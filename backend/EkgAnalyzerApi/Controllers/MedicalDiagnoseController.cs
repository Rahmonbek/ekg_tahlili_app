using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.AspNetCore.RateLimiting;

[ApiController]
[Route("api/medical-diagnose")]
[Authorize]
public class MedicalDiagnoseController : ControllerBase
{
    private readonly MedDataDB _context;
    private readonly MedicalDiagnoseService _diagnoseService;
    private readonly PythonApiProxyService _proxyService;

    public MedicalDiagnoseController(MedDataDB context, MedicalDiagnoseService diagnoseService, PythonApiProxyService proxyService)
    {
        _context = context;
        _diagnoseService = diagnoseService;
        _proxyService = proxyService;
    }


    // Frontend chaqiradigan to'g'ri nom (eski "diognose" — imlo xatosi edi)
    [HttpGet("get-medical-diagnose-by-patcient-id")]
    [HttpGet("get-diognose-by-patcient-id")]  // Backward compatibility
    public async Task<IActionResult> GetECGAnalysesByPatientId(int id, int page = 1)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var results = await _diagnoseService.GetMedicalDiagnosesByPatientIdAsync(id, page, 5);

        return Ok(results);
    }

    /// <summary>
    /// Tibbiy tashxis faylini saqlash (Python API ga proxy)
    /// POST api/med-diagnose/save
    /// </summary>
    [HttpPost("save")]
    [EnableRateLimiting("ai-analysis")]
    public async Task<IActionResult> Save()
    {
        var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
        try
        {
            var response = await _proxyService.ProxyMultipartAsync("/api/med-diagnoses-save", Request, token);
            return await ProxyHttpResponseMapper.ToContentResultAsync(response);
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = "AI tahlil xizmati bilan bog'lanib bo'lmadi", error = ex.Message });
        }
    }
    [HttpGet("get-by-clinic")]
    public async Task<IActionResult> GetByClinic(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,

        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.ClinicId == null)
            return Unauthorized(new { message = "Klinika aniqlanmadi" });

        var userClinicId = user.ClinicId.Value;

        var results = await _diagnoseService.GetMedicalDiagnoseAnalysesByClinicIdAsync(
            userClinicId, page, pageSize, search, dateFrom, dateTo);

        return Ok(results);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _diagnoseService.GetMedicalDiagnoseByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    // ── Shifokor bo'yicha endpointlar ─────────────────────────────────────────

    [HttpGet("get-by-doctor")]
    public async Task<IActionResult> GetByDoctor(
        int page = 1, int pageSize = 10,
        string? search = null,
        DateTime? dateFrom = null, DateTime? dateTo = null)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);
        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
        if (doctor == null) return NotFound(new { message = "Shifokor topilmadi" });

        var results = await _diagnoseService.GetMedicalDiagnosesByDoctorAsync(
            doctor.Id, page, pageSize, search, dateFrom, dateTo);
        return Ok(results);
    }

    [HttpGet("unviewed-count")]
    public async Task<IActionResult> GetUnviewedCount()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);
        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
        if (doctor == null) return Ok(new { count = 0 });

        var count = await _diagnoseService.GetUnviewedDiagnosesCountByDoctorAsync(doctor.Id);
        return Ok(new { count });
    }

    [HttpPut("mark-viewed")]
    public async Task<IActionResult> MarkViewed()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);
        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
        if (doctor == null) return NotFound(new { message = "Shifokor topilmadi" });

        await _diagnoseService.MarkDiagnosesViewedByDoctorAsync(doctor.Id);
        return Ok(new { success = true });
    }

    // ── Hamshira bo'yicha endpointlar ─────────────────────────────────────────

    [HttpGet("get-by-nurse")]
    public async Task<IActionResult> GetByNurse(
        int page = 1, int pageSize = 10,
        string? search = null,
        DateTime? dateFrom = null, DateTime? dateTo = null)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);
        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
        if (doctor == null) return NotFound(new { message = "Hamshira topilmadi" });

        var results = await _diagnoseService.GetDiagnosesByNurseAsync(
            doctor.Id, page, pageSize, search, dateFrom, dateTo);
        return Ok(results);
    }

}
