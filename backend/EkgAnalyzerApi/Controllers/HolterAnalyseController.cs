using EkgAnalyzerApi.Constants;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.RateLimiting;

[ApiController]
[Route("api/holter-analyses")]
[Authorize]
public class HolterAnalyseController : ControllerBase
{
    private readonly MedDataDB _context;
    private readonly HolterAnalyseService _holterService;
    private readonly PythonApiProxyService _proxyService;
    private readonly AnalysisProgressTracker _progressTracker;
    private readonly ICurrentUser _currentUser;

    public HolterAnalyseController(MedDataDB context, HolterAnalyseService holterService, PythonApiProxyService proxyService, AnalysisProgressTracker progressTracker, ICurrentUser currentUser)
    {
        _context = context;
        _holterService = holterService;
        _proxyService = proxyService;
        _progressTracker = progressTracker;
        _currentUser = currentUser;
    }


    [HttpGet("get-holter-analyses-by-patcient-id")]
    public async Task<IActionResult> GetHolterAnalysesByPatientId(int id, int page = 1)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var results = await _holterService.GetHolterAnalysesByPatientIdAsync(id, page, 5);

        return Ok(results);
    }

    /// <summary>
    /// Holter faylni tahlil qilish (Python API ga proxy)
    /// POST api/holter-analyses/analyze
    /// </summary>
    [HttpPost("analyze")]
    [EnableRateLimiting("ai-analysis")]
    public async Task<IActionResult> Analyze()
    {
        var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
        try
        {
            var response = await _proxyService.ProxyMultipartAsync("/holter/analyze", Request, token);
            var result = await ProxyHttpResponseMapper.ToContentResultAsync(response);
            if (response.IsSuccessStatusCode && !string.IsNullOrWhiteSpace(result.Content))
                TrackAnalysisProgress(result.Content, "holter", "holter_id");
            return result;
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = "AI tahlil xizmati bilan bog'lanib bo'lmadi", error = ex.Message });
        }
    }

    private void TrackAnalysisProgress(string content, string type, string idKey)
    {
        if (!TryGetUserId(out var userId)) return;
        var analysisId = ExtractInt(content, idKey);
        if (analysisId.HasValue)
            _progressTracker.Track(userId, type, analysisId.Value);
    }

    private bool TryGetUserId(out int userId)
    {
        userId = 0;
        var claim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out userId);
    }

    private static int? ExtractInt(string json, string key)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.TryGetProperty(key, out var prop) && prop.TryGetInt32(out var value)
                ? value
                : null;
        }
        catch
        {
            return null;
        }
    }
    [HttpGet("get-by-clinic")]
    [Authorize(Policy = RoleConstants.PolicyClinicManager)]
    public async Task<IActionResult> GetByClinic(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] int? status = null,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] int? automaticAnalysisBool = null,
        [FromQuery] bool? hasDiagnosis = null)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.ClinicId == null)
            return Unauthorized(new { message = "Klinika aniqlanmadi" });

        var userClinicId = user.ClinicId.Value;

        var results = await _holterService.GetHolterAnalysesByClinicIdAsync(
            userClinicId, page, pageSize, search, status, dateFrom, dateTo, automaticAnalysisBool, hasDiagnosis);

        return Ok(results);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        // Klinika izolyatsiyasi: foydalanuvchi faqat o'z klinikasining tahlilini ko'ra oladi
        var clinicId = await _currentUser.GetClinicIdAsync();
        if (clinicId == null) return Unauthorized(new { message = "Klinika aniqlanmadi" });

        var result = await _holterService.GetHolterAnalyseByIdAsync(id, clinicId.Value);
        if (result == null) return NotFound(new { message = "Tahlil topilmadi yoki ruxsat yo'q" });
        return Ok(result);
    }

    // ── Shifokor bo'yicha endpointlar ─────────────────────────────────────────

    [HttpGet("get-by-doctor")]
    [Authorize(Policy = RoleConstants.PolicyDoctorOnly)]
    public async Task<IActionResult> GetByDoctor(
        int page = 1, int pageSize = 10,
        string? search = null, int? status = null,
        DateTime? dateFrom = null, DateTime? dateTo = null,
        int? automaticAnalysisBool = null,
        bool? hasDiagnosis = null)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);
        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
        if (doctor == null) return NotFound(new { message = "Shifokor topilmadi" });

        var results = await _holterService.GetHolterAnalysesByDoctorAsync(
            doctor.Id, page, pageSize, search, status, dateFrom, dateTo, automaticAnalysisBool, hasDiagnosis);
        return Ok(results);
    }

    [HttpGet("unviewed-count")]
    [Authorize(Policy = RoleConstants.PolicyDoctorOnly)]
    public async Task<IActionResult> GetUnviewedCount()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);
        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
        if (doctor == null) return Ok(new { count = 0 });

        var count = await _holterService.GetUnviewedHolterCountByDoctorAsync(doctor.Id);
        return Ok(new { count });
    }

    [HttpPut("mark-viewed")]
    [Authorize(Policy = RoleConstants.PolicyDoctorOnly)]
    public async Task<IActionResult> MarkViewed()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);
        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
        if (doctor == null) return NotFound(new { message = "Shifokor topilmadi" });

        await _holterService.MarkHolterViewedByDoctorAsync(doctor.Id);
        return Ok(new { success = true });
    }

    // ── Hamshira bo'yicha endpointlar ─────────────────────────────────────────

    [HttpGet("get-by-nurse")]
    [Authorize(Policy = RoleConstants.PolicyNurseOnly)]
    public async Task<IActionResult> GetByNurse(
        int page = 1, int pageSize = 10,
        string? search = null, int? status = null,
        DateTime? dateFrom = null, DateTime? dateTo = null,
        int? automaticAnalysisBool = null,
        bool? hasDiagnosis = null)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);
        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
        if (doctor == null) return NotFound(new { message = "Hamshira topilmadi" });

        var results = await _holterService.GetHolterAnalysesByNurseAsync(
            doctor.Id, page, pageSize, search, status, dateFrom, dateTo, automaticAnalysisBool, hasDiagnosis);
        return Ok(results);
    }


    /// <summary>
    /// Noto'g'ri yuklangan faylni almashtirib, tahlilni qayta ishga tushirish.
    /// POST api/holter-analyses/replace-file   (multipart: id, file, age, gender, lang)
    /// Yangi tahlil yaratilmaydi — mavjud yozuvning fayli almashtiriladi.
    /// </summary>
    [HttpPost("replace-file")]
    [EnableRateLimiting("ai-analysis")]
    public async Task<IActionResult> ReplaceFile()
    {
        var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");

        // Klinika izolyatsiyasi: faqat o'z klinikasining tahlilini almashtirish mumkin
        if (!int.TryParse(Request.Form["id"].ToString(), out var analysisId))
            return BadRequest(new { message = "id ko'rsatilmagan" });

        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user?.ClinicId == null) return Unauthorized(new { message = "Klinika aniqlanmadi" });

        var belongsToClinic = await _context.HolterAnalyses
            .AnyAsync(a => a.Id == analysisId && a.ClinicId == user.ClinicId);
        if (!belongsToClinic)
            return NotFound(new { message = "Tahlil topilmadi yoki ruxsat yo'q" });

        try
        {
            var response = await _proxyService.ProxyMultipartAsync("/holter/replace-file", Request, token);
            var result = await ProxyHttpResponseMapper.ToContentResultAsync(response);
            if (response.IsSuccessStatusCode && !string.IsNullOrWhiteSpace(result.Content))
                TrackAnalysisProgress(result.Content, "holter", "holter_id");
            return result;
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = "AI tahlil xizmati bilan bog'lanib bo'lmadi", error = ex.Message });
        }
    }


    /// <summary>
    /// Xatolik bilan tugagan tahlilni MAVJUD fayl bilan qayta ishga tushiradi.
    /// POST api/holter-analyses/retry   (multipart: id, age, gender, lang)
    ///
    /// Ilgari `status = -1` yozuvida foydalanuvchida hech qanday harakat
    /// imkoniyati yo'q edi — yozuvni o'chirib, bemor va shifokorlarni
    /// qaytadan kiritishdan boshqa yo'l yo'q edi (T-044).
    /// </summary>
    [HttpPost("retry")]
    [EnableRateLimiting("ai-analysis")]
    public async Task<IActionResult> Retry()
    {
        var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");

        if (!int.TryParse(Request.Form["id"].ToString(), out var analysisId))
            return BadRequest(new { message = "id ko'rsatilmagan" });

        var clinicId = await _currentUser.GetClinicIdAsync();
        if (clinicId == null) return Unauthorized(new { message = "Klinika aniqlanmadi" });

        var belongsToClinic = await _context.HolterAnalyses
            .AnyAsync(a => a.Id == analysisId && a.ClinicId == clinicId);
        if (!belongsToClinic)
            return NotFound(new { message = "Tahlil topilmadi yoki ruxsat yo'q" });

        try
        {
            var response = await _proxyService.ProxyMultipartAsync("/holter/retry", Request, token);
            var result = await ProxyHttpResponseMapper.ToContentResultAsync(response);
            if (response.IsSuccessStatusCode && !string.IsNullOrWhiteSpace(result.Content))
                TrackAnalysisProgress(result.Content, "holter", "holter_id");
            return result;
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = "AI tahlil xizmati bilan bog'lanib bo'lmadi", error = ex.Message });
        }
    }

}
