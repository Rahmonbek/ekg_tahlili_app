using EkgAnalyzerApi.Data;
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

        var complaints = await _context.Patients
            .FirstOrDefaultAsync(v =>
                v.Passport == passport &&
                v.BirthDate.Date == birthDate.ToDateTime(TimeOnly.MinValue)
            );
        ;

        if (complaints == null)
            return NotFound(new { message = "Patient not found" });

        return Ok(complaints);
    }
}