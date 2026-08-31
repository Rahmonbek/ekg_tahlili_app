using System.Text.Json;
using EkgAnalyzerApi.Constants;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Controllers;

/// <summary>
/// Tizim holati — Admin/Direktor uchun diagnostika.
///
/// Ilgari "AI xizmati ishlayaptimi?" degan savolga javob berish uchun
/// tahlil yuborib ko'rishdan boshqa yo'l yo'q edi. Klinika xodimi tahlil
/// natijasi kelmayotganda muammo o'zidami yoki platformadami — bilmasdi.
/// </summary>
[ApiController]
[Route("api/system")]
// Faqat SuperAdmin: xizmatlar holati platforma darajasidagi ma'lumot
[Authorize(Policy = RoleConstants.PolicySuperAdmin)]
public class SystemStatusController : ControllerBase
{
    private readonly MedDataDB _context;
    private readonly ICurrentUser _currentUser;
    private readonly IHttpClientFactory _httpFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<SystemStatusController> _logger;

    public SystemStatusController(
        MedDataDB context,
        ICurrentUser currentUser,
        IHttpClientFactory httpFactory,
        IConfiguration config,
        ILogger<SystemStatusController> logger)
    {
        _context = context;
        _currentUser = currentUser;
        _httpFactory = httpFactory;
        _config = config;
        _logger = logger;
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var clinicId = await _currentUser.GetClinicIdAsync();
        if (clinicId == null)
            return Unauthorized(new { message = "Klinika aniqlanmadi" });

        // ── 1. Baza ────────────────────────────────────────────────────
        bool dbOk;
        try
        {
            dbOk = await _context.Database.CanConnectAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Tizim holati: bazaga ulanib bo'lmadi");
            dbOk = false;
        }

        // ── 2. AI xizmati ──────────────────────────────────────────────
        var aiOk = false;
        string? aiDetail = null;
        var aiBase = _config["PythonApi:BaseUrl"] ?? "http://127.0.0.1:8000";
        try
        {
            var client = _httpFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(5);
            var resp = await client.GetAsync($"{aiBase.TrimEnd('/')}/api/health");
            aiOk = resp.IsSuccessStatusCode;
            aiDetail = await resp.Content.ReadAsStringAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Tizim holati: AI xizmatiga ulanib bo'lmadi");
            aiDetail = "unreachable";
        }

        object? aiChecks = null;
        if (!string.IsNullOrWhiteSpace(aiDetail) && aiDetail.TrimStart().StartsWith("{"))
        {
            try { aiChecks = JsonSerializer.Deserialize<JsonElement>(aiDetail); }
            catch { /* format kutilganidek emas — e'tiborsiz */ }
        }

        // ── 3. Oxirgi 24 soatdagi tahlil holati (shu klinika bo'yicha) ──
        var since = DateTime.UtcNow.AddHours(-24);

        async Task<(int total, int failed, int pending)> CountAsync<T>(IQueryable<T> q,
            Func<IQueryable<T>, IQueryable<T>> recent,
            Func<IQueryable<T>, IQueryable<T>> failedFilter,
            Func<IQueryable<T>, IQueryable<T>> pendingFilter)
        {
            var r = recent(q);
            return (await r.CountAsync(), await failedFilter(r).CountAsync(), await pendingFilter(r).CountAsync());
        }

        var ecg = await CountAsync(
            _context.ECGAnalyse.Where(x => x.ClinicId == clinicId),
            q => q.Where(x => x.CreatedAt >= since),
            q => q.Where(x => x.Status == -1),
            q => q.Where(x => x.Status == 0 || x.Status == 1));

        var lab = await CountAsync(
            _context.LabAnalyse.Where(x => x.ClinicId == clinicId),
            q => q.Where(x => x.CreatedAt >= since),
            q => q.Where(x => x.Status == -1),
            q => q.Where(x => x.Status == 0 || x.Status == 1));

        var holter = await CountAsync(
            _context.HolterAnalyses.Where(x => x.ClinicId == clinicId),
            q => q.Where(x => x.CreatedAt >= since),
            q => q.Where(x => x.Status == -1),
            q => q.Where(x => x.Status == 0 || x.Status == 1));

        var smad = await CountAsync(
            _context.SmadAnalyses.Where(x => x.ClinicId == clinicId),
            q => q.Where(x => x.CreatedAt >= since),
            q => q.Where(x => x.Status == -1),
            q => q.Where(x => x.Status == 0 || x.Status == 1));

        var total = ecg.total + lab.total + holter.total + smad.total;
        var failed = ecg.failed + lab.failed + holter.failed + smad.failed;
        var pending = ecg.pending + lab.pending + holter.pending + smad.pending;

        return Ok(new
        {
            checkedAt = DateTime.UtcNow,
            services = new
            {
                api = new { ok = true },
                database = new { ok = dbOk },
                ai = new { ok = aiOk, checks = aiChecks },
            },
            last24Hours = new
            {
                total,
                failed,
                pending,
                byType = new
                {
                    ecg = new { ecg.total, ecg.failed, ecg.pending },
                    lab = new { lab.total, lab.failed, lab.pending },
                    holter = new { holter.total, holter.failed, holter.pending },
                    smad = new { smad.total, smad.failed, smad.pending },
                },
            },
        });
    }
}
