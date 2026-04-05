using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[ApiController]
[Route("api/holter-analyses")]
[Authorize]
public class HolterAnalyseController : ControllerBase
{
    private readonly MedDataDB _context;
    private readonly HolterAnalyseService _holterService;
    private readonly PythonApiProxyService _proxyService;

    public HolterAnalyseController(MedDataDB context, HolterAnalyseService holterService, PythonApiProxyService proxyService)
    {
        _context = context;
        _holterService = holterService;
        _proxyService = proxyService;
    }


    [HttpGet("get-holter-analyses-by-patcient-id")]
    public async Task<IActionResult> GetHolterAnalysesByPatientId(int id, int page = 1)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var results = await _holterService.GetHolterAnalysesByPatientIdAsync(id, page, 5);

        return Ok(results);
    }

    /// <summary>
    /// Holter faylni tahlil qilish (Python API ga proxy)
    /// POST api/holter-analyses/analyze
    /// </summary>
    [HttpPost("analyze")]
    public async Task<IActionResult> Analyze()
    {
        var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
        try
        {
            var response = await _proxyService.ProxyMultipartAsync("/holter/analyze", Request, token);
            var content = await response.Content.ReadAsStringAsync();
            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = "AI tahlil xizmati bilan bog'lanib bo'lmadi", error = ex.Message });
        }
    }
}