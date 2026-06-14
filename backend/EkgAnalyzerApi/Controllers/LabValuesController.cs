using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[ApiController]
[Route("api/lab-values")]
[Authorize]
public class LabValuesController : ControllerBase
{
    private readonly MedDataDB _context;

    public LabValuesController(MedDataDB context)
    {
        _context = context;
    }


    [HttpGet("get-lab-values")]
    public async Task<IActionResult> GetComplaints()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var complaints = _context.LabValueTypes.OrderBy(v => v.Id);


        return Ok(complaints);
    }
}