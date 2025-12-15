using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[ApiController]
[Route("api/user")]
public class UserController : ControllerBase
{
    private readonly UserService _userService;

    public UserController(UserService userService)
    {
        _userService = userService;
    }


    [HttpGet("get-user-by-token")]
    public async Task<IActionResult> GetUser()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);

        var user = await _userService.GetUserByIdAsync(userId);
        if (user == null)
            return NotFound(new { message = "user not found" });

        return Ok(user);
    }
}