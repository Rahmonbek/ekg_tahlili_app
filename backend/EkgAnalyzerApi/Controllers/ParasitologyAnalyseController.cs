using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[ApiController]
[Route("api/parasitology-analyses")]
[Authorize]
public class ParasitologyAnalyseController : ControllerBase
{
    private readonly MedDataDB _context;
    private readonly ParasitologyAnalyseService _service;

    public ParasitologyAnalyseController(MedDataDB context, ParasitologyAnalyseService service)
    {
        _context = context;
        _service = service;
    }

    [HttpPost("save-and-analyze")]
    [EnableRateLimiting("ai-analysis")]
    public async Task<IActionResult> SaveAndAnalyze(
        [FromForm] ParasitologyAnalyseCreateDto dto,
        IFormFile file)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Fayl yuborilmagan" });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".jpg" && ext != ".jpeg" && ext != ".png")
            return BadRequest(new { message = "Faqat JPG/PNG rasmlari qabul qilinadi" });

        var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");

        try
        {
            var result = await _service.SaveAndAnalyzeAsync(file, dto, token);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Tahlil xizmati xatolik", error = ex.Message });
        }
    }

    [HttpGet("get-by-patient-id")]
    public async Task<IActionResult> GetByPatientId([FromQuery] int id, [FromQuery] int page = 1)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var result = await _service.GetByPatientIdAsync(id, page);
        return Ok(result);
    }

    [HttpPost("send-to-ai/{id}")]
    [EnableRateLimiting("ai-analysis")]
    public async Task<IActionResult> SendToAi(int id)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var analysis = await _context.ParasitologyAnalyses.FindAsync(id);
        if (analysis == null)
            return NotFound(new { message = "Tahlil topilmadi" });

        if (analysis.AnalysisStatus != "not_analyzed")
            return BadRequest(new { message = "Faqat 'not_analyzed' statusdagi tahlillar qayta yuborilishi mumkin" });

        var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");

        try
        {
            var result = await _service.SendToAiAsync(id, token);
            if (result == null)
                return StatusCode(500, new { message = "Fayl topilmadi yoki qayta yuborish imkonsiz" });
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "AI yuborish xatolik", error = ex.Message });
        }
    }

    [HttpGet("get-by-clinic")]
    public async Task<IActionResult> GetByClinic(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] int? jiddiylik = null)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        var userId = int.Parse(userIdClaim.Value);
        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
        if (doctor?.ClinicId == null) return BadRequest(new { message = "Klinika aniqlanmadi" });

        var result = await _service.GetByClinicAsync(doctor.ClinicId.Value, page, pageSize, search, status, dateFrom, dateTo, jiddiylik);
        return Ok(result);
    }

    [HttpGet("get-by-doctor")]
    public async Task<IActionResult> GetByDoctor(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] int? jiddiylik = null)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        var userId = int.Parse(userIdClaim.Value);
        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
        if (doctor == null) return BadRequest(new { message = "Shifokor topilmadi" });

        var result = await _service.GetByDoctorAsync(doctor.Id, page, pageSize, search, status, dateFrom, dateTo, jiddiylik);
        return Ok(result);
    }

    [HttpGet("get-by-nurse")]
    public async Task<IActionResult> GetByNurse(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] int? jiddiylik = null)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        var userId = int.Parse(userIdClaim.Value);
        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
        if (doctor == null) return BadRequest(new { message = "Xodim topilmadi" });

        var result = await _service.GetByNurseAsync(doctor.Id, page, pageSize, search, status, dateFrom, dateTo, jiddiylik);
        return Ok(result);
    }

    [HttpGet("statistics")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetStatistics(
        [FromQuery] string? viloyat,
        [FromQuery] string? tuman,
        [FromQuery] string? yiloyAy,
        [FromQuery] string? helminthType,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo)
    {
        try
        {
            var stats = await _service.GetStatisticsAsync(viloyat, tuman, yiloyAy, helminthType, dateFrom, dateTo);
            return Ok(stats);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Statistika xatolik", error = ex.Message });
        }
    }
}
