using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EkgAnalyzerApi.Controllers;

/// <summary>
/// AI xulosasini boshqa tilga tarjima qilish (T-059).
/// </summary>
/// <remarks>
/// Tahlil yaratilayotganda AI tili tanlanadi va javob o'sha tilda
/// saqlanadi. Boshqa tilli shifokor uni ochsa matn tushunarsiz qoladi —
/// interfeys tilini o'zgartirish yordam bermaydi, chunki matn bazada
/// bitta tilda yotadi.
///
/// So'rov Python xizmatiga uzatiladi: tarjima sun'iy intellekt orqali
/// bajariladi va u yerda keshlanadi.
///
/// `ai-analysis` rate limit siyosati qo'llanadi: bu ham AI chaqiruvi,
/// ya'ni pullik va sekin.
/// </remarks>
[ApiController]
[Route("api/analyses/translate")]
[Authorize]
public class AnalysisTranslationController : ControllerBase
{
    private readonly PythonApiProxyService _proxyService;
    private readonly ILogger<AnalysisTranslationController> _logger;

    public AnalysisTranslationController(
        PythonApiProxyService proxyService,
        ILogger<AnalysisTranslationController> logger)
    {
        _proxyService = proxyService;
        _logger = logger;
    }

    [HttpPost]
    [EnableRateLimiting("ai-analysis")]
    public async Task<IActionResult> Translate()
    {
        var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");

        try
        {
            var response = await _proxyService.ProxyMultipartAsync(
                "/api/translate-analysis", Request, token);
            return await ProxyHttpResponseMapper.ToContentResultAsync(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Tarjima so'rovi bajarilmadi");
            return StatusCode(502, new { message = "translation_failed" });
        }
    }
}
