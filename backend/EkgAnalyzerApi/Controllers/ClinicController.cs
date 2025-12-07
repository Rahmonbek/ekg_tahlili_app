using Microsoft.AspNetCore.Mvc;
using EkgAnalyzerApi.DTOs;

[Route("api/auth")]
[ApiController]
public class ClinicController : ControllerBase
{
    private readonly ClinicService _clinicService;

    public ClinicController(ClinicService clinicService)
    {
        _clinicService = clinicService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        await _clinicService.RegisterAsync(dto);
        return Ok(new { message = "code_sended" });
    }

    [HttpPost("verify")]
    public async Task<IActionResult> Verify(VerifyCodeDto dto)
    {
        var result = await _clinicService.VerifyCodeAsync(dto);

        if (!result.Success)
        {
            // Kod noto‘g‘ri yoki expired bo‘lsa
            return BadRequest(new { message = result.Message });
        }

        // Kod to‘g‘ri bo‘lsa
        return Ok(new
        {
            userId= result.UserId,
            message = result.Message,
            token = result.Token
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var result = await _clinicService.LoginAsync(dto);

        if (!result.Success)
        {
            // Xatolik bo‘lsa, 400 qaytaramiz va message bilan yuboramiz
            return BadRequest(new
            {
                message = result.Message
            });
        }

        // Muvaffaqiyatli login bo‘lsa, token, userId va message qaytarish
        return Ok(new
        {
            token = result.Token,
            userId = result.UserId,
            message = result.Message
        });
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordDto dto)
    {
        await _clinicService.ChangePasswordAsync(dto);
        return Ok(new { message = "Password changed successfully" });
    }
}
