using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services;

/// <summary>
/// "Muzlab qolgan" tahlillarni topib xatolik holatiga o'tkazadi.
///
/// Muammo (T-044): tranzaksiya yarim qolganda yoki AI jarayoni qulaganda
/// yozuv `status = 0` ("kutmoqda") yoki `status = 1` ("AI tahlil qilmoqda")
/// holatida **abadiy** qolib ketardi. Ro'yxatda u oddiy "Yuklanmoqda"
/// yozuvi bo'lib turadi: hech qachon tugamaydi, foydalanuvchida esa hech
/// qanday harakat imkoniyati yo'q edi.
///
/// Endi belgilangan muddatdan oshgan yozuvlar `status = -1` (xatolik) ga
/// o'tkaziladi va ular uchun ro'yxatda "Qayta urinish" tugmasi paydo
/// bo'ladi.
///
/// Yozuv o'chirilmaydi va fayli saqlanadi — faqat holati aniqlashtiriladi.
/// </summary>
public class StuckAnalysisWatchdog : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<StuckAnalysisWatchdog> _logger;
    private readonly TimeSpan _timeout;
    private readonly TimeSpan _interval;

    public StuckAnalysisWatchdog(
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<StuckAnalysisWatchdog> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;

        // AI tahlili odatda 1-3 daqiqa oladi; 30 daqiqa keng zaxira.
        _timeout = TimeSpan.FromMinutes(config.GetValue("Analysis:StuckTimeoutMinutes", 30));
        _interval = TimeSpan.FromMinutes(config.GetValue("Analysis:WatchdogIntervalMinutes", 5));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "Muzlab qolgan tahlillar kuzatuvchisi ishga tushdi: har {Interval} daqiqada, chegara {Timeout} daqiqa",
            _interval.TotalMinutes, _timeout.TotalMinutes);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SweepAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                // Kuzatuvchi qulasa ham ilova ishlashda davom etishi kerak
                _logger.LogError(ex, "Muzlab qolgan tahlillarni tekshirishda xato");
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

    private async Task SweepAsync(CancellationToken token)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<MedDataDB>();

        var cutoff = DateTime.UtcNow - _timeout;
        var total = 0;

        total += await MarkStuckAsync(context, context.ECGAnalyse, cutoff, "ecg", token);
        total += await MarkStuckAsync(context, context.LabAnalyse, cutoff, "lab", token);
        total += await MarkStuckAsync(context, context.HolterAnalyses, cutoff, "holter", token);
        total += await MarkStuckAsync(context, context.SmadAnalyses, cutoff, "smad", token);

        if (total > 0)
        {
            await context.SaveChangesAsync(token);
            _logger.LogWarning("{Count} ta muzlab qolgan tahlil xatolik holatiga o'tkazildi", total);
        }
    }

    /// <summary>
    /// Bir jadvaldagi eskirgan "kutmoqda"/"jarayonda" yozuvlarni belgilaydi.
    /// </summary>
    private async Task<int> MarkStuckAsync<T>(
        MedDataDB context, DbSet<T> set, DateTime cutoff, string kind, CancellationToken token)
        where T : class, IStuckDetectable
    {
        var stuck = await set
            .Where(x => (x.Status == 0 || x.Status == 1) && x.CreatedAt != null && x.CreatedAt < cutoff)
            .ToListAsync(token);

        foreach (var item in stuck)
        {
            item.Status = -1;

            // Foydalanuvchi sababni ko'rishi uchun — `ai_errors` bilan bir xil format
            if (string.IsNullOrWhiteSpace(item.AIAnswerData))
            {
                item.AIAnswerData =
                    "{\"xato\":\"tahlil_muzlab_qoldi\"," +
                    "\"xabar\":\"Tahlil belgilangan vaqt ichida tugamadi. " +
                    "Qayta urinib ko'ring yoki faylni almashtiring.\"}";
            }

            _logger.LogWarning(
                "Muzlab qolgan tahlil: {Kind}#{Id}, yaratilgan {CreatedAt:u}",
                kind, item.Id, item.CreatedAt);
        }

        return stuck.Count;
    }
}

/// <summary>
/// Kuzatuvchi uchun umumiy shartnoma — to'rttala tahlil turi ham
/// shu maydonlarga ega.
/// </summary>
public interface IStuckDetectable
{
    int Id { get; }
    int? Status { get; set; }
    DateTime? CreatedAt { get; }
    string? AIAnswerData { get; set; }
}
