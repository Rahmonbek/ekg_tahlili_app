using EkgAnalyzerApi.Data;
using Microsoft.AspNetCore.Mvc;

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
    public IActionResult GetRegions()
    {
        var complaints = _context.Regions.OrderBy(v => v.Id);

        return Ok(complaints);
    }

    [HttpGet("get-districts-by-region-id")]
    public IActionResult GetDistricts(int region_id)
    {
        var complaints = _context.Districts.Where(x=>x.RegionId==region_id).OrderBy(v => v.Id);

        return Ok(complaints);
    }
}
