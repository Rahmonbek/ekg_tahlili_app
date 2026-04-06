using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.AspNetCore.RateLimiting;

[ApiController]
[Route("api/smad-analyses")]
[Authorize]
public class SmadAnalyseController : ControllerBase
{
    private readonly MedDataDB _context;
    private readonly SmadAnalyseService _smadService;
    private readonly PythonApiProxyService _proxyService;

    public SmadAnalyseController(MedDataDB context, SmadAnalyseService smadService, PythonApiProxyService proxyService)
    {
        _context = context;
        _smadService = smadService;
        _proxyService = proxyService;
    }


    [HttpGet("get-smad-analyses-by-patcient-id")]
    public async Task<IActionResult> GetSmadAnalysesByPatientId(int id, int page = 1)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var results = await _smadService.GetSmadAnalysesByPatientIdAsync(id, page, 5);

        return Ok(results);
    }

    /// <summary>
    /// SMAD faylni tahlil qilish (Python API ga proxy)
    /// POST api/smad-analyses/analyze
    /// </summary>
    [HttpPost("analyze")]
    [EnableRateLimiting("ai-analysis")]
    public async Task<IActionResult> Analyze()
    {
        var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
        try
        {
            var response = await _proxyService.ProxyMultipartAsync("/smad/analyze", Request, token);
            var content = await response.Content.ReadAsStringAsync();
            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = "AI tahlil xizmati bilan bog'lanib bo'lmadi", error = ex.Message });
        }
    }
}