using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[ApiController]
[Route("api/ecg-analyses")]
public class ECGAnalyseController : ControllerBase
{
    private readonly MedDataDB _context;
    private readonly ECGAnalyseService _ecgService;

    public ECGAnalyseController(MedDataDB context, ECGAnalyseService ecgService)
    {
        _context = context;
        _ecgService = ecgService;
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
}