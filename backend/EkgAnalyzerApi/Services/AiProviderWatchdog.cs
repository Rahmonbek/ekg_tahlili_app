using System.Text.Json;

namespace EkgAnalyzerApi.Services;

/// <summary>
/// Sun'iy intellekt provayderi ishlamay qolganda administratorga xabar
/// beradi (T-028).
///
/// Nima uchun kerak: auditda `OPENAI_API_KEY` yaroqsiz ekani va yuborilgan
/// to'rt tahlilning to'rttasi ham muvaffaqiyatsiz tugagani aniqlandi.
/// Tizim bu haqda hech qanday signal bermasdi — har bir tahlil jimgina
/// <c>status = -1</c> ga o'tardi. Klinika bir necha kun davomida hech narsa
/// ishlamayotganini bilmasligi mumkin edi.
///
/// Python xizmati endi <c>/api/health</c> da kalitning haqiqiy holatini
/// beradi. Bu xizmat o'sha endpointni davriy so'raydi va holat
/// o'zgarganda — buzilganda ham, tiklanganda ham — bir marta xat yuboradi.
/// "Bir marta": har tekshiruvda xat yuborish pochta qutisini to'ldiradi va
/// ogohlantirish qiymatini yo'qotadi.
/// </summary>
public class AiProviderWatchdog : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHttpClientFactory _httpFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<AiProviderWatchdog> _logger;

    /// <summary>Oxirgi ma'lum holat. <c>null</c> — hali tekshirilmagan.</summary>
    private bool? _lastHealthy;

    public AiProviderWatchdog(
        IServiceScopeFactory scopeFactory,
        IHttpClientFactory httpFactory,
        IConfiguration config,
        ILogger<AiProviderWatchdog> logger)
    {
        _scopeFactory = scopeFactory;
        _httpFactory = httpFactory;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_config.GetValue("AiWatchdog:Enabled", true))
        {
            _logger.LogInformation(
                "AI provayder kuzatuvchisi o'chirilgan (AiWatchdog:Enabled = false)");
            return;
        }

        var interval = TimeSpan.FromMinutes(
            Math.Max(1, _config.GetValue("AiWatchdog:IntervalMinutes", 10)));

        // Ilova ko'tarilishi bilan darhol tekshirmaymiz: Python xizmati
        // hali ishga tushayotgan bo'lishi mumkin va bu yolg'on signal berardi
        await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                // Kuzatuvchining o'zi xato tufayli to'xtab qolmasligi kerak
                _logger.LogError(ex, "AI provayder kuzatuvchisida kutilmagan xatolik");
            }

            try
            {
                await Task.Delay(interval, stoppingToken);
            }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task CheckOnceAsync(CancellationToken ct)
    {
        var (healthy, detail) = await ProbeAsync(ct);

        if (_lastHealthy == healthy)
            return;                      // holat o'zgarmadi — xat yuborilmaydi

        var previous = _lastHealthy;
        _lastHealthy = healthy;

        if (previous == null && healthy)
            return;                      // birinchi tekshiruv va hammasi joyida

        if (!healthy)
        {
            _logger.LogCritical(
                "AI provayderi ishlamayapti ({Detail}). Barcha yangi tahlillar "
                + "xatolik bilan tugaydi.", detail);
            await NotifyAsync(
                "NMED: AI xizmati ishlamayapti",
                $"Sun'iy intellekt provayderi javob bermayapti.\n\n"
                + $"Sabab: {detail}\n"
                + $"Vaqt: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC\n\n"
                + "Yangi tahlillar xatolik bilan tugaydi. API kalitini va "
                + "hisob balansini tekshiring.");
        }
        else
        {
            _logger.LogWarning("AI provayderi tiklandi");
            await NotifyAsync(
                "NMED: AI xizmati tiklandi",
                $"Sun'iy intellekt provayderi yana ishlayapti.\n"
                + $"Vaqt: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");
        }
    }

    /// <summary>Python xizmatining salomatlik endpointini so'raydi.</summary>
    private async Task<(bool healthy, string detail)> ProbeAsync(CancellationToken ct)
    {
        var baseUrl = (_config["PythonApi:BaseUrl"] ?? "http://127.0.0.1:8000").TrimEnd('/');

        try
        {
            var client = _httpFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(20);
            var response = await client.GetAsync($"{baseUrl}/api/health", ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("checks", out var checks)
                && checks.TryGetProperty("openai", out var openai))
            {
                var ok = openai.TryGetProperty("ok", out var okProp) && okProp.GetBoolean();
                var key = openai.TryGetProperty("key", out var keyProp)
                    ? keyProp.GetString() : null;
                return (ok, key ?? "unknown");
            }

            // Endpoint javob berdi, lekin kutilgan bo'lim yo'q — bu xizmat
            // ishlamayapti degani emas, shuning uchun holat o'zgartirilmaydi
            return (_lastHealthy ?? true, "unexpected_response");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AI salomatlik so'rovi bajarilmadi");
            return (false, "unreachable");
        }
    }

    private async Task NotifyAsync(string subject, string body)
    {
        var to = _config["Smtp:PlatformAdminEmail"];
        if (string.IsNullOrWhiteSpace(to))
        {
            _logger.LogWarning(
                "Smtp:PlatformAdminEmail sozlanmagan — ogohlantirish faqat "
                + "log'da qoldi: {Subject}", subject);
            return;
        }

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var email = scope.ServiceProvider.GetRequiredService<IEmailService>();
            await email.SendPlainAsync(to, subject, body);
        }
        catch (Exception ex)
        {
            // Xat ketmasa ham kuzatuvchi ishlashda davom etadi — CRITICAL
            // log allaqachon yozilgan
            _logger.LogError(ex, "Ogohlantirish xati yuborilmadi");
        }
    }
}
