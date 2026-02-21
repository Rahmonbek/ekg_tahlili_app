using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[ApiController]
[Route("api/smad-analyses")]
public class SmadAnalyseController : ControllerBase
{
    private readonly MedDataDB _context;
    private readonly SmadAnalyseService _smadService;

    public SmadAnalyseController(MedDataDB context, SmadAnalyseService smadService)
    {
        _context = context;
        _smadService = smadService;
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
}