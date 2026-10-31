using EkgAnalyzerApi.Constants;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EkgAnalyzerApi.Controllers;

/// <summary>
/// Vipiska (statsionardan chiqarish epikrizi).
///
/// Shifokor bemor kartasida «Vipiska chiqarish» tugmasini bosadi, ИБ raqami
/// va sanalarni kiritadi, so'ng vipiskaga kiradigan tahlillar, diagnoz,
/// shikoyatlar, konsultatsiya xulosalari va tavsiyalarni to'ldiradi.
/// PDF: <c>GET api/report/discharge/{id}</c>. Huquqlar — <see cref="DischargeSummaryService"/>.
/// </summary>
[ApiController]
[Route("api/discharge-summaries")]
[Authorize]
public class DischargeSummaryController : ControllerBase
{
    private readonly DischargeSummaryService _service;
    private readonly ICurrentUser _currentUser;

    public DischargeSummaryController(DischargeSummaryService service, ICurrentUser currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    /// <summary>
    /// Bemorning vipiskalari va joriy foydalanuvchi yangisini chiqara olishi.
    /// GET api/discharge-summaries/by-patient/{patientId}
    /// </summary>
    [HttpGet("by-patient/{patientId:int}")]
    public async Task<IActionResult> GetByPatient(int patientId)
    {
        if (!_currentUser.IsAuthenticated) return Unauthorized(new { message = "Token invalid" });

        var result = await _service.GetByPatientAsync(_currentUser.UserId, _currentUser.RoleId, patientId);
        return Ok(result);
    }

    /// <summary>
    /// Vipiskaga tanlash mumkin bo'lgan tahlillar va konsultatsiya xulosalari.
    /// GET api/discharge-summaries/candidates?patientId=5&amp;admissionDate=2026-10-01&amp;dischargeDate=2026-10-09
    /// </summary>
    [HttpGet("candidates")]
    public async Task<IActionResult> GetCandidates(
        [FromQuery] int patientId, [FromQuery] DateOnly admissionDate, [FromQuery] DateOnly dischargeDate)
    {
        if (!_currentUser.IsAuthenticated) return Unauthorized(new { message = "Token invalid" });
        if (_currentUser.RoleId != RoleConstants.Doctor)
            return StatusCode(403, new { message = "Vipiskani faqat shifokor chiqaradi" });

        if (admissionDate == default || dischargeDate == default)
            return BadRequest(new { message = "Yotqizilish va chiqarilish sanalarini kiriting" });
        if (admissionDate > dischargeDate)
            return BadRequest(new { message = "Yotqizilish sanasi chiqarilish sanasidan keyin bo'lishi mumkin emas" });

        if (!await _service.CanCreateAsync(_currentUser.UserId, patientId))
            return StatusCode(403, new { message = "Bu bemor sizga yo'naltirilmagan" });

        var doctorId = await _currentUser.GetDoctorIdAsync();
        var result = await _service.GetCandidatesAsync(doctorId!.Value, patientId, admissionDate, dischargeDate);
        return Ok(result);
    }

    /// <summary>GET api/discharge-summaries/{id}</summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        if (!_currentUser.IsAuthenticated) return Unauthorized(new { message = "Token invalid" });

        var dto = await _service.GetByIdAsync(_currentUser.UserId, _currentUser.RoleId, id);
        if (dto == null) return NotFound(new { message = "Vipiska topilmadi yoki ruxsat yo'q" });

        return Ok(dto);
    }

    /// <summary>POST api/discharge-summaries</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] DischargeSaveRequest request)
    {
        if (!_currentUser.IsAuthenticated) return Unauthorized(new { message = "Token invalid" });

        var result = await _service.CreateAsync(_currentUser.UserId, request);
        if (result.Forbidden) return StatusCode(403, new { message = result.Error });
        if (result.Error != null) return BadRequest(new { message = result.Error });

        return Ok(new { id = result.Entity!.Id });
    }

    /// <summary>PUT api/discharge-summaries/{id}</summary>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] DischargeSaveRequest request)
    {
        if (!_currentUser.IsAuthenticated) return Unauthorized(new { message = "Token invalid" });

        var result = await _service.UpdateAsync(_currentUser.UserId, id, request);
        if (result.Forbidden) return StatusCode(403, new { message = result.Error });
        if (result.Error != null) return BadRequest(new { message = result.Error });
        if (result.Entity == null) return NotFound(new { message = "Vipiska topilmadi" });

        return Ok(new { id = result.Entity.Id });
    }

    /// <summary>DELETE api/discharge-summaries/{id}</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!_currentUser.IsAuthenticated) return Unauthorized(new { message = "Token invalid" });

        var deleted = await _service.DeleteAsync(_currentUser.UserId, id);
        return deleted switch
        {
            null => NotFound(new { message = "Vipiska topilmadi" }),
            false => StatusCode(403, new { message = "Vipiskani faqat uni yaratgan shifokor o'chira oladi" }),
            _ => Ok(new { success = true }),
        };
    }
}
