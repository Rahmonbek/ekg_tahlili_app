using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

/// <summary>
/// PDF hisobot yuklab olish endpointlari.
/// Har bir endpoint:
///   - [Authorize] JWT tekshiradi
///   - Tahlil klinikasi == foydalanuvchi klinikasi (izolyatsiya)
///   - byte[] → application/pdf response
/// </summary>
[ApiController]
[Route("api/report")]
[Authorize]
public class ReportController : ControllerBase
{
    private readonly PdfReportService _pdf;
    private readonly MedDataDB _context;
    private readonly ILogger<ReportController> _logger;

    public ReportController(
        PdfReportService pdf,
        MedDataDB context,
        ILogger<ReportController> logger)
    {
        _pdf     = pdf;
        _context = context;
        _logger  = logger;
    }

    // ── EKG ─────────────────────────────────────────────────────────────

    /// <summary>GET /api/report/ecg/{id}?lang=uz</summary>
    [HttpGet("ecg/{id:int}")]
    public async Task<IActionResult> DownloadEcg(int id, [FromQuery] string lang = "uz")
    {
        var clinicId = await GetCallerClinicId();
        if (clinicId == null) return Unauthorized(new { message = "Klinika aniqlanmadi" });

        // Klinika izolyatsiyasi
        var exists = await _context.ECGAnalyse
            .AnyAsync(e => e.Id == id && e.ClinicId == clinicId);
        if (!exists) return NotFound(new { message = "Tahlil topilmadi yoki ruxsat yo'q" });

        return await BuildPdfResponse(
            () => _pdf.GenerateEcgReport(id, lang),
            $"nmed_ecg_{id}_{DateTime.Now:ddMMyyyy}.pdf");
    }

    // ── SMAD ─────────────────────────────────────────────────────────────

    /// <summary>GET /api/report/smad/{id}?lang=uz</summary>
    [HttpGet("smad/{id:int}")]
    public async Task<IActionResult> DownloadSmad(int id, [FromQuery] string lang = "uz")
    {
        var clinicId = await GetCallerClinicId();
        if (clinicId == null) return Unauthorized(new { message = "Klinika aniqlanmadi" });

        var exists = await _context.SmadAnalyses
            .AnyAsync(e => e.Id == id && e.ClinicId == clinicId);
        if (!exists) return NotFound(new { message = "Tahlil topilmadi yoki ruxsat yo'q" });

        return await BuildPdfResponse(
            () => _pdf.GenerateSmadReport(id, lang),
            $"nmed_smad_{id}_{DateTime.Now:ddMMyyyy}.pdf");
    }

    // ── Holter ───────────────────────────────────────────────────────────

    /// <summary>GET /api/report/holter/{id}?lang=uz</summary>
    [HttpGet("holter/{id:int}")]
    public async Task<IActionResult> DownloadHolter(int id, [FromQuery] string lang = "uz")
    {
        var clinicId = await GetCallerClinicId();
        if (clinicId == null) return Unauthorized(new { message = "Klinika aniqlanmadi" });

        var exists = await _context.HolterAnalyses
            .AnyAsync(e => e.Id == id && e.ClinicId == clinicId);
        if (!exists) return NotFound(new { message = "Tahlil topilmadi yoki ruxsat yo'q" });

        return await BuildPdfResponse(
            () => _pdf.GenerateHolterReport(id, lang),
            $"nmed_holter_{id}_{DateTime.Now:ddMMyyyy}.pdf");
    }

    // ── Laboratoriya ──────────────────────────────────────────────────────

    /// <summary>GET /api/report/lab/{id}?lang=uz</summary>
    [HttpGet("lab/{id:int}")]
    public async Task<IActionResult> DownloadLab(int id, [FromQuery] string lang = "uz")
    {
        var clinicId = await GetCallerClinicId();
        if (clinicId == null) return Unauthorized(new { message = "Klinika aniqlanmadi" });

        var exists = await _context.LabAnalyse
            .AnyAsync(e => e.Id == id && e.ClinicId == clinicId);
        if (!exists) return NotFound(new { message = "Tahlil topilmadi yoki ruxsat yo'q" });

        return await BuildPdfResponse(
            () => _pdf.GenerateLabReport(id, lang),
            $"nmed_lab_{id}_{DateTime.Now:ddMMyyyy}.pdf");
    }

    // ── Parazitologiya ────────────────────────────────────────────────────

