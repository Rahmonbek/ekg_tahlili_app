using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EkgAnalyzerApi.Controllers;

/// <summary>
/// Kompleks (ko'p tahlilli) AI xulosasi.
///
/// Bemor kartasida tanlangan bir nechta tahlil AI ga BIRGALIKDA yuboriladi
/// va yagona yakuniy xulosa olinadi. Natija alohida jadvalda saqlanadi va
/// bemor kartasida ko'rsatiladi.
///
/// To'rttala rol ham (admin, direktor, shifokor, hamshira) foydalana oladi —
/// bemor kartasining o'zi ham rol bo'yicha cheklanmagan.
/// </summary>
[ApiController]
[Route("api/combined-analyses")]
[Authorize]
public class CombinedAnalysisController : ControllerBase
{
    private readonly CombinedAnalysisService _service;
    private readonly PythonApiProxyService _proxyService;
    private readonly AnalysisProgressTracker _progressTracker;
    private readonly ICurrentUser _currentUser;
    private readonly ILogger<CombinedAnalysisController> _logger;

    public CombinedAnalysisController(
        CombinedAnalysisService service,
        PythonApiProxyService proxyService,
        AnalysisProgressTracker progressTracker,
        ICurrentUser currentUser,
        ILogger<CombinedAnalysisController> logger)
    {
        _service = service;
        _proxyService = proxyService;
        _progressTracker = progressTracker;
        _currentUser = currentUser;
        _logger = logger;
    }

    /// <summary>
    /// Tanlangan tahlillarni birgalikda tahlil qilishga yuboradi.
    /// POST api/combined-analyses/create
    /// </summary>
    /// <remarks>
    /// Javob DARHOL qaytadi (`status = 0/1`) — AI fon rejimida ishlaydi.
    /// Tayyor bo'lganda SignalR orqali `AnalysisProgressUpdated` keladi.
    ///
    /// Aynan shu to'plam uchun tayyor xulosa bo'lsa, u qayta hisoblanmasdan
    /// qaytariladi (`reused = true`) — bu AI xarajatini tejaydi.
    /// </remarks>
    [HttpPost("create")]
    [EnableRateLimiting("ai-analysis")]
    public async Task<IActionResult> Create([FromBody] CombinedAnalysisCreateRequest request)
    {
        var userId = _currentUser.UserId;
        if (userId <= 0) return Unauthorized(new { message = "Token invalid" });

        if (request == null)
            return BadRequest(new { message = "So'rov bo'sh" });

        var result = await _service.CreateAsync(request, userId);
        if (result.Error != null)
            return BadRequest(new { message = result.Error });

        var entity = result.Entity!;

        // Keshdan olindi — AI ga umuman murojaat qilmaymiz
        if (result.Reused)
            return Ok(new { combined_id = entity.Id, status = entity.Status, reused = true });

        var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
        try
        {
            var response = await _proxyService.ProxyJsonAsync(
                "/combined/analyze",
                new { combined_id = entity.Id, lang = entity.AiLang ?? "uz", mode = entity.Mode },
                token);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                _logger.LogError(
                    "Kompleks tahlil Python tomonda rad etildi: id={Id} kod={Code} javob={Body}",
                    entity.Id, (int)response.StatusCode, body);
                return await ProxyHttpResponseMapper.ToContentResultAsync(response);
            }

            _progressTracker.Track(userId, "combined", entity.Id);
            return Ok(new { combined_id = entity.Id, status = 1, reused = false });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kompleks tahlil: AI xizmatiga ulanib bo'lmadi, id={Id}", entity.Id);
            return StatusCode(502, new { message = "AI tahlil xizmati bilan bog'lanib bo'lmadi", error = ex.Message });
        }
    }

    /// <summary>
    /// Kompleks xulosalarning umumiy ro'yxati (alohida sahifa uchun).
    /// GET api/combined-analyses/list?page=1&amp;pageSize=10&amp;search=Ali
    /// </summary>
    /// <remarks>
    /// Rol bo'yicha cheklangan: foydalanuvchi bemorlar ro'yxatida qaysi
    /// bemorlarni ko'rsa, shu bemorlarning xulosalarini ko'radi
    /// (<see cref="PatientVisibility"/>).
    /// </remarks>
    [HttpGet("list")]
    public async Task<IActionResult> GetList(
        int page = 1, int pageSize = 10, string? search = null)
    {
        var userId = _currentUser.UserId;
        if (userId <= 0) return Unauthorized(new { message = "Token invalid" });

        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 10;

        var result = await _service.GetListAsync(userId, page, pageSize, search);
        return Ok(result);
    }

    /// <summary>
    /// Bemorning kompleks xulosalari.
    /// GET api/combined-analyses/by-patient/{patientId}
    /// </summary>
    [HttpGet("by-patient/{patientId:int}")]
    public async Task<IActionResult> GetByPatient(int patientId)
    {
        if (!_currentUser.IsAuthenticated)
            return Unauthorized(new { message = "Token invalid" });

        var items = await _service.GetByPatientAsync(patientId);
        return Ok(items);
    }

    /// <summary>
    /// Bitta kompleks xulosa.
    /// GET api/combined-analyses/{id}
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        if (!_currentUser.IsAuthenticated)
            return Unauthorized(new { message = "Token invalid" });

        var dto = await _service.GetByIdAsync(id);
        if (dto == null) return NotFound(new { message = "Kompleks xulosa topilmadi" });

        return Ok(dto);
    }

    /// <summary>
    /// Kompleks xulosani o'chirish.
    /// DELETE api/combined-analyses/{id}
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!_currentUser.IsAuthenticated)
            return Unauthorized(new { message = "Token invalid" });

        var deleted = await _service.DeleteAsync(id);
        if (!deleted) return NotFound(new { message = "Kompleks xulosa topilmadi" });

        return Ok(new { success = true });
    }
}
