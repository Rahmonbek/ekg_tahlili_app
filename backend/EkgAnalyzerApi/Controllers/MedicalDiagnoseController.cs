using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[ApiController]
[Route("api/med-diagnose")]
[Authorize]
public class MedicalDiagnoseController : ControllerBase
{
    private readonly MedDataDB _context;
    private readonly MedicalDiagnoseService _diagnoseService;
    private readonly PythonApiProxyService _proxyService;

    public MedicalDiagnoseController(MedDataDB context, MedicalDiagnoseService diagnoseService, PythonApiProxyService proxyService)
    {
        _context = context;
        _diagnoseService = diagnoseService;
        _proxyService = proxyService;
    }


    [HttpGet("get-diognose-by-patcient-id")]
    public async Task<IActionResult> GetECGAnalysesByPatientId(int id, int page = 1)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var results = await _diagnoseService.GetMedicalDiagnosesByPatientIdAsync(id, page, 5);

        return Ok(results);
    }

    /// <summary>
    /// Tibbiy tashxis faylini saqlash (Python API ga proxy)
    /// POST api/med-diagnose/save
    /// </summary>
    [HttpPost("save")]
    public async Task<IActionResult> Save()
    {
        var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
        try
        {
            var response = await _proxyService.ProxyMultipartAsync("/api/med-diagnoses-save", Request, token);
            var content = await response.Content.ReadAsStringAsync();
            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = "AI tahlil xizmati bilan bog'lanib bo'lmadi", error = ex.Message });
        }
    }
}