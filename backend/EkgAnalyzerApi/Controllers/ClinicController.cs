using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[ApiController]
[Route("api/clinic")]
[Authorize]
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
        try
        {
            var clinic = await _clinicService.UpsertAsync(dto);
            return Ok(new
            {
                clinic.Id,
                clinic.ClinicName,
                clinic.ClinicLogo
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("update-clinic-phone")]
    public async Task<IActionResult> UpdateClinicPhoneData([FromBody] ClinicPhoneUpsertDto dto)
    {
        try
        {
            await _clinicService.UpsertClinicPhonesAsync(dto);
            return Ok(true);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("create-update-clinic-detail")]
    public async Task<IActionResult> Upsert([FromForm] ClinicDetailUpsertDto dto)
    {
        try
        {
            var detail = await _clinicService.CreateUpdateClinicDetail(dto);
            return Ok(new
            {
                detail.Id,
                detail.ClinicId,
                detail.BankAccaunt,
                detail.DistrictId,
                detail.MFO,
                detail.BankName,
                detail.INN,
                detail.Address,
                detail.License
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
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

    /// <summary>
    /// SuperAdmin klinikani faollashtiradi yoki o'chiradi.
    /// PATCH /api/clinic/{id}/set-active?isActive=true
    /// </summary>
    [HttpPatch("{id}/set-active")]
    [Authorize]
    public async Task<IActionResult> SetClinicActive(int id, [FromQuery] bool isActive)
    {
        // Faqat SuperAdmin (roleId=1) uchun ruxsat
        var roleClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role);
        if (roleClaim == null || roleClaim.Value != "1")
            return Forbid();

        try
        {
            var result = await _clinicService.SetClinicActiveAsync(id, isActive);
            return Ok(new { clinicId = id, isActive = result });
        }
        catch (Exception ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}