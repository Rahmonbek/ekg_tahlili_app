using System.Text.Json;
using EkgAnalyzerApi.Constants;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Helpers;
using EkgAnalyzerApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services;

/// <summary>
/// Vipiska (statsionardan chiqarish epikrizi).
///
/// Huquqlar (loyiha egasining qarori):
///   • Yaratish — faqat shifokor (rol 4) va faqat O'ZIGA yo'naltirilgan
///     bemorga (bemorlar ro'yxatidagi qoida — <see cref="PatientVisibility"/>).
///   • Tahrirlash / o'chirish — faqat vipiskani yaratgan shifokor.
///   • Ko'rish / PDF — yaratgan shifokor, shuningdek o'sha klinikaning
///     admini va direktori (faqat o'qish).
///
/// Vipiskaga tanlash mumkin bo'lgan tahlillar:
///   (a) shu shifokorga yo'naltirilgan (yoki u yuklagan) tahlillar — sanasidan
///       qat'i nazar;
///   (b) yotqizilish–chiqarilish oralig'ida olingan BOSHQA tahlillar ham.
/// Faqat natijasi tayyor tahlillar ko'rsatiladi: tayyor bo'lmagan
/// laboratoriyada qiymatlar hali yo'q.
/// </summary>
public class DischargeSummaryService
{
    public static readonly string[] SupportedTypes = { "ecg", "holter", "smad", "lab", "para" };

    private const int MaxTextLength = 20000;
    private const int MaxPrescriptions = 60;

    private readonly MedDataDB _context;
    private readonly IConfiguration _config;
    private readonly ILogger<DischargeSummaryService> _logger;

    public DischargeSummaryService(MedDataDB context, IConfiguration config,
        ILogger<DischargeSummaryService> logger)
    {
        _context = context;
        _config = config;
        _logger = logger;
    }

    /// <summary>Saqlash natijasi: xatolik matni (400) yoki yozuv.</summary>
    public record SaveResult(DischargeSummary? Entity, string? Error, bool Forbidden = false);

    // ════════════════════════════════════════════════════════════════════
    //  HUQUQLAR
    // ════════════════════════════════════════════════════════════════════

    /// <summary>Shifokor shu bemorga vipiska chiqara oladimi.</summary>
    public async Task<bool> CanCreateAsync(int userId, int patientId, CancellationToken ct = default)
    {
        var user = await _context.Users.AsNoTracking()
            .Include(u => u.Doctor)
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user == null || user.RoleId != RoleConstants.Doctor || user.Doctor == null || user.ClinicId == null)
            return false;

