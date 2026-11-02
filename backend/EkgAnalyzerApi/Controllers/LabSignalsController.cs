using EkgAnalyzerApi.Constants;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Services;
using EkgAnalyzerApi.Services.LabRules;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Bitta bemorning laboratoriya xavf signallari — bemor kartasidagi blok (L-26).
///
/// Kim ko'radi va baholaydi (tasdiqlash / rad etish / bekor qilish):
/// <list type="bullet">
/// <item>Admin (2) / Direktor (3) — o'z klinikasining istalgan bemori
/// (statistika sahifasidagi huquq bilan bir xil);</item>
/// <item>Shifokor (4) — faqat bemorlar ro'yxatida ko'radigan bemorlari
/// (<see cref="PatientVisibility"/>: o'zi yuklagan yoki o'ziga
/// biriktirilgan tahlillarning bemorlari) va faqat o'z klinikasidagi
/// signallar.</item>
/// </list>
/// Boshqa rollarga blok ko'rsatilmaydi (<c>canView = false</c>).
/// Klinika statistikasi sahifasi (`/lab-statistics`) avvalgidek faqat 2/3.
/// </summary>
[ApiController]
[Route("api/lab-signals")]
[Authorize]
public class LabSignalsController : ControllerBase
{
    private readonly LabSignalsService _signals;
    private readonly MedDataDB _db;
    private readonly ICurrentUser _currentUser;
    private readonly ILogger<LabSignalsController> _logger;

    public LabSignalsController(LabSignalsService signals, MedDataDB db, ICurrentUser currentUser,
        ILogger<LabSignalsController> logger)
    {
        _signals = signals;
        _db = db;
        _currentUser = currentUser;
        _logger = logger;
    }

    /// <summary>GET api/lab-signals/patient/{patientId} → { canView, items }</summary>
    [HttpGet("patient/{patientId:int}")]
    public async Task<IActionResult> ForPatient(int patientId)
    {
        var user = await LoadUserAsync();
        if (user == null) return Unauthorized(new { message = "Token invalid" });
        if (user.ClinicId is not { } clinicId || !await CanAccessPatientAsync(user, patientId))
            return Ok(new { canView = false, items = Array.Empty<object>() });

        var items = await _signals.GetPatientSignalsAsync(clinicId, patientId);
        return Ok(new { canView = true, items });
    }

    public sealed class ReviewRequest
    {
        /// <summary>confirmed | rejected | pending</summary>
        public string Decision { get; set; } = "";
        public string? Note { get; set; }
    }

    /// <summary>POST api/lab-signals/{id}/review — shifokor qarori.</summary>
    [HttpPost("{id:long}/review")]
    public async Task<IActionResult> Review(long id, [FromBody] ReviewRequest body)
    {
        var user = await LoadUserAsync();
        if (user == null) return Unauthorized(new { message = "Token invalid" });
        if (body.Decision is not ("confirmed" or "rejected" or "pending"))
            return BadRequest(new { message = "invalid_decision" });

        var owner = await _signals.GetOwnerAsync(id);
        // Topilmagan va ruxsat yo'q signal bir xil javob oladi — boshqa
        // klinika signalining mavjudligi oshkor bo'lmasin
        if (owner is not { } o || user.ClinicId != o.ClinicId || !await CanAccessPatientAsync(user, o.PatientId))
            return NotFound(new { message = "signal_not_found" });

        var ok = await _signals.ReviewAsync(o.ClinicId, id, user.Id, body.Decision, body.Note);
        if (ok)
            _logger.LogInformation("Lab xavf signali baholandi: signal={Id}, patient={Patient}, user={User}, qaror={Decision}",
                id, o.PatientId, user.Id, body.Decision);
        return ok ? Ok(new { ok = true }) : NotFound(new { message = "signal_not_found" });
    }

    private async Task<User?> LoadUserAsync()
    {
        var userId = _currentUser.UserId;
        if (userId <= 0) return null;
        return await _db.Users.AsNoTracking().Include(u => u.Doctor).FirstOrDefaultAsync(u => u.Id == userId);
    }

    private async Task<bool> CanAccessPatientAsync(User user, int patientId)
    {
        if (user.ClinicId == null) return false;
        if (user.RoleId is RoleConstants.Admin or RoleConstants.Director) return true;
        if (user.RoleId == RoleConstants.Doctor && user.Doctor != null)
            return await PatientVisibility.VisiblePatientIds(_db, user).ContainsAsync(patientId);
        return false;
    }
}
