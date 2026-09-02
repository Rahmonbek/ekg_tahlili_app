using System.Text.Json;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services;

/// <summary>Yumshoq o'chirish natijasi.</summary>
public enum DeleteOutcome
{
    Ok,
    NotFound,
    AlreadyDeleted,
    ReasonRequired,
}

/// <summary>
/// Tahlillarni yumshoq o'chirish (soft delete) va tiklash.
///
/// Nima uchun alohida xizmat: beshta tahlil turi uchun bir xil qoidalar amal
/// qiladi — klinika tekshiruvi, majburiy sabab, audit yozuvi. Ularni har bir
/// controller ichida takrorlash qoidaning bir joyda unutilishiga olib keladi.
///
/// Yozuv HECH QACHON fizik o'chirilmaydi: `deleted_at` qo'yiladi, global
/// query filter uni barcha so'rovlardan chiqarib tashlaydi. Fayl ham diskda
/// qoladi — tibbiy hujjatni tiklash talab qilinishi mumkin.
/// </summary>
public class AnalysisDeletionService
{
    private readonly MedDataDB _context;
    private readonly ILogger<AnalysisDeletionService> _logger;

    /// <summary>Sabab kamida shuncha belgidan iborat bo'lishi kerak.</summary>
    public const int MinReasonLength = 5;

    public AnalysisDeletionService(MedDataDB context, ILogger<AnalysisDeletionService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Tahlilni yumshoq o'chiradi va `audit_logs` ga yozuv qo'shadi.
    /// </summary>
    /// <param name="type">"ecg" | "lab" | "holter" | "smad" | "diagnose"</param>
    /// <param name="restrictToCreatorDoctorId">
    /// null bo'lsa — cheklovsiz (Admin/Direktor har qanday tahlilni o'chiradi).
    /// Qiymat berilsa — FAQAT shu doktor yaratgan (CreatedDoctorId) tahlil
    /// o'chiriladi. Shifokor/hamshira faqat O'ZI yuklagan tahlilni o'chirsin.
    /// </param>
    public async Task<DeleteOutcome> DeleteAsync(
        string type, int id, int clinicId, int userId, string? username, string? reason,
        int? restrictToCreatorDoctorId = null)
    {
        if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length < MinReasonLength)
            return DeleteOutcome.ReasonRequired;

        reason = reason.Trim();
        var now = DateTime.UtcNow;

        // `IgnoreQueryFilters` kerak: allaqachon o'chirilgan yozuvni ham topib,
        // "topilmadi" o'rniga aniq "allaqachon o'chirilgan" javobini berish uchun.
        switch (type)
        {
            case "ecg":
            {
                var e = await _context.ECGAnalyse.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId
                        && (restrictToCreatorDoctorId == null || x.CreatedDoctorId == restrictToCreatorDoctorId));
                if (e == null) return DeleteOutcome.NotFound;
                if (e.DeletedAt != null) return DeleteOutcome.AlreadyDeleted;
                e.DeletedAt = now; e.DeletedByUserId = userId; e.DeleteReason = reason;
                break;
            }
            case "lab":
            {
                var e = await _context.LabAnalyse.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId
                        && (restrictToCreatorDoctorId == null || x.CreatedDoctorId == restrictToCreatorDoctorId));
                if (e == null) return DeleteOutcome.NotFound;
                if (e.DeletedAt != null) return DeleteOutcome.AlreadyDeleted;
                e.DeletedAt = now; e.DeletedByUserId = userId; e.DeleteReason = reason;
                break;
            }
            case "holter":
            {
                var e = await _context.HolterAnalyses.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId
                        && (restrictToCreatorDoctorId == null || x.CreatedDoctorId == restrictToCreatorDoctorId));
                if (e == null) return DeleteOutcome.NotFound;
                if (e.DeletedAt != null) return DeleteOutcome.AlreadyDeleted;
                e.DeletedAt = now; e.DeletedByUserId = userId; e.DeleteReason = reason;
                break;
            }
            case "smad":
            {
                var e = await _context.SmadAnalyses.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId
                        && (restrictToCreatorDoctorId == null || x.CreatedDoctorId == restrictToCreatorDoctorId));
                if (e == null) return DeleteOutcome.NotFound;
                if (e.DeletedAt != null) return DeleteOutcome.AlreadyDeleted;
                e.DeletedAt = now; e.DeletedByUserId = userId; e.DeleteReason = reason;
                break;
            }
            case "diagnose":
            {
                var e = await _context.MedicalDiagnose.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId
                        && (restrictToCreatorDoctorId == null || x.CreatedDoctorId == restrictToCreatorDoctorId));
                if (e == null) return DeleteOutcome.NotFound;
                if (e.DeletedAt != null) return DeleteOutcome.AlreadyDeleted;
                e.DeletedAt = now; e.DeletedByUserId = userId; e.DeleteReason = reason;
                break;
            }
            default:
                return DeleteOutcome.NotFound;
        }

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            Username = username,
            Action = "ANALYSIS_SOFT_DELETE",
            EntityType = type,
            EntityId = id.ToString(),
            NewValues = JsonSerializer.Serialize(new { deletedAt = now, reason }),
            HttpMethod = "DELETE",
            CreatedAt = now,
        });

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Tahlil yumshoq o'chirildi: {Type}#{Id}, klinika {ClinicId}, foydalanuvchi {UserId}",
            type, id, clinicId, userId);

        return DeleteOutcome.Ok;
    }

    /// <summary>
    /// O'chirilgan tahlilni tiklaydi (SuperAdmin uchun).
    /// </summary>
    public async Task<DeleteOutcome> RestoreAsync(string type, int id, int userId, string? username)
    {
        var now = DateTime.UtcNow;

        switch (type)
        {
            case "ecg":
            {
                var e = await _context.ECGAnalyse.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id);
                if (e == null) return DeleteOutcome.NotFound;
                e.DeletedAt = null; e.DeletedByUserId = null; e.DeleteReason = null;
                break;
            }
            case "lab":
            {
                var e = await _context.LabAnalyse.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id);
                if (e == null) return DeleteOutcome.NotFound;
                e.DeletedAt = null; e.DeletedByUserId = null; e.DeleteReason = null;
                break;
            }
            case "holter":
            {
                var e = await _context.HolterAnalyses.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id);
                if (e == null) return DeleteOutcome.NotFound;
                e.DeletedAt = null; e.DeletedByUserId = null; e.DeleteReason = null;
                break;
            }
            case "smad":
            {
                var e = await _context.SmadAnalyses.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id);
                if (e == null) return DeleteOutcome.NotFound;
                e.DeletedAt = null; e.DeletedByUserId = null; e.DeleteReason = null;
                break;
            }
            case "diagnose":
            {
                var e = await _context.MedicalDiagnose.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id);
                if (e == null) return DeleteOutcome.NotFound;
                e.DeletedAt = null; e.DeletedByUserId = null; e.DeleteReason = null;
                break;
            }
            default:
                return DeleteOutcome.NotFound;
        }

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            Username = username,
            Action = "ANALYSIS_RESTORE",
            EntityType = type,
            EntityId = id.ToString(),
            HttpMethod = "POST",
            CreatedAt = now,
        });

        await _context.SaveChangesAsync();
        return DeleteOutcome.Ok;
    }
}
