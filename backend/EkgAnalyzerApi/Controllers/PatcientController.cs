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

    public PatcientController(MedDataDB context, PatcientService patcientService)
    {
        _context = context;
        _patcientService = patcientService;
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

        return Ok(result);
    }

    [HttpGet("get-patient-by-passport")]
    public async Task<IActionResult> GetPatientByPassport(string passport, string birthdate)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        DateOnly birthDate = DateOnly.Parse(birthdate);

        var patient = await _context.Patcients.Include(x => x.District).ThenInclude(d => d.Region)
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
        var existingPatient = await _context.Patcients
            .FirstOrDefaultAsync(p =>
                p.Passport == patientDto.passport.ToUpper() &&
                p.BirthDate == birthDate
            );

        if (existingPatient != null)
        {
            // ✅ Update mavjud patient
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

            return Ok(existingPatient);
        }
        else
        {
            // ✅ Create yangi patient
            var newPatient = new Patcient
            {
                Passport = patientDto.passport.ToUpper(),
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

        return Ok(patients);
    }





}