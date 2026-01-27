using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[ApiController]
[Route("api/regions")]
public class RegionController : ControllerBase
{
    private readonly MedDataDB _context;

    public RegionController(MedDataDB context)
    {
        _context = context;
    }


    [HttpGet("get-regions")]
    public async Task<IActionResult> GetRegions()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var complaints = _context.Regions.OrderBy(v => v.Id);


        return Ok(complaints);
    }

    [HttpGet("get-districts-by-region-id")]
    public async Task<IActionResult> GetDistricts(int region_id)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var complaints = _context.Districts.Where(x=>x.RegionId==region_id).OrderBy(v => v.Id);


        return Ok(complaints);
    }
}