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
            if (DateTime.UtcNow - item.CreatedAt > TimeSpan.FromMinutes(30))
            {
                _pending.TryRemove(pair.Key, out _);
                continue;
            }

            var status = await GetStatusAsync(db, item.Type, item.AnalysisId, ct);
            if (status is null || status == "loading") continue;

            await _hub.Clients.Group(UserGroup(item.UserId)).SendAsync("AnalysisProgressUpdated", new
            {
                type = item.Type,
                analysisId = item.AnalysisId,
                status,
                listPath = ListPath(item.Type),
                label = Label(item.Type)
            }, ct);

            _pending.TryRemove(pair.Key, out _);
        }
    }

    private static async Task<string?> GetStatusAsync(MedDataDB db, string type, int id, CancellationToken ct)
    {
        return type switch
        {
            "ecg" => ToProgress(await db.ECGAnalyse.Where(x => x.Id == id).Select(x => (int?)x.Status).FirstOrDefaultAsync(ct)),
            "smad" => ToProgress(await db.SmadAnalyses.Where(x => x.Id == id).Select(x => (int?)x.Status).FirstOrDefaultAsync(ct)),
            "holter" => ToProgress(await db.HolterAnalyses.Where(x => x.Id == id).Select(x => (int?)x.Status).FirstOrDefaultAsync(ct)),
            "lab" => ToProgress(await db.LabAnalyse.Where(x => x.Id == id).Select(x => (int?)x.Status).FirstOrDefaultAsync(ct)),
            "parasitology" or "para" => ToProgress(await db.ParasitologyAnalyses.Where(x => x.Id == id).Select(x => x.AnalysisStatus).FirstOrDefaultAsync(ct)),
            _ => null
        };
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

    private sealed record PendingAnalysis(int UserId, string Type, int AnalysisId, DateTime CreatedAt);
}
