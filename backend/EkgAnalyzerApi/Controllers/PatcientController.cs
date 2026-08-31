using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.RegularExpressions;

[ApiController]
[Route("api/patcient")]
[Authorize]
public class PatcientController : ControllerBase
{
    private readonly MedDataDB _context;
    private readonly PatcientService _patcientService;
    private readonly EncryptionService _encryption;
    private readonly ICurrentUser _currentUser;

    public PatcientController(
        MedDataDB context,
        PatcientService patcientService,
        EncryptionService encryption,
        ICurrentUser currentUser)
    {
        _context = context;
        _patcientService = patcientService;
        _encryption = encryption;
        _currentUser = currentUser;
    }

    /// <summary>
    /// Klinika bemorlari ro'yxati (sahifalangan, qidiruv bilan).
    /// Passport javobda MASKALANGAN holda qaytadi.
    /// </summary>
    [HttpGet("get-patcients-of-clinic")]
    public async Task<IActionResult> GetPatcientsOfClinic(
        [FromQuery] int page = 1,
        [FromQuery] string? search = null,
        [FromQuery] string lang = "uz")
    {
        var userId = _currentUser.UserId;
        if (userId <= 0)
            return Unauthorized(new { message = "Token invalid" });

        if (page < 1) page = 1;

        var result = await _patcientService.GetPatcientsAsync(page, userId, search, lang);
        return Ok(result);
    }

    /// <summary>
    /// Bemor kartasi: shaxsiy ma'lumotlar + barcha tahlillar xronologik lentada.
    /// </summary>
    [HttpGet("get-patient-card/{id:int}")]
    public async Task<IActionResult> GetPatientCard(int id, [FromQuery] string lang = "uz")
    {
        var userId = _currentUser.UserId;
        if (userId <= 0)
            return Unauthorized(new { message = "Token invalid" });

        var card = await _patcientService.GetPatientCardAsync(id, userId, lang);
        if (card == null)
            return NotFound(new { message = "Bemor topilmadi" });

        return Ok(card);
    }

    [HttpGet("get-patient-by-passport")]
    public async Task<IActionResult> GetPatientByPassport(string passport, string birthdate)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        if (!DateOnly.TryParse(birthdate, out DateOnly birthDate))
            return BadRequest(new { message = "Invalid birthdate format" });

        var normalizedPassport = NormalizeDocumentSeries(passport);

        var patients = await _context.Patcients
            .Include(x => x.District!).ThenInclude(d => d.Region!)
            .Where(v => v.BirthDate == birthDate)
            .ToListAsync();

        var patient = patients.FirstOrDefault(v =>
            NormalizeDocumentSeries(v.Passport) == normalizedPassport);

        if (patient == null)
            return NotFound(new { message = "Patient not found" });

        patient.Passport = patient.Passport;
        return Ok(patient);
    }

    [HttpPost("save-patient-data")]
    public async Task<IActionResult> SavePatientData(PatcientDTO patientDto)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        if (!DateOnly.TryParse(patientDto.birthdate, out DateOnly birthDate))
            return BadRequest(new { message = "Invalid birthdate format" });

        var normalizedPassport = NormalizeDocumentSeries(patientDto.passport);

        var patientsByBirthDate = await _context.Patcients
            .Where(p => p.BirthDate == birthDate)
            .ToListAsync();

        var existingPatient = patientsByBirthDate.FirstOrDefault(p =>
            NormalizeDocumentSeries(p.Passport) == normalizedPassport);

        if (existingPatient != null)
        {
            existingPatient.Passport = normalizedPassport;
            existingPatient.FirstName = patientDto.firstname;
            existingPatient.Address = patientDto.address;
            existingPatient.DistrictId = patientDto.district_id;
            existingPatient.LastName = patientDto.lastname;
            existingPatient.SureName = patientDto.surename;
            existingPatient.Gender = patientDto.gender;
            existingPatient.Phone = patientDto.phone;
            existingPatient.UpdatedAt = DateTime.UtcNow;

            _context.Patcients.Update(existingPatient);
            await _context.SaveChangesAsync();

            existingPatient.Passport = existingPatient.Passport;
            return Ok(existingPatient);
        }

        var newPatient = new Patcient
        {
            Passport = normalizedPassport,
            BirthDate = birthDate,
            FirstName = patientDto.firstname,
            Address = patientDto.address,
            DistrictId = patientDto.district_id,
            LastName = patientDto.lastname,
            SureName = patientDto.surename,
            Gender = patientDto.gender,
            Phone = patientDto.phone,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.Patcients.AddAsync(newPatient);
        await _context.SaveChangesAsync();

        newPatient.Passport = newPatient.Passport;
        return Ok(newPatient);
    }

    /// <summary>
    /// Klinikaning bemorlari ro'yxati (sahifalangan).
    ///
    /// Ilgari bu endpoint <b>butun platformadagi barcha bemorlarni</b> qaytarardi —
    /// istalgan klinika boshqa klinikalarning bemor bazasini ko'ra olardi.
    /// Endi u klinika bo'yicha filtrlangan va sahifalangan ro'yxatni qaytaradi.
    /// </summary>
    /// <summary>
    /// `get-patcients-of-clinic` bilan bir xil — eski nom bilan moslik uchun
    /// saqlangan. Ikkalasi ham bitta servis metodini chaqiradi, shuning uchun
    /// pagination, klinika filtri, passport maskalash va qidiruv bir xil.
    ///
    /// Ilgari bu endpoint har bir bemor uchun uning BARCHA EKG, laboratoriya
    /// tahlillari va shifokor xulosalarini ichma-ich qaytarardi va
    /// pagination yo'q edi — 10 000 bemorli klinikada bu o'nlab megabaytlik
    /// javob demakdir (T-064).
    /// </summary>
    [HttpGet("get-all-patients")]
    public async Task<IActionResult> GetAllPatient(
        [FromQuery] int page = 1,
        [FromQuery] string? search = null,
        [FromQuery] string lang = "uz")
    {
        if (!_currentUser.IsAuthenticated)
            return Unauthorized(new { message = "Token invalid" });

        if (await _currentUser.GetClinicIdAsync() == null)
            return Unauthorized(new { message = "Klinika aniqlanmadi" });

        if (page < 1) page = 1;

        // Klinika bo'yicha filtrlash mantig'i PatcientService ichida
        var result = await _patcientService.GetPatcientsAsync(page, _currentUser.UserId, search, lang);
        return Ok(result);
    }

    private static string NormalizeDocumentSeries(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        var upper = value.Trim().ToUpperInvariant();

        return Regex.Replace(upper, @"[\s\-\/\.]", string.Empty);
    }
}
