using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
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
    public async Task<IActionResult> SaveDoctorData([FromBody] DoctorDTORequest data)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);

        var clinic = await _doctorService.SaveDoctorData(userId, data);
        if (clinic == null)
            return NotFound(new { message = "error" });
        if (clinic.Status == false)
        {
            return BadRequest(new { message = clinic.Message ?? "error" });
        }

        return Ok(clinic);
    }

    [HttpGet("get-default-username")]
    public async Task<IActionResult> GetDefaultUserName()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);
        

        var result = await _doctorService.GetDefaultUserName(userId);

        return Ok(new { username = result });
    }

    [HttpGet("get-doctors-of-clinic")]
    public async Task<IActionResult> GetDoctors([FromQuery] int page = 1)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);

        if (page < 1) page = 1;

        var result = await _doctorService.GetDoctorsAsync(page, userId);

        return Ok(result);
    }

    [HttpGet("get-doctors-by-clinic-id")]
    public async Task<IActionResult> GetDoctorsByClinicId([FromQuery] int id)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);

        

        var result = await _doctorService.GetDoctorsByClinicId(id);

        return Ok(result);
    }

    [HttpGet("get-doctors-by-id")]
    public async Task<IActionResult> GetDoctorsById([FromQuery] int id)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);

        var result = await _doctorService.GetDoctorByIdAsync(userId, id);

        if (result == null)
            return NotFound(new { message = "Doctor not found or access denied" });

        return Ok(result);
    }



    [HttpGet("get-params-for-add-staff")]
    public async Task<IActionResult> GetRolesForAddStaff()
    {
        var roleIdClaim = User.Claims.FirstOrDefault(c => c.Type == "roleId");
        if (roleIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        int roleId = int.Parse(roleIdClaim.Value);

        var clinic = await _doctorService.GetRolesForAddStaff(roleId);
        if (clinic == null)
            return NotFound(new { message = "error" });
        

        return Ok(clinic);
    }


}
