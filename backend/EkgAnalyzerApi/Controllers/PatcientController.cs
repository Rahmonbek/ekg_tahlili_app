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
    public async Task<IActionResult> SavePatcientData(PatcientDTO patcient)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        DateOnly birthDate = DateOnly.Parse(patcient.birthdate);

        var new_patient = new Patient
        {
            Passport = patcient.passport.ToUpper(),
            BirthDate = birthDate, 
            FirstName = patcient.firstname,
            LastName = patcient.lastname,
            SureName = patcient.surename,
            Gender = patcient.gender,
            Phone = patcient.phone,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.Patients.AddAsync(new_patient);
        await _context.SaveChangesAsync();


        
        if (new_patient == null)
            return NotFound(new { message = "Patient not found" });

        return Ok(new_patient);
    }
}