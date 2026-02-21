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
public class HolterAnalyseController : ControllerBase
{
    private readonly MedDataDB _context;
    private readonly HolterAnalyseService _holterService;

    public HolterAnalyseController(MedDataDB context, HolterAnalyseService holterService)
    {
        _context = context;
        _holterService = holterService;
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
}