using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Hubs;
using EkgAnalyzerApi.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace EkgAnalyzerApi.Services
{
    public interface IOnlineConsultationService
    {
        Task<List<DoctorCatalogItemDto>> GetDoctorsCatalogAsync(int adminClinicId, int requestingUserId, string? specialization, string? search);
        Task<List<MyConsultantDto>> GetMyConsultantsAsync(int clinicId);
        Task<List<ConsultantHistoryItemDto>> GetConsultantHistoryAsync(int clinicConsultantId, int clinicId);
        Task<(bool success, string? error, int consultationId)> CreateConsultationAsync(CreateConsultationDto dto, int adminUserId, int clinicId);
        Task<List<ConsultationListItemDto>> GetConsultationListAsync(int clinicId, string? status, int? consultantDoctorId, int? patientId);
        Task<ConsultationDetailDto?> GetConsultationByIdAsync(int id, int userId, int roleId);
        Task<(bool success, string? error)> CancelConsultationAsync(int id, int clinicId);
        Task<(bool success, string? error)> RateConsultationAsync(int id, RateConsultationDto dto, int clinicId);
        Task<List<IncomingConsultationDto>> GetIncomingConsultationsAsync(int doctorId, string? status);
        Task<List<LinkedClinicDto>> GetMyLinkedClinicsAsync(int doctorId);
        Task<(bool success, string? error)> AcceptConsultationAsync(int id, int doctorId, int doctorUserId);
        Task<(bool success, string? error)> RejectConsultationAsync(int id, RejectConsultationDto dto, int doctorId);
        Task<(bool success, string? error)> ScheduleConsultationAsync(int id, ScheduleConsultationDto dto, int doctorId);
        Task<(bool success, string? error)> ConcludeConsultationAsync(int id, ConcludeConsultationDto dto, int doctorId);
        Task<List<FullAnalysisItemDto>> GetConsultationAnalysesAsync(int id, int doctorId);
        Task<(bool success, string? error, ConsultationTokenResponseDto? token)> GetLiveKitTokenAsync(int id, int userId, int roleId);
    }

    public class OnlineConsultationService : IOnlineConsultationService
    {
        private readonly MedDataDB _db;
        private readonly IHubContext<ConsultationHub> _hub;
        private readonly IConsultationConnectionService _connections;
        private readonly IConfiguration _config;
        private readonly ILogger<OnlineConsultationService> _logger;

        public OnlineConsultationService(
            MedDataDB db,
            IHubContext<ConsultationHub> hub,
            IConsultationConnectionService connections,
            IConfiguration config,
            ILogger<OnlineConsultationService> logger)
        {
            _db = db;
            _hub = hub;
            _connections = connections;
            _config = config;
            _logger = logger;
        }

        // ─── CATALOG ──────────────────────────────────────────────────────────

        public async Task<List<DoctorCatalogItemDto>> GetDoctorsCatalogAsync(
            int adminClinicId, int requestingUserId, string? specialization, string? search)
        {
            try
            {
                var query = _db.Doctors
                    .AsNoTracking()
                    .Include(d => d.User)
                    .Include(d => d.DoctorPositions!)
                        .ThenInclude(dp => dp.Position)
                    .Where(d => d.User != null && d.UserId != requestingUserId);

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.Trim().ToLower();
                    query = query.Where(d =>
                        (d.FirstName != null && d.FirstName.ToLower().Contains(s)) ||
                        (d.LastName  != null && d.LastName.ToLower().Contains(s))  ||
                        (d.SureName  != null && d.SureName.ToLower().Contains(s)));
                }

                var doctors = await query.ToListAsync();

                // Shu klinikaning biriktirilgan konsultantlari
                var linkedMap = await _db.ClinicConsultants
                    .AsNoTracking()
                    .Where(cc => cc.ClinicId == adminClinicId)
                    .ToDictionaryAsync(cc => cc.ConsultantDoctorId);

                // Klinika nomlari
                var clinicIds = doctors
                    .Where(d => d.User?.ClinicId != null)
                    .Select(d => d.User!.ClinicId!.Value)
                    .Distinct()
                    .ToList();

                var clinics = await _db.Clinics
                    .AsNoTracking()
                    .Where(c => clinicIds.Contains(c.Id))
                    .ToDictionaryAsync(c => c.Id, c => c.ClinicName ?? "");

                var result = new List<DoctorCatalogItemDto>();
                foreach (var d in doctors)
                {
                    var spec = d.DoctorPositions?.FirstOrDefault()?.Position?.NameUz
                            ?? d.DoctorPositions?.FirstOrDefault()?.Position?.NameRu;

                    if (!string.IsNullOrWhiteSpace(specialization) &&
                        (spec == null || !spec.ToLower().Contains(specialization.ToLower())))
                        continue;

                    int doctorClinicId = d.User?.ClinicId ?? 0;
                    var isLinked = linkedMap.ContainsKey(d.Id);
                    var totalConsultations = isLinked ? linkedMap[d.Id].TotalConsultations : 0;

                    result.Add(new DoctorCatalogItemDto
                    {
                        Id              = d.Id,
                        UserId          = d.UserId,
                        FullName        = $"{d.FirstName} {d.LastName}".Trim(),
                        Specialization  = spec,
                        ExperienceYears = d.ExperienceYears,
                        ClinicName      = clinics.TryGetValue(doctorClinicId, out var cn) ? cn : "",
                        AverageRating   = d.AverageRating,
                        IsLinked        = isLinked,
                        TotalConsultations = totalConsultations
                    });
                }
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetDoctorsCatalogAsync xatolik: adminClinicId={ClinicId}", adminClinicId);
                return new List<DoctorCatalogItemDto>();
            }
        }

        // ─── MY CONSULTANTS ────────────────────────────────────────────────────

        public async Task<List<MyConsultantDto>> GetMyConsultantsAsync(int clinicId)
        {
            try
            {
                var list = await _db.ClinicConsultants
                    .AsNoTracking()
                    .Where(cc => cc.ClinicId == clinicId && cc.Status == "active")
                    .Include(cc => cc.ConsultantDoctor)
                        .ThenInclude(d => d!.User)
                            .ThenInclude(u => u!.Clinic)
                    .Include(cc => cc.ConsultantDoctor)
                        .ThenInclude(d => d!.DoctorPositions!)
                            .ThenInclude(dp => dp.Position)
                    .ToListAsync();

                return list.Select(cc =>
                {
                    var d = cc.ConsultantDoctor;
                    var spec = d?.DoctorPositions?.FirstOrDefault()?.Position?.NameUz
                            ?? d?.DoctorPositions?.FirstOrDefault()?.Position?.NameRu;
                    return new MyConsultantDto
                    {
                        ClinicConsultantId = cc.Id,
                        DoctorId           = cc.ConsultantDoctorId,
                        FullName           = d != null ? $"{d.FirstName} {d.LastName}".Trim() : "",
                        Specialization     = spec,
                        ClinicName         = d?.User?.Clinic?.ClinicName ?? "",
                        AverageRating      = d?.AverageRating ?? 0,
                        TotalConsultations = cc.TotalConsultations,
                        LastConsultationAt = cc.LastConsultationAt,
                        Status             = cc.Status
                    };
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetMyConsultantsAsync xatolik: clinicId={ClinicId}", clinicId);
                return new List<MyConsultantDto>();
            }
        }

        // ─── CONSULTANT HISTORY ────────────────────────────────────────────────

        public async Task<List<ConsultantHistoryItemDto>> GetConsultantHistoryAsync(
            int clinicConsultantId, int clinicId)
        {
            try
            {
                return await _db.Consultations
                    .AsNoTracking()
                    .Where(c => c.ClinicConsultantId == clinicConsultantId && c.ClinicId == clinicId)
                    .Include(c => c.Patient)
                    .Include(c => c.Conclusion)
                    .OrderByDescending(c => c.CreatedAt)
                    .Select(c => new ConsultantHistoryItemDto
                    {
                        ConsultationId = c.Id,
                        PatientName    = c.Patient != null
                            ? $"{c.Patient.FirstName} {c.Patient.LastName}".Trim()
                            : "",
                        Status         = c.Status,
                        CreatedAt      = c.CreatedAt,
                        HasConclusion  = c.Conclusion != null
                    })
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetConsultantHistoryAsync xatolik: ccId={Id}", clinicConsultantId);
                return new List<ConsultantHistoryItemDto>();
            }
        }

        // ─── CREATE ────────────────────────────────────────────────────────────

        public async Task<(bool success, string? error, int consultationId)> CreateConsultationAsync(
            CreateConsultationDto dto, int adminUserId, int clinicId)
        {
            try
            {
                // O'z so'roviga konsultant bo'lib bo'lmaydi
                var consultantUser = await _db.Doctors.AsNoTracking()
                    .Where(d => d.Id == dto.ConsultantDoctorId)
                    .Select(d => d.UserId)
                    .FirstOrDefaultAsync();

                if (consultantUser == adminUserId)
                    return (false, "O'z so'rovingizga konsultant bo'lib bo'lmaydi", 0);

                // Biriktirilgan mi?
                var existing = await _db.ClinicConsultants
                    .Where(cc => cc.ClinicId == clinicId && cc.ConsultantDoctorId == dto.ConsultantDoctorId)
                    .FirstOrDefaultAsync();

                bool isFirst = existing == null;

                var consultation = new Consultation
                {
                    ClinicId             = clinicId,
                    ConsultantDoctorId   = dto.ConsultantDoctorId,
                    ClinicConsultantId   = existing?.Id,
                    RequestedByAdminId   = adminUserId,
                    PatientId            = dto.PatientId,
                    IsFirstRequest       = isFirst,
                    Note                 = dto.Note,
                    Status               = "pending",
                    CreatedAt            = DateTime.UtcNow,
                    UpdatedAt            = DateTime.UtcNow
                };

                _db.Consultations.Add(consultation);
                await _db.SaveChangesAsync();

                // Tahlillarni saqlash
                if (dto.Analyses?.Count > 0)
                {
                    var analyses = dto.Analyses.Select(a => new ConsultationAnalysis
                    {
                        ConsultationId = consultation.Id,
                        AnalysisType   = a.AnalysisType,
                        AnalysisId     = a.AnalysisId,
                        SharedAt       = DateTime.UtcNow
                    }).ToList();
                    _db.ConsultationAnalyses.AddRange(analyses);
                    await _db.SaveChangesAsync();
                }

                // SignalR: doctorga bildirishnoma
                var clinic = await _db.Clinics.AsNoTracking()
                    .FirstOrDefaultAsync(c => c.Id == clinicId);

                var patient = await _db.Patcients.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == dto.PatientId);

                var doctorConn = _connections.GetConnectionId(consultantUser);
                if (doctorConn != null)
                {
                    await _hub.Clients.Client(doctorConn).SendAsync("NewConsultationRequest", new
                    {
                        consultationId = consultation.Id,
                        clinicName     = clinic?.ClinicName ?? "",
                        patientName    = patient != null
                            ? $"{patient.FirstName} {patient.LastName}".Trim() : "",
                        note           = dto.Note,
                        isFirstRequest = isFirst
                    });
                }

                return (true, null, consultation.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CreateConsultationAsync xatolik: adminUserId={UserId}", adminUserId);
                return (false, "Server xatoligi yuz berdi", 0);
            }
        }

        // ─── LIST ──────────────────────────────────────────────────────────────

        public async Task<List<ConsultationListItemDto>> GetConsultationListAsync(
            int clinicId, string? status, int? consultantDoctorId, int? patientId)
        {
            try
            {
                var query = _db.Consultations
                    .AsNoTracking()
                    .Where(c => c.ClinicId == clinicId)
                    .Include(c => c.Patient)
                    .Include(c => c.ConsultantDoctor)
                    .Include(c => c.Conclusion)
                    .AsQueryable();

                if (!string.IsNullOrWhiteSpace(status))
                    query = query.Where(c => c.Status == status);

                if (consultantDoctorId.HasValue)
                    query = query.Where(c => c.ConsultantDoctorId == consultantDoctorId.Value);

                if (patientId.HasValue)
                    query = query.Where(c => c.PatientId == patientId.Value);

                return await query
                    .OrderByDescending(c => c.CreatedAt)
                    .Select(c => new ConsultationListItemDto
                    {
                        Id            = c.Id,
                        PatientName   = c.Patient != null
                            ? $"{c.Patient.FirstName} {c.Patient.LastName}".Trim() : "",
                        ConsultantName = c.ConsultantDoctor != null
                            ? $"{c.ConsultantDoctor.FirstName} {c.ConsultantDoctor.LastName}".Trim() : "",
                        Status        = c.Status,
                        CreatedAt     = c.CreatedAt,
                        ScheduledAt   = c.ScheduledAt,
                        HasConclusion = c.Conclusion != null
                    })
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetConsultationListAsync xatolik: clinicId={ClinicId}", clinicId);
                return new List<ConsultationListItemDto>();
            }
        }

        // ─── DETAIL ────────────────────────────────────────────────────────────

        public async Task<ConsultationDetailDto?> GetConsultationByIdAsync(int id, int userId, int roleId)
        {
            try
            {
                var c = await _db.Consultations
                    .AsNoTracking()
                    .Where(x => x.Id == id)
                    .Include(x => x.Patient)
                    .Include(x => x.ConsultantDoctor)
                        .ThenInclude(d => d!.User)
                            .ThenInclude(u => u!.Clinic)
                    .Include(x => x.ConsultantDoctor)
                        .ThenInclude(d => d!.DoctorPositions!)
                            .ThenInclude(dp => dp.Position)
                    .Include(x => x.Analyses)
                    .Include(x => x.Conclusion)
                    .FirstOrDefaultAsync();

                if (c == null) return null;

                // Kirish tekshiruvi
                if (roleId == 2 || roleId == 3)
                {
                    // Admin: faqat o'z klinikasi
                    var adminClinicId = await _db.Users.AsNoTracking()
                        .Where(u => u.Id == userId)
                        .Select(u => u.ClinicId)
                        .FirstOrDefaultAsync();
                    if (adminClinicId != c.ClinicId) return null;
                }
                else if (roleId == 4)
                {
                    // Doctor: faqat o'ziga yuborilgan
                    var doctorId = await _db.Doctors.AsNoTracking()
                        .Where(d => d.UserId == userId)
                        .Select(d => d.Id)
                        .FirstOrDefaultAsync();
                    if (doctorId != c.ConsultantDoctorId) return null;
                }

                var d = c.ConsultantDoctor;
                var spec = d?.DoctorPositions?.FirstOrDefault()?.Position?.NameUz
                        ?? d?.DoctorPositions?.FirstOrDefault()?.Position?.NameRu;

                int? age = null;
                if (c.Patient?.BirthDate != default)
                {
                    var today = DateOnly.FromDateTime(DateTime.Today);
                    age = today.Year - c.Patient.BirthDate.Year;
                    if (c.Patient.BirthDate > today.AddYears(-age.Value)) age--;
                }

                var hasRating = await _db.ConsultantRatings
                    .AnyAsync(r => r.ConsultationId == id);

                return new ConsultationDetailDto
                {
                    Id               = c.Id,
                    Status           = c.Status,
                    IsFirstRequest   = c.IsFirstRequest,
                    Note             = c.Note,
                    RejectionReason  = c.RejectionReason,
                    ScheduledAt      = c.ScheduledAt,
                    LiveKitRoomName  = c.LiveKitRoomName,
                    ConcludedAt      = c.ConcludedAt,
                    CreatedAt        = c.CreatedAt,

                    PatientId        = c.PatientId,
                    PatientName      = c.Patient != null
                        ? $"{c.Patient.FirstName} {c.Patient.LastName}".Trim() : "",
                    PatientAge       = age,
                    PatientGender    = c.Patient?.Gender,

                    ConsultantDoctorId   = c.ConsultantDoctorId,
                    ConsultantName       = d != null ? $"{d.FirstName} {d.LastName}".Trim() : "",
                    ConsultantSpecialization = spec,
                    ConsultantClinicName = d?.User?.Clinic?.ClinicName ?? "",
                    ConsultantRating     = d?.AverageRating ?? 0,

                    Analyses = c.Analyses?.Select(a => new SharedAnalysisDto
                    {
                        Id           = a.Id,
                        AnalysisType = a.AnalysisType,
                        AnalysisId   = a.AnalysisId,
                        SharedAt     = a.SharedAt
                    }).ToList() ?? new List<SharedAnalysisDto>(),

                    Conclusion = c.Conclusion == null ? null : new ConsultationConclusionDto
                    {
                        Diagnosis        = c.Conclusion.Diagnosis,
                        Recommendations  = c.Conclusion.Recommendations,
                        Medications      = c.Conclusion.Medications,
                        FollowUpRequired = c.Conclusion.FollowUpRequired,
                        FollowUpNote     = c.Conclusion.FollowUpNote,
                        CreatedAt        = c.Conclusion.CreatedAt
                    },

                    HasRating = hasRating
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetConsultationByIdAsync xatolik: id={Id}", id);
                return null;
            }
        }

        // ─── CANCEL ────────────────────────────────────────────────────────────

        public async Task<(bool success, string? error)> CancelConsultationAsync(int id, int clinicId)
        {
            try
            {
                var c = await _db.Consultations
                    .Where(x => x.Id == id && x.ClinicId == clinicId)
                    .Include(x => x.ConsultantDoctor)
                    .FirstOrDefaultAsync();

                if (c == null) return (false, "Konsultatsiya topilmadi");
                if (c.Status != "pending" && c.Status != "accepted")
                    return (false, "Faqat 'pending' yoki 'accepted' holatdagi konsultatsiyani bekor qilish mumkin");

                c.Status    = "cancelled";
                c.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();

                // Doctor ga bildirishnoma
                if (c.ConsultantDoctor != null)
                {
                    var conn = _connections.GetConnectionId(c.ConsultantDoctor.UserId);
                    if (conn != null)
                        await _hub.Clients.Client(conn).SendAsync("ConsultationCancelled", new { consultationId = id });
                }

                return (true, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CancelConsultationAsync xatolik: id={Id}", id);
                return (false, "Server xatoligi yuz berdi");
            }
        }

        // ─── RATE ──────────────────────────────────────────────────────────────

        public async Task<(bool success, string? error)> RateConsultationAsync(
            int id, RateConsultationDto dto, int clinicId)
        {
            try
            {
                if (dto.Score < 1 || dto.Score > 5)
                    return (false, "Baho 1 dan 5 gacha bo'lishi kerak");

                var c = await _db.Consultations
                    .Where(x => x.Id == id && x.ClinicId == clinicId)
                    .FirstOrDefaultAsync();

                if (c == null) return (false, "Konsultatsiya topilmadi");
                if (c.Status != "concluded")
                    return (false, "Faqat yakunlangan konsultatsiyani baholash mumkin");

                if (c.ConcludedAt.HasValue && DateTime.UtcNow > c.ConcludedAt.Value.AddHours(72))
                    return (false, "Baho berish muddati o'tdi (72 soat)");

                var alreadyRated = await _db.ConsultantRatings
                    .AnyAsync(r => r.ConsultationId == id);
                if (alreadyRated)
                    return (false, "Bu konsultatsiya allaqachon baholangan");

                var rating = new ConsultantRating
                {
                    ConsultantDoctorId = c.ConsultantDoctorId,
                    ConsultationId     = id,
                    ClinicId           = clinicId,
                    Score              = dto.Score,
                    Comment            = dto.Comment,
                    CreatedAt          = DateTime.UtcNow
                };
                _db.ConsultantRatings.Add(rating);
                await _db.SaveChangesAsync();

                // Doctor.AverageRating va TotalRatings qayta hisoblash
                var stats = await _db.ConsultantRatings
                    .Where(r => r.ConsultantDoctorId == c.ConsultantDoctorId)
                    .GroupBy(r => r.ConsultantDoctorId)
                    .Select(g => new { Avg = g.Average(r => (double)r.Score), Count = g.Count() })
                    .FirstOrDefaultAsync();

                if (stats != null)
                {
                    var doctor = await _db.Doctors.FirstOrDefaultAsync(d => d.Id == c.ConsultantDoctorId);
                    if (doctor != null)
                    {
                        doctor.AverageRating = (decimal)Math.Round(stats.Avg, 2);
                        doctor.TotalRatings  = stats.Count;
                        await _db.SaveChangesAsync();
                    }
                }

                return (true, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "RateConsultationAsync xatolik: id={Id}", id);
                return (false, "Server xatoligi yuz berdi");
            }
        }

        // ─── INCOMING (DOCTOR) ────────────────────────────────────────────────

        public async Task<List<IncomingConsultationDto>> GetIncomingConsultationsAsync(
            int doctorId, string? status)
        {
            try
            {
                var query = _db.Consultations
                    .AsNoTracking()
                    .Where(c => c.ConsultantDoctorId == doctorId)
                    .Include(c => c.Clinic)
                    .Include(c => c.Patient)
                    .Include(c => c.Analyses)
                    .AsQueryable();

                if (!string.IsNullOrWhiteSpace(status))
                {
                    var statuses = status.Split(',').Select(s => s.Trim()).ToList();
                    query = query.Where(c => statuses.Contains(c.Status));
                }

                var list = await query
                    .OrderByDescending(c => c.CreatedAt)
                    .ToListAsync();

                return list.Select(c =>
                {
                    int? age = null;
                    if (c.Patient?.BirthDate != default)
                    {
                        var today = DateOnly.FromDateTime(DateTime.Today);
                        age = today.Year - c.Patient.BirthDate.Year;
                        if (c.Patient.BirthDate > today.AddYears(-age.Value)) age--;
                    }

                    var summary = c.Analyses?
                        .GroupBy(a => a.AnalysisType)
                        .Select(g => new SharedAnalysisTypeCountDto
                        {
                            AnalysisType = g.Key,
                            Count        = g.Count()
                        }).ToList() ?? new List<SharedAnalysisTypeCountDto>();

                    return new IncomingConsultationDto
                    {
                        Id             = c.Id,
                        ClinicName     = c.Clinic?.ClinicName ?? "",
                        PatientName    = c.Patient != null
                            ? $"{c.Patient.FirstName} {c.Patient.LastName}".Trim() : "",
                        PatientAge     = age,
                        PatientGender  = c.Patient?.Gender,
                        Note           = c.Note,
                        IsFirstRequest = c.IsFirstRequest,
                        Status         = c.Status,
                        CreatedAt      = c.CreatedAt,
                        ScheduledAt    = c.ScheduledAt,
                        AnalysisSummary = summary
                    };
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetIncomingConsultationsAsync xatolik: doctorId={DoctorId}", doctorId);
                return new List<IncomingConsultationDto>();
            }
        }

        // ─── MY LINKED CLINICS ────────────────────────────────────────────────

        public async Task<List<LinkedClinicDto>> GetMyLinkedClinicsAsync(int doctorId)
        {
            try
            {
                return await _db.ClinicConsultants
                    .AsNoTracking()
                    .Where(cc => cc.ConsultantDoctorId == doctorId && cc.Status == "active")
                    .Include(cc => cc.Clinic)
                    .Select(cc => new LinkedClinicDto
                    {
                        ClinicConsultantId = cc.Id,
                        ClinicId           = cc.ClinicId,
                        ClinicName         = cc.Clinic != null ? cc.Clinic.ClinicName ?? "" : "",
                        TotalConsultations = cc.TotalConsultations,
                        LastConsultationAt = cc.LastConsultationAt,
                        Status             = cc.Status
                    })
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetMyLinkedClinicsAsync xatolik: doctorId={DoctorId}", doctorId);
                return new List<LinkedClinicDto>();
            }
        }

        // ─── ACCEPT ────────────────────────────────────────────────────────────

        public async Task<(bool success, string? error)> AcceptConsultationAsync(
            int id, int doctorId, int doctorUserId)
        {
            try
            {
                var c = await _db.Consultations
                    .Where(x => x.Id == id && x.ConsultantDoctorId == doctorId)
                    .FirstOrDefaultAsync();

                if (c == null) return (false, "Konsultatsiya topilmadi yoki ruxsat yo'q");
                if (c.Status != "pending") return (false, "Faqat 'pending' holatdagi konsultatsiyani qabul qilish mumkin");

                if (c.IsFirstRequest)
                {
                    // Yangi biriktiruv
                    var link = new ClinicConsultant
                    {
                        ClinicId               = c.ClinicId,
                        ConsultantDoctorId     = doctorId,
                        LinkedAt               = DateTime.UtcNow,
                        LinkedByConsultationId = id,
                        Status                 = "active",
                        TotalConsultations     = 1,
                        LastConsultationAt     = DateTime.UtcNow
                    };
                    _db.ClinicConsultants.Add(link);
                    await _db.SaveChangesAsync();

                    c.ClinicConsultantId = link.Id;
                }
                else if (c.ClinicConsultantId.HasValue)
                {
                    // Mavjud biriktuv yangilash
                    var link = await _db.ClinicConsultants
                        .FirstOrDefaultAsync(cc => cc.Id == c.ClinicConsultantId.Value);
                    if (link != null)
                    {
                        link.TotalConsultations++;
                        link.LastConsultationAt = DateTime.UtcNow;
                    }
                }

                c.Status    = "accepted";
                c.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();

                // Adminga bildirishnoma
                var adminConns = _connections.GetAdminConnectionsForClinic(c.ClinicId).ToList();
                if (adminConns.Any())
                {
                    var doctorName = await _db.Doctors.AsNoTracking()
                        .Where(d => d.Id == doctorId)
                        .Select(d => $"{d.FirstName} {d.LastName}")
                        .FirstOrDefaultAsync() ?? "";

                    await _hub.Clients.Clients(adminConns).SendAsync("ConsultationAccepted", new
                    {
                        consultationId = id,
                        doctorName     = doctorName.Trim()
                    });
                }

                return (true, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AcceptConsultationAsync xatolik: id={Id}", id);
                return (false, "Server xatoligi yuz berdi");
            }
        }

        // ─── REJECT ────────────────────────────────────────────────────────────

        public async Task<(bool success, string? error)> RejectConsultationAsync(
            int id, RejectConsultationDto dto, int doctorId)
        {
            try
            {
                var c = await _db.Consultations
                    .Where(x => x.Id == id && x.ConsultantDoctorId == doctorId)
                    .FirstOrDefaultAsync();

                if (c == null) return (false, "Konsultatsiya topilmadi yoki ruxsat yo'q");
                if (c.Status != "pending") return (false, "Faqat 'pending' holatdagi konsultatsiyani rad etish mumkin");

                c.Status          = "rejected";
                c.RejectionReason = dto.RejectionReason;
                c.UpdatedAt       = DateTime.UtcNow;
                // IsFirstRequest=true bo'lsa ClinicConsultants ga HECH NARSA YOZILMAYDI
                await _db.SaveChangesAsync();

                // Adminga bildirishnoma
                var adminConns = _connections.GetAdminConnectionsForClinic(c.ClinicId).ToList();
                if (adminConns.Any())
                    await _hub.Clients.Clients(adminConns).SendAsync("ConsultationRejected", new
                    {
                        consultationId = id,
                        reason         = dto.RejectionReason
                    });

                return (true, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "RejectConsultationAsync xatolik: id={Id}", id);
                return (false, "Server xatoligi yuz berdi");
            }
        }

        // ─── SCHEDULE ──────────────────────────────────────────────────────────

        public async Task<(bool success, string? error)> ScheduleConsultationAsync(
            int id, ScheduleConsultationDto dto, int doctorId)
        {
            try
            {
                var c = await _db.Consultations
                    .Where(x => x.Id == id && x.ConsultantDoctorId == doctorId)
                    .FirstOrDefaultAsync();

                if (c == null) return (false, "Konsultatsiya topilmadi yoki ruxsat yo'q");
                if (c.Status != "accepted") return (false, "Faqat 'accepted' holatdagi konsultatsiyaga vaqt belgilash mumkin");

                c.ScheduledAt      = dto.ScheduledAt.ToUniversalTime();
                c.LiveKitRoomName  = $"consultation-{id}";
                c.Status           = "scheduled";
                c.UpdatedAt        = DateTime.UtcNow;
                await _db.SaveChangesAsync();

                // Adminga bildirishnoma
                var adminConns = _connections.GetAdminConnectionsForClinic(c.ClinicId).ToList();
                if (adminConns.Any())
                    await _hub.Clients.Clients(adminConns).SendAsync("ConsultationScheduled", new
                    {
                        consultationId = id,
                        scheduledAt    = c.ScheduledAt
                    });

                return (true, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ScheduleConsultationAsync xatolik: id={Id}", id);
                return (false, "Server xatoligi yuz berdi");
            }
        }

        // ─── CONCLUDE ──────────────────────────────────────────────────────────

        public async Task<(bool success, string? error)> ConcludeConsultationAsync(
            int id, ConcludeConsultationDto dto, int doctorId)
        {
            try
            {
                var c = await _db.Consultations
                    .Where(x => x.Id == id && x.ConsultantDoctorId == doctorId)
                    .FirstOrDefaultAsync();

                if (c == null) return (false, "Konsultatsiya topilmadi yoki ruxsat yo'q");
                if (c.Status != "accepted" && c.Status != "scheduled")
                    return (false, "Faqat 'accepted' yoki 'scheduled' holatdagi konsultatsiyani yakunlash mumkin");

                var conclusion = new ConsultationConclusion
                {
                    ConsultationId   = id,
                    Diagnosis        = dto.Diagnosis,
                    Recommendations  = dto.Recommendations,
                    Medications      = dto.Medications,
                    FollowUpRequired = dto.FollowUpRequired,
                    FollowUpNote     = dto.FollowUpNote,
                    CreatedAt        = DateTime.UtcNow
                };
                _db.ConsultationConclusions.Add(conclusion);

                c.Status      = "concluded";
                c.ConcludedAt = DateTime.UtcNow;
                c.UpdatedAt   = DateTime.UtcNow;
                await _db.SaveChangesAsync();

                // Adminga bildirishnoma
                var adminConns = _connections.GetAdminConnectionsForClinic(c.ClinicId).ToList();
                if (adminConns.Any())
                    await _hub.Clients.Clients(adminConns).SendAsync("ConsultationConcluded", new
                    {
                        consultationId = id
                    });

                return (true, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ConcludeConsultationAsync xatolik: id={Id}", id);
                return (false, "Server xatoligi yuz berdi");
            }
        }

        // ─── ANALYSES (Doctor) ─────────────────────────────────────────────────

        public async Task<List<FullAnalysisItemDto>> GetConsultationAnalysesAsync(
            int id, int doctorId)
        {
            try
            {
                // Faqat o'ziga yuborilgan konsultatsiya
                var consultation = await _db.Consultations.AsNoTracking()
                    .Where(c => c.Id == id && c.ConsultantDoctorId == doctorId)
                    .FirstOrDefaultAsync();

                if (consultation == null) return new List<FullAnalysisItemDto>();

                var sharedAnalyses = await _db.ConsultationAnalyses.AsNoTracking()
                    .Where(a => a.ConsultationId == id)
                    .ToListAsync();

                var result = new List<FullAnalysisItemDto>();

                foreach (var a in sharedAnalyses)
                {
                    string? aiSummary = null;
                    DateTime? createdAt = null;

                    switch (a.AnalysisType)
                    {
                        case "EKG":
                        {
                            var item = await _db.ECGAnalyse.AsNoTracking()
                                .Where(e => e.Id == a.AnalysisId)
                                .Select(e => new { e.AIAnswerData, e.CreatedAt })
                                .FirstOrDefaultAsync();
                            aiSummary = ExtractAiSummary(item?.AIAnswerData);
                            createdAt = item?.CreatedAt;
                            break;
                        }
                        case "SMAD":
                        {
                            var item = await _db.SmadAnalyses.AsNoTracking()
                                .Where(e => e.Id == a.AnalysisId)
                                .Select(e => new { e.AIAnswerData, e.CreatedAt })
                                .FirstOrDefaultAsync();
                            aiSummary = ExtractAiSummary(item?.AIAnswerData);
                            createdAt = item?.CreatedAt;
                            break;
                        }
                        case "Holter":
                        {
                            var item = await _db.HolterAnalyses.AsNoTracking()
                                .Where(e => e.Id == a.AnalysisId)
                                .Select(e => new { e.AIAnswerData, e.CreatedAt })
                                .FirstOrDefaultAsync();
                            aiSummary = ExtractAiSummary(item?.AIAnswerData);
                            createdAt = item?.CreatedAt;
                            break;
                        }
                        case "Lab":
                        {
                            var item = await _db.LabAnalyse.AsNoTracking()
                                .Where(e => e.Id == a.AnalysisId)
                                .Select(e => new { e.AIAnswerData, e.CreatedAt })
                                .FirstOrDefaultAsync();
                            aiSummary = ExtractAiSummary(item?.AIAnswerData);
                            createdAt = item?.CreatedAt;
                            break;
                        }
                        case "Parasit":
                        {
                            var item = await _db.ParasitologyAnalyses.AsNoTracking()
                                .Where(e => e.Id == a.AnalysisId)
                                .Select(e => new { e.AiResponse, e.CreatedAt })
                                .FirstOrDefaultAsync();
                            aiSummary = item?.AiResponse?.Length > 200
                                ? item.AiResponse.Substring(0, 200) + "..." : item?.AiResponse;
                            createdAt = item?.CreatedAt;
                            break;
                        }
                    }

                    result.Add(new FullAnalysisItemDto
                    {
                        AnalysisType = a.AnalysisType,
                        AnalysisId   = a.AnalysisId,
                        CreatedAt    = createdAt,
                        AiSummary    = aiSummary
                    });
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetConsultationAnalysesAsync xatolik: id={Id}", id);
                return new List<FullAnalysisItemDto>();
            }
        }

        // ─── LIVEKIT TOKEN ────────────────────────────────────────────────────

        public async Task<(bool success, string? error, ConsultationTokenResponseDto? token)>
            GetLiveKitTokenAsync(int id, int userId, int roleId)
        {
            try
            {
                var c = await _db.Consultations.AsNoTracking()
                    .Where(x => x.Id == id)
                    .FirstOrDefaultAsync();

                if (c == null) return (false, "Konsultatsiya topilmadi", null);
                if (string.IsNullOrEmpty(c.LiveKitRoomName))
                    return (false, "Video vaqti hali belgilanmagan", null);

                // Kirish tekshiruvi
                if (roleId == 2 || roleId == 3)
                {
                    var adminClinicId = await _db.Users.AsNoTracking()
                        .Where(u => u.Id == userId).Select(u => u.ClinicId).FirstOrDefaultAsync();
                    if (adminClinicId != c.ClinicId)
                        return (false, "Ruxsat yo'q", null);
                }
                else if (roleId == 4)
                {
                    var doctorId = await _db.Doctors.AsNoTracking()
                        .Where(d => d.UserId == userId).Select(d => d.Id).FirstOrDefaultAsync();
                    if (doctorId != c.ConsultantDoctorId)
                        return (false, "Ruxsat yo'q", null);
                }
                else
                {
                    return (false, "Ruxsat yo'q", null);
                }

                var participantName = roleId == 4 ? $"doctor-{userId}" : $"admin-{userId}";
                var apiKey    = _config["LiveKit:ApiKey"]    ?? "";
                var apiSecret = _config["LiveKit:ApiSecret"] ?? "";
                var url       = _config["LiveKit:Url"]       ?? "";

                var token = GenerateLiveKitToken(apiKey, apiSecret, $"user_{userId}",
                    c.LiveKitRoomName, participantName);

                return (true, null, new ConsultationTokenResponseDto
                {
                    Token      = token,
                    LiveKitUrl = url,
                    RoomName   = c.LiveKitRoomName
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetLiveKitTokenAsync xatolik: id={Id}", id);
                return (false, "Server xatoligi yuz berdi", null);
            }
        }

        // ─── HELPERS ──────────────────────────────────────────────────────────

        private static string? ExtractAiSummary(string? aiAnswerData)
        {
            if (string.IsNullOrEmpty(aiAnswerData)) return null;
            try
            {
                // AIAnswerData JSON formatidan final_summary → automatic_analysis → AI_recommendations
                using var doc = System.Text.Json.JsonDocument.Parse(aiAnswerData);
                var root = doc.RootElement;
                string? text = null;

                if (root.TryGetProperty("final_summary", out var fs)
                    && fs.ValueKind == System.Text.Json.JsonValueKind.String)
                    text = fs.GetString();
                else if (root.TryGetProperty("automatic_analysis", out var aa)
                    && aa.ValueKind == System.Text.Json.JsonValueKind.String)
                    text = aa.GetString();
                else if (root.TryGetProperty("AI_recommendations", out var ar)
                    && ar.ValueKind == System.Text.Json.JsonValueKind.String)
                    text = ar.GetString();

                if (string.IsNullOrWhiteSpace(text)) return null;
                const int maxLen = 350;
                return text.Length > maxLen ? text[..maxLen] + "..." : text;
            }
            catch
            {
                // JSON parse xatoligi — raw string qisqacha
                const int maxLen = 200;
                return aiAnswerData.Length > maxLen ? aiAnswerData[..maxLen] + "..." : aiAnswerData;
            }
        }

        // VideoCallController.cs dagi GenerateLiveKitToken pattern
        private static string GenerateLiveKitToken(
            string apiKey, string apiSecret, string identity, string roomName, string displayName)
        {
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var headerObj  = new { alg = "HS256", typ = "JWT" };
            var payloadObj = new
            {
                iss   = apiKey,
                sub   = identity,
                iat   = now,
                exp   = now + 21600,
                nbf   = now,
                name  = displayName,
                video = new { roomJoin = true, room = roomName }
            };

            var headerJson  = System.Text.Json.JsonSerializer.Serialize(headerObj);
            var payloadJson = System.Text.Json.JsonSerializer.Serialize(payloadObj);

            var headerB64  = Base64UrlEncode(Encoding.UTF8.GetBytes(headerJson));
            var payloadB64 = Base64UrlEncode(Encoding.UTF8.GetBytes(payloadJson));
            var signingInput = $"{headerB64}.{payloadB64}";

            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(apiSecret));
            var sig = hmac.ComputeHash(Encoding.UTF8.GetBytes(signingInput));
            return $"{signingInput}.{Base64UrlEncode(sig)}";
        }

        private static string Base64UrlEncode(byte[] bytes) =>
            Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
