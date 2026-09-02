using System.Collections.Concurrent;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services;

public class AnalysisProgressTracker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<AnalysisHub> _hub;
    private readonly ILogger<AnalysisProgressTracker> _logger;
    private readonly ConcurrentDictionary<string, PendingAnalysis> _pending = new();

    public AnalysisProgressTracker(
        IServiceScopeFactory scopeFactory,
        IHubContext<AnalysisHub> hub,
        ILogger<AnalysisProgressTracker> logger)
    {
        _scopeFactory = scopeFactory;
        _hub = hub;
        _logger = logger;
    }

    public static string UserGroup(int userId) => $"analysis-user-{userId}";

    public void Track(int userId, string type, int analysisId)
    {
        if (userId <= 0 || analysisId <= 0 || string.IsNullOrWhiteSpace(type)) return;

        var key = $"{userId}:{type}:{analysisId}";
        _pending[key] = new PendingAnalysis(userId, type.ToLowerInvariant(), analysisId, DateTime.UtcNow);
    }

    /// <summary>
    /// Tahlil o'chirilganda kuzatuvni DARHOL to'xtatadi (2 soniyalik pollingni
    /// kutmasdan) va tegishli foydalanuvchi(lar)ga "removed" xabarini yuboradi.
    /// O'chiruvchi yuklovchidan boshqa foydalanuvchi bo'lishi mumkin, shuning
    /// uchun tur+id bo'yicha mos barcha yozuvlar olib tashlanadi.
    /// </summary>
    public async Task RemoveByAnalysisAsync(string type, int analysisId)
    {
        if (analysisId <= 0 || string.IsNullOrWhiteSpace(type)) return;
        var t = type.ToLowerInvariant();

        foreach (var pair in _pending.ToArray())
        {
            if (pair.Value.Type != t || pair.Value.AnalysisId != analysisId) continue;
            if (!_pending.TryRemove(pair.Key, out var removed)) continue;

            await _hub.Clients.Group(UserGroup(removed.UserId)).SendAsync("AnalysisProgressUpdated", new
            {
                type = t,
                analysisId,
                status = "removed",
                listPath = ListPath(t),
                label = Label(t)
            });
        }
    }

    /// <summary>
    /// Foydalanuvchining joriy kuzatilayotgan tahlillari (yuklanayotgan va
    /// yaqinda tugagan — terminal holat 60 soniya saqlanadi). Frontend qayta
    /// ulanganda (yoki sahifa yangilanganda) shu ro'yxatni so'rab, holatni
    /// tiklaydi — shunda uzilish paytida yo'qolgan xabar ham qamraladi.
    /// </summary>
    public IReadOnlyList<object> GetPendingForUser(int userId) =>
        _pending.Values
            .Where(p => p.UserId == userId)
            .Select(p => (object)new
            {
                type = p.Type,
                analysisId = p.AnalysisId,
                status = p.Status,
                listPath = ListPath(p.Type),
                label = Label(p.Type),
            })
            .ToList();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckPendingAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Analysis progress tracker xatolik");
            }

            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
        }
    }

    private async Task CheckPendingAsync(CancellationToken ct)
    {
        if (_pending.IsEmpty) return;

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MedDataDB>();

        foreach (var pair in _pending.ToArray())
        {
            var item = pair.Value;

            // Tugagan (terminal) element yana 60 soniya saqlanadi: shu vaqt
            // ichida qayta ulangan mijoz `SyncPending` orqali holatni oladi —
            // uzilish paytida yo'qolgan push xabari o'rni to'ldiriladi.
            if (item.Status != "loading")
            {
                if (DateTime.UtcNow - (item.CompletedAt ?? item.CreatedAt) > TimeSpan.FromSeconds(60))
                    _pending.TryRemove(pair.Key, out _);
                continue;
            }

            if (DateTime.UtcNow - item.CreatedAt > TimeSpan.FromMinutes(30))
            {
                _pending.TryRemove(pair.Key, out _);
                continue;
            }

            var status = await GetStatusAsync(db, item.Type, item.AnalysisId, ct);

            // Tahlil o'chirilgan (yoki topilmadi): kuzatuvni to'xtatib, mijozga
            // "removed" xabarini yuboramiz — aks holda ko'rsatkich "tahlil
            // qilinyapti" holatida abadiy qolib ketardi.
            if (status == Gone)
            {
                _pending.TryRemove(pair.Key, out _);
                await _hub.Clients.Group(UserGroup(item.UserId)).SendAsync("AnalysisProgressUpdated", new
                {
                    type = item.Type,
                    analysisId = item.AnalysisId,
                    status = "removed",
                    listPath = ListPath(item.Type),
                    label = Label(item.Type)
                }, ct);
                continue;
            }

            if (status is null || status == "loading") continue;

            // Terminal holatga o'tkazamiz (o'chirmaymiz — 60s saqlanadi)
            item.Status = status;
            item.CompletedAt = DateTime.UtcNow;

            await _hub.Clients.Group(UserGroup(item.UserId)).SendAsync("AnalysisProgressUpdated", new
            {
                type = item.Type,
                analysisId = item.AnalysisId,
                status,
                listPath = ListPath(item.Type),
                label = Label(item.Type)
            }, ct);
        }
    }

    /// <summary>Tahlil o'chirilgan yoki topilmagan — kuzatuvni to'xtatish signali.</summary>
    private const string Gone = "gone";

    /// <summary>
    /// Tahlil holatini qaytaradi: "loading" / "done" / "error", yoki tahlil
    /// (soft-delete tufayli) TOPILMASA — <see cref="Gone"/>.
    ///
    /// Ilgari topilmagan (o'chirilgan) tahlil ham `null` qaytarardi va u
    /// "loading" bilan bir xil ishlov olardi — natijada o'chirilgan tahlil
    /// ko'rsatkichda abadiy "tahlil qilinyapti" bo'lib qolardi. Endi
    /// yo'qlik alohida aniqlanadi.
    /// </summary>
    private static async Task<string?> GetStatusAsync(MedDataDB db, string type, int id, CancellationToken ct)
    {
        switch (type)
        {
            case "ecg":
            {
                var row = await db.ECGAnalyse.Where(x => x.Id == id).Select(x => new { x.Status }).FirstOrDefaultAsync(ct);
                return row is null ? Gone : ToProgress(row.Status);
            }
            case "smad":
            {
                var row = await db.SmadAnalyses.Where(x => x.Id == id).Select(x => new { x.Status }).FirstOrDefaultAsync(ct);
                return row is null ? Gone : ToProgress(row.Status);
            }
            case "holter":
            {
                var row = await db.HolterAnalyses.Where(x => x.Id == id).Select(x => new { x.Status }).FirstOrDefaultAsync(ct);
                return row is null ? Gone : ToProgress(row.Status);
            }
            case "lab":
            {
                var row = await db.LabAnalyse.Where(x => x.Id == id).Select(x => new { x.Status }).FirstOrDefaultAsync(ct);
                return row is null ? Gone : ToProgress(row.Status);
            }
            case "parasitology":
            case "para":
            {
                var row = await db.ParasitologyAnalyses.Where(x => x.Id == id).Select(x => new { x.AnalysisStatus }).FirstOrDefaultAsync(ct);
                return row is null ? Gone : ToProgress(row.AnalysisStatus);
            }
            default:
                return null;
        }
    }

    private static string? ToProgress(int? status) => status switch
    {
        2 => "done",
        -1 => "error",
        0 or 1 => "loading",
        _ => null
    };

    private static string? ToProgress(string? status) => status switch
    {
        "analyzed" => "done",
        "failed" => "error",
        "pending" or "not_analyzed" => "loading",
        _ => null
    };

    private static string ListPath(string type) => type switch
    {
        "ecg" => "/ecg-analyses",
        "smad" => "/smad-analyses",
        "holter" => "/holter-analyses",
        "lab" => "/lab-analyses",
        "parasitology" or "para" => "/parasitology-analyses",
        _ => "/"
    };

    private static string Label(string type) => type switch
    {
        "ecg" => "EKG AI tahlil",
        "smad" => "SMAD AI tahlil",
        "holter" => "Holter AI tahlil",
        "lab" => "Laboratoriya AI tahlil",
        "parasitology" or "para" => "Parazitologiya AI tahlil",
        _ => "Tahlil"
    };

    private sealed class PendingAnalysis
    {
        public PendingAnalysis(int userId, string type, int analysisId, DateTime createdAt)
        {
            UserId = userId; Type = type; AnalysisId = analysisId; CreatedAt = createdAt;
        }

        public int UserId { get; }
        public string Type { get; }
        public int AnalysisId { get; }
        public DateTime CreatedAt { get; }
        //: "loading" | "done" | "error"
        public string Status { get; set; } = "loading";
        public DateTime? CompletedAt { get; set; }
    }
}
