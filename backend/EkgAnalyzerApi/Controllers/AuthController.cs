using Microsoft.AspNetCore.Mvc;
using EkgAnalyzerApi.DTOs;
using Newtonsoft.Json;
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AuthService authService, IConfiguration configuration, ILogger<AuthController> logger)
    {
        _authService = authService;
        _configuration = configuration;
        _logger = logger;
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

    [HttpGet("check-phone")]
    public async Task<IActionResult> CheckPhone([FromQuery] string phone, int? doctorId)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return BadRequest(new { message = "phone_required" });

        var exists = await _authService.CheckPhoneAsync(phone, doctorId);

        return Ok(new
        {
            exists,
            message = exists ? "phone_already_exists" : "phone_available"
        });
    }

    [HttpGet("check-clinic-inn")]
    public async Task<IActionResult> CheckClinicInn([FromQuery] string clinicInn)
    {
        if (string.IsNullOrWhiteSpace(clinicInn))
            return BadRequest(new { message = "clinic_inn_required" });

        var exists = await _authService.CheckClinicInnAsync(clinicInn);

        return Ok(new
        {
            exists,
            message = exists ? "clinic_already_registered" : "clinic_available"
        });
    }
    // ========================= VERIFY PHONE NUMBER =========================
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
    private async Task<bool> IsReCaptchaValid(string? token)
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
        dynamic result = Newtonsoft.Json.JsonConvert.DeserializeObject(jsonString)!;

        // Google JSON boolean true qaytaradi (string "true" emas!)
        // v3 da 'success' true bo'lishi va 'score' (ball) kamida 0.5 bo'lishi tavsiya etiladi
        bool success = result.success == true;
        double score = result.score != null ? (double)result.score : 0.0;
        return success && score >= 0.5;
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

    [HttpPost("send-reset-code")]
    public async Task<IActionResult> SendResetCode([FromBody] PhoneNumberDto dto)
    {
        try
        {
            await _authService.SendResetCodeAsync(dto);
            return Ok(new { message = "code_sended" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Register request failed. Inner: {InnerMessage}", ex.InnerException?.Message);
            return BadRequest(new { message = ex.Message });
        }
    }

}
