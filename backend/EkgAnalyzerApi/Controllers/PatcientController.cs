using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[ApiController]
[Route("api/patcient")]
public class PatcientController : ControllerBase
{
    private readonly MedDataDB _context;
    private readonly PatcientService _patcientService;
    private readonly EncryptionService _encryption;

    public PatcientController(MedDataDB context, PatcientService patcientService, EncryptionService encryption)
    {
        _context = context;
        _patcientService = patcientService;
        _encryption = encryption;
    }

    [HttpGet("get-patcients-of-clinic")]
    public async Task<IActionResult> GetDoctors([FromQuery] int page = 1)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);

        if (page < 1) page = 1;

        var result = await _patcientService.GetPatcientsAsync(page, userId);

        // Passportlarni deshifrlash
        if (result?.data != null)
        {
            foreach (var p in result.data)
            {
                p.Passport = _encryption.Decrypt(p.Passport);
            }
        }

        return Ok(result);
    }

    [HttpGet("get-patient-by-passport")]
    public async Task<IActionResult> GetPatientByPassport(string passport, string birthdate)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        DateOnly birthDate = DateOnly.Parse(birthdate);

        // Passportni shifrlangan holda qidirish
        var encryptedPassport = _encryption.Encrypt(passport);

        // Avval shifrlangan qiymat bilan qidirish, topilmasa — ochiq qiymat bilan (migration davri uchun)
        var patient = await _context.Patcients.Include(x => x.District).ThenInclude(d => d.Region)
            .FirstOrDefaultAsync(v =>
                (v.Passport == encryptedPassport || v.Passport == passport.ToUpper()) &&
                v.BirthDate == birthDate
            );

        if (patient == null)
            return NotFound(new { message = "Patient not found" });

        // Deshifrlash
        patient.Passport = _encryption.Decrypt(patient.Passport);

        return Ok(patient);
    }

    [HttpPost("save-patient-data")]
    public async Task<IActionResult> SavePatientData(PatcientDTO patientDto)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        // Parse birthdate
        if (!DateOnly.TryParse(patientDto.birthdate, out DateOnly birthDate))
            return BadRequest(new { message = "Invalid birthdate format" });

        // Passportni shifrlash
        var encryptedPassport = _encryption.Encrypt(patientDto.passport.ToUpper());

        // Tekshirish: patient mavjudmi (ochiq va shifrlangan passport bilan)
        var existingPatient = await _context.Patcients
            .FirstOrDefaultAsync(p =>
                (p.Passport == encryptedPassport || p.Passport == patientDto.passport.ToUpper()) &&
                p.BirthDate == birthDate
            );

        if (existingPatient != null)
        {
            // ✅ Update mavjud patient
            existingPatient.Passport = encryptedPassport; // Eski ochiq passport ni shifrlash
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

            // Response da deshifrlangan passport qaytarish
            existingPatient.Passport = _encryption.Decrypt(existingPatient.Passport);
            return Ok(existingPatient);
        }
        else
        {
            // ✅ Create yangi patient (shifrlangan passport bilan)
            var newPatient = new Patcient
            {
                Passport = encryptedPassport,
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

            // Response da deshifrlangan passport qaytarish
            newPatient.Passport = _encryption.Decrypt(newPatient.Passport);
            return Ok(newPatient);
        }
    }




    [HttpGet("get-all-patients")]
    public async Task<IActionResult> GetAllPatient()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var patients = await _context.Patcients.ToListAsync();

        if (patients == null || !patients.Any())
            return NotFound(new { message = "Patients not found" });

        // Passportlarni deshifrlash
        foreach (var p in patients)
        {
            p.Passport = _encryption.Decrypt(p.Passport);
        }

        return Ok(patients);
    }
}

