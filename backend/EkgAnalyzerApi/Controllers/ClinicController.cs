using EkgAnalyzerApi.Constants;
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
    private readonly ICurrentUser _currentUser;

    public ClinicController(ClinicService clinicService, ICurrentUser currentUser)
    {
        _clinicService = clinicService;
        _currentUser = currentUser;
    }

    [HttpPost("update-clinic-data")]
    [Authorize(Policy = RoleConstants.PolicyClinicManager)]
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
    [Authorize(Policy = RoleConstants.PolicyClinicManager)]
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
    [Authorize(Policy = RoleConstants.PolicyClinicManager)]
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
    /// <summary>
    /// Klinika ma'lumotlari. Faqat foydalanuvchining O'Z klinikasi qaytariladi —
    /// boshqa klinika ID si so'ralsa 403.
    /// </summary>
    [HttpGet("get-clinic-by-id")]
    [Authorize(Policy = RoleConstants.PolicyClinicManager)]
    public async Task<IActionResult> GetClinicById([FromQuery] int id)
    {
        if (!_currentUser.IsAuthenticated)
            return Unauthorized(new { message = "Token invalid" });

        var myClinicId = await _currentUser.GetClinicIdAsync();
        if (myClinicId == null)
            return Unauthorized(new { message = "Klinika aniqlanmadi" });

        // Klinika izolyatsiyasi: ilgari istalgan klinika ID sini so'rab, boshqa
        // klinikaning nomi, INN va bank rekvizitlarini olish mumkin edi.
        if (id != myClinicId.Value)
            return Forbid();

        var result = await _clinicService.GetClinicByIdAsync(_currentUser.UserId, id);

        if (result == null)
            return NotFound(new { message = "Klinika topilmadi" });

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
    [Authorize(Policy = RoleConstants.PolicySuperAdmin)]
    public async Task<IActionResult> SetClinicActive(int id, [FromQuery] bool isActive)
    {
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