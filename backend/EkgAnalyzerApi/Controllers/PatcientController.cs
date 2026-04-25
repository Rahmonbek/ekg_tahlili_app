using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.RegularExpressions;

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

        if (result?.data != null)
        {
            foreach (var p in result.data)
            {
                p.Passport = p.Passport;
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

        if (!DateOnly.TryParse(birthdate, out DateOnly birthDate))
            return BadRequest(new { message = "Invalid birthdate format" });

        var normalizedPassport = NormalizeDocumentSeries(passport);

        var patients = await _context.Patcients
            .Include(x => x.District).ThenInclude(d => d.Region)
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

    [HttpGet("get-all-patients")]
    public async Task<IActionResult> GetAllPatient()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var patients = await _context.Patcients.ToListAsync();

        if (patients == null || !patients.Any())
            return NotFound(new { message = "Patients not found" });

        foreach (var p in patients)
        {
            p.Passport = p.Passport;
        }

        return Ok(patients);
    }

    private static string NormalizeDocumentSeries(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        var upper = value.Trim().ToUpperInvariant();

        return Regex.Replace(upper, @"[\s\-\/\.]", string.Empty);
    }
}
