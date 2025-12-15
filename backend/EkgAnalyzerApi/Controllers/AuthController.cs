using Microsoft.AspNetCore.Mvc;
using EkgAnalyzerApi.DTOs;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    // ========================= REGISTER =========================
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        try
        {
            await _authService.RegisterAsync(dto);
            return Ok(new { message = "code_sended" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    [HttpGet("check-username")]
    public async Task<IActionResult> CheckUsername([FromQuery] string username)
    {
        if (string.IsNullOrWhiteSpace(username))
            return BadRequest(new { message = "username_required" });

        var exists = await _authService.CheckUsernameAsync(username);

        return Ok(new
        {
            exists = exists,
            message = exists ? "username_already_exists" : "username_available"
        });
    }
    // ========================= VERIFY EMAIL =========================
    [HttpPost("verify")]
    public async Task<IActionResult> Verify([FromBody] VerifyCodeDto dto)
    {
        var result = await _authService.VerifyCodeAsync(dto);

        if (!result.Success)
            return BadRequest(new { message = result.Message });

        return Ok(new
        {
            userId = result.UserId,
            token = result.Token,
            message = result.Message
        });
    }

    // ========================= LOGIN =========================
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var result = await _authService.LoginAsync(dto);

        if (!result.Success)
            return BadRequest(new { message = result.Message });

        return Ok(new
        {
            userId = result.UserId,
            token = result.Token,
            message = result.Message
        });
    }

    // ========================= CHANGE PASSWORD =========================
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        try
        {
            await _authService.ChangePasswordAsync(dto);
            return Ok(new { message = "password_changed_successfully" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }


}
