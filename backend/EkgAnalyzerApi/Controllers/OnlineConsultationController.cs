using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[ApiController]
[Route("api/online-consultation")]
[Authorize]
public class OnlineConsultationController : ControllerBase
{
    private readonly IOnlineConsultationService _service;
    private readonly MedDataDB _db;

    public OnlineConsultationController(
        IOnlineConsultationService service,
        MedDataDB db)
    {
        _service = service;
        _db = db;
    }

    // ─── ADMIN ENDPOINTLARI ────────────────────────────────────────────────

    /// <summary>Doktorlar katalogi — boshqa klinikalar ham, o'z klinikasi ham</summary>
    [HttpGet("doctors-catalog")]
    public async Task<IActionResult> GetDoctorsCatalog(
        [FromQuery] string? specialization,
        [FromQuery] string? search)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 2 && roleId != 3) return Forbid();

        var clinicId = await GetUserClinicIdAsync(userId);
        var result = await _service.GetDoctorsCatalogAsync(clinicId, userId, specialization, search);
        return Ok(result);
    }

    /// <summary>Shu klinikaning biriktirilgan konsultantlari</summary>
    [HttpGet("my-consultants")]
    public async Task<IActionResult> GetMyConsultants()
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 2 && roleId != 3) return Forbid();

        var clinicId = await GetUserClinicIdAsync(userId);
        var result = await _service.GetMyConsultantsAsync(clinicId);
        return Ok(result);
    }

    /// <summary>Bitta konsultant bilan bo'lgan konsultatsiyalar tarixi</summary>
    [HttpGet("my-consultants/{clinicConsultantId}/history")]
    public async Task<IActionResult> GetConsultantHistory(int clinicConsultantId)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 2 && roleId != 3) return Forbid();

        var clinicId = await GetUserClinicIdAsync(userId);
        var result = await _service.GetConsultantHistoryAsync(clinicConsultantId, clinicId);
        return Ok(result);
    }

    /// <summary>Yangi konsultatsiya yaratish</summary>
    [HttpPost("create")]
    [EnableRateLimiting("general")]
    public async Task<IActionResult> CreateConsultation([FromBody] CreateConsultationDto dto)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 2 && roleId != 3) return Forbid();

        var clinicId = await GetUserClinicIdAsync(userId);
        var (success, error, consultationId) = await _service.CreateConsultationAsync(dto, userId, clinicId);

        if (!success) return BadRequest(new { message = error });
        return Ok(new { message = "Konsultatsiya so'rovi yuborildi", consultationId });
    }

    /// <summary>Klinikaning konsultatsiyalar ro'yxati</summary>
    [HttpGet("list")]
    public async Task<IActionResult> GetConsultationList(
        [FromQuery] string? status,
        [FromQuery] int? consultantDoctorId,
        [FromQuery] int? patientId)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 2 && roleId != 3) return Forbid();

        var clinicId = await GetUserClinicIdAsync(userId);
        var result = await _service.GetConsultationListAsync(clinicId, status, consultantDoctorId, patientId);
        return Ok(result);
    }

    /// <summary>Konsultatsiya to'liq ma'lumoti</summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetConsultationById(int id)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 2 && roleId != 3 && roleId != 4) return Forbid();

        var result = await _service.GetConsultationByIdAsync(id, userId, roleId);
        if (result == null) return NotFound(new { message = "Konsultatsiya topilmadi yoki ruxsat yo'q" });
        return Ok(result);
    }

    /// <summary>Konsultatsiyani bekor qilish (Admin)</summary>
    [HttpPut("{id}/cancel")]
    public async Task<IActionResult> CancelConsultation(int id)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 2 && roleId != 3) return Forbid();

        var clinicId = await GetUserClinicIdAsync(userId);
        var (success, error) = await _service.CancelConsultationAsync(id, clinicId);
        if (!success) return BadRequest(new { message = error });
        return Ok(new { message = "Konsultatsiya bekor qilindi" });
    }

    /// <summary>Konsultantga baho berish (Admin)</summary>
    [HttpPost("{id}/rate")]
    public async Task<IActionResult> RateConsultation(int id, [FromBody] RateConsultationDto dto)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 2 && roleId != 3) return Forbid();

        var clinicId = await GetUserClinicIdAsync(userId);
        var (success, error) = await _service.RateConsultationAsync(id, dto, clinicId);
        if (!success) return BadRequest(new { message = error });
        return Ok(new { message = "Baho saqlandi" });
    }

    // ─── DOCTOR ENDPOINTLARI ───────────────────────────────────────────────

    /// <summary>Menga kelgan konsultatsiya so'rovlari</summary>
    [HttpGet("incoming")]
    public async Task<IActionResult> GetIncomingConsultations([FromQuery] string? status)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 4) return Forbid();

        var doctorId = await GetDoctorIdAsync(userId);
        if (doctorId == 0) return NotFound(new { message = "Doctor topilmadi" });

        var result = await _service.GetIncomingConsultationsAsync(doctorId, status);
        return Ok(result);
    }

    /// <summary>Men biriktirilgan klinikalar</summary>
    [HttpGet("my-linked-clinics")]
    public async Task<IActionResult> GetMyLinkedClinics()
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 4) return Forbid();

        var doctorId = await GetDoctorIdAsync(userId);
        if (doctorId == 0) return NotFound(new { message = "Doctor topilmadi" });

        var result = await _service.GetMyLinkedClinicsAsync(doctorId);
        return Ok(result);
    }

    /// <summary>Konsultatsiya so'rovini qabul qilish (Doctor)</summary>
    [HttpPut("{id}/accept")]
    public async Task<IActionResult> AcceptConsultation(int id)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 4) return Forbid();

        var doctorId = await GetDoctorIdAsync(userId);
        if (doctorId == 0) return NotFound(new { message = "Doctor topilmadi" });

        var (success, error) = await _service.AcceptConsultationAsync(id, doctorId, userId);
        if (!success) return BadRequest(new { message = error });
        return Ok(new { message = "Konsultatsiya qabul qilindi" });
    }

    /// <summary>Konsultatsiya so'rovini rad etish (Doctor)</summary>
    [HttpPut("{id}/reject")]
    public async Task<IActionResult> RejectConsultation(int id, [FromBody] RejectConsultationDto dto)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 4) return Forbid();

        var doctorId = await GetDoctorIdAsync(userId);
        if (doctorId == 0) return NotFound(new { message = "Doctor topilmadi" });

        var (success, error) = await _service.RejectConsultationAsync(id, dto, doctorId);
        if (!success) return BadRequest(new { message = error });
        return Ok(new { message = "Konsultatsiya rad etildi" });
    }

    /// <summary>Video vaqtini belgilash (Doctor)</summary>
    [HttpPut("{id}/schedule")]
    public async Task<IActionResult> ScheduleConsultation(int id, [FromBody] ScheduleConsultationDto dto)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 4) return Forbid();

        var doctorId = await GetDoctorIdAsync(userId);
        if (doctorId == 0) return NotFound(new { message = "Doctor topilmadi" });

        var (success, error) = await _service.ScheduleConsultationAsync(id, dto, doctorId);
        if (!success) return BadRequest(new { message = error });
        return Ok(new { message = "Vaqt belgilandi" });
    }

    /// <summary>Xulosa yozish (Doctor)</summary>
    [HttpPost("{id}/conclude")]
    public async Task<IActionResult> ConcludeConsultation(int id, [FromBody] ConcludeConsultationDto dto)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 4) return Forbid();

        var doctorId = await GetDoctorIdAsync(userId);
        if (doctorId == 0) return NotFound(new { message = "Doctor topilmadi" });

        var (success, error) = await _service.ConcludeConsultationAsync(id, dto, doctorId);
        if (!success) return BadRequest(new { message = error });
        return Ok(new { message = "Xulosa saqlandi" });
    }

    /// <summary>Ulashilgan tahlillar (Doctor)</summary>
    [HttpGet("{id}/analyses")]
    public async Task<IActionResult> GetConsultationAnalyses(int id)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 4) return Forbid();

        var doctorId = await GetDoctorIdAsync(userId);
        if (doctorId == 0) return NotFound(new { message = "Doctor topilmadi" });

        var result = await _service.GetConsultationAnalysesAsync(id, doctorId);
        return Ok(result);
    }

    // ─── VIDEO TOKEN ───────────────────────────────────────────────────────

    /// <summary>LiveKit token olish (Admin ham, Doctor ham)</summary>
    [HttpGet("{id}/livekit-token")]
    [EnableRateLimiting("general")]
    public async Task<IActionResult> GetLiveKitToken(int id)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 2 && roleId != 3 && roleId != 4) return Forbid();

        var (success, error, token) = await _service.GetLiveKitTokenAsync(id, userId, roleId);
        if (!success) return BadRequest(new { message = error });
        return Ok(token);
    }

    // ─── PRIVATE HELPERS ──────────────────────────────────────────────────

    private int GetUserId()
    {
        var claim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : 0;
    }

    private int GetRoleId()
    {
        var claim = User.Claims.FirstOrDefault(c => c.Type == "roleId")?.Value;
        return int.TryParse(claim, out var id) ? id : 0;
    }

    private async Task<int> GetUserClinicIdAsync(int userId)
    {
        var clinicId = await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.ClinicId)
            .FirstOrDefaultAsync();
        return clinicId ?? 0;
    }

    private async Task<int> GetDoctorIdAsync(int userId)
    {
        return await _db.Doctors.AsNoTracking()
            .Where(d => d.UserId == userId)
            .Select(d => d.Id)
            .FirstOrDefaultAsync();
    }
}
