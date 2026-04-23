using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly DashboardService _service;

    public DashboardController(DashboardService service)
    {
        _service = service;
    }

    [HttpGet("statistics")]
    public async Task<IActionResult> GetStatistics()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            return Unauthorized(new { message = "Token invalid" });

        var roleIdClaim = User.Claims.FirstOrDefault(c => c.Type == "roleId");
        if (roleIdClaim == null || !int.TryParse(roleIdClaim.Value, out var roleId))
            return Unauthorized(new { message = "Role claim missing" });

        var result = await _service.GetStatisticsAsync(userId, roleId);
        return Ok(result);
    }
}
