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

    public PatcientController(MedDataDB context)
    {
        _context = context;
    }


    [HttpGet("get-patient-by-passport")]
    public async Task<IActionResult> GetPatientByPassport(string passport, string birthdate)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        DateOnly birthDate = DateOnly.Parse(birthdate);

        var patient = await _context.Patients
            .FirstOrDefaultAsync(v =>
                v.Passport == passport &&
                v.BirthDate == birthDate
            );

        if (patient == null)
            return NotFound(new { message = "Patient not found" });

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

        // Tekshirish: patient mavjudmi (passport + birthdate)
        var existingPatient = await _context.Patients
            .FirstOrDefaultAsync(p =>
                p.Passport == patientDto.passport.ToUpper() &&
                p.BirthDate == birthDate
            );

        if (existingPatient != null)
        {
            // ✅ Update mavjud patient
            existingPatient.FirstName = patientDto.firstname;
            existingPatient.LastName = patientDto.lastname;
            existingPatient.SureName = patientDto.surename;
            existingPatient.Gender = patientDto.gender;
            existingPatient.Phone = patientDto.phone;
            existingPatient.UpdatedAt = DateTime.UtcNow;

            _context.Patients.Update(existingPatient);
            await _context.SaveChangesAsync();

            return Ok(existingPatient);
        }
        else
        {
            // ✅ Create yangi patient
            var newPatient = new Patient
            {
                Passport = patientDto.passport.ToUpper(),
                BirthDate = birthDate,
                FirstName = patientDto.firstname,
                LastName = patientDto.lastname,
                SureName = patientDto.surename,
                Gender = patientDto.gender,
                Phone = patientDto.phone,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _context.Patients.AddAsync(newPatient);
            await _context.SaveChangesAsync();

            return Ok(newPatient);
        }
    }
}