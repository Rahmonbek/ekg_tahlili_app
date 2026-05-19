using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[ApiController]
[Route("api/consultation")]
[Authorize]
public class ConsultationController : ControllerBase
{
    private readonly IOnlineConsultationService _service;
    private readonly MedDataDB _db;

    public ConsultationController(IOnlineConsultationService service, MedDataDB db)
    {
        _service = service;
        _db = db;
    }

    // ─── ADMIN: SHIFOKOR QIDIRISH ─────────────────────────────────────────────

    [HttpGet("search-doctors")]
    public async Task<IActionResult> SearchDoctors([FromQuery] SearchDoctorsQuery q)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 2 && roleId != 3) return Forbid();

        var hasFilter = !string.IsNullOrWhiteSpace(q.PassportSeries)
            || !string.IsNullOrWhiteSpace(q.Phone)
            || q.RegionId.HasValue
            || q.DistrictId.HasValue
            || q.ClinicId.HasValue;

        if (!hasFilter)
            return BadRequest(new { message = "Kamida 1 ta filter kiritish shart" });

        var clinicId = await GetUserClinicIdAsync(userId);
        var result = await _service.SearchDoctorsAsync(q, clinicId);
        return Ok(result);
    }

    // ─── ADMIN: TAKLIF YUBORISH ───────────────────────────────────────────────

    [HttpGet("clinic-options")]
    public async Task<IActionResult> GetClinicOptions([FromQuery] int? regionId, [FromQuery] int? districtId)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 2 && roleId != 3) return Forbid();

        var query = _db.Clinics
            .AsNoTracking()
            .Include(c => c.ClinicDetail)
                .ThenInclude(cd => cd!.District)
            .AsQueryable();

        if (districtId.HasValue)
        {
            query = query.Where(c => c.ClinicDetail != null && c.ClinicDetail.DistrictId == districtId.Value);
        }
        else if (regionId.HasValue)
        {
            query = query.Where(c =>
                c.ClinicDetail != null &&
                c.ClinicDetail.District != null &&
                c.ClinicDetail.District.RegionId == regionId.Value);
        }

        var result = await query
            .OrderBy(c => c.ClinicName)
            .Select(c => new
            {
                id = c.Id,
                clinicName = c.ClinicName
            })
            .ToListAsync();

        return Ok(result);
    }

    [HttpPost("invite")]
    [EnableRateLimiting("general")]
    public async Task<IActionResult> InviteDoctor([FromBody] InviteDoctorDto dto)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 2 && roleId != 3) return Forbid();

        var clinicId = await GetUserClinicIdAsync(userId);
        var (success, error) = await _service.InviteDoctorAsync(dto, userId, clinicId);
        if (!success) return BadRequest(new { message = error });
        return Ok(new { message = "Taklif yuborildi" });
    }

    // ─── ADMIN: MENING KONSULTANTLARIM ───────────────────────────────────────

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

    [HttpGet("my-sent-invitations")]
    public async Task<IActionResult> GetMySentInvitations()
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 2 && roleId != 3) return Forbid();

        var clinicId = await GetUserClinicIdAsync(userId);
        var result = await _service.GetMySentInvitationsAsync(clinicId);
        return Ok(result);
    }

    // ─── ADMIN: NARX O'ZGARTIRISH ─────────────────────────────────────────────

    [HttpPut("consultants/{clinicConsultantId}/update-price")]
    public async Task<IActionResult> UpdateConsultantPrice(
        int clinicConsultantId, [FromBody] UpdatePriceDto dto)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 2 && roleId != 3) return Forbid();

        var clinicId = await GetUserClinicIdAsync(userId);
        var (success, error) = await _service.UpdateConsultantPriceAsync(clinicConsultantId, dto, userId, clinicId);
        if (!success) return BadRequest(new { message = error });
        return Ok(new { message = "Narx yangilandi" });
    }

    // ─── ADMIN: KONSULTANT TARIXI ─────────────────────────────────────────────

    [HttpGet("consultants/{clinicConsultantId}/history")]
    public async Task<IActionResult> GetConsultantHistory(
        int clinicConsultantId,
        [FromQuery] string? patientName,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 2 && roleId != 3) return Forbid();

        var clinicId = await GetUserClinicIdAsync(userId);
        var result = await _service.GetConsultantHistoryAsync(clinicConsultantId, clinicId, patientName, dateFrom, dateTo);
        return Ok(result);
    }

    // ─── ADMIN: KONSULTATSIYA YARATISH ────────────────────────────────────────

    [HttpPost("create")]
    [EnableRateLimiting("general")]
    public async Task<IActionResult> CreateConsultation([FromBody] CreateConsultationDto dto)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 2 && roleId != 3) return Forbid();

        var clinicId = await GetUserClinicIdAsync(userId);
        var (success, error, count) = await _service.CreateConsultationsAsync(dto, userId, clinicId);
        if (!success) return BadRequest(new { message = error });
        return Ok(new { message = $"{count} ta konsultatsiya yaratildi", count });
    }

    // ─── ADMIN: KONSULTATSIYALAR RO'YXATI ─────────────────────────────────────

    [HttpGet("patient-lookup")]
    public async Task<IActionResult> FindPatient([FromQuery] string passportSeries, [FromQuery] DateOnly birthDate)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 2 && roleId != 3) return Forbid();

        if (string.IsNullOrWhiteSpace(passportSeries))
            return BadRequest(new { message = "Passport seriyasi kiritilishi shart" });

        var result = await _service.FindPatientAsync(passportSeries, birthDate);
        return Ok(result);
    }

    [HttpGet("list")]
    public async Task<IActionResult> GetConsultationList(
        [FromQuery] string? status,
        [FromQuery] int? doctorId,
        [FromQuery] string? patientName,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 2 && roleId != 3) return Forbid();

        var clinicId = await GetUserClinicIdAsync(userId);
        var result = await _service.GetConsultationListAsync(clinicId, status, doctorId, patientName, dateFrom, dateTo);
        return Ok(result);
    }

    // ─── ADMIN: KONSULTATSIYA BATAFSIL ───────────────────────────────────────

    [HttpGet("{id}/detail")]
    public async Task<IActionResult> GetConsultationDetail(int id)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 2 && roleId != 3) return Forbid();

        var clinicId = await GetUserClinicIdAsync(userId);
        var result = await _service.GetConsultationDetailAdminAsync(id, clinicId);
        if (result == null) return NotFound(new { message = "Konsultatsiya topilmadi" });
        return Ok(result);
    }

    // ─── ADMIN: LIVEKIT TOKEN ─────────────────────────────────────────────────

    [HttpGet("{id}/livekit-token")]
    [EnableRateLimiting("general")]
    public async Task<IActionResult> GetAdminLiveKitToken(int id)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 2 && roleId != 3) return Forbid();

        var clinicId = await GetUserClinicIdAsync(userId);
        var (success, error, token) = await _service.GetAdminLiveKitTokenAsync(id, userId, clinicId);
        if (!success) return BadRequest(new { message = error });
        return Ok(token);
    }

    // ─── SHIFOKOR: TAKLIFLAR ──────────────────────────────────────────────────

    [HttpGet("invitations")]
    public async Task<IActionResult> GetMyInvitations()
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 4) return Forbid();

        var doctorId = await GetDoctorIdAsync(userId);
        if (doctorId == 0) return NotFound(new { message = "Shifokor topilmadi" });

        var result = await _service.GetMyInvitationsAsync(doctorId);
        return Ok(result);
    }

    // ─── SHIFOKOR: TAKLIFNI QABUL QILISH ─────────────────────────────────────

    [HttpPut("invitations/{id}/accept")]
    public async Task<IActionResult> AcceptInvitation(int id)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 4) return Forbid();

        var doctorId = await GetDoctorIdAsync(userId);
        var (success, error) = await _service.AcceptInvitationAsync(id, doctorId);
        if (!success) return BadRequest(new { message = error });
        return Ok(new { message = "Taklif qabul qilindi" });
    }

    // ─── SHIFOKOR: TAKLIFNI RAD ETISH ────────────────────────────────────────

    [HttpPut("invitations/{id}/reject")]
    public async Task<IActionResult> RejectInvitation(int id)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 4) return Forbid();

        var doctorId = await GetDoctorIdAsync(userId);
        var (success, error) = await _service.RejectInvitationAsync(id, doctorId);
        if (!success) return BadRequest(new { message = error });
        return Ok(new { message = "Taklif rad etildi" });
    }

    // ─── SHIFOKOR: MENING KLINIKALARIM ───────────────────────────────────────

    [HttpGet("my-clinics")]
    public async Task<IActionResult> GetMyClinics()
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 4) return Forbid();

        var doctorId = await GetDoctorIdAsync(userId);
        if (doctorId == 0) return NotFound(new { message = "Shifokor topilmadi" });

        var result = await _service.GetMyClinicsAsync(doctorId);
        return Ok(result);
    }

    // ─── SHIFOKOR: KLINIKA TARIXI ─────────────────────────────────────────────

    [HttpGet("my-clinics/{clinicConsultantId}/history")]
    public async Task<IActionResult> GetDoctorClinicHistory(
        int clinicConsultantId,
        [FromQuery] string? patientName,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 4) return Forbid();

        var doctorId = await GetDoctorIdAsync(userId);
        if (doctorId == 0) return NotFound(new { message = "Shifokor topilmadi" });

        var result = await _service.GetDoctorClinicHistoryAsync(clinicConsultantId, doctorId, patientName, dateFrom, dateTo);
        return Ok(result);
    }

    // ─── SHIFOKOR: MENING KONSULTATSIYALARIM ──────────────────────────────────

    [HttpGet("my-consultations")]
    public async Task<IActionResult> GetMyConsultations([FromQuery] string? status)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 4) return Forbid();

        var doctorId = await GetDoctorIdAsync(userId);
        if (doctorId == 0) return NotFound(new { message = "Shifokor topilmadi" });

        var result = await _service.GetMyConsultationsAsync(doctorId, status);
        return Ok(result);
    }

    // ─── SHIFOKOR: KONSULTATSIYANI QABUL QILISH ───────────────────────────────

    [HttpPut("{id}/accept")]
    public async Task<IActionResult> AcceptConsultation(int id)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 4) return Forbid();

        var doctorId = await GetDoctorIdAsync(userId);
        if (doctorId == 0) return NotFound(new { message = "Shifokor topilmadi" });

        var (success, error) = await _service.AcceptConsultationAsync(id, doctorId);
        if (!success) return BadRequest(new { message = error });
        return Ok(new { message = "Konsultatsiya qabul qilindi" });
    }

    // ─── SHIFOKOR: KONSULTATSIYANI RAD ETISH ──────────────────────────────────

    [HttpPut("{id}/reject")]
    public async Task<IActionResult> RejectConsultation(int id, [FromBody] RejectConsultationDto dto)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 4) return Forbid();

        var doctorId = await GetDoctorIdAsync(userId);
        if (doctorId == 0) return NotFound(new { message = "Shifokor topilmadi" });

        var (success, error) = await _service.RejectConsultationAsync(id, dto.RejectionReason, doctorId);
        if (!success) return BadRequest(new { message = error });
        return Ok(new { message = "Konsultatsiya rad etildi" });
    }

    // ─── SHIFOKOR: KONSULTATSIYA BATAFSIL ────────────────────────────────────

    [HttpGet("{id}/doctor-detail")]
    public async Task<IActionResult> GetDoctorConsultationDetail(int id)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 4) return Forbid();

        var doctorId = await GetDoctorIdAsync(userId);
        if (doctorId == 0) return NotFound(new { message = "Shifokor topilmadi" });

        var result = await _service.GetConsultationDetailDoctorAsync(id, doctorId);
        if (result == null) return NotFound(new { message = "Konsultatsiya topilmadi" });
        return Ok(result);
    }

    // ─── SHIFOKOR: XULOSA YOZISH ─────────────────────────────────────────────

    [HttpPost("{id}/conclude")]
    public async Task<IActionResult> ConcludeConsultation(int id, [FromBody] ConcludeConsultationDto dto)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 4) return Forbid();

        var doctorId = await GetDoctorIdAsync(userId);
        if (doctorId == 0) return NotFound(new { message = "Shifokor topilmadi" });

        var (success, error) = await _service.ConcludeConsultationAsync(id, dto, doctorId);
        if (!success) return BadRequest(new { message = error });
        return Ok(new { message = "Xulosa saqlandi" });
    }

    // ─── SHIFOKOR: LIVEKIT TOKEN ──────────────────────────────────────────────

    [HttpGet("{id}/livekit-token-doctor")]
    [EnableRateLimiting("general")]
    public async Task<IActionResult> GetDoctorLiveKitToken(int id)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 4) return Forbid();

        var doctorId = await GetDoctorIdAsync(userId);
        if (doctorId == 0) return NotFound(new { message = "Shifokor topilmadi" });

        var (success, error, token) = await _service.GetDoctorLiveKitTokenAsync(id, userId, doctorId);
        if (!success) return BadRequest(new { message = error });
        return Ok(token);
    }

    [HttpGet("badge-counts")]
    public async Task<IActionResult> GetBadgeCounts()
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });
        if (roleId != 2 && roleId != 3 && roleId != 4) return Forbid();

        var clinicId = roleId == 2 || roleId == 3 ? await GetUserClinicIdAsync(userId) : 0;
        var doctorId = roleId == 4 ? await GetDoctorIdAsync(userId) : 0;
        var result = await _service.GetBadgeCountsAsync(roleId, clinicId, doctorId);
        return Ok(result);
    }

    // ─── PRIVATE HELPERS ──────────────────────────────────────────────────────

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
