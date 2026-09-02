using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EkgAnalyzerApi.Controllers;

/// <summary>
/// Har bir tahlil turi uchun ruxsat etilgan fayl kengaytmalari (T-041).
/// </summary>
/// <remarks>
/// Ilgari bu ro'yxat ikki joyda alohida yozilgan edi va ular bir-biriga
/// mos kelmasdi. Masalan Holter yuklash maydonida faqat <c>pdf</c>
/// taklif qilinardi, server esa rasm formatlarini ham qabul qilardi —
/// ya'ni klinika Holter hisobotining suratini yuklay olardi, lekin buni
/// bilmasdi.
///
/// Ro'yxat Python xizmatidan olinadi, chunki fayl validatsiyasi o'sha
/// yerda bajariladi. Frontend uni bir marta so'rab, keshlaydi.
/// </remarks>
[ApiController]
[Route("api/analyses/file-types")]
[Authorize]
public class FileTypesController : ControllerBase
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<FileTypesController> _logger;

    /// <summary>
    /// Python javob bermasa ishlatiladigan zaxira ro'yxat.
    /// `file_validator.ALLOWED_BY_ANALYSIS_TYPE` bilan bir xil bo'lishi kerak.
    /// </summary>
    private static readonly Dictionary<string, string[]> Fallback = new()
    {
        ["ecg"] = new[] { ".jpeg", ".jpg", ".pdf", ".png" },
        ["holter"] = new[] { ".jpeg", ".jpg", ".pdf", ".png" },
        ["smad"] = new[] { ".jpeg", ".jpg", ".pdf", ".png" },
        ["lab"] = new[] { ".jpeg", ".jpg", ".pdf", ".png" },
        ["diagnose"] = new[] { ".jpeg", ".jpg", ".pdf", ".png" },
    };

    public FileTypesController(
        IHttpClientFactory httpFactory,
        IConfiguration config,
        ILogger<FileTypesController> logger)
    {
        _httpFactory = httpFactory;
        _config = config;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var baseUrl = (_config["PythonApi:BaseUrl"] ?? "http://127.0.0.1:8000").TrimEnd('/');

        try
        {
            var client = _httpFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            var response = await client.GetAsync($"{baseUrl}/api/file-types", ct);

            if (response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                return Content(body, "application/json");
            }

            _logger.LogWarning(
                "Fayl turlari ro'yxati olinmadi: HTTP {Status}", (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Fayl turlari ro'yxati olinmadi");
        }

        // Yuklash formasi ishlashda davom etishi kerak — ro'yxatsiz
        // foydalanuvchi hech qanday fayl tanlay olmaydi
        return Ok(Fallback);
    }
}
