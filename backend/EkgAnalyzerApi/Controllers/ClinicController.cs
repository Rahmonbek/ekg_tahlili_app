using EkgAnalyzerApi.DTOs;
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

    [HttpPost("update-clinic-data")]
    public async Task<IActionResult> UpdateClinicData([FromForm] ClinicUpsertDto dto)
    {
        var clinic = await _clinicService.UpsertAsync(dto);

        return Ok(new
        {
            clinic.Id,
            clinic.ClinicName,
            clinic.ClinicLogo
        });
    }

    [HttpPost("update-clinic-phone")]
    public async Task<IActionResult> UpdateClinicPhoneData([FromForm] ClinicPhoneUpsertDto dto)
    {
        await _clinicService.UpsertClinicPhonesAsync(dto);
        return Ok();
    }
    [HttpPost("create-update-clinic-detail")]
    public async Task<IActionResult> Upsert([FromForm] ClinicDetailUpsertDto dto)
    {
        var detail = await _clinicService.CreateUpdateClinicDetail(dto);

        return Ok(new
        {
            detail.Id,
            detail.ClinicId,
            detail.BankAccaunt,
            detail.MFO,
            detail.BankName,
            detail.INN,
            detail.Address,
            detail.License
        });
    }
    [HttpGet("get-clinic-by-id")]
    public async Task<IActionResult> GetClinicById([FromQuery] int id)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);

        var result = await _clinicService.GetClinicByIdAsync(userId, id);

        if (result == null)
            return NotFound(new { message = "Doctor not found or access denied" });

        return Ok(result);
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