using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[ApiController]
[Route("api/doctor")]
public class DoctorController : ControllerBase
{
    private readonly DoctorService _doctorService;

    public DoctorController(DoctorService doctorService)
    {
        _doctorService = doctorService;
    }


    [HttpPost("save-doctor-data")]
    public async Task<IActionResult> GetClinic([FromBody] DoctorDTORequest data)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);

        var clinic = await _doctorService.SaveDoctorData(userId, data);
        if (clinic == null)
            return NotFound(new { message = "Clinic not found" });
        if (clinic.Status == false)
        {
            return BadRequest(new { message = "Clinic not found" });
        }

        return Ok(clinic);
    }
}