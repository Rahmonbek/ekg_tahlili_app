using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Helpers;
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

    /// <summary>
    /// Passport ma'lumotlari bo'yicha bemor QIDIRUVI (ro'yxat qaytaradi).
    ///
    /// GET api/patcient/search-by-passport?passport=AB1234567&amp;birthdate=1972-03-11
    ///
    /// `get-patient-by-passport` dan farqi: u tahlil yuklash sahifasi uchun
    /// bitta bemor obyektini qaytaradi va o'zgartirilmadi. Bu esa bemorlar
    /// sahifasidagi "Passport ma'lumotlari bilan qidirish" oynasi uchun —
    /// ro'yxat, tahlillar soni va oxirgi tahlil sanasi bilan.
    ///
    /// Klinika/rol filtri YO'Q: to'rttala rol ham bazadagi istalgan bemorni
    /// topa oladi. Buning xavfsizlik asosi — passportni to'liq bilish talabi.
    /// </summary>
    [HttpGet("search-by-passport")]
    public async Task<IActionResult> SearchByPassport(
        [FromQuery] string? passport,
        [FromQuery] string? birthdate,
        [FromQuery] string lang = "uz")
    {
        if (!_currentUser.IsAuthenticated)
            return Unauthorized(new { message = "Token invalid" });

        if (string.IsNullOrWhiteSpace(passport))
            return BadRequest(new { message = "Passport seriyasi kiritilmagan" });

        if (!DateOnly.TryParse(birthdate, out var birthDate))
            return BadRequest(new { message = "Tug'ilgan sana noto'g'ri formatda" });

        var items = await _patcientService.SearchByPassportAsync(passport, birthDate, lang);
        return Ok(new PatcientListDTO
        {
            data = items,
            TotalCount = items.Count,
            TotalPages = 1
        });
    }

    /// <summary>
    /// Ism / familiya / otasining ismi bo'yicha bemor QIDIRUVI — tahlil
    /// yuklash sahifalaridagi "Bemor" qadami uchun (passport + tug'ilgan
    /// sana bo'yicha qidiruv o'rniga).
    ///
    /// GET api/patcient/search-by-name?q=ismoilov rahmon
    ///
    /// Klinika/rol filtri YO'Q (loyiha egasining qarori) — natija
    /// <see cref="PatcientService.NameSearchLimit"/> ta bilan cheklanadi.
    /// </summary>
    [HttpGet("search-by-name")]
    public async Task<IActionResult> SearchByName([FromQuery] string? q, [FromQuery] string lang = "uz")
    {
        if (!_currentUser.IsAuthenticated)
            return Unauthorized(new { message = "Token invalid" });

        var query = PatientInput.NormalizeName(q);
        if (query.Replace(" ", "").Length < 2)
            return BadRequest(new { message = "Kamida 2 ta harf kiriting" });
        if (!PatientInput.IsLatinName(query))
            return BadRequest(new { message = "Faqat lotin harflarida kiriting" });

        var items = await _patcientService.SearchByNameAsync(query, lang);
        return Ok(new PatcientListDTO
        {
            data = items,
            TotalCount = items.Count,
            TotalPages = 1
        });
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

    /// <summary>
    /// Bemorni yaratadi yoki tahrirlaydi.
    ///
    /// <list type="bullet">
    /// <item><c>id</c> berilsa — aynan shu bemor tahrirlanadi (ism bo'yicha
    /// qidiruvdan tanlangan bemor).</item>
    /// <item><c>id</c> yo'q, lekin passport VA tug'ilgan sana bazadagi
    /// bemorga mos — o'sha bemor yangilanadi (eski passport oqimi:
    /// konsultatsiya, xulosalar sahifalari; takror bemor yaratilmaydi).</item>
    /// <item>Aks holda — yangi bemor.</item>
    /// </list>
    ///
    /// Faqat ism va familiya majburiy; barcha matnlar lotin harflarida
    /// (<see cref="PatientInput"/>).
    /// </summary>
    [HttpPost("save-patient-data")]
    public async Task<IActionResult> SavePatientData(PatcientDTO patientDto)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var firstName = PatientInput.NormalizeName(patientDto.firstname);
        var lastName = PatientInput.NormalizeName(patientDto.lastname);
        var sureName = PatientInput.NormalizeName(patientDto.surename);
        if (firstName.Length == 0 || lastName.Length == 0)
            return BadRequest(new { message = "Ism va familiya majburiy" });
        if (!PatientInput.IsLatinName(firstName) || !PatientInput.IsLatinName(lastName)
            || (sureName.Length > 0 && !PatientInput.IsLatinName(sureName)))
            return BadRequest(new { message = "Ism, familiya va otasining ismi faqat lotin harflarida kiritilsin" });

        var address = string.IsNullOrWhiteSpace(patientDto.address) ? null : patientDto.address.Trim().ToUpperInvariant();
        if (!PatientInput.IsLatinText(address))
            return BadRequest(new { message = "Manzil faqat lotin harflarida kiritilsin" });

        // Maskalangan passport ("** ****4567") formadan qaytib kelsa — o'zgarmagan
        var passportUnchanged = patientDto.passport?.Contains('*') == true;
        var normalizedPassport = passportUnchanged ? string.Empty : NormalizeDocumentSeries(patientDto.passport);
        if (!Regex.IsMatch(normalizedPassport, "^[A-Z0-9]*$"))
            return BadRequest(new { message = "Passport seriyasi faqat lotin harflari va raqamlardan iborat bo'lsin" });

        DateOnly? birthDate = null;
        if (!string.IsNullOrWhiteSpace(patientDto.birthdate))
        {
            if (!DateOnly.TryParse(patientDto.birthdate, out var parsed))
                return BadRequest(new { message = "Tug'ilgan sana noto'g'ri formatda" });
            if (parsed < new DateOnly(1900, 1, 1) || parsed > DateOnly.FromDateTime(DateTime.Today))
                return BadRequest(new { message = "Tug'ilgan sana noto'g'ri" });
            birthDate = parsed;
        }

        int? districtId = patientDto.district_id is > 0 ? patientDto.district_id : null;
        if (districtId != null && !await _context.Districts.AnyAsync(d => d.Id == districtId))
            return BadRequest(new { message = "Tuman topilmadi" });

        Patcient? patient = null;
        if (patientDto.id is > 0)
        {
            patient = await _context.Patcients.FirstOrDefaultAsync(p => p.Id == patientDto.id);
            if (patient == null)
                return NotFound(new { message = "Bemor topilmadi" });
        }
        else if (normalizedPassport.Length > 0 && birthDate != null)
        {
            var sameBirthDate = await _context.Patcients
                .Where(p => p.BirthDate == birthDate)
                .ToListAsync();
            patient = sameBirthDate.FirstOrDefault(p =>
                NormalizeDocumentSeries(p.Passport) == normalizedPassport);
        }

        if (patient == null)
        {
            patient = new Patcient { CreatedAt = DateTime.UtcNow };
            await _context.Patcients.AddAsync(patient);
        }

        if (!passportUnchanged) patient.Passport = normalizedPassport;
        patient.BirthDate = birthDate;
        patient.FirstName = firstName;
        patient.LastName = lastName;
        patient.SureName = sureName;
        patient.Gender = patientDto.gender;
        patient.Phone = patientDto.phone?.Trim() ?? string.Empty;
        patient.Address = address;
        patient.DistrictId = districtId;
        patient.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Frontend tahrirlash formasini viloyat/tuman bilan to'ldiradi
        var saved = await _context.Patcients.AsNoTracking()
            .Include(x => x.District!).ThenInclude(d => d.Region!)
            .FirstAsync(x => x.Id == patient.Id);
        return Ok(saved);
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
