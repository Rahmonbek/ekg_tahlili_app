using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

[ApiController]
[Route("api/ecg-analyses")]
[Authorize]
public class ECGAnalyseController : ControllerBase
{
    private readonly MedDataDB _context;
    private readonly ECGAnalyseService _ecgService;
    private readonly PythonApiProxyService _proxyService;
    private readonly AnalysisProgressTracker _progressTracker;

    public ECGAnalyseController(MedDataDB context, ECGAnalyseService ecgService, PythonApiProxyService proxyService, AnalysisProgressTracker progressTracker)
    {
        _context = context;
        _ecgService = ecgService;
        _proxyService = proxyService;
        _progressTracker = progressTracker;
    }


    /// <summary>
    /// Klinikaga tegishli barcha ECG tahlillari (id DESC, pagination, search, status filter)
    /// GET api/ecg-analyses/get-by-clinic?page=1&pageSize=10&search=Ali&status=2
    /// </summary>
    [HttpGet("get-by-clinic")]
    public async Task<IActionResult> GetByClinic(
        int page = 1,
        int pageSize = 10,
        string? search = null,
        int? status = null,
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        int? automaticAnalysisBool = null,
        bool? hasDiagnosis = null)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.ClinicId == null)
            return Unauthorized(new { message = "Klinika aniqlanmadi" });

        var results = await _ecgService.GetECGAnalysesByClinicIdAsync(
            user.ClinicId.Value, page, pageSize, search, status, dateFrom, dateTo, automaticAnalysisBool, hasDiagnosis);

        return Ok(results);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _ecgService.GetECGAnalyseByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpGet("get-ecg-analyses-by-patcient-id")]
    public async Task<IActionResult> GetECGAnalysesByPatientId(int id, int page = 1)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var results = await _ecgService.GetECGAnalysesByPatientIdAsync(id, page, 5);

        return Ok(results);
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

        var results = await _ecgService.GetECGAnalysesByDoctorAsync(
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

        var count = await _ecgService.GetUnviewedECGCountByDoctorAsync(doctor.Id);
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

        await _ecgService.MarkECGViewedByDoctorAsync(doctor.Id);
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

        var results = await _ecgService.GetECGAnalysesByNurseAsync(
            doctor.Id, page, pageSize, search, status, dateFrom, dateTo, automaticAnalysisBool, hasDiagnosis);
        return Ok(results);
    }

    /// <summary>
    /// EKG faylni tahlil qilish (Python API ga proxy)
    /// POST api/ecg-analyses/analyze
    /// </summary>
    [HttpPost("analyze")]
    [EnableRateLimiting("ai-analysis")]
    public async Task<IActionResult> Analyze()
    {
        var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
        try
        {
            var response = await _proxyService.ProxyMultipartAsync("/api/analyze", Request, token);
            var content = await response.Content.ReadAsStringAsync();
            TrackAnalysisProgress(content, "ecg", "ecg_id");
            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = "AI tahlil xizmati bilan bog'lanib bo'lmadi", error = ex.Message });
        }
    }

    /// <summary>
    /// EKG faylni faqat saqlash (AI tahlilsiz)
    /// POST api/ecg-analyses/analyze-save
    /// </summary>
    [HttpPost("analyze-save")]
    [EnableRateLimiting("ai-analysis")]
    public async Task<IActionResult> AnalyzeSave()
    {
        var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
        try
        {
            var response = await _proxyService.ProxyMultipartAsync("/api/analyze-save", Request, token);
            var content = await response.Content.ReadAsStringAsync();
            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = "AI tahlil xizmati bilan bog'lanib bo'lmadi", error = ex.Message });
        }
    }

    /// <summary>
    /// Saqlangan EKG ni qayta AI ga yuborish (E3 stsenariy)
    /// POST api/ecg-analyses/send-to-ai
    /// </summary>
    [HttpPost("send-to-ai")]
    [EnableRateLimiting("ai-analysis")]
    public async Task<IActionResult> SendToAi()
    {
        var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
        try
        {
            var response = await _proxyService.ProxyMultipartAsync("/api/analyze-retry", Request, token);
            var content = await response.Content.ReadAsStringAsync();
            TrackAnalysisProgress(content, "ecg", "ecg_id");
            return Content(content, "application/json");
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
}
