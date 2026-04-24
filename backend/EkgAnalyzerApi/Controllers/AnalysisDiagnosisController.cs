using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EkgAnalyzerApi.Controllers;

/// <summary>
/// Tahlil tashxislari — CRUD.
/// Shifokor (4), Admin (2), Direktor (3) yoza oladi.
/// Shifokor faqat o'zi yozgan tashxisni tahrirlash/o'chirish mumkin.
/// </summary>
[ApiController]
[Route("api/analysis-diagnosis")]
[Authorize]
public class AnalysisDiagnosisController : ControllerBase
{
    private readonly MedDataDB _context;
    private static readonly HashSet<string> ValidTypes = new() { "ecg", "holter", "smad", "lab", "para" };

    public AnalysisDiagnosisController(MedDataDB context)
    {
        _context = context;
    }

    // ── GET /api/analysis-diagnosis?type=ecg&analysisId=123 ──────────
    [HttpGet]
    public async Task<IActionResult> GetByAnalysis(
        [FromQuery] string type, [FromQuery] int analysisId)
    {
        if (!ValidTypes.Contains(type))
            return BadRequest(new { message = "Noto'g'ri tahlil turi" });

        var diagnoses = await _context.AnalysisDiagnoses
            .Where(d => d.AnalysisType == type && d.AnalysisId == analysisId)
            .Include(d => d.Doctor)
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new
            {
                d.Id,
                d.DiagnosisText,
                d.DoctorId,
                doctorName = (d.Doctor.LastName ?? "") + " " + (d.Doctor.FirstName ?? ""),
                d.CreatedAt,
                d.UpdatedAt,
            })
            .ToListAsync();

        return Ok(diagnoses);
    }

    // ── POST /api/analysis-diagnosis ─────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] DiagnosisRequest req)
    {
        if (!ValidTypes.Contains(req.AnalysisType))
            return BadRequest(new { message = "Noto'g'ri tahlil turi" });

        if (string.IsNullOrWhiteSpace(req.DiagnosisText))
            return BadRequest(new { message = "Tashxis matni bo'sh" });

        var (doctor, error) = await GetCurrentDoctor();
        if (error != null) return error;

        // Shifokor bu tahlilga tayinlanganligini tekshirish
        if (!await IsDoctorAssigned(req.AnalysisType, req.AnalysisId, doctor!.Id))
            return Forbid();

        var entity = new AnalysisDiagnosis
        {
            AnalysisType = req.AnalysisType,
            AnalysisId = req.AnalysisId,
            DoctorId = doctor!.Id,
            DiagnosisText = req.DiagnosisText.Trim(),
            ClinicId = (await GetCurrentUser())?.ClinicId,
        };

        _context.AnalysisDiagnoses.Add(entity);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            entity.Id,
            entity.DiagnosisText,
            entity.DoctorId,
            doctorName = (doctor.LastName ?? "") + " " + (doctor.FirstName ?? ""),
            entity.CreatedAt,
        });
    }

    // ── PUT /api/analysis-diagnosis/{id} ─────────────────────────────
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] DiagnosisUpdateRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.DiagnosisText))
            return BadRequest(new { message = "Tashxis matni bo'sh" });

        var (doctor, error) = await GetCurrentDoctor();
        if (error != null) return error;

        var entity = await _context.AnalysisDiagnoses.FindAsync(id);
        if (entity == null) return NotFound();

        // Faqat o'zi yozganini o'zgartira oladi (admin ham o'zini)
        var user = await GetCurrentUser();
        if (entity.DoctorId != doctor!.Id && user!.RoleId > 3)
            return Forbid();

        entity.DiagnosisText = req.DiagnosisText.Trim();
        await _context.SaveChangesAsync();

        return Ok(new { entity.Id, entity.DiagnosisText, entity.UpdatedAt });
    }

    // ── DELETE /api/analysis-diagnosis/{id} ───────────────────────────
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var (doctor, error) = await GetCurrentDoctor();
        if (error != null) return error;

        var entity = await _context.AnalysisDiagnoses.FindAsync(id);
        if (entity == null) return NotFound();

        var user = await GetCurrentUser();
        if (entity.DoctorId != doctor!.Id && user!.RoleId > 3)
            return Forbid();

        _context.AnalysisDiagnoses.Remove(entity);
        await _context.SaveChangesAsync();

        return Ok(new { success = true });
    }

    // ── GET /api/analysis-diagnosis/has-diagnosis?type=ecg&ids=1,2,3 ─
    /// <summary>Batch check — list sahifasi uchun tashxis bor/yo'qligini tekshirish</summary>
    [HttpGet("has-diagnosis")]
    public async Task<IActionResult> HasDiagnosis(
        [FromQuery] string type, [FromQuery] string ids)
    {
        if (!ValidTypes.Contains(type))
            return BadRequest(new { message = "Noto'g'ri tahlil turi" });

        var idList = ids.Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(s => int.TryParse(s.Trim(), out var v) ? v : 0)
            .Where(v => v > 0)
            .ToList();

        var withDiagnosis = await _context.AnalysisDiagnoses
            .Where(d => d.AnalysisType == type && idList.Contains(d.AnalysisId))
            .Select(d => d.AnalysisId)
            .Distinct()
            .ToListAsync();

        return Ok(withDiagnosis); // [1, 3, 7] — bu ID lar tashxisga ega
    }

    // ════════════════════════════════════════════════════════════════
    //  HELPERS
    // ════════════════════════════════════════════════════════════════

    private async Task<(Doctor? doctor, IActionResult? error)> GetCurrentDoctor()
    {
        var user = await GetCurrentUser();
        if (user == null) return (null, Unauthorized(new { message = "Token invalid" }));

        // Admin/Direktor uchun doctor table dan qidirish
        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == user.Id);
        if (doctor == null)
            return (null, NotFound(new { message = "Shifokor topilmadi" }));

        return (doctor, null);
    }

    private async Task<User?> GetCurrentUser()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return null;
        return await _context.Users.FindAsync(int.Parse(userIdClaim.Value));
    }

    private async Task<bool> IsDoctorAssigned(string type, int analysisId, int doctorId)
    {
        // Admin/Direktor har qanday tahlilga yozishi mumkin
        var user = await GetCurrentUser();
        if (user != null && user.RoleId <= 3) return true;

        return type switch
        {
            "ecg" => await _context.ECGAnalyseDoctor
                .AnyAsync(d => d.ECGAnalysesId == analysisId && d.DoctorId == doctorId),
            "holter" => await _context.HolterAnalyseDoctor
                .AnyAsync(d => d.HolterAnalysesId == analysisId && d.DoctorId == doctorId),
            "smad" => await _context.SmadAnalyseDoctor
                .AnyAsync(d => d.SmadAnalysesId == analysisId && d.DoctorId == doctorId),
            "lab" => await _context.LabAnalyseDoctor
                .AnyAsync(d => d.LabAnalysesId == analysisId && d.DoctorId == doctorId),
            "para" => await _context.ParasitologyAnalysisDoctors
                .AnyAsync(d => d.ParasitologyAnalysisId == analysisId && d.DoctorId == doctorId),
            _ => false,
        };
    }
}

public record DiagnosisRequest(string AnalysisType, int AnalysisId, string DiagnosisText);
public record DiagnosisUpdateRequest(string DiagnosisText);
