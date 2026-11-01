namespace EkgAnalyzerApi.Services.LabRules;

/// <summary>
/// Xavf signallarini fonda yangilaydi: har siklda qiymatlari o'zgargan
/// (yangi tahlil, qayta tahlil, o'chirish) yoki qoidalar versiyasi eskirgan
/// bemorlarni qayta baholaydi. Birinchi ishga tushganda butun tarix
/// bosqichma-bosqich (`BatchSize` tadan) baholanadi — AI chaqirilmaydi,
/// faqat SQL va hisob.
///
/// Sozlamalar: `LabRules:Enabled` (true), `LabRules:IntervalSeconds` (60),
/// `LabRules:BatchSize` (300).
/// </summary>
public class LabRuleWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<LabRuleWorker> _logger;
    private readonly bool _enabled;
    private readonly TimeSpan _interval;
    private readonly int _batch;

    public LabRuleWorker(IServiceScopeFactory scopes, ILogger<LabRuleWorker> logger, IConfiguration config)
    {
        _scopes = scopes;
        _logger = logger;
        _enabled = config.GetValue("LabRules:Enabled", true);
        _interval = TimeSpan.FromSeconds(Math.Max(10, config.GetValue("LabRules:IntervalSeconds", 60)));
        _batch = Math.Clamp(config.GetValue("LabRules:BatchSize", 300), 10, 5000);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_enabled)
        {
            _logger.LogInformation("Laboratoriya xavf signallari o'chirilgan (LabRules:Enabled = false)");
            return;
        }
        _logger.LogInformation("Laboratoriya xavf signallari ishga tushdi: har {Sec} s, qoidalar v{Ver}",
            _interval.TotalSeconds, LabRules.Version);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunCycleAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Laboratoriya xavf signallari sikli xatosi");
            }

            try { await Task.Delay(_interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task RunCycleAsync(CancellationToken ct)
    {
        using var scope = _scopes.CreateScope();
        var engine = scope.ServiceProvider.GetRequiredService<LabRuleEngine>();

        var dirty = await engine.FindDirtyAsync(_batch);
        if (dirty.Count > 0)
        {
            var catalog = await engine.LoadCatalogAsync();
            var signals = 0;
            foreach (var (clinicId, patientId, lastId, count) in dirty)
            {
                ct.ThrowIfCancellationRequested();
                signals += await engine.EvaluateAsync(clinicId, patientId, lastId, count, catalog);
            }
            _logger.LogInformation("Lab xavf signallari: {Patients} bemor baholandi, {Signals} signal", dirty.Count, signals);
        }

        var purged = await engine.PurgeOrphansAsync();
        if (purged > 0) _logger.LogInformation("Lab xavf signallari: {N} eskirgan yozuv o'chirildi", purged);
    }
}
