using System.Security.Claims;
using System.Text.Json;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Services;
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
    private readonly PdfReportService _pdf;
    private readonly IConfiguration _config;
    private readonly ILogger<LabStatisticsController> _logger;

    public LabStatisticsController(LabStatisticsService stats, LabSignalsService signals, LabRuleEngine engine,
        MedDataDB db, PdfReportService pdf, IConfiguration config, ILogger<LabStatisticsController> logger)
    {
        _pdf = pdf;
        _config = config;
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

    /// <summary>
    /// Sahifadagi statistikaning PDF nusxasi — xuddi shu filtrlar bilan
    /// (umumiy raqamlar, oylar, tarkib, guruhlar, ko'rsatkichlar, xodimlar,
    /// xavf signallari). GET api/lab-statistics/pdf?lang=uz&amp;from=…
    /// </summary>
    [HttpGet("pdf")]
    public async Task<IActionResult> Pdf([FromQuery] LabStatsFilter f, [FromQuery] string lang = "uz")
    {
        var (clinicId, _, error) = await ResolveAsync();
        if (error != null) return error;

        static JsonElement J(object o) => JsonSerializer.SerializeToElement(o);
        var indicators = J(await _stats.GetIndicatorsAsync(clinicId, f));
        var data = new PdfReportService.LabStatsReportData
        {
            Summary = J(await _stats.GetSummaryAsync(clinicId, f)),
            Timeline = J(await _stats.GetTimelineAsync(clinicId, f, "month")),
            Indicators = indicators,
            Doctors = J(await _stats.GetDoctorsAsync(clinicId, f)),
            Signals = J(await _signals.GetSummaryAsync(clinicId)),
            Filters = await DescribeFiltersAsync(clinicId, f, lang, indicators),
        };

        try
        {
            var bytes = _pdf.GenerateLabStatisticsReport(data, lang);
            return File(bytes, "application/pdf", $"lab_statistika_{AppTime.LocalNow(_config):yyyy-MM-dd}.pdf");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lab statistikasi PDF yaratilmadi: clinic={Clinic}", clinicId);
            return StatusCode(500, new { message = "pdf_failed" });
        }
    }

    /// <summary>Hisobot boshidagi «parametrlar» paneli — sahifadagi filtrlar tanlangan tilda.</summary>
    private async Task<List<(string, string)>> DescribeFiltersAsync(int clinicId, LabStatsFilter f, string lang, JsonElement indicators)
    {
        var lg = (lang ?? "uz").ToLowerInvariant();
        string L(string uz, string ru, string en) => lg == "ru" ? ru : lg == "en" ? en : uz;
        var all = L("Barchasi", "Все", "All");

        var period = f.From == null && f.To == null
            ? L("Butun davr", "Весь период", "All time")
            : $"{f.From?.ToString("dd.MM.yyyy") ?? "…"} — {f.To?.ToString("dd.MM.yyyy") ?? "…"}";

        var doctor = all;
        if (f.DoctorId is { } did)
        {
            var opts = JsonSerializer.SerializeToElement(await _stats.GetDoctorOptionsAsync(clinicId));
            foreach (var o in opts.EnumerateArray())
                if (o.TryGetProperty("id", out var id) && id.GetInt32() == did && o.TryGetProperty("name", out var n))
                    doctor = n.GetString() ?? all;
        }

        var gender = f.Gender switch
        {
            "male" => L("Erkak", "Мужской", "Male"),
            "female" => L("Ayol", "Женский", "Female"),
            "unknown" => L("Noma'lum", "Неизвестно", "Unknown"),
            _ => all,
        };
        var age = f.AgeFrom == null && f.AgeTo == null ? all : $"{f.AgeFrom?.ToString() ?? "…"} — {f.AgeTo?.ToString() ?? "…"}";
        var category = f.Category != null && PdfReportService.LabCategoryNames.TryGetValue(f.Category, out var cn)
            ? (lg == "ru" ? cn.ru : lg == "en" ? cn.en : cn.uz) : all;
        var indicator = all;
        if (!string.IsNullOrEmpty(f.Indicator))
        {
            indicator = f.Indicator;
            foreach (var r in indicators.EnumerateArray())
                if (r.TryGetProperty("column_name", out var col) && col.GetString() == f.Indicator
                    && r.TryGetProperty($"name_{lg}", out var nm) && nm.ValueKind == JsonValueKind.String)
                    indicator = nm.GetString()!;
        }

        return new List<(string, string)>
        {
            (L("Davr (tahlil sanasi)", "Период (дата анализа)", "Period (analysis date)"), period),
            (L("Shifokor", "Врач", "Doctor"), doctor),
            (L("Jinsi", "Пол", "Sex"), gender),
            (L("Yoshi", "Возраст", "Age"), age),
            (L("Tahlil guruhi", "Группа анализов", "Analysis group"), category),
            (L("Ko'rsatkich", "Показатель", "Indicator"), indicator),
            (L("Qiymatlar", "Значения", "Values"), f.OnlyAbnormal
                ? L("Faqat me'yordan tashqari", "Только вне нормы", "Only out of range") : all),
        };
    }

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
