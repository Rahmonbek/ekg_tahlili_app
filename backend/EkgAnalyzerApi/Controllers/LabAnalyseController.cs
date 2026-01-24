using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[ApiController]
[Route("api/lab-analyses")]
public class LabAnalyseController : ControllerBase
{
    private readonly MedDataDB _context;
    private readonly LabAnalyseService _labService;

    public LabAnalyseController(MedDataDB context, LabAnalyseService labService)
    {
        _context = context;
        _labService = labService;
    }


    [HttpGet("get-lab-analyses-by-patcient-id")]
    public async Task<IActionResult> GetLabAnalysesByPatientId(int id, int page = 1)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var results = await _labService.GetLabAnalysesByPatientIdAsync(id, page, 5);

        return Ok(results);
    }
}