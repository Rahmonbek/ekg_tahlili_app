using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Controllers;

/// <summary>
/// Shifokor profil paneli: unga tayinlangan (yuborilgan) tahlillar bo'yicha
/// statistika va HALI XULOSA YOZILMAGAN tahlillar ro'yxati.
///
/// "Xulosa yozilmagan" = shu shifokor tomonidan `AnalysisDiagnosis` yozuvi yo'q.
/// Faqat shifokor (roleId=4) uchun.
/// </summary>
[ApiController]
[Route("api/doctor-dashboard")]
[Authorize]
public class DoctorDashboardController : ControllerBase
{
    private readonly MedDataDB _context;
    private readonly ICurrentUser _currentUser;

    public DoctorDashboardController(MedDataDB context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public class DashboardItem
    {
        public string Type { get; set; } = "";
        public int Id { get; set; }
        public string? DocumentNumber { get; set; }
        public string? PatientName { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? AnalysisDate { get; set; }
        public int? Status { get; set; }
        public string? AiAnswerData { get; set; }
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int limit = 12)
    {
        var doctorId = await _context.Doctors
            .Where(d => d.UserId == _currentUser.UserId)
            .Select(d => (int?)d.Id)
            .FirstOrDefaultAsync();
        if (doctorId == null)
            return Ok(new { assigned = 0, pending = 0, concluded = 0, byType = EmptyByType(), items = Array.Empty<object>() });

        var did = doctorId.Value;
        if (limit < 1) limit = 12;
        if (limit > 50) limit = 50;

        // ── Har tur uchun: tayinlangan va xulosa yozilmaganlar soni ──
        var assignedEcg = _context.ECGAnalyse.AsNoTracking().Where(a => a.Doctors!.Any(d => d.DoctorId == did));
        var assignedHolter = _context.HolterAnalyses.AsNoTracking().Where(a => a.Doctors!.Any(d => d.DoctorId == did));
        var assignedSmad = _context.SmadAnalyses.AsNoTracking().Where(a => a.Doctors!.Any(d => d.DoctorId == did));
        var assignedLab = _context.LabAnalyse.AsNoTracking().Where(a => a.Doctors!.Any(d => d.DoctorId == did));

        bool NoDiag(string type, int id) => !_context.AnalysisDiagnoses
            .Any(x => x.AnalysisType == type && x.AnalysisId == id && x.DoctorId == did);

        var ecgAssigned = await assignedEcg.CountAsync();
        var holterAssigned = await assignedHolter.CountAsync();
        var smadAssigned = await assignedSmad.CountAsync();
        var labAssigned = await assignedLab.CountAsync();

        var ecgPending = await assignedEcg.Where(a => !_context.AnalysisDiagnoses.Any(x => x.AnalysisType == "ecg" && x.AnalysisId == a.Id && x.DoctorId == did)).CountAsync();
        var holterPending = await assignedHolter.Where(a => !_context.AnalysisDiagnoses.Any(x => x.AnalysisType == "holter" && x.AnalysisId == a.Id && x.DoctorId == did)).CountAsync();
        var smadPending = await assignedSmad.Where(a => !_context.AnalysisDiagnoses.Any(x => x.AnalysisType == "smad" && x.AnalysisId == a.Id && x.DoctorId == did)).CountAsync();
        var labPending = await assignedLab.Where(a => !_context.AnalysisDiagnoses.Any(x => x.AnalysisType == "lab" && x.AnalysisId == a.Id && x.DoctorId == did)).CountAsync();

        // ── Xulosa yozilmagan tahlillar ro'yxati (barcha tur, eng yangilari) ──
        var items = new List<DashboardItem>();

        items.AddRange(await assignedEcg
            .Where(a => !_context.AnalysisDiagnoses.Any(x => x.AnalysisType == "ecg" && x.AnalysisId == a.Id && x.DoctorId == did))
            .OrderByDescending(a => a.CreatedAt).Take(limit)
            .Select(a => new DashboardItem { Type = "ecg", Id = a.Id, DocumentNumber = a.DocumentNumber, CreatedAt = a.CreatedAt, AnalysisDate = a.AnalysisDate, Status = a.Status, AiAnswerData = a.AIAnswerData, PatientName = a.Patcient!.LastName + " " + a.Patcient.FirstName }).ToListAsync());

        items.AddRange(await assignedHolter
            .Where(a => !_context.AnalysisDiagnoses.Any(x => x.AnalysisType == "holter" && x.AnalysisId == a.Id && x.DoctorId == did))
            .OrderByDescending(a => a.CreatedAt).Take(limit)
            .Select(a => new DashboardItem { Type = "holter", Id = a.Id, DocumentNumber = a.DocumentNumber, CreatedAt = a.CreatedAt, AnalysisDate = a.AnalysisDate, Status = a.Status, AiAnswerData = a.AIAnswerData, PatientName = a.Patcient!.LastName + " " + a.Patcient.FirstName }).ToListAsync());

        items.AddRange(await assignedSmad
            .Where(a => !_context.AnalysisDiagnoses.Any(x => x.AnalysisType == "smad" && x.AnalysisId == a.Id && x.DoctorId == did))
            .OrderByDescending(a => a.CreatedAt).Take(limit)
            .Select(a => new DashboardItem { Type = "smad", Id = a.Id, DocumentNumber = a.DocumentNumber, CreatedAt = a.CreatedAt, AnalysisDate = a.AnalysisDate, Status = a.Status, AiAnswerData = a.AIAnswerData, PatientName = a.Patcient!.LastName + " " + a.Patcient.FirstName }).ToListAsync());

        items.AddRange(await assignedLab
            .Where(a => !_context.AnalysisDiagnoses.Any(x => x.AnalysisType == "lab" && x.AnalysisId == a.Id && x.DoctorId == did))
            .OrderByDescending(a => a.CreatedAt).Take(limit)
            .Select(a => new DashboardItem { Type = "lab", Id = a.Id, DocumentNumber = a.DocumentNumber, CreatedAt = a.CreatedAt, AnalysisDate = a.AnalysisDate, Status = a.Status, AiAnswerData = a.AIAnswerData, PatientName = a.Patcient!.LastName + " " + a.Patcient.FirstName }).ToListAsync());

        var top = items
            .OrderByDescending(x => x.CreatedAt)
            .Take(limit)
            .Select(x => new
            {
                x.Type,
                x.Id,
                x.DocumentNumber,
                x.PatientName,
                x.CreatedAt,
                x.AnalysisDate,
                x.Status,
                severity = AiSeverity.Parse(x.AiAnswerData),
            })
            .ToList();

        var pending = ecgPending + holterPending + smadPending + labPending;
        var assigned = ecgAssigned + holterAssigned + smadAssigned + labAssigned;

        return Ok(new
        {
            assigned,
            pending,
            concluded = assigned - pending,
            byType = new
            {
                ecg = new { assigned = ecgAssigned, pending = ecgPending },
                holter = new { assigned = holterAssigned, pending = holterPending },
                smad = new { assigned = smadAssigned, pending = smadPending },
                lab = new { assigned = labAssigned, pending = labPending },
            },
            items = top,
        });
    }

    private static object EmptyByType() => new
    {
        ecg = new { assigned = 0, pending = 0 },
        holter = new { assigned = 0, pending = 0 },
        smad = new { assigned = 0, pending = 0 },
        lab = new { assigned = 0, pending = 0 },
    };
}
