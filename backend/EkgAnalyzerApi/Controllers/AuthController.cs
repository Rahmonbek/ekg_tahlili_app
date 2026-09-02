using Microsoft.AspNetCore.Mvc;
using EkgAnalyzerApi.DTOs;
using Newtonsoft.Json;
using Microsoft.AspNetCore.RateLimiting;
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthController> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    public AuthController(
        AuthService authService,
        IConfiguration configuration,
        ILogger<AuthController> logger,
        IHttpClientFactory httpClientFactory)
    {
        _authService = authService;
        _configuration = configuration;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
    }

    // ========================= REGISTER =========================
    [HttpPost("register")]
    [EnableRateLimiting("strict")]
    public async Task<IActionResult> Register([FromForm] RegisterDto dto)
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

    [HttpGet("check-phone")]
    [EnableRateLimiting("strict")]
    /// <remarks>
    /// Kanonik nom — <c>phoneNumber</c>: API ning qolgan qismida
    /// (`LoginDto`, `RegisterDto`, `PhoneNumberDto`) aynan shu ishlatiladi.
    /// Eski <c>phone</c> nomi ham qabul qilinadi, chunki frontend va
    /// tashqi mijozlar undan foydalanmoqda (T-084).
    /// </remarks>
    public async Task<IActionResult> CheckPhone(
        [FromQuery] string? phone,
        [FromQuery] string? phoneNumber,
        int? doctorId)
    {
        phone = !string.IsNullOrWhiteSpace(phoneNumber) ? phoneNumber : phone;
        if (string.IsNullOrWhiteSpace(phone))
            return BadRequest(new { message = "phone_required" });

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
    [EnableRateLimiting("strict")]
    /// <remarks>
    /// Kanonik nom — <c>clinicInn</c> (`RegisterDto.ClinicInn` bilan bir xil).
    /// Qisqartirilgan <c>inn</c> ham qabul qilinadi (T-084).
    /// </remarks>
    public async Task<IActionResult> CheckClinicInn(
        [FromQuery] string? clinicInn,
        [FromQuery] string? inn)
    {
        clinicInn = !string.IsNullOrWhiteSpace(inn) ? inn : clinicInn;
        if (string.IsNullOrWhiteSpace(clinicInn))
            return BadRequest(new { message = "clinic_inn_required" });

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
    [EnableRateLimiting("strict")]
    public async Task<IActionResult> Verify([FromBody] VerifyCodeDto dto)
    {
        var result = await _authService.VerifyCodeAsync(dto);

        if (!result.Success)
            return BadRequest(new { message = result.Message });

        return Ok(new
        {
            userId = result.UserId,
            token = result.Token,
            message = result.Message,
            // Admin yaratgan vaqtinchalik parol hali almashtirilmagan —
            // frontend foydalanuvchini parol almashtirishga yo'naltiradi (T-022)
            mustChangePassword = result.MustChangePassword
        });
    }
    private async Task<bool> IsReCaptchaValid(string? token)
    {
        if (string.IsNullOrEmpty(token)) return false;

        var secretKey = _configuration["ReCaptcha:SecretKey"];
        if (string.IsNullOrEmpty(secretKey))
            return false;

        // IHttpClientFactory orqali: har chaqiruvda `new HttpClient()` yaratish
        // socket exhaustion (TIME_WAIT to'planishi) muammosiga olib keladi.
        var client = _httpClientFactory.CreateClient("ReCaptcha");

        try
        {
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
        catch (Exception ex)
        {
            // Google javob bermasa login cheksiz kutib qolmasin (timeout HttpClient da sozlangan)
            _logger.LogWarning(ex, "reCAPTCHA tekshiruvini bajarib bo'lmadi");
            return false;
        }
    }
    // ========================= LOGIN =========================
    [HttpPost("login")]
    [EnableRateLimiting("strict")]
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
            message = result.Message,
            // Admin yaratgan vaqtinchalik parol hali almashtirilmagan —
            // frontend foydalanuvchini parol almashtirishga yo'naltiradi (T-022)
            mustChangePassword = result.MustChangePassword
        });
    }

    // ========================= CHANGE PASSWORD =========================
    [HttpPost("change-password")]
    [EnableRateLimiting("strict")]
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
    [EnableRateLimiting("strict")]
    public async Task<IActionResult> SendResetCode([FromBody] PhoneNumberDto dto)
    {
        // Javob har doim bir xil: foydalanuvchi mavjudligini oshkor qilmaymiz.
        // Aks holda bu endpoint orqali platformadagi barcha telefon raqamlarini
        // sanab chiqish mumkin bo'lardi.
        try
        {
            await _authService.SendResetCodeAsync(dto);
        }
        catch (Exception ex) when (ex.Message == "user_not_found")
        {
            // Foydalanuvchi mavjudligini oshkor qilmaymiz — javob baribir
            // muvaffaqiyatli ko'rinadi (raqamlarni sanab chiqishning oldini olish).
            _logger.LogInformation("Parolni tiklash: raqam topilmadi (javob yashiriladi)");
        }
        catch (Exception ex)
        {
            // SMS infratuzilma xatosi (Eskiz sozlanmagan/ishlamayapti/shablon
            // tasdiqlanmagan) — buni foydalanuvchidan YASHIRMAYMIZ, aks holda u
            // nega kod kelmayotganini bilmay qoladi. Bu raqam-spetsifik ma'lumot emas.
            _logger.LogError(ex, "Parolni tiklash: SMS yuborib bo'lmadi");
            return BadRequest(new { message = ex.Message });
        }

        return Ok(new { message = "code_sended" });
    }

}
