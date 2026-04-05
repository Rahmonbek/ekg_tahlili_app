using Microsoft.AspNetCore.Mvc;
using EkgAnalyzerApi.DTOs;
using Newtonsoft.Json;
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly IConfiguration _configuration;

    public AuthController(AuthService authService, IConfiguration configuration)
    {
        _authService = authService;
        _configuration = configuration;
    }

    // ========================= REGISTER =========================
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var isValid = await IsReCaptchaValid(dto.RecaptchaToken);
        if (!isValid)
        {
            return BadRequest(new { message = "reCAPTCHA tekshiruvidan o'tmadi (Bot ehtimoli)" });
        }
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
    public async Task<IActionResult> CheckUsername([FromQuery] string username, int? user_id, string? email)
    {
        if (string.IsNullOrWhiteSpace(username))
            return BadRequest(new { message = "username_required" });

        var exists = await _authService.CheckUsernameAsync(username, user_id, email);

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
    private async Task<bool> IsReCaptchaValid(string token)
    {
        if (string.IsNullOrEmpty(token)) return false;

        using var client = new HttpClient();
        var secretKey = _configuration["ReCaptcha:SecretKey"];
        if (string.IsNullOrEmpty(secretKey))
            return false;

        var response = await client.PostAsync(
            $"https://www.google.com/recaptcha/api/siteverify?secret={secretKey}&response={token}",
            null);

        if (!response.IsSuccessStatusCode) return false;

        var jsonString = await response.Content.ReadAsStringAsync();
        dynamic result = Newtonsoft.Json.JsonConvert.DeserializeObject(jsonString);

        // v3 da 'success' true bo'lishi va 'score' (ball) kamida 0.5 bo'lishi tavsiya etiladi
        return result.success == "true" && (double)result.score >= 0.5;
    }
    // ========================= LOGIN =========================
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        // 1. reCAPTCHA tekshiruvi
        var isValid = await IsReCaptchaValid(dto.RecaptchaToken);
        if (!isValid)
        {
            return BadRequest(new { message = "reCAPTCHA tekshiruvidan o'tmadi (Bot ehtimoli)" });
        }

        // 2. Oddiy login mantiqi
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
