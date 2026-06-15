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
[Route("api/smad-analyses")]
[Authorize]
public class SmadAnalyseController : ControllerBase
{
    private readonly MedDataDB _context;
    private readonly SmadAnalyseService _smadService;
    private readonly PythonApiProxyService _proxyService;
    private readonly AnalysisProgressTracker _progressTracker;

    public SmadAnalyseController(MedDataDB context, SmadAnalyseService smadService, PythonApiProxyService proxyService, AnalysisProgressTracker progressTracker)
    {
        _context = context;
        _smadService = smadService;
        _proxyService = proxyService;
        _progressTracker = progressTracker;
    }


    [HttpGet("get-smad-analyses-by-patcient-id")]
    public async Task<IActionResult> GetSmadAnalysesByPatientId(int id, int page = 1)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var results = await _smadService.GetSmadAnalysesByPatientIdAsync(id, page, 5);

        return Ok(results);
    }

    /// <summary>
    /// SMAD faylni tahlil qilish (Python API ga proxy)
    /// POST api/smad-analyses/analyze
    /// </summary>
    [HttpPost("analyze")]
    [EnableRateLimiting("ai-analysis")]
    public async Task<IActionResult> Analyze()
    {
        var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
        try
        {
            var response = await _proxyService.ProxyMultipartAsync("/smad/analyze", Request, token);
            var result = await ProxyHttpResponseMapper.ToContentResultAsync(response);
            if (response.IsSuccessStatusCode && !string.IsNullOrWhiteSpace(result.Content))
                TrackAnalysisProgress(result.Content, "smad", "smad_id");
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

        var results = await _smadService.GetSmadAnalysesByClinicIdAsync(
            userClinicId, page, pageSize, search, status, dateFrom, dateTo, automaticAnalysisBool, hasDiagnosis);

        return Ok(results);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _smadService.GetSmadAnalyseByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    // ── Shifokor bo'yicha endpointlar ─────────────────────────────────────────

    [HttpGet("get-by-doctor")]
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

        var results = await _smadService.GetSmadAnalysesByDoctorAsync(
            doctor.Id, page, pageSize, search, status, dateFrom, dateTo, automaticAnalysisBool, hasDiagnosis);
        return Ok(results);
    }

    [HttpGet("unviewed-count")]
    public async Task<IActionResult> GetUnviewedCount()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);
        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
        if (doctor == null) return Ok(new { count = 0 });

        var count = await _smadService.GetUnviewedSmadCountByDoctorAsync(doctor.Id);
        return Ok(new { count });
    }

    [HttpPut("mark-viewed")]
    public async Task<IActionResult> MarkViewed()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);
        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
        if (doctor == null) return NotFound(new { message = "Shifokor topilmadi" });

        await _smadService.MarkSmadViewedByDoctorAsync(doctor.Id);
        return Ok(new { success = true });
    }

    // ── Hamshira bo'yicha endpointlar ─────────────────────────────────────────

    [HttpGet("get-by-nurse")]
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

        var results = await _smadService.GetSmadAnalysesByNurseAsync(
            doctor.Id, page, pageSize, search, status, dateFrom, dateTo, automaticAnalysisBool, hasDiagnosis);
        return Ok(results);
    }

}
