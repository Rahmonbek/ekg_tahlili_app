using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

[ApiController]
[Route("api/ecg-analyses")]
[Authorize]
public class ECGAnalyseController : ControllerBase
{
    private readonly MedDataDB _context;
    private readonly ECGAnalyseService _ecgService;
    private readonly PythonApiProxyService _proxyService;

    public ECGAnalyseController(MedDataDB context, ECGAnalyseService ecgService, PythonApiProxyService proxyService)
    {
        _context = context;
        _ecgService = ecgService;
        _proxyService = proxyService;
    }


    [HttpGet("get-ecg-analyses-by-patcient-id")]
    public async Task<IActionResult> GetECGAnalysesByPatientId(int id, int page = 1)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var results = await _ecgService.GetECGAnalysesByPatientIdAsync(id, page, 5);

        return Ok(results);
    }

    /// <summary>
    /// EKG faylni tahlil qilish (Python API ga proxy)
    /// POST api/ecg-analyses/analyze
    /// </summary>
    [HttpPost("analyze")]
    [EnableRateLimiting("ai-analysis")]
    public async Task<IActionResult> Analyze()
    {
        var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
        try
        {
            var response = await _proxyService.ProxyMultipartAsync("/api/analyze", Request, token);
            var content = await response.Content.ReadAsStringAsync();
            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = "AI tahlil xizmati bilan bog'lanib bo'lmadi", error = ex.Message });
        }
    }

    /// <summary>
    /// EKG faylni faqat saqlash (AI tahlilsiz)
    /// POST api/ecg-analyses/analyze-save
    /// </summary>
    [HttpPost("analyze-save")]
    [EnableRateLimiting("ai-analysis")]
    public async Task<IActionResult> AnalyzeSave()
    {
        var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
        try
        {
            var response = await _proxyService.ProxyMultipartAsync("/api/analyze-save", Request, token);
            var content = await response.Content.ReadAsStringAsync();
            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = "AI tahlil xizmati bilan bog'lanib bo'lmadi", error = ex.Message });
        }
    }

    /// <summary>
    /// Saqlangan EKG ni qayta AI ga yuborish (E3 stsenariy)
    /// POST api/ecg-analyses/send-to-ai
    /// </summary>
    [HttpPost("send-to-ai")]
    [EnableRateLimiting("ai-analysis")]
    public async Task<IActionResult> SendToAi()
    {
        var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
        try
        {
            var response = await _proxyService.ProxyMultipartAsync("/api/analyze-retry", Request, token);
            var content = await response.Content.ReadAsStringAsync();
            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = "AI tahlil xizmati bilan bog'lanib bo'lmadi", error = ex.Message });
        }
    }
}