using System.Net.Http.Headers;
using System.Text.Json;

namespace EkgAnalyzerApi.Services;

public interface ISmsService
{
    Task SendVerificationCodeAsync(string phone, string code);
}

public class EskizSmsService : ISmsService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<EskizSmsService> _logger;

    public EskizSmsService(HttpClient httpClient, IConfiguration config, ILogger<EskizSmsService> logger)
    {
        _httpClient = httpClient;
        _config = config;
        _logger = logger;
    }

    public async Task SendVerificationCodeAsync(string phone, string code)
    {
        var email = _config["Eskiz:Email"];
        var password = _config["Eskiz:Password"];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            throw new InvalidOperationException("eskiz_credentials_not_configured");

        var token = await GetTokenAsync(email, password);
        // var message = $"<#> NMED platformasida telefon raqamni tasdiqlash kod: {code} @nmed.uz #ab12cd34ef";
        var message = $"<#> Uyavto platformasiga kirish uchun kod: {code} @uyavto.uz #ab12cd34ef";

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://notify.eskiz.uz/api/message/sms/send");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["mobile_phone"] = phone,
            ["message"] = message,
            ["from"] = _config["Eskiz:From"] ?? "4546"
        });

        using var response = await _httpClient.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Eskiz SMS yuborishda xato. Status: {StatusCode}, Body: {Body}", response.StatusCode, body);
            throw new InvalidOperationException("sms_send_failed");
        }
    }

    private async Task<string> GetTokenAsync(string email, string password)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://notify.eskiz.uz/api/auth/login");
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["email"] = email,
            ["password"] = password
        });

        using var response = await _httpClient.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Eskiz token olishda xato. Status: {StatusCode}, Body: {Body}", response.StatusCode, body);
            throw new InvalidOperationException("sms_auth_failed");
        }

        using var doc = JsonDocument.Parse(body);
        if (doc.RootElement.TryGetProperty("data", out var data) &&
            data.TryGetProperty("token", out var tokenElement))
        {
            return tokenElement.GetString() ?? throw new InvalidOperationException("sms_auth_failed");
        }

        throw new InvalidOperationException("sms_auth_failed");
    }
}
