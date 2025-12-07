using Microsoft.AspNetCore.Mvc;
using EkgAnalyzerApi.DTOs;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        await _authService.RegisterAsync(dto);
        return Ok(new { message = "Verification code sent to email" });
    }

    [HttpPost("verify")]
    public async Task<IActionResult> Verify(VerifyCodeDto dto)
    {
        await _authService.VerifyCodeAsync(dto);
        return Ok(new { message = "Email verified successfully" });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var token = await _authService.LoginAsync(dto);
        return Ok(new { token });
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordDto dto)
    {
        await _authService.ChangePasswordAsync(dto);
        return Ok(new { message = "Password changed successfully" });
    }
}
