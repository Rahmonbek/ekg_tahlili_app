using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services;

/// <summary>
/// AVTOMATIK kompleks AI xulosasi.
///
/// Bemorga yangi tahlil (EKG, Holter, SMAD, Laboratoriya) yuklanib, AI uni
/// tahlil qilib bo'lgach, tizim bemorning BARCHA tayyor tahlillarini
/// jamlab kompleks tahlil yaratadi va AI ga yuboradi. Misol:
///
///   1-kun: EKG yuklandi → AI natija berdi (bemorda bitta tahlil — kompleks yo'q)
///   4-kun: Laboratoriya yuklandi → natijadan keyin: kompleks = EKG + Lab
///   9-kun: SMAD yuklandi → natijadan keyin: kompleks = EKG + Lab + SMAD
///
/// Qo'lda yaratish (bemor kartasi / `/combined-analyzer`) o'zgarishsiz
/// qoladi; avtomatik yaratilgani `is_auto = true` bilan belgilanadi.
///
/// Qanday aniqlanadi (holatsiz — qayta ishga tushganda ham to'g'ri ishlaydi):
///  * NOMZOD — AI natijasi tayyor (`status = 2`), hali HECH BIR kompleks
///    xulosaga kirmagan va oxirgi <see cref="_lookback"/> ichida tugagan tahlil;
///  * u kamida <see cref="_settle"/> oldin tugagan bo'lishi va bemorning boshqa
///    tahlili hali ishlanayotgan bo'lmasligi kerak — bir vaqtda yuklangan
///    EKG va Laboratoriya ikkita emas, BITTA kompleks xulosa beradi;
///  * kompleksga bemorning eng yangi <see cref="CombinedAnalysisService.MaxItems"/>
///    ta yaroqli tahlili kiradi (nomzodlar albatta).
///
/// Xarajatdan himoya:
///  * <see cref="_lookback"/> — birinchi ishga tushganda butun tarix uchun
///    AI chaqirilmaydi, faqat yaqinda tugagan tahlillar uchun;
///  * <see cref="_maxPerCycle"/> — bir siklda cheklangan miqdordagi bemor;
///  * aynan shu to'plam uchun xulosa bo'lsa, qayta yaratilmaydi
///    (<see cref="CombinedAnalysisService"/> dagi takror tekshiruvi);
///  * AI "tahlil qila olmadi" degan natijalar kompleksga qo'shilmaydi.
///
/// Sozlamalar: <c>AutoCombined:*</c> (appsettings).
/// </summary>
public class AutoCombinedAnalysisWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly AnalysisProgressTracker _tracker;
    private readonly ILogger<AutoCombinedAnalysisWorker> _logger;

    private readonly bool _enabled;
    private readonly TimeSpan _interval;
    private readonly TimeSpan _settle;
    private readonly TimeSpan _lookback;
    private readonly TimeSpan _inProgressWindow;
    private readonly int _maxPerCycle;

    public AutoCombinedAnalysisWorker(
        IServiceScopeFactory scopeFactory,
        AnalysisProgressTracker tracker,
        IConfiguration config,
        ILogger<AutoCombinedAnalysisWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _tracker = tracker;
        _logger = logger;
        _enabled = config.GetValue("AutoCombined:Enabled", true);
        _interval = TimeSpan.FromSeconds(Math.Max(15, config.GetValue("AutoCombined:IntervalSeconds", 60)));
        _settle = TimeSpan.FromMinutes(Math.Max(0, config.GetValue("AutoCombined:SettleMinutes", 3)));
        _lookback = TimeSpan.FromHours(Math.Max(1, config.GetValue("AutoCombined:LookbackHours", 24)));
        _maxPerCycle = Math.Max(1, config.GetValue("AutoCombined:MaxPerCycle", 5));
        // "Hali ishlanmoqda" deb hisoblanadigan muddat — muzlagan tahlil
        // (StuckAnalysisWatchdog chegarasi) bemorni abadiy to'xtatib qo'ymasin
        _inProgressWindow = TimeSpan.FromMinutes(config.GetValue("Analysis:StuckTimeoutMinutes", 30));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_enabled)
        {
            _logger.LogInformation("Avtomatik kompleks tahlil o'chirilgan (AutoCombined:Enabled = false)");
            return;
        }

        _logger.LogInformation(
            "Avtomatik kompleks tahlil ishga tushdi: har {Interval} s, kutish {Settle} daq, oyna {Lookback} soat",
            _interval.TotalSeconds, _settle.TotalMinutes, _lookback.TotalHours);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunCycleAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // Servis qulasa ham ilova ishlashda davom etishi kerak
                _logger.LogError(ex, "Avtomatik kompleks tahlil siklida xato");
            }

            try
            {
                await Task.Delay(_interval, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }
        }
    }

    /// <summary>Bitta tahlilning kompleks uchun kerakli ma'lumotlari.</summary>
    private sealed record Src(
        string Type, int Id, int PatientId, int Status, DateTime? Finished, DateTime? Date,
        string? Ai, int DoctorId, int? ClinicId, string? Lang);

    internal async Task RunCycleAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<MedDataDB>();

        var now = DateTime.UtcNow;
        var candidates = await LoadCandidatesAsync(context, now - _lookback, now - _settle, ct);
        if (candidates.Count == 0) return;

        var patients = candidates
            .GroupBy(c => c.PatientId)
            .OrderBy(g => g.Min(c => c.Finished))
            .Take(_maxPerCycle)
            .ToList();

        foreach (var group in patients)
        {
            ct.ThrowIfCancellationRequested();
            await ProcessPatientAsync(scope.ServiceProvider, context, group.Key, group.ToList(), now, ct);
        }
    }

    private async Task ProcessPatientAsync(
        IServiceProvider services, MedDataDB context, int patientId, List<Src> triggers,
        DateTime now, CancellationToken ct)
    {
        // Bemorning boshqa tahlili hali ishlanayotgan bo'lsa — kutamiz:
        // u tugagach hammasi BITTA kompleks xulosaga tushadi
        if (await HasInProgressAsync(context, patientId, now - _inProgressWindow, ct))
        {
            _logger.LogDebug("Avto-kompleks: bemor #{PatientId} da tahlil hali ishlanmoqda — kutiladi", patientId);
            return;
        }

        var triggerKeys = triggers.Select(t => $"{t.Type}#{t.Id}").ToHashSet();
        var usable = (await LoadPatientAnalysesAsync(context, patientId, ct))
            .Where(IsUsable)
            .OrderByDescending(s => triggerKeys.Contains($"{s.Type}#{s.Id}"))
            .ThenByDescending(s => s.Date)
            .Take(CombinedAnalysisService.MaxItems)
            .ToList();

        if (usable.Count < CombinedAnalysisService.MinItems)
        {
            // Bemorda hali bitta tahlil — kompleksning ma'nosi yo'q. Keyingi
            // tahlil kelganda bu ham unga qo'shiladi.
            return;
        }

        // Shifokor, klinika va til — eng so'nggi tugagan (tetiklagan) tahlildan
        var trigger = triggers.OrderByDescending(t => t.Finished).First();
        var clinicId = trigger.ClinicId ?? await context.Doctors
            .Where(d => d.Id == trigger.DoctorId)
            .Select(d => d.User!.ClinicId)
            .FirstOrDefaultAsync(ct);
        if (clinicId == null)
        {
            _logger.LogWarning("Avto-kompleks: bemor #{PatientId} uchun klinika aniqlanmadi", patientId);
            return;
        }

        var service = services.GetRequiredService<CombinedAnalysisService>();
        var refs = usable
            .Select(s => new CombinedAnalysisItemRefDTO { Type = s.Type, Id = s.Id })
            .ToList();
        var result = await service.CreateAutoAsync(
            patientId, refs, trigger.DoctorId, clinicId.Value, trigger.Lang, ct);

        if (result.Error != null)
        {
            _logger.LogWarning("Avto-kompleks: bemor #{PatientId} — yaratilmadi: {Error}", patientId, result.Error);
            return;
        }
        if (result.Reused)
        {
            _logger.LogInformation(
                "Avto-kompleks: bemor #{PatientId} — aynan shu to'plam uchun xulosa bor (#{Id})",
                patientId, result.Entity!.Id);
            return;
        }

        var entity = result.Entity!;
        _logger.LogInformation(
            "Avto-kompleks yaratildi: #{Id} bemor #{PatientId}, tahlillar: {Items}",
            entity.Id, patientId, string.Join(", ", usable.Select(s => $"{s.Type}#{s.Id}")));

        await DispatchAsync(services, context, entity, ct);
    }

    /// <summary>Yozuvni Python ga yuboradi; ulanib bo'lmasa xatolik holatini yozadi.</summary>
    private async Task DispatchAsync(
        IServiceProvider services, MedDataDB context, Models.CombinedAnalysis entity, CancellationToken ct)
    {
        var proxy = services.GetRequiredService<PythonApiProxyService>();
        var tokens = services.GetRequiredService<TokenService>();
        try
        {
            var response = await proxy.ProxyJsonAsync(
                "/combined/analyze",
                new { combined_id = entity.Id, lang = entity.AiLang ?? "uz", mode = entity.Mode },
                tokens.GenerateServiceToken("auto-combined"));

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                await MarkFailedAsync(context, entity, $"AI xizmati rad etdi: {(int)response.StatusCode}", ct);
                _logger.LogError("Avto-kompleks #{Id}: Python rad etdi {Code}: {Body}",
                    entity.Id, (int)response.StatusCode, body);
                return;
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            await MarkFailedAsync(context, entity, "AI tahlil xizmati bilan bog'lanib bo'lmadi", ct);
            _logger.LogError(ex, "Avto-kompleks #{Id}: AI xizmatiga ulanib bo'lmadi", entity.Id);
            return;
        }

        // Tahlilni yuklagan xodimga tayyor bo'lganda SignalR xabari boradi
        var userId = await context.Doctors
            .Where(d => d.Id == entity.CreatedDoctorId)
            .Select(d => d.UserId)
            .FirstOrDefaultAsync(ct);
        if (userId > 0) _tracker.Track(userId, "combined", entity.Id);
    }

    private static async Task MarkFailedAsync(
        MedDataDB context, Models.CombinedAnalysis entity, string message, CancellationToken ct)
    {
        entity.Status = -1;
        entity.AIAnswerData = System.Text.Json.JsonSerializer.Serialize(new
        {
            xato = "ai_xizmati_ishlamadi",
            xabar = message,
            qayta_urinish_mumkin = true,
        });
        entity.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync(ct);
    }

    /// <summary>
    /// AI natijasi kompleks uchun yaroqlimi: jiddiylik darajasi aniq
    /// (1..3). "Tahlil qila olmadi" (`tahlil_imkonsiz`) natijalarda daraja
    /// `ai_result_guard` tomonidan olib tashlangan — ular kompleksga
    /// faqat shovqin qo'shardi.
    /// </summary>
    private static bool IsUsable(Src s) =>
        s.Status == 2 && AiSeverity.Parse(s.Ai) is >= 1 and <= 3;

    /// <summary>Hali hech bir kompleks xulosaga kirmagan, yaqinda tugagan tahlillar.</summary>
    private static async Task<List<Src>> LoadCandidatesAsync(
        MedDataDB c, DateTime from, DateTime until, CancellationToken ct)
    {
        var items = c.CombinedAnalysisItems;

        var ecg = await c.ECGAnalyse.AsNoTracking()
            .Where(a => a.Status == 2
                && (a.UpdatedAt ?? a.CreatedAt) >= from && (a.UpdatedAt ?? a.CreatedAt) <= until
                && !items.Any(i => i.AnalysisType == "ecg" && i.AnalysisId == a.Id))
            .Select(a => new Src("ecg", a.Id, a.PatcientId, a.Status ?? 0, a.UpdatedAt ?? a.CreatedAt,
                a.AnalysisDate ?? a.CreatedAt, a.AIAnswerData, a.CreatedDoctorId, a.ClinicId, a.AiLang))
            .ToListAsync(ct);
        var holter = await c.HolterAnalyses.AsNoTracking()
            .Where(a => a.Status == 2
                && (a.UpdatedAt ?? a.CreatedAt) >= from && (a.UpdatedAt ?? a.CreatedAt) <= until
                && !items.Any(i => i.AnalysisType == "holter" && i.AnalysisId == a.Id))
            .Select(a => new Src("holter", a.Id, a.PatcientId, a.Status ?? 0, a.UpdatedAt ?? a.CreatedAt,
                a.AnalysisDate ?? a.CreatedAt, a.AIAnswerData, a.CreatedDoctorId, a.ClinicId, a.AiLang))
            .ToListAsync(ct);
        var smad = await c.SmadAnalyses.AsNoTracking()
            .Where(a => a.Status == 2
                && (a.UpdatedAt ?? a.CreatedAt) >= from && (a.UpdatedAt ?? a.CreatedAt) <= until
                && !items.Any(i => i.AnalysisType == "smad" && i.AnalysisId == a.Id))
            .Select(a => new Src("smad", a.Id, a.PatcientId, a.Status ?? 0, a.UpdatedAt ?? a.CreatedAt,
                a.AnalysisDate ?? a.CreatedAt, a.AIAnswerData, a.CreatedDoctorId, a.ClinicId, a.AiLang))
            .ToListAsync(ct);
        var lab = await c.LabAnalyse.AsNoTracking()
            .Where(a => a.Status == 2
                && (a.UpdatedAt ?? a.CreatedAt) >= from && (a.UpdatedAt ?? a.CreatedAt) <= until
                && !items.Any(i => i.AnalysisType == "lab" && i.AnalysisId == a.Id))
            .Select(a => new Src("lab", a.Id, a.PatcientId, a.Status ?? 0, a.UpdatedAt ?? a.CreatedAt,
                a.AnalysisDate ?? a.CreatedAt, a.AIAnswerData, a.CreatedDoctorId, a.ClinicId, a.AiLang))
            .ToListAsync(ct);

        // Yaroqsiz natija (AI tahlil qila olmagan) nomzod ham bo'lmaydi
        return ecg.Concat(holter).Concat(smad).Concat(lab).Where(IsUsable).ToList();
    }

    /// <summary>Bemorning barcha tayyor tahlillari (o'chirilganlari global filtr bilan chiqmaydi).</summary>
    private static async Task<List<Src>> LoadPatientAnalysesAsync(MedDataDB c, int patientId, CancellationToken ct)
    {
        var ecg = await c.ECGAnalyse.AsNoTracking().Where(a => a.PatcientId == patientId && a.Status == 2)
            .Select(a => new Src("ecg", a.Id, a.PatcientId, a.Status ?? 0, a.UpdatedAt ?? a.CreatedAt,
                a.AnalysisDate ?? a.CreatedAt, a.AIAnswerData, a.CreatedDoctorId, a.ClinicId, a.AiLang))
            .ToListAsync(ct);
        var holter = await c.HolterAnalyses.AsNoTracking().Where(a => a.PatcientId == patientId && a.Status == 2)
            .Select(a => new Src("holter", a.Id, a.PatcientId, a.Status ?? 0, a.UpdatedAt ?? a.CreatedAt,
                a.AnalysisDate ?? a.CreatedAt, a.AIAnswerData, a.CreatedDoctorId, a.ClinicId, a.AiLang))
            .ToListAsync(ct);
        var smad = await c.SmadAnalyses.AsNoTracking().Where(a => a.PatcientId == patientId && a.Status == 2)
            .Select(a => new Src("smad", a.Id, a.PatcientId, a.Status ?? 0, a.UpdatedAt ?? a.CreatedAt,
                a.AnalysisDate ?? a.CreatedAt, a.AIAnswerData, a.CreatedDoctorId, a.ClinicId, a.AiLang))
            .ToListAsync(ct);
        var lab = await c.LabAnalyse.AsNoTracking().Where(a => a.PatcientId == patientId && a.Status == 2)
            .Select(a => new Src("lab", a.Id, a.PatcientId, a.Status ?? 0, a.UpdatedAt ?? a.CreatedAt,
                a.AnalysisDate ?? a.CreatedAt, a.AIAnswerData, a.CreatedDoctorId, a.ClinicId, a.AiLang))
            .ToListAsync(ct);
        return ecg.Concat(holter).Concat(smad).Concat(lab).ToList();
    }

    /// <summary>Bemorning hali ishlanayotgan (0/1) tahlili bormi — muzlaganlari hisobga olinmaydi.</summary>
    private static async Task<bool> HasInProgressAsync(MedDataDB c, int patientId, DateTime since, CancellationToken ct) =>
        await c.ECGAnalyse.AnyAsync(a => a.PatcientId == patientId && (a.Status == 0 || a.Status == 1) && a.CreatedAt >= since, ct)
        || await c.HolterAnalyses.AnyAsync(a => a.PatcientId == patientId && (a.Status == 0 || a.Status == 1) && a.CreatedAt >= since, ct)
        || await c.SmadAnalyses.AnyAsync(a => a.PatcientId == patientId && (a.Status == 0 || a.Status == 1) && a.CreatedAt >= since, ct)
        || await c.LabAnalyse.AnyAsync(a => a.PatcientId == patientId && (a.Status == 0 || a.Status == 1) && a.CreatedAt >= since, ct);
}
