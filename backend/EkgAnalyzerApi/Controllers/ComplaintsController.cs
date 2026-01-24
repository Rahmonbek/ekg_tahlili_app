using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[ApiController]
[Route("api/complaints")]
public class ComplaintsController : ControllerBase
{
    private readonly MedDataDB _context;

    public ComplaintsController(MedDataDB context)
    {
        _context = context;
    }


    [HttpGet("get-complaints")]
    public async Task<IActionResult> GetComplaints()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var complaints = _context.Complaints.OrderBy(v => v.NameUz);


        return Ok(complaints);
    }
}