    /// <summary>GET /api/report/parasitology/{id}?lang=uz</summary>
    [HttpGet("parasitology/{id:int}")]
    public async Task<IActionResult> DownloadParasitology(int id, [FromQuery] string lang = "uz")
    {
        var clinicId = await GetCallerClinicId();
        if (clinicId == null) return Unauthorized(new { message = "Klinika aniqlanmadi" });

        var exists = await _context.ParasitologyAnalyses
            .AnyAsync(e => e.Id == id && e.ClinicId == clinicId);
        if (!exists) return NotFound(new { message = "Tahlil topilmadi yoki ruxsat yo'q" });

        return await BuildPdfResponse(
            () => _pdf.GenerateParasitologyReport(id, lang),
            $"nmed_para_{id}_{DateTime.Now:ddMMyyyy}.pdf");
    }

    // ── Combined ──────────────────────────────────────────────────────────

    /// <summary>GET /api/report/combined/{patientId}?lang=uz</summary>
    [HttpGet("combined/{patientId:int}")]
    public async Task<IActionResult> DownloadCombined(int patientId, [FromQuery] string lang = "uz")
    {
        var clinicId = await GetCallerClinicId();
        if (clinicId == null) return Unauthorized(new { message = "Klinika aniqlanmadi" });

        // Ushbu bemorning hech bo'lmasa 1 tahlili shu klinikaga tegishlimi?
        bool hasAccess =
            await _context.ECGAnalyse.AnyAsync(e => e.PatcientId == patientId && e.ClinicId == clinicId) ||
            await _context.SmadAnalyses.AnyAsync(e => e.PatcientId == patientId && e.ClinicId == clinicId) ||
            await _context.HolterAnalyses.AnyAsync(e => e.PatcientId == patientId && e.ClinicId == clinicId) ||
            await _context.LabAnalyse.AnyAsync(e => e.PatcientId == patientId && e.ClinicId == clinicId) ||
            await _context.ParasitologyAnalyses.AnyAsync(e => e.PatcientId == patientId && e.ClinicId == clinicId);

        if (!hasAccess) return NotFound(new { message = "Bemor topilmadi yoki ruxsat yo'q" });

        return await BuildPdfResponse(
            () => _pdf.GenerateCombinedReport(patientId, lang),
            $"nmed_combined_{patientId}_{DateTime.Now:ddMMyyyy}.pdf");
    }

    [HttpGet("consultation/{id:int}")]
    public async Task<IActionResult> DownloadConsultation(int id, [FromQuery] string lang = "uz")
    {
        var userId = GetUserId();
        if (userId == 0) return Unauthorized(new { message = "Token invalid" });

        var roleId = GetRoleId();
        var clinicId = await GetCallerClinicId();
        var hasAccess = false;

        if ((roleId == 2 || roleId == 3) && clinicId.HasValue)
        {
            hasAccess = await _context.Consultations
                .AnyAsync(c => c.Id == id && c.ClinicId == clinicId.Value && c.Conclusion != null);
        }
        else if (roleId == 4)
        {
            var doctorId = await _context.Doctors.AsNoTracking()
                .Where(d => d.UserId == userId)
                .Select(d => d.Id)
                .FirstOrDefaultAsync();

            hasAccess = doctorId > 0 && await _context.Consultations
                .AnyAsync(c => c.Id == id && c.DoctorId == doctorId && c.Conclusion != null);
        }

        if (!hasAccess)
            return NotFound(new { message = "Konsultatsiya xulosasi topilmadi yoki ruxsat yo'q" });

        return await BuildPdfResponse(
            () => _pdf.GenerateConsultationReport(id, lang),
            $"nmed_consultation_{id}_{DateTime.Now:ddMMyyyy}.pdf");
    }

    // ════════════════════════════════════════════════════════════════════
    //  YORDAMCHI METODLAR
    // ════════════════════════════════════════════════════════════════════

    private async Task<IActionResult> BuildPdfResponse(Func<Task<byte[]>> generator, string filename)
    {
        try
        {
            var bytes = await generator();

            Response.Headers["Content-Disposition"] = $"attachment; filename=\"{filename}\"";
            return File(bytes, "application/pdf", filename);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "PDF: tahlil topilmadi — {filename}", filename);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PDF yaratishda xatolik — {filename}", filename);
            return StatusCode(500, new { message = "PDF hujjat yaratishda xatolik yuz berdi" });
        }
    }

    /// <summary>
    /// JWT dan userId → user → clinicId olish.
    /// Mavjud barcha controllerlardagi pattern bilan bir xil.
    /// </summary>
    private async Task<int?> GetCallerClinicId()
    {
        var claim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (claim == null) return null;

        if (!int.TryParse(claim.Value, out var userId)) return null;

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        return user?.ClinicId;
    }

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
}
