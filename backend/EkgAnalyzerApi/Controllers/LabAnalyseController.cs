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
[Route("api/lab-analyses")]
[Authorize]
public class LabAnalyseController : ControllerBase
{
    private readonly MedDataDB _context;
    private readonly LabAnalyseService _labService;
    private readonly PythonApiProxyService _proxyService;

    public LabAnalyseController(MedDataDB context, LabAnalyseService labService, PythonApiProxyService proxyService)
    {
        _context = context;
        _labService = labService;
        _proxyService = proxyService;
    }


    [HttpGet("get-lab-analyses-by-patcient-id")]
    public async Task<IActionResult> GetLabAnalysesByPatientId(int id, int page = 1)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var results = await _labService.GetLabAnalysesByPatientIdAsync(id, page, 5);

        return Ok(results);
    }

    /// <summary>
    /// Lab faylni tahlil qilish (Python API ga proxy)
    /// POST api/lab-analyses/analyze
    /// </summary>
    [HttpPost("analyze")]
    [EnableRateLimiting("ai-analysis")]
    public async Task<IActionResult> Analyze()
    {
        var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
        try
        {
            var response = await _proxyService.ProxyMultipartAsync("/lab/analyze", Request, token);
            var content = await response.Content.ReadAsStringAsync();
            return Content(content, "application/json");
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
        [FromQuery] int? status = null,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] int? automaticAnalysisBool = null,
        [FromQuery] bool? hasDiagnosis = null)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.ClinicId == null)
            return Unauthorized(new { message = "Klinika aniqlanmadi" });

        var results = await _labService.GetLabAnalysesByClinicIdAsync(
            user.ClinicId.Value, page, pageSize, search, status, dateFrom, dateTo, automaticAnalysisBool, hasDiagnosis);

        return Ok(results);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _labService.GetLabAnalyseByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    // ── Shifokor bo'yicha endpointlar ─────────────────────────────────────────

    [HttpGet("get-by-doctor")]
    public async Task<IActionResult> GetByDoctor(
        int page = 1, int pageSize = 10,
        string? search = null, int? status = null,
        DateTime? dateFrom = null, DateTime? dateTo = null,
        bool? hasDiagnosis = null)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);
        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
        if (doctor == null) return NotFound(new { message = "Shifokor topilmadi" });

        var results = await _labService.GetLabAnalysesByDoctorAsync(
            doctor.Id, page, pageSize, search, status, dateFrom, dateTo, hasDiagnosis);
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

        var count = await _labService.GetUnviewedLabCountByDoctorAsync(doctor.Id);
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

        await _labService.MarkLabViewedByDoctorAsync(doctor.Id);
        return Ok(new { success = true });
    }

    // ── Hamshira bo'yicha endpointlar ─────────────────────────────────────────

    [HttpGet("get-by-nurse")]
    public async Task<IActionResult> GetByNurse(
        int page = 1, int pageSize = 10,
        string? search = null, int? status = null,
        DateTime? dateFrom = null, DateTime? dateTo = null,
        bool? hasDiagnosis = null)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);
        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
        if (doctor == null) return NotFound(new { message = "Hamshira topilmadi" });

        var results = await _labService.GetLabAnalysesByNurseAsync(
            doctor.Id, page, pageSize, search, status, dateFrom, dateTo, hasDiagnosis);
        return Ok(results);
    }

}