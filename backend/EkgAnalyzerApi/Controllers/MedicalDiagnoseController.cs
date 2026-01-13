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
public class MedicalDiagnoseController : ControllerBase
{
    private readonly MedDataDB _context;
    private readonly MedicalDiagnoseService _diagnoseService;

    public MedicalDiagnoseController(MedDataDB context, MedicalDiagnoseService diagnoseService)
    {
        _context = context;
        _diagnoseService = diagnoseService;
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
}