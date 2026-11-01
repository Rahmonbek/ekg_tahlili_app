using System.Security.Claims;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Services.LabRules;
using EkgAnalyzerApi.Services.LabStatistics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Klinika laboratoriya statistikasi va xavf signallari — faqat klinika
/// admini (2) va direktori (3), faqat O'Z klinikasi ma'lumoti.
/// </summary>
[ApiController]
[Route("api/lab-statistics")]
[Authorize]
public class LabStatisticsController : ControllerBase
{
    private readonly LabStatisticsService _stats;
    private readonly LabSignalsService _signals;
    private readonly LabRuleEngine _engine;
    private readonly MedDataDB _db;
    private readonly ILogger<LabStatisticsController> _logger;

    public LabStatisticsController(LabStatisticsService stats, LabSignalsService signals, LabRuleEngine engine,
        MedDataDB db, ILogger<LabStatisticsController> logger)
    {
        _stats = stats;
        _signals = signals;
        _engine = engine;
        _db = db;
        _logger = logger;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary([FromQuery] LabStatsFilter f) =>
        await WithClinic(c => _stats.GetSummaryAsync(c, f));

    [HttpGet("timeline")]
    public async Task<IActionResult> Timeline([FromQuery] LabStatsFilter f, [FromQuery] string bucket = "month") =>
        await WithClinic(c => _stats.GetTimelineAsync(c, f, bucket));

    [HttpGet("indicators")]
    public async Task<IActionResult> Indicators([FromQuery] LabStatsFilter f) =>
        await WithClinic(c => _stats.GetIndicatorsAsync(c, f));

    [HttpGet("indicator/{column}")]
    public async Task<IActionResult> Indicator(string column, [FromQuery] LabStatsFilter f) =>
        await WithClinic(async c => await _stats.GetIndicatorDetailAsync(c, f, column) ?? new { });

    [HttpGet("doctors")]
    public async Task<IActionResult> Doctors([FromQuery] LabStatsFilter f) =>
        await WithClinic(c => _stats.GetDoctorsAsync(c, f));

    [HttpGet("doctor-options")]
    public async Task<IActionResult> DoctorOptions() =>
        await WithClinic(c => _stats.GetDoctorOptionsAsync(c));

    // ── Xavf signallari ────────────────────────────────────────────────────

    [HttpGet("signals/summary")]
    public async Task<IActionResult> SignalsSummary() =>
        await WithClinic(c => _signals.GetSummaryAsync(c));

    [HttpGet("signals")]
    public async Task<IActionResult> Signals(
        [FromQuery] string? rule, [FromQuery] string? status, [FromQuery] int? severity,
        [FromQuery] string? review, [FromQuery] string? search, [FromQuery] int? patientId,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20) =>
        await WithClinic(c => _signals.GetListAsync(c, rule, status, severity, review, search, patientId, page, pageSize));

    public sealed class ReviewRequest
    {
        /// <summary>confirmed | rejected | pending</summary>
        public string Decision { get; set; } = "";
        public string? Note { get; set; }
    }

    [HttpPost("signals/{id:long}/review")]
    public async Task<IActionResult> Review(long id, [FromBody] ReviewRequest body)
    {
        var (clinicId, userId, error) = await ResolveAsync();
        if (error != null) return error;
        var ok = await _signals.ReviewAsync(clinicId, id, userId, body.Decision, body.Note);
        return ok ? Ok(new { ok = true }) : NotFound(new { message = "signal_not_found" });
    }

    /// <summary>Klinikaning barcha bemorlarini qayta baholashga belgilaydi.</summary>
    [HttpPost("signals/recompute")]
    public async Task<IActionResult> Recompute()
    {
        var (clinicId, _, error) = await ResolveAsync();
        if (error != null) return error;
        var n = await _engine.ResetClinicAsync(clinicId);
        _logger.LogInformation("Lab xavf signallari qayta baholashga belgilandi: clinic={Clinic}, {N} bemor", clinicId, n);
        return Ok(new { queued = n });
    }

    // ── Yordamchilar ───────────────────────────────────────────────────────

    private async Task<IActionResult> WithClinic(Func<int, Task<object>> action)
    {
        var (clinicId, _, error) = await ResolveAsync();
        if (error != null) return error;
        return Ok(await action(clinicId));
    }

    private async Task<(int ClinicId, int UserId, IActionResult? Error)> ResolveAsync()
    {
        var idClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (idClaim == null || !int.TryParse(idClaim.Value, out var userId))
            return (0, 0, Unauthorized(new { message = "Token invalid" }));
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return (0, 0, Unauthorized(new { message = "Token invalid" }));
        if (user.RoleId is not (2 or 3))
            return (0, 0, StatusCode(403, new { message = "forbidden" }));
        if (user.ClinicId is not { } clinicId)
            return (0, 0, BadRequest(new { message = "clinic_not_found" }));
        return (clinicId, userId, null);
    }
}
