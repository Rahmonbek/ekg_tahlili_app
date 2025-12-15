using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[ApiController]
[Route("api/clinic")]
public class ClinicController : ControllerBase
{
    private readonly ClinicService _clinicService;

    public ClinicController(ClinicService clinicService)
    {
        _clinicService = clinicService;
    }

    
    //[HttpGet("get-clinic-by-token")]
    //public async Task<IActionResult> GetClinic()
    //{
    //    var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
    //    if (userIdClaim == null)
    //        return Unauthorized(new { message = "Token invalid" });

    //    var userId = int.Parse(userIdClaim.Value);

    //    var clinic = await _clinicService.GetClinicByUserIdAsync(userId);
    //    if (clinic == null)
    //        return NotFound(new { message = "Clinic not found" });

    //    return Ok(clinic);
    //}
}