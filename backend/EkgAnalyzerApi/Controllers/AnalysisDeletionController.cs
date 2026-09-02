using EkgAnalyzerApi.Constants;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Controllers;

/// <summary>So'rov tanasi: o'chirish sababi.</summary>
public class DeleteAnalysisRequest
{
    public string? Reason { get; set; }
}

/// <summary>
/// Tahlillarni yumshoq o'chirish va tiklash.
///
/// Beshta tahlil turi uchun bitta endpoint: qoidalar (klinika tekshiruvi,
/// majburiy sabab, audit yozuvi) barcha turlar uchun bir xil, shuning uchun
/// ularni beshta controller'ga ko'chirib yozish faqat farqlanish xavfini
/// oshirardi.
/// </summary>
[ApiController]
[Route("api/analyses")]
[Authorize]
public class AnalysisDeletionController : ControllerBase
{
    private static readonly string[] AllowedTypes = { "ecg", "lab", "holter", "smad", "diagnose" };

    private readonly AnalysisDeletionService _deletion;
    private readonly ICurrentUser _currentUser;
    private readonly MedDataDB _context;

    public AnalysisDeletionController(
        AnalysisDeletionService deletion, ICurrentUser currentUser, MedDataDB context)
    {
        _deletion = deletion;
        _currentUser = currentUser;
        _context = context;
    }

    /// <summary>
    /// Tahlilni o'chiradi (yumshoq). Admin/Direktor — klinikadagi HAR QANDAY
    /// tahlilni; Shifokor/Hamshira — FAQAT o'zi yuklagan tahlilni.
    /// Sabab majburiy — audit uchun.
    /// </summary>
    [HttpDelete("{type}/{id:int}")]
    public async Task<IActionResult> Delete(string type, int id, [FromBody] DeleteAnalysisRequest body)
    {
        type = (type ?? string.Empty).ToLowerInvariant();
        if (!AllowedTypes.Contains(type))
            return BadRequest(new { message = "Noma'lum tahlil turi" });

        var clinicId = await _currentUser.GetClinicIdAsync();
        if (clinicId == null)
            return Unauthorized(new { message = "Klinika aniqlanmadi" });

        var me = await _context.Users
            .Where(u => u.Id == _currentUser.UserId)
            .Select(u => new { u.Email, u.RoleId })
            .FirstOrDefaultAsync();
        if (me == null)
            return Unauthorized(new { message = "Foydalanuvchi topilmadi" });

        // Admin (2) / Direktor (3) — cheklovsiz. Shifokor (4) / Hamshira (5) —
        // faqat o'zi yuklagan tahlilni o'chira oladi. Boshqa rollar o'chira olmaydi.
        int? restrictToCreatorDoctorId = null;
        bool isManager = me.RoleId == RoleConstants.Admin || me.RoleId == RoleConstants.Director;
        if (!isManager)
        {
            if (me.RoleId != RoleConstants.Doctor && me.RoleId != RoleConstants.Nurse)
                return Forbid();

            var myDoctorId = await _context.Doctors
                .Where(d => d.UserId == _currentUser.UserId)
                .Select(d => (int?)d.Id)
                .FirstOrDefaultAsync();
            if (myDoctorId == null)
                return Forbid();
            restrictToCreatorDoctorId = myDoctorId;
        }

        var outcome = await _deletion.DeleteAsync(
            type, id, clinicId.Value, _currentUser.UserId, me.Email, body?.Reason,
            restrictToCreatorDoctorId);

        return outcome switch
        {
            DeleteOutcome.Ok => Ok(new { message = "Tahlil o'chirildi" }),
            DeleteOutcome.AlreadyDeleted => Conflict(new { message = "Tahlil allaqachon o'chirilgan" }),
            DeleteOutcome.ReasonRequired => BadRequest(new
            {
                message = $"O'chirish sababi majburiy (kamida {AnalysisDeletionService.MinReasonLength} belgi)"
            }),
            _ => NotFound(new { message = "Tahlil topilmadi yoki ruxsat yo'q" }),
        };
    }

    /// <summary>O'chirilgan tahlilni tiklaydi. Faqat SuperAdmin.</summary>
    [HttpPost("{type}/{id:int}/restore")]
    [Authorize(Policy = RoleConstants.PolicySuperAdmin)]
    public async Task<IActionResult> Restore(string type, int id)
    {
        type = (type ?? string.Empty).ToLowerInvariant();
        if (!AllowedTypes.Contains(type))
            return BadRequest(new { message = "Noma'lum tahlil turi" });

        var outcome = await _deletion.RestoreAsync(type, id, _currentUser.UserId, null);
        return outcome == DeleteOutcome.Ok
            ? Ok(new { message = "Tahlil tiklandi" })
            : NotFound(new { message = "Tahlil topilmadi" });
    }

    /// <summary>
    /// O'z klinikasida o'chirilgan tahlillar ro'yxati (Admin/Direktor).
    /// "Nima uchun bu tahlil yo'qoldi?" degan savolga javob beradi.
    /// </summary>
    [HttpGet("deleted")]
    [Authorize(Policy = RoleConstants.PolicyClinicManager)]
    public async Task<IActionResult> GetDeleted()
    {
        var clinicId = await _currentUser.GetClinicIdAsync();
        if (clinicId == null)
            return Unauthorized(new { message = "Klinika aniqlanmadi" });

        var ecg = await _context.ECGAnalyse.IgnoreQueryFilters().AsNoTracking()
            .Where(x => x.ClinicId == clinicId && x.DeletedAt != null)
            .Select(x => new { type = "ecg", x.Id, x.DocumentNumber, x.DeletedAt, x.DeleteReason, x.DeletedByUserId })
            .ToListAsync();
        var lab = await _context.LabAnalyse.IgnoreQueryFilters().AsNoTracking()
            .Where(x => x.ClinicId == clinicId && x.DeletedAt != null)
            .Select(x => new { type = "lab", x.Id, x.DocumentNumber, x.DeletedAt, x.DeleteReason, x.DeletedByUserId })
            .ToListAsync();
        var holter = await _context.HolterAnalyses.IgnoreQueryFilters().AsNoTracking()
            .Where(x => x.ClinicId == clinicId && x.DeletedAt != null)
            .Select(x => new { type = "holter", x.Id, x.DocumentNumber, x.DeletedAt, x.DeleteReason, x.DeletedByUserId })
            .ToListAsync();
        var smad = await _context.SmadAnalyses.IgnoreQueryFilters().AsNoTracking()
            .Where(x => x.ClinicId == clinicId && x.DeletedAt != null)
            .Select(x => new { type = "smad", x.Id, x.DocumentNumber, x.DeletedAt, x.DeleteReason, x.DeletedByUserId })
            .ToListAsync();
        var diagnose = await _context.MedicalDiagnose.IgnoreQueryFilters().AsNoTracking()
            .Where(x => x.ClinicId == clinicId && x.DeletedAt != null)
            .Select(x => new { type = "diagnose", x.Id, DocumentNumber = (string?)null, x.DeletedAt, x.DeleteReason, x.DeletedByUserId })
            .ToListAsync();

        var all = ecg.Concat(lab).Concat(holter).Concat(smad).Concat(diagnose)
            .OrderByDescending(x => x.DeletedAt)
            .ToList();

        return Ok(new { data = all, totalCount = all.Count });
    }
}