        return await PatientVisibility.VisiblePatientIds(_context, user).ContainsAsync(patientId, ct);
    }

    /// <summary>Vipiskani ko'rish huquqi: yaratgan shifokor yoki shu klinika admini/direktori.</summary>
    public async Task<bool> CanViewAsync(int userId, int roleId, DischargeSummary entity, CancellationToken ct = default)
    {
        if (roleId == RoleConstants.Doctor)
            return await DoctorIdAsync(userId, ct) == entity.DoctorId;

        if (roleId is RoleConstants.Admin or RoleConstants.Director)
        {
            var clinicId = await _context.Users.AsNoTracking()
                .Where(u => u.Id == userId).Select(u => u.ClinicId).FirstOrDefaultAsync(ct);
            return clinicId == entity.ClinicId;
        }

        return false;
    }

    public async Task<bool> CanViewAsync(int userId, int roleId, int dischargeId, CancellationToken ct = default)
    {
        var entity = await _context.DischargeSummaries.AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == dischargeId, ct);
        return entity != null && await CanViewAsync(userId, roleId, entity, ct);
    }

    private async Task<int?> DoctorIdAsync(int userId, CancellationToken ct) =>
        await _context.Doctors.AsNoTracking()
            .Where(d => d.UserId == userId)
            .Select(d => (int?)d.Id)
            .FirstOrDefaultAsync(ct);

    // ════════════════════════════════════════════════════════════════════
    //  TANLASH UCHUN MANBALAR
    // ════════════════════════════════════════════════════════════════════

    private sealed record RawAnalysis(
        string Type, int Id, DateTime? AnalysisDate, DateTime? CreatedAt,
        string? DocumentNumber, string? Ai, int? ParaSeverity, bool Assigned);

    /// <summary>
    /// Vipiskaga tanlash mumkin bo'lgan tahlillar va konsultatsiya xulosalari.
    /// </summary>
    public async Task<DischargeCandidatesDTO> GetCandidatesAsync(
        int doctorId, int patientId, DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var raws = new List<RawAnalysis>();

        raws.AddRange(await _context.ECGAnalyse.AsNoTracking()
            .Where(a => a.PatcientId == patientId && a.Status == 2)
            .Select(a => new RawAnalysis("ecg", a.Id, a.AnalysisDate, a.CreatedAt, a.DocumentNumber,
                a.AIAnswerData, null,
                a.CreatedDoctorId == doctorId || a.Doctors!.Any(d => d.DoctorId == doctorId)))
            .ToListAsync(ct));

        raws.AddRange(await _context.HolterAnalyses.AsNoTracking()
            .Where(a => a.PatcientId == patientId && a.Status == 2)
            .Select(a => new RawAnalysis("holter", a.Id, a.AnalysisDate, a.CreatedAt, a.DocumentNumber,
                a.AIAnswerData, null,
                a.CreatedDoctorId == doctorId || a.MainDoctorId == doctorId
                    || a.Doctors!.Any(d => d.DoctorId == doctorId)))
            .ToListAsync(ct));

        raws.AddRange(await _context.SmadAnalyses.AsNoTracking()
            .Where(a => a.PatcientId == patientId && a.Status == 2)
            .Select(a => new RawAnalysis("smad", a.Id, a.AnalysisDate, a.CreatedAt, a.DocumentNumber,
                a.AIAnswerData, null,
                a.CreatedDoctorId == doctorId || a.MainDoctorId == doctorId
                    || a.Doctors!.Any(d => d.DoctorId == doctorId)))
            .ToListAsync(ct));

        raws.AddRange(await _context.LabAnalyse.AsNoTracking()
            .Where(a => a.PatcientId == patientId && a.Status == 2)
            .Select(a => new RawAnalysis("lab", a.Id, a.AnalysisDate, a.CreatedAt, a.DocumentNumber,
                a.AIAnswerData, null,
                a.CreatedDoctorId == doctorId || a.Doctors!.Any(d => d.DoctorId == doctorId)))
            .ToListAsync(ct));

        raws.AddRange(await _context.ParasitologyAnalyses.AsNoTracking()
            .Where(a => a.PatcientId == patientId && a.AnalysisStatus == "analyzed")
            .Select(a => new RawAnalysis("para", a.Id, a.AnalysisDate, a.CreatedAt, a.DocumentNumber,
                a.AiResponse, a.JiddiylikDarajasi,
                a.CreatedDoctorId == doctorId || a.Doctors!.Any(d => d.DoctorId == doctorId)))
            .ToListAsync(ct));

        var analyses = raws
            .Select(r =>
            {
                var date = r.AnalysisDate ?? r.CreatedAt;
                var localDay = date.HasValue
                    ? DateOnly.FromDateTime(AppTime.ToLocal(date.Value, _config))
                    : (DateOnly?)null;
                var inPeriod = localDay.HasValue && localDay.Value >= from && localDay.Value <= to;

                return new DischargeCandidateAnalysisDTO
                {
                    Type = r.Type,
                    Id = r.Id,
                    Date = date,
                    DocumentNumber = r.DocumentNumber,
                    Severity = r.Type == "para" ? r.ParaSeverity : AiSeverity.Parse(r.Ai),
                    Summary = r.Type == "para" ? ParaSummary(r.Ai, _logger) : AiSummary(r.Ai, _logger),
                    AssignedToMe = r.Assigned,
                    InPeriod = inPeriod,
                };
            })
            .Where(a => a.AssignedToMe || a.InPeriod)
            .OrderByDescending(a => a.Date)
            .ToList();

        // Har bir tahlilga yozilgan shifokor xulosalari — diagnoz tanlash uchun
        if (analyses.Count > 0)
        {
            var ids = analyses.Select(a => a.Id).Distinct().ToList();
            var notes = await _context.AnalysisDiagnoses.AsNoTracking()
                .Include(d => d.Doctor)
                .Where(d => ids.Contains(d.AnalysisId) && SupportedTypes.Contains(d.AnalysisType))
                .OrderBy(d => d.CreatedAt)
                .ToListAsync(ct);

            foreach (var a in analyses)
            {
                a.Conclusions = notes
                    .Where(n => n.AnalysisType == a.Type && n.AnalysisId == a.Id
                        && !string.IsNullOrWhiteSpace(n.DiagnosisText))
                    .Select(n => new DischargeConclusionDTO
                    {
                        Id = n.Id,
                        DoctorName = n.Doctor == null ? null : PersonNameHelper.Display(n.Doctor.LastName, n.Doctor.FirstName),
                        Text = n.DiagnosisText.Trim(),
                        CreatedAt = n.CreatedAt,
                    })
                    .ToList();
            }
        }

        var combined = await LoadCombinedAsync(patientId, analyses, ct);

        var consultations = await _context.Consultations.AsNoTracking()
            .Include(c => c.Doctor)
            .Include(c => c.Clinic)
            .Include(c => c.Conclusion)
            .Where(c => c.PatientId == patientId && c.Conclusion != null
                && c.ConsultationDate >= from && c.ConsultationDate <= to)
            .OrderBy(c => c.ConsultationDate)
            .ToListAsync(ct);

        return new DischargeCandidatesDTO
        {
            Analyses = analyses,
            Consultations = consultations.Select(c => new DischargeCandidateConsultationDTO
            {
                Id = c.Id,
                Date = c.ConsultationDate,
                DoctorName = c.Doctor == null ? null : PersonNameHelper.Display(c.Doctor.LastName, c.Doctor.FirstName),
                ClinicName = c.Clinic?.ClinicName,
                PatientCondition = c.Conclusion!.PatientCondition,
                Diagnosis = c.Conclusion.Diagnosis,
                Treatment = c.Conclusion.Treatment,
            }).ToList(),
            Combined = combined,
        };
    }

    /// <summary>
    /// Tanlash ro'yxatidagi tahlillardan kamida bittasi qatnashgan TAYYOR
    /// kompleks AI xulosalari va ularga yozilgan shifokor xulosalari.
    /// Ro'yxatda yo'q tahlillar (masalan boshqa shifokorniki, yotish
    /// davridan tashqari) bo'yicha kompleks xulosa qaytarilmaydi.
    /// </summary>
    private async Task<List<DischargeCandidateCombinedDTO>> LoadCombinedAsync(
        int patientId, List<DischargeCandidateAnalysisDTO> analyses, CancellationToken ct)
    {
        if (analyses.Count == 0) return new();

        var available = analyses.Select(a => $"{a.Type}#{a.Id}").ToHashSet();

        var rows = await _context.CombinedAnalyses.AsNoTracking()
            .Include(c => c.Items)
            .Where(c => c.PatientId == patientId && c.Status == 2 && c.AIAnswerData != null)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(ct);

        rows = rows
            .Where(c => c.Items.Any(i => available.Contains($"{i.AnalysisType}#{i.AnalysisId}")))
            .ToList();
        if (rows.Count == 0) return new();

        var ids = rows.Select(c => c.Id).ToList();
        var notes = await _context.AnalysisDiagnoses.AsNoTracking()
            .Include(d => d.Doctor)
            .Where(d => d.AnalysisType == "combined" && ids.Contains(d.AnalysisId))
            .OrderBy(d => d.CreatedAt)
            .ToListAsync(ct);

        return rows.Select(c => new DischargeCandidateCombinedDTO
        {
            Id = c.Id,
            CreatedAt = c.CreatedAt,
            Severity = AiSeverity.Parse(c.AIAnswerData),
            Summary = AiSummary(c.AIAnswerData, _logger),
            Items = c.Items
                .Select(i => new DischargeItemRefDTO { Type = i.AnalysisType, Id = i.AnalysisId })
                .ToList(),
            Conclusions = notes
                .Where(n => n.AnalysisId == c.Id && !string.IsNullOrWhiteSpace(n.DiagnosisText))
                .Select(n => new DischargeConclusionDTO
                {
                    Id = n.Id,
                    DoctorName = n.Doctor == null ? null : PersonNameHelper.Display(n.Doctor.LastName, n.Doctor.FirstName),
                    Text = n.DiagnosisText.Trim(),
                    CreatedAt = n.CreatedAt,
                })
                .ToList(),
        }).ToList();
    }

    // ════════════════════════════════════════════════════════════════════
    //  YARATISH / TAHRIRLASH / O'CHIRISH
    // ════════════════════════════════════════════════════════════════════

    public async Task<SaveResult> CreateAsync(int userId, DischargeSaveRequest request, CancellationToken ct = default)
    {
        if (request == null) return new SaveResult(null, "So'rov bo'sh");

        var user = await _context.Users.AsNoTracking()
            .Include(u => u.Doctor)
            .FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user?.Doctor == null || user.RoleId != RoleConstants.Doctor)
            return new SaveResult(null, "Vipiskani faqat shifokor chiqaradi", Forbidden: true);
        if (user.ClinicId == null)
            return new SaveResult(null, "Klinika aniqlanmadi");

        if (!await CanCreateAsync(userId, request.PatientId, ct))
            return new SaveResult(null, "Bu bemor sizga yo'naltirilmagan", Forbidden: true);

        var entity = new DischargeSummary
        {
            PatientId = request.PatientId,
            ClinicId = user.ClinicId.Value,
            DoctorId = user.Doctor.Id,
        };

        var error = await ApplyAsync(entity, request, user.Doctor.Id, ct);
        if (error != null) return new SaveResult(null, error);

        _context.DischargeSummaries.Add(entity);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("Vipiska yaratildi: id={Id} bemor={PatientId} shifokor={DoctorId}",
            entity.Id, entity.PatientId, entity.DoctorId);
        return new SaveResult(entity, null);
    }

    public async Task<SaveResult> UpdateAsync(int userId, int id, DischargeSaveRequest request, CancellationToken ct = default)
    {
        if (request == null) return new SaveResult(null, "So'rov bo'sh");

        var entity = await _context.DischargeSummaries
            .Include(d => d.Items)
            .Include(d => d.Complaints)
            .Include(d => d.Consultations)
            .Include(d => d.Prescriptions)
            .FirstOrDefaultAsync(d => d.Id == id, ct);
        if (entity == null) return new SaveResult(null, null);

        var doctorId = await DoctorIdAsync(userId, ct);
        if (doctorId == null || doctorId != entity.DoctorId)
            return new SaveResult(null, "Vipiskani faqat uni yaratgan shifokor tahrirlay oladi", Forbidden: true);

        // Bemor almashtirilmaydi — so'rovdagi qiymat e'tiborsiz qoldiriladi
        request.PatientId = entity.PatientId;

        var error = await ApplyAsync(entity, request, doctorId.Value, ct);
        if (error != null) return new SaveResult(null, error);

        // Faqat tarkib (shikoyat, tahlil, dori) o'zgarsa asosiy yozuv EF uchun
        // "o'zgarmagan" bo'lib qoladi va `updated_at` yangilanmasdi. Bu vaqt —
        // hujjat versiyasi: QR tekshiruv sahifasi uni chop etilgan nusxadagi
        // vaqt bilan solishtirishni so'raydi, shuning uchun har saqlashda yangilanadi.
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return new SaveResult(entity, null);
    }

    /// <summary>`null` — topilmadi, `false` — huquq yo'q, `true` — o'chirildi.</summary>
    public async Task<bool?> DeleteAsync(int userId, int id, CancellationToken ct = default)
    {
        var entity = await _context.DischargeSummaries.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (entity == null) return null;

        var doctorId = await DoctorIdAsync(userId, ct);
        if (doctorId == null || doctorId != entity.DoctorId) return false;

        _context.DischargeSummaries.Remove(entity);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("Vipiska o'chirildi: id={Id} shifokor={DoctorId}", id, doctorId);
        return true;
    }

    /// <summary>
    /// So'rovni tekshiradi va yozuvga ko'chiradi. Xatolik bo'lsa matnini qaytaradi.
    /// Tanlangan tahlil va konsultatsiyalar <see cref="GetCandidatesAsync"/>
    /// qaytaradigan to'plamda bo'lishi SHART — frontend cheklovini chetlab
    /// o'tib begona tahlilni vipiskaga qo'shib bo'lmaydi.
    /// </summary>
    private async Task<string?> ApplyAsync(DischargeSummary entity, DischargeSaveRequest r,
        int doctorId, CancellationToken ct)
    {
        var historyNumber = r.HistoryNumber?.Trim();
        if (string.IsNullOrWhiteSpace(historyNumber))
            return "Kasallik tarixi (ИБ) raqamini kiriting";
        if (historyNumber.Length > 50)
            return "ИБ raqami 50 belgidan oshmasligi kerak";

        if (r.AdmissionDate == default || r.DischargeDate == default || r.DocumentDate == default)
            return "Vipiska, yotqizilish va chiqarilish sanalarini kiriting";
        if (r.AdmissionDate > r.DischargeDate)
            return "Yotqizilish sanasi chiqarilish sanasidan keyin bo'lishi mumkin emas";

        foreach (var text in new[]
                 {
                     r.DiagnosisMain, r.DiagnosisConcomitant, r.DiagnosisComplications, r.ComplaintsText,
                     r.Anamnesis, r.ObjectiveStatus, r.Treatment, r.DischargeCondition, r.RecommendationsText,
                 })
        {
            if (text != null && text.Length > MaxTextLength)
                return $"Matn juda uzun (ko'pi bilan {MaxTextLength} belgi)";
        }

        // ── Tahlillar ──
        var candidates = await GetCandidatesAsync(doctorId, entity.PatientId, r.AdmissionDate, r.DischargeDate, ct);
        var allowed = candidates.Analyses.ToDictionary(a => $"{a.Type}#{a.Id}");

        var items = new List<DischargeSummaryItem>();
        foreach (var item in (r.Items ?? new()).Where(i => i != null && i.Id > 0))
        {
            var type = item.Type?.Trim().ToLowerInvariant() ?? string.Empty;
            var key = $"{type}#{item.Id}";
            if (items.Any(i => $"{i.AnalysisType}#{i.AnalysisId}" == key)) continue;

            if (!allowed.TryGetValue(key, out var source))
                return $"Tahlilni vipiskaga qo'shib bo'lmaydi: {type}#{item.Id}. "
                    + "U sizga yo'naltirilmagan va yotish davrida olinmagan (yoki natijasi tayyor emas).";

            items.Add(new DischargeSummaryItem { AnalysisType = type, AnalysisId = item.Id, SnapshotDate = source.Date });
        }

        // ── Konsultatsiyalar ──
        var allowedConsultations = candidates.Consultations.Select(c => c.Id).ToHashSet();
        var consultationIds = (r.ConsultationIds ?? new()).Distinct().ToList();
        var foreign = consultationIds.Where(id => !allowedConsultations.Contains(id)).ToList();
        if (foreign.Count > 0)
            return "Konsultatsiya xulosasi yotish davriga to'g'ri kelmaydi yoki bu bemorga tegishli emas";

        // ── Shikoyatlar ──
        var complaintIds = (r.ComplaintIds ?? new()).Distinct().ToList();
        if (complaintIds.Count > 0)
        {
            var existing = await _context.Complaints.AsNoTracking()
                .Where(c => complaintIds.Contains(c.Id)).CountAsync(ct);
            if (existing != complaintIds.Count) return "Shikoyatlar ro'yxatida yo'q qiymat tanlangan";
        }

        // ── Tavsiyalar jadvali ──
        var prescriptions = (r.Prescriptions ?? new())
            .Where(p => p != null && !string.IsNullOrWhiteSpace(p.DrugName))
            .ToList();
        if (prescriptions.Count > MaxPrescriptions)
            return $"Tavsiyalar jadvalida ko'pi bilan {MaxPrescriptions} ta qator bo'lishi mumkin";

        entity.HistoryNumber = historyNumber;
        entity.DocumentDate = r.DocumentDate;
        entity.AdmissionDate = r.AdmissionDate;
        entity.DischargeDate = r.DischargeDate;
        entity.DiagnosisMain = Clean(r.DiagnosisMain);
        entity.DiagnosisConcomitant = Clean(r.DiagnosisConcomitant);
        entity.DiagnosisComplications = Clean(r.DiagnosisComplications);
        entity.ComplaintsText = Clean(r.ComplaintsText);
        entity.Anamnesis = Clean(r.Anamnesis);
        entity.ObjectiveStatus = Clean(r.ObjectiveStatus);
        entity.Treatment = Clean(r.Treatment);
        entity.DischargeCondition = Clean(r.DischargeCondition);
        entity.RecommendationsText = Clean(r.RecommendationsText);
        entity.IncludePatientCopy = r.IncludePatientCopy;

        // Tarkib to'liq almashtiriladi — farqni hisoblashdan sodda va xatosiz
        _context.DischargeSummaryItems.RemoveRange(entity.Items);
        _context.DischargeSummaryComplaints.RemoveRange(entity.Complaints);
        _context.DischargeSummaryConsultations.RemoveRange(entity.Consultations);
        _context.DischargeSummaryPrescriptions.RemoveRange(entity.Prescriptions);

        entity.Items = items;
        entity.Complaints = complaintIds.Select(id => new DischargeSummaryComplaint { ComplaintId = id }).ToList();
        entity.Consultations = consultationIds.Select(id => new DischargeSummaryConsultation { ConsultationId = id }).ToList();
        entity.Prescriptions = prescriptions.Select((p, i) => new DischargeSummaryPrescription
        {
            SortOrder = i,
            DrugName = Limit(p.DrugName.Trim(), 300)!,
            Dose = Limit(Clean(p.Dose), 200),
            Frequency = Limit(Clean(p.Frequency), 200),
            IntakeTime = Limit(Clean(p.IntakeTime), 100),
            Duration = Limit(Clean(p.Duration), 300),
        }).ToList();

        return null;
    }

    // ════════════════════════════════════════════════════════════════════
    //  O'QISH
    // ════════════════════════════════════════════════════════════════════

    public async Task<DischargeByPatientDTO> GetByPatientAsync(int userId, int roleId, int patientId,
        CancellationToken ct = default)
    {
        var query = _context.DischargeSummaries.AsNoTracking()
            .Include(d => d.Doctor)
            .Where(d => d.PatientId == patientId);

        var doctorId = await DoctorIdAsync(userId, ct);

        if (roleId == RoleConstants.Doctor)
        {
            query = query.Where(d => d.DoctorId == doctorId);
        }
        else if (roleId is RoleConstants.Admin or RoleConstants.Director)
        {
            var clinicId = await _context.Users.AsNoTracking()
                .Where(u => u.Id == userId).Select(u => u.ClinicId).FirstOrDefaultAsync(ct);
            query = query.Where(d => d.ClinicId == clinicId);
        }
        else
        {
            return new DischargeByPatientDTO();
        }

        var rows = await query.OrderByDescending(d => d.DischargeDate).ThenByDescending(d => d.Id).ToListAsync(ct);

        return new DischargeByPatientDTO
        {
            CanCreate = await CanCreateAsync(userId, patientId, ct),
            Items = rows.Select(d => new DischargeListItemDTO
            {
                Id = d.Id,
                HistoryNumber = d.HistoryNumber,
                DocumentDate = d.DocumentDate,
                AdmissionDate = d.AdmissionDate,
                DischargeDate = d.DischargeDate,
                DoctorName = d.Doctor == null ? null : PersonNameHelper.Display(d.Doctor.LastName, d.Doctor.FirstName),
                DiagnosisMain = d.DiagnosisMain,
                IsMine = doctorId != null && d.DoctorId == doctorId,
                CreatedAt = d.CreatedAt,
                UpdatedAt = d.UpdatedAt,
            }).ToList(),
        };
    }

    /// <summary>`null` — topilmadi yoki ko'rish huquqi yo'q.</summary>
    public async Task<DischargeDetailDTO?> GetByIdAsync(int userId, int roleId, int id, CancellationToken ct = default)
    {
        var d = await _context.DischargeSummaries.AsNoTracking()
            .Include(x => x.Doctor)
            .Include(x => x.Patient)
            .Include(x => x.Items)
            .Include(x => x.Complaints)
            .Include(x => x.Consultations)
            .Include(x => x.Prescriptions)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (d == null || !await CanViewAsync(userId, roleId, d, ct)) return null;

        var doctorId = await DoctorIdAsync(userId, ct);

        return new DischargeDetailDTO
        {
            Id = d.Id,
            PatientId = d.PatientId,
            HistoryNumber = d.HistoryNumber,
            DocumentDate = d.DocumentDate,
            AdmissionDate = d.AdmissionDate,
            DischargeDate = d.DischargeDate,
            DiagnosisMain = d.DiagnosisMain,
            DiagnosisConcomitant = d.DiagnosisConcomitant,
            DiagnosisComplications = d.DiagnosisComplications,
            ComplaintIds = d.Complaints.Select(c => c.ComplaintId).ToList(),
            ComplaintsText = d.ComplaintsText,
            Anamnesis = d.Anamnesis,
            ObjectiveStatus = d.ObjectiveStatus,
            Items = d.Items.OrderBy(i => i.SnapshotDate)
                .Select(i => new DischargeItemRefDTO { Type = i.AnalysisType, Id = i.AnalysisId }).ToList(),
            ConsultationIds = d.Consultations.Select(c => c.ConsultationId).ToList(),
            Treatment = d.Treatment,
            DischargeCondition = d.DischargeCondition,
            Prescriptions = d.Prescriptions.OrderBy(p => p.SortOrder).Select(p => new DischargePrescriptionDTO
            {
                DrugName = p.DrugName,
                Dose = p.Dose,
                Frequency = p.Frequency,
                IntakeTime = p.IntakeTime,
                Duration = p.Duration,
            }).ToList(),
            RecommendationsText = d.RecommendationsText,
            IncludePatientCopy = d.IncludePatientCopy,
            DoctorName = d.Doctor == null ? null : PersonNameHelper.Display(d.Doctor.LastName, d.Doctor.FirstName),
            IsMine = doctorId != null && d.DoctorId == doctorId,
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt,
            PatientFirstName = d.Patient?.FirstName,
            PatientLastName = d.Patient?.LastName,
            PatientBirthDate = d.Patient?.BirthDate,
            PatientGender = d.Patient?.Gender,
        };
    }

    // ════════════════════════════════════════════════════════════════════
    //  YORDAMCHILAR
    // ════════════════════════════════════════════════════════════════════

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string? Limit(string? value, int max) =>
        value == null || value.Length <= max ? value : value[..max];

    /// <summary>
    /// Vipiska uchun AI xulosasining qisqa matni. <see cref="AiSeverity.Conclusion"/>
    /// dan farqli o'laroq avval `final_summary` (yakuniy xulosa) olinadi —
    /// epikrizda tekshiruv natijasi xulosa ko'rinishida yoziladi.
    /// </summary>
    public static string? AiSummary(string? aiAnswerData, ILogger logger) =>
        FirstString(aiAnswerData, logger, "final_summary", "automatic_analysis");

    /// <summary>Parazitologiya javobining yakuniy xulosasi.</summary>
    public static string? ParaSummary(string? aiResponse, ILogger logger) =>
        FirstString(aiResponse, logger, "yakuniy_xulosa", "shifokorga_tavsiya");

    private static string? FirstString(string? json, ILogger logger, params string[] fields)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;

        var start = json.IndexOf('{');
        var end = json.LastIndexOf('}');
        if (start < 0 || end <= start) return null;

        try
        {
            using var doc = JsonDocument.Parse(json[start..(end + 1)]);
            if (doc.RootElement.ValueKind != JsonValueKind.Object) return null;

            foreach (var field in fields)
            {
                if (doc.RootElement.TryGetProperty(field, out var prop)
                    && prop.ValueKind == JsonValueKind.String
                    && !string.IsNullOrWhiteSpace(prop.GetString()))
                    return prop.GetString()!.Trim();
            }
        }
        catch (JsonException ex)
        {
            // Buzilgan JSON — xulosa matni bo'lmaydi, tahlil ro'yxatda qoladi
            logger.LogDebug(ex, "Vipiska: AI javobidan xulosa o'qilmadi");
        }

        return null;
    }
}
