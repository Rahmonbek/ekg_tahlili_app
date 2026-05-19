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
        // Admin
        Task<List<DoctorSearchResultDto>> SearchDoctorsAsync(SearchDoctorsQuery q, int adminClinicId);
        Task<ConsultationPatientLookupDto> FindPatientAsync(string passportSeries, DateOnly birthDate);
        Task<(bool success, string? error)> InviteDoctorAsync(InviteDoctorDto dto, int adminUserId, int clinicId);
        Task<List<MyConsultantDto>> GetMyConsultantsAsync(int clinicId);
        Task<List<SentInvitationDto>> GetMySentInvitationsAsync(int clinicId);
        Task<ConsultationBadgeCountsDto> GetBadgeCountsAsync(int roleId, int clinicId, int doctorId);
        Task<(bool success, string? error)> UpdateConsultantPriceAsync(int ccId, UpdatePriceDto dto, int adminUserId, int clinicId);
        Task<ConsultantHistoryDto> GetConsultantHistoryAsync(int ccId, int clinicId, string? patientName, DateOnly? from, DateOnly? to);
        Task<(bool success, string? error, int count)> CreateConsultationsAsync(CreateConsultationDto dto, int adminUserId, int clinicId);
        Task<List<ConsultationListItemDto>> GetConsultationListAsync(int clinicId, string? status, int? doctorId, string? patientName, DateOnly? from, DateOnly? to);
        Task<ConsultationDetailAdminDto?> GetConsultationDetailAdminAsync(int id, int clinicId);
        Task<(bool success, string? error, ConsultationTokenDto? token)> GetAdminLiveKitTokenAsync(int id, int userId, int clinicId);

        // Doctor
        Task<List<InvitationDto>> GetMyInvitationsAsync(int doctorId);
        Task<(bool success, string? error)> AcceptInvitationAsync(int id, int doctorId);
        Task<(bool success, string? error)> RejectInvitationAsync(int id, int doctorId);
        Task<List<MyClinicDto>> GetMyClinicsAsync(int doctorId);
        Task<ConsultantHistoryDto> GetDoctorClinicHistoryAsync(int ccId, int doctorId, string? patientName, DateOnly? from, DateOnly? to);
        Task<List<DoctorConsultationItemDto>> GetMyConsultationsAsync(int doctorId, string? status);
        Task<(bool success, string? error)> AcceptConsultationAsync(int id, int doctorId);
        Task<(bool success, string? error)> RejectConsultationAsync(int id, string reason, int doctorId);
        Task<ConsultationDetailDoctorDto?> GetConsultationDetailDoctorAsync(int id, int doctorId);
        Task<(bool success, string? error)> ConcludeConsultationAsync(int id, ConcludeConsultationDto dto, int doctorId);
        Task<(bool success, string? error, ConsultationTokenDto? token)> GetDoctorLiveKitTokenAsync(int id, int userId, int doctorId);
    }

    public class OnlineConsultationService : IOnlineConsultationService
    {
        private readonly MedDataDB _db;
        private readonly IHubContext<ConsultationHub> _hub;
        private readonly IConsultationConnectionService _connections;
        private readonly IConfiguration _config;
        private readonly EncryptionService _encryption;
        private readonly ILogger<OnlineConsultationService> _logger;

        public OnlineConsultationService(
            MedDataDB db,
            IHubContext<ConsultationHub> hub,
            IConsultationConnectionService connections,
            IConfiguration config,
            EncryptionService encryption,
            ILogger<OnlineConsultationService> logger)
        {
            _db = db;
            _hub = hub;
            _connections = connections;
            _config = config;
            _encryption = encryption;
            _logger = logger;
        }

        // ─── SEARCH DOCTORS (Admin) ───────────────────────────────────────────

        public async Task<List<DoctorSearchResultDto>> SearchDoctorsAsync(SearchDoctorsQuery q, int adminClinicId)
        {
            try
            {
                var hasFilter = !string.IsNullOrWhiteSpace(q.PassportSeries)
                    || !string.IsNullOrWhiteSpace(q.Phone)
                    || q.RegionId.HasValue
                    || q.DistrictId.HasValue
                    || q.ClinicId.HasValue;

                if (!hasFilter) return new List<DoctorSearchResultDto>();

                // Allaqachon accepted yoki pending invitation bor doctorlar
                var excludedDoctorIds = await _db.ConsultantInvitations.AsNoTracking()
                    .Where(i => i.ClinicId == adminClinicId &&
                               (i.Status == "accepted" || i.Status == "pending"))
                    .Select(i => i.DoctorId)
                    .ToListAsync();

                var doctorQuery = _db.Doctors
                    .AsNoTracking()
                    .Include(d => d.User)
                        .ThenInclude(u => u!.Clinic)
                            .ThenInclude(c => c!.ClinicDetail)
                                .ThenInclude(cd => cd!.District)
                                    .ThenInclude(di => di!.Region)
                    .Include(d => d.DoctorPositions!)
                        .ThenInclude(dp => dp.Position)
                    .Where(d => d.User != null && d.User.RoleId == 4
                                && !excludedDoctorIds.Contains(d.Id));

                if (!string.IsNullOrWhiteSpace(q.Phone))
                {
                    var phone = q.Phone.Trim();
                    doctorQuery = doctorQuery.Where(d => d.Phone != null && d.Phone.Contains(phone));
                }

                if (q.ClinicId.HasValue)
                    doctorQuery = doctorQuery.Where(d => d.User!.ClinicId == q.ClinicId.Value);

                if (q.DistrictId.HasValue)
                    doctorQuery = doctorQuery.Where(d =>
                        d.User!.Clinic != null &&
                        d.User.Clinic.ClinicDetail != null &&
                        d.User.Clinic.ClinicDetail.DistrictId == q.DistrictId.Value);

                if (q.RegionId.HasValue)
                    doctorQuery = doctorQuery.Where(d =>
                        d.User!.Clinic != null &&
                        d.User.Clinic.ClinicDetail != null &&
                        d.User.Clinic.ClinicDetail.District != null &&
                        d.User.Clinic.ClinicDetail.District.RegionId == q.RegionId.Value);

                var doctors = await doctorQuery.ToListAsync();

                // Passport seriyasi bo'yicha qidiruv — doctor.Phone orqali (passport mavjud emas)
                if (!string.IsNullOrWhiteSpace(q.PassportSeries))
                {
                    var ps = q.PassportSeries.Trim().ToUpper();
                    doctors = doctors.Where(d =>
                        (d.FirstName != null && d.FirstName.ToUpper().Contains(ps)) ||
                        (d.LastName  != null && d.LastName.ToUpper().Contains(ps)) ||
                        (d.SureName  != null && d.SureName.ToUpper().Contains(ps))
                    ).ToList();
                }

                return doctors.Select(d =>
                {
                    var position = d.DoctorPositions?.FirstOrDefault()?.Position?.NameUz
                               ?? d.DoctorPositions?.FirstOrDefault()?.Position?.NameRu;
                    var detail = d.User?.Clinic?.ClinicDetail;
                    return new DoctorSearchResultDto
                    {
                        DoctorId    = d.Id,
                        FullName    = $"{d.FirstName} {d.LastName}".Trim(),
                        Position    = position,
                        Phone       = d.Phone,
                        ClinicName  = d.User?.Clinic?.ClinicName ?? "",
                        RegionName   = detail?.District?.Region?.NameUz ?? detail?.District?.Region?.NameRu,
                        DistrictName = detail?.District?.NameUz ?? detail?.District?.NameRu
                    };
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SearchDoctorsAsync xatolik: clinicId={ClinicId}", adminClinicId);
                return new List<DoctorSearchResultDto>();
            }
        }

        public async Task<ConsultationPatientLookupDto> FindPatientAsync(string passportSeries, DateOnly birthDate)
        {
            var normalizedPassport = NormalizePassport(passportSeries);
            if (string.IsNullOrWhiteSpace(normalizedPassport))
                return new ConsultationPatientLookupDto { Found = false };

            var candidates = await _db.Patcients
                .AsNoTracking()
                .Where(p => p.BirthDate == birthDate)
                .ToListAsync();

            foreach (var patient in candidates)
            {
                string? decryptedPassport = null;
                try
                {
                    decryptedPassport = _encryption.Decrypt(patient.Passport);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Patient passport decrypt xatolik: patientId={PatientId}", patient.Id);
                    continue;
                }

                if (NormalizePassport(decryptedPassport) != normalizedPassport) continue;

                return new ConsultationPatientLookupDto
                {
                    Found = true,
                    PatientId = patient.Id,
                    PassportSeries = decryptedPassport,
                    FullName = $"{patient.FirstName} {patient.LastName} {patient.SureName}".Trim(),
                    BirthDate = patient.BirthDate,
                    Gender = patient.Gender,
                    Phone = patient.Phone,
                    Address = patient.Address
                };
            }

            return new ConsultationPatientLookupDto
            {
                Found = false,
                PassportSeries = passportSeries,
                BirthDate = birthDate
            };
        }

        // ─── INVITE DOCTOR (Admin) ────────────────────────────────────────────

        public async Task<(bool success, string? error)> InviteDoctorAsync(
            InviteDoctorDto dto, int adminUserId, int clinicId)
        {
            try
            {
                if (dto.PricePerSession < 0)
                    return (false, "Narx manfiy bo'lishi mumkin emas");

                var existing = await _db.ConsultantInvitations.AsNoTracking()
                    .AnyAsync(i => i.ClinicId == clinicId && i.DoctorId == dto.DoctorId);

                if (existing)
                    return (false, "Bu shifokorga allaqachon taklif yuborilgan");

                var doctor = await _db.Doctors.AsNoTracking()
                    .Include(d => d.User)
                    .FirstOrDefaultAsync(d => d.Id == dto.DoctorId);

                if (doctor == null) return (false, "Shifokor topilmadi");

                var invitation = new ConsultantInvitation
                {
                    ClinicId       = clinicId,
                    DoctorId       = dto.DoctorId,
                    PricePerSession = dto.PricePerSession,
                    Status         = "pending",
                    InvitedAt      = DateTime.UtcNow
                };
                _db.ConsultantInvitations.Add(invitation);
                await _db.SaveChangesAsync();

                if (doctor.UserId > 0)
                {
                    var conns = _connections.GetConnectionIds(doctor.UserId).ToList();
                    if (conns.Any())
                    {
                        var clinic = await _db.Clinics.AsNoTracking()
                            .FirstOrDefaultAsync(c => c.Id == clinicId);
                        await _hub.Clients.Clients(conns).SendAsync("NewInvitation", new
                        {
                            invitationId   = invitation.Id,
                            clinicName     = clinic?.ClinicName ?? "",
                            pricePerSession = dto.PricePerSession
                        });
                    }
                }

                return (true, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "InviteDoctorAsync xatolik: clinicId={ClinicId}", clinicId);
                return (false, "Server xatoligi yuz berdi");
            }
        }

        // ─── MY CONSULTANTS (Admin) ───────────────────────────────────────────

        public async Task<List<MyConsultantDto>> GetMyConsultantsAsync(int clinicId)
        {
            try
            {
                return await _db.ClinicConsultants
                    .AsNoTracking()
                    .Where(cc => cc.ClinicId == clinicId && cc.Status == "active")
                    .Include(cc => cc.Doctor)
                        .ThenInclude(d => d!.DoctorPositions!)
                            .ThenInclude(dp => dp.Position)
                    .OrderByDescending(cc => cc.LinkedAt)
                    .Select(cc => new MyConsultantDto
                    {
                        ClinicConsultantId = cc.Id,
                        DoctorId           = cc.DoctorId,
                        FullName           = cc.Doctor != null
                            ? $"{cc.Doctor.FirstName} {cc.Doctor.LastName}".Trim() : "",
                        Position           = cc.Doctor != null && cc.Doctor.DoctorPositions != null
                            ? cc.Doctor.DoctorPositions
                                .Select(dp => dp.Position != null ? dp.Position.NameUz ?? dp.Position.NameRu : null)
                                .FirstOrDefault()
                            : null,
                        Phone              = cc.Doctor != null ? cc.Doctor.Phone : null,
                        CurrentPrice       = cc.CurrentPrice,
                        TotalConsultations = cc.TotalConsultations,
                        LinkedAt           = cc.LinkedAt
                    })
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetMyConsultantsAsync xatolik: clinicId={ClinicId}", clinicId);
                return new List<MyConsultantDto>();
            }
        }

        public async Task<List<SentInvitationDto>> GetMySentInvitationsAsync(int clinicId)
        {
            try
            {
                return await _db.ConsultantInvitations
                    .AsNoTracking()
                    .Where(i => i.ClinicId == clinicId)
                    .Include(i => i.Doctor)
                        .ThenInclude(d => d!.User)
                            .ThenInclude(u => u!.Clinic)
                    .Include(i => i.Doctor)
                        .ThenInclude(d => d!.DoctorPositions!)
                            .ThenInclude(dp => dp.Position)
                    .OrderByDescending(i => i.InvitedAt)
                    .Select(i => new SentInvitationDto
                    {
                        Id = i.Id,
                        DoctorId = i.DoctorId,
                        DoctorFullName = i.Doctor != null
                            ? $"{i.Doctor.FirstName} {i.Doctor.LastName}".Trim()
                            : "",
                        DoctorPosition = i.Doctor != null && i.Doctor.DoctorPositions != null
                            ? i.Doctor.DoctorPositions
                                .Select(dp => dp.Position != null ? dp.Position.NameUz ?? dp.Position.NameRu : null)
                                .FirstOrDefault()
                            : null,
                        DoctorPhone = i.Doctor != null ? i.Doctor.Phone : null,
                        DoctorClinicName = i.Doctor != null && i.Doctor.User != null && i.Doctor.User.Clinic != null
                            ? i.Doctor.User.Clinic.ClinicName ?? ""
                            : "",
                        PricePerSession = i.PricePerSession,
                        InvitedAt = i.InvitedAt,
                        RespondedAt = i.RespondedAt,
                        Status = i.Status
                    })
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetMySentInvitationsAsync xatolik: clinicId={ClinicId}", clinicId);
                return new List<SentInvitationDto>();
            }
        }

        public async Task<ConsultationBadgeCountsDto> GetBadgeCountsAsync(int roleId, int clinicId, int doctorId)
        {
            try
            {
                var dto = new ConsultationBadgeCountsDto();

                if ((roleId == 2 || roleId == 3) && clinicId > 0)
                {
                    dto.AdminPendingCount = await _db.Consultations.AsNoTracking()
                        .CountAsync(c => c.ClinicId == clinicId && c.Status == "created");
                }

                if (roleId == 4 && doctorId > 0)
                {
                    dto.DoctorPendingInvitationsCount = await _db.ConsultantInvitations.AsNoTracking()
                        .CountAsync(i => i.DoctorId == doctorId && i.Status == "pending");
                    dto.DoctorCreatedCount = await _db.Consultations.AsNoTracking()
                        .CountAsync(c => c.DoctorId == doctorId && c.Status == "created");
                    dto.DoctorPendingCount = dto.DoctorPendingInvitationsCount + dto.DoctorCreatedCount;
                }

                return dto;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetBadgeCountsAsync xatolik: roleId={RoleId}, clinicId={ClinicId}, doctorId={DoctorId}", roleId, clinicId, doctorId);
                return new ConsultationBadgeCountsDto();
            }
        }

        // ─── UPDATE PRICE (Admin) ─────────────────────────────────────────────

        public async Task<(bool success, string? error)> UpdateConsultantPriceAsync(
            int ccId, UpdatePriceDto dto, int adminUserId, int clinicId)
        {
            try
            {
                if (dto.NewPrice < 0)
                    return (false, "Narx manfiy bo'lishi mumkin emas");

                if (dto.EffectiveFrom < DateOnly.FromDateTime(DateTime.Today))
                    return (false, "Sana o'tgan bo'lishi mumkin emas");

                var cc = await _db.ClinicConsultants
                    .FirstOrDefaultAsync(c => c.Id == ccId && c.ClinicId == clinicId);

                if (cc == null) return (false, "Konsultant topilmadi");

                var history = new ConsultantPriceHistory
                {
                    ClinicConsultantId = ccId,
                    OldPrice           = cc.CurrentPrice,
                    NewPrice           = dto.NewPrice,
                    EffectiveFrom      = dto.EffectiveFrom,
                    ChangedAt          = DateTime.UtcNow,
                    ChangedByUserId    = adminUserId
                };
                _db.ConsultantPriceHistories.Add(history);

                cc.CurrentPrice = dto.NewPrice;
                await _db.SaveChangesAsync();

                return (true, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "UpdateConsultantPriceAsync xatolik: ccId={Id}", ccId);
                return (false, "Server xatoligi yuz berdi");
            }
        }

        // ─── CONSULTANT HISTORY (Admin) ───────────────────────────────────────

        public async Task<ConsultantHistoryDto> GetConsultantHistoryAsync(
            int ccId, int clinicId, string? patientName, DateOnly? from, DateOnly? to)
        {
            try
            {
                var query = _db.Consultations
                    .AsNoTracking()
                    .Where(c => c.ClinicConsultantId == ccId && c.ClinicId == clinicId)
                    .Include(c => c.Patient)
                    .Include(c => c.Conclusion)
                    .AsQueryable();

                if (!string.IsNullOrWhiteSpace(patientName))
                {
                    var n = patientName.Trim().ToLower();
                    query = query.Where(c =>
                        c.Patient != null &&
                        ((c.Patient.FirstName != null && c.Patient.FirstName.ToLower().Contains(n)) ||
                         (c.Patient.LastName  != null && c.Patient.LastName.ToLower().Contains(n)) ||
                         (c.Patient.SureName  != null && c.Patient.SureName.ToLower().Contains(n))));
                }

                if (from.HasValue)  query = query.Where(c => c.ConsultationDate >= from.Value);
                if (to.HasValue)    query = query.Where(c => c.ConsultationDate <= to.Value);

                var items = await query.OrderByDescending(c => c.ConsultationDate).ToListAsync();

                var rows = items.Select(c => new ConsultantHistoryItemDto
                {
                    Id              = c.Id,
                    PatientFullName = c.Patient != null
                        ? $"{c.Patient.FirstName} {c.Patient.LastName}".Trim() : "",
                    ConsultationDate = c.ConsultationDate,
                    PriceAtCreation  = c.PriceAtCreation,
                    Status           = c.Status,
                    HasConclusion    = c.Conclusion != null
                }).ToList();

                return new ConsultantHistoryDto
                {
                    Consultations = rows,
                    TotalAmount   = rows.Sum(r => r.PriceAtCreation)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetConsultantHistoryAsync xatolik: ccId={Id}", ccId);
                return new ConsultantHistoryDto();
            }
        }

        // ─── CREATE CONSULTATIONS (Admin) ─────────────────────────────────────

        public async Task<(bool success, string? error, int count)> CreateConsultationsAsync(
            CreateConsultationDto dto, int adminUserId, int clinicId)
        {
            try
            {
                if (dto.DoctorIds == null || dto.DoctorIds.Length == 0)
                    return (false, "Kamida 1 ta shifokor tanlash kerak", 0);

                if (dto.ConsultationDate < DateOnly.FromDateTime(DateTime.Today))
                    return (false, "Sana o'tgan bo'lishi mumkin emas", 0);

                if (dto.ConsultationDate > DateOnly.FromDateTime(DateTime.Today.AddDays(30)))
                    return (false, "Sana bugundan 30 kundan ko'p bo'lishi mumkin emas", 0);

                // Bemor topish yoki yaratish
                int patientId;
                if (dto.PatientId.HasValue && dto.PatientId.Value > 0)
                {
                    var patExists = await _db.Patcients.AnyAsync(p => p.Id == dto.PatientId.Value);
                    if (!patExists) return (false, "Bemor topilmadi", 0);
                    patientId = dto.PatientId.Value;
                }
                else if (dto.NewPatient != null)
                {
                    var encryptedPassport = _encryption.Encrypt(dto.NewPatient.PassportSeries);
                    var nameParts = dto.NewPatient.FullName.Trim().Split(' ', 3);
                    var newPatient = new Patcient
                    {
                        Passport  = encryptedPassport,
                        FirstName = nameParts.Length > 0 ? nameParts[0] : dto.NewPatient.FullName,
                        LastName  = nameParts.Length > 1 ? nameParts[1] : "",
                        SureName  = nameParts.Length > 2 ? nameParts[2] : "",
                        BirthDate = dto.NewPatient.BirthDate,
                        Gender    = dto.NewPatient.Gender,
                        Phone     = dto.NewPatient.Phone ?? "",
                        Address   = dto.NewPatient.Address,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _db.Patcients.Add(newPatient);
                    await _db.SaveChangesAsync();
                    patientId = newPatient.Id;
                }
                else
                {
                    return (false, "Bemor ma'lumotlari kiritilmagan", 0);
                }

                int createdCount = 0;
                foreach (var doctorId in dto.DoctorIds.Distinct())
                {
                    var cc = await _db.ClinicConsultants
                        .FirstOrDefaultAsync(c => c.ClinicId == clinicId &&
                                                  c.DoctorId == doctorId &&
                                                  c.Status == "active");

                    if (cc == null) continue;

                    // Narx logikasi: ConsultantPriceHistory dan topish
                    var price = await GetPriceForDateAsync(cc.Id, dto.ConsultationDate)
                                ?? cc.CurrentPrice;

                    var consultation = new Consultation
                    {
                        ClinicId          = clinicId,
                        ClinicConsultantId = cc.Id,
                        DoctorId          = doctorId,
                        PatientId         = patientId,
                        CreatedByAdminId  = adminUserId,
                        ConsultationDate  = dto.ConsultationDate,
                        PriceAtCreation   = price,
                        Status            = "created",
                        CreatedAt         = DateTime.UtcNow,
                        UpdatedAt         = DateTime.UtcNow
                    };
                    _db.Consultations.Add(consultation);
                    await _db.SaveChangesAsync();

                    cc.TotalConsultations++;
                    await _db.SaveChangesAsync();

                    // Shifokorga bildirishnoma
                    var doctor = await _db.Doctors.AsNoTracking()
                        .Where(d => d.Id == doctorId)
                        .Select(d => new { d.UserId, d.FirstName, d.LastName })
                        .FirstOrDefaultAsync();

                    if (doctor != null)
                    {
                        var conns = _connections.GetConnectionIds(doctor.UserId).ToList();
                        if (conns.Any())
                        {
                            var clinic = await _db.Clinics.AsNoTracking()
                                .FirstOrDefaultAsync(c => c.Id == clinicId);
                            await _hub.Clients.Clients(conns).SendAsync("NewConsultation", new
                            {
                                consultationId   = consultation.Id,
                                clinicName       = clinic?.ClinicName ?? "",
                                consultationDate = dto.ConsultationDate
                            });
                        }
                    }

                    createdCount++;
                }

                return createdCount > 0
                    ? (true, null, createdCount)
                    : (false, "Faol konsultant topilmadi", 0);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CreateConsultationsAsync xatolik: adminId={Id}", adminUserId);
                return (false, "Server xatoligi yuz berdi", 0);
            }
        }

        private async Task<decimal?> GetPriceForDateAsync(int ccId, DateOnly consultationDate)
        {
            return await _db.ConsultantPriceHistories
                .AsNoTracking()
                .Where(p => p.ClinicConsultantId == ccId && p.EffectiveFrom <= consultationDate)
                .OrderByDescending(p => p.EffectiveFrom)
                .Select(p => (decimal?)p.NewPrice)
                .FirstOrDefaultAsync();
        }

        // ─── CONSULTATION LIST (Admin) ────────────────────────────────────────

        public async Task<List<ConsultationListItemDto>> GetConsultationListAsync(
            int clinicId, string? status, int? doctorId, string? patientName, DateOnly? from, DateOnly? to)
        {
            try
            {
                var query = _db.Consultations
                    .AsNoTracking()
                    .Where(c => c.ClinicId == clinicId)
                    .Include(c => c.Patient)
                    .Include(c => c.Doctor)
                    .Include(c => c.Conclusion)
                    .AsQueryable();

                if (!string.IsNullOrWhiteSpace(status))
                    query = query.Where(c => c.Status == status);

                if (doctorId.HasValue)
                    query = query.Where(c => c.DoctorId == doctorId.Value);

                if (!string.IsNullOrWhiteSpace(patientName))
                {
                    var n = patientName.Trim().ToLower();
                    query = query.Where(c =>
                        c.Patient != null &&
                        ((c.Patient.FirstName != null && c.Patient.FirstName.ToLower().Contains(n)) ||
                         (c.Patient.LastName  != null && c.Patient.LastName.ToLower().Contains(n))));
                }

                if (from.HasValue) query = query.Where(c => c.ConsultationDate >= from.Value);
                if (to.HasValue)   query = query.Where(c => c.ConsultationDate <= to.Value);

                return await query
                    .OrderByDescending(c => c.CreatedAt)
                    .Select(c => new ConsultationListItemDto
                    {
                        Id              = c.Id,
                        PatientFullName = c.Patient != null
                            ? $"{c.Patient.FirstName} {c.Patient.LastName}".Trim() : "",
                        DoctorFullName  = c.Doctor != null
                            ? $"{c.Doctor.FirstName} {c.Doctor.LastName}".Trim() : "",
                        PriceAtCreation  = c.PriceAtCreation,
                        ConsultationDate = c.ConsultationDate,
                        CreatedAt        = c.CreatedAt,
                        Status           = c.Status,
                        HasConclusion    = c.Conclusion != null
                    })
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetConsultationListAsync xatolik: clinicId={ClinicId}", clinicId);
                return new List<ConsultationListItemDto>();
            }
        }

        // ─── CONSULTATION DETAIL (Admin) ──────────────────────────────────────

        public async Task<ConsultationDetailAdminDto?> GetConsultationDetailAdminAsync(int id, int clinicId)
        {
            try
            {
                var c = await _db.Consultations
                    .AsNoTracking()
                    .Where(x => x.Id == id && x.ClinicId == clinicId)
                    .Include(x => x.Patient)
                    .Include(x => x.Doctor)
                        .ThenInclude(d => d!.User)
                            .ThenInclude(u => u!.Clinic)
                    .Include(x => x.Doctor)
                        .ThenInclude(d => d!.DoctorPositions!)
                            .ThenInclude(dp => dp.Position)
                    .Include(x => x.Conclusion)
                    .FirstOrDefaultAsync();

                if (c == null) return null;

                // Bemorning barcha tahlillari
                var analyses = await GetPatientAnalysesAsync(c.PatientId);

                // Passport decrypt qilish (admin uchun ko'rsatiladi)
                string? decryptedPassport = null;
                if (c.Patient?.Passport != null)
                {
                    try { decryptedPassport = _encryption.Decrypt(c.Patient.Passport); }
                    catch { decryptedPassport = null; }
                }

                var d = c.Doctor;
                var position = d?.DoctorPositions?.FirstOrDefault()?.Position?.NameUz
                            ?? d?.DoctorPositions?.FirstOrDefault()?.Position?.NameRu;

                return new ConsultationDetailAdminDto
                {
                    Id               = c.Id,
                    ConsultationDate = c.ConsultationDate,
                    PriceAtCreation  = c.PriceAtCreation,
                    Status           = c.Status,
                    CreatedAt        = c.CreatedAt,
                    RejectionReason  = c.RejectionReason,
                    LiveKitRoomName  = c.LiveKitRoomName,

                    PatientId        = c.PatientId,
                    PatientFullName  = c.Patient != null
                        ? $"{c.Patient.FirstName} {c.Patient.LastName}".Trim() : "",
                    BirthDate        = c.Patient?.BirthDate,
                    Gender           = c.Patient?.Gender,
                    Phone            = c.Patient?.Phone,
                    Address          = c.Patient?.Address,
                    PassportSeries   = decryptedPassport,

                    DoctorId         = c.DoctorId,
                    DoctorUserId     = d?.UserId,
                    DoctorIsOnline   = d?.UserId > 0 && _connections.IsOnline(d.UserId),
                    DoctorFullName   = d != null ? $"{d.FirstName} {d.LastName}".Trim() : "",
                    DoctorPosition   = position,
                    DoctorPhone      = d?.Phone,
                    DoctorClinicName = d?.User?.Clinic?.ClinicName ?? "",

                    Conclusion = c.Conclusion == null ? null : new ConsultationConclusionDto
                    {
                        PatientCondition = c.Conclusion.PatientCondition,
                        Diagnosis        = c.Conclusion.Diagnosis,
                        Treatment        = c.Conclusion.Treatment,
                        CreatedAt        = c.Conclusion.CreatedAt,
                        UpdatedAt        = c.Conclusion.UpdatedAt
                    },

                    Analyses = analyses
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetConsultationDetailAdminAsync xatolik: id={Id}", id);
                return null;
            }
        }

        // ─── ADMIN LIVEKIT TOKEN ──────────────────────────────────────────────

        public async Task<(bool success, string? error, ConsultationTokenDto? token)> GetAdminLiveKitTokenAsync(
            int id, int userId, int clinicId)
        {
            try
            {
                var c = await _db.Consultations.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId);

                if (c == null) return (false, "Konsultatsiya topilmadi", null);

                var roomName = string.IsNullOrEmpty(c.LiveKitRoomName)
                    ? $"consultation-{c.Id}" : c.LiveKitRoomName;

                if (c.LiveKitRoomName == null)
                {
                    var cons = await _db.Consultations.FirstOrDefaultAsync(x => x.Id == id);
                    if (cons != null)
                    {
                        cons.LiveKitRoomName = roomName;
                        await _db.SaveChangesAsync();
                    }
                }

                var token = BuildLiveKitToken(userId, roomName, $"admin-{userId}");
                return (true, null, new ConsultationTokenDto
                {
                    Token      = token,
                    LiveKitUrl = _config["LiveKit:Url"] ?? "",
                    RoomName   = roomName
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetAdminLiveKitTokenAsync xatolik: id={Id}", id);
                return (false, "Server xatoligi yuz berdi", null);
            }
        }

        // ─── INVITATIONS (Doctor) ─────────────────────────────────────────────

        public async Task<List<InvitationDto>> GetMyInvitationsAsync(int doctorId)
        {
            try
            {
                return await _db.ConsultantInvitations
                    .AsNoTracking()
                    .Where(i => i.DoctorId == doctorId)
                    .Include(i => i.Clinic)
                    .OrderByDescending(i => i.InvitedAt)
                    .Select(i => new InvitationDto
                    {
                        Id             = i.Id,
                        ClinicName     = i.Clinic != null ? i.Clinic.ClinicName ?? "" : "",
                        PricePerSession = i.PricePerSession,
                        InvitedAt      = i.InvitedAt,
                        Status         = i.Status
                    })
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetMyInvitationsAsync xatolik: doctorId={DoctorId}", doctorId);
                return new List<InvitationDto>();
            }
        }

        // ─── ACCEPT INVITATION (Doctor) ───────────────────────────────────────

        public async Task<(bool success, string? error)> AcceptInvitationAsync(int id, int doctorId)
        {
            try
            {
                var invitation = await _db.ConsultantInvitations
                    .FirstOrDefaultAsync(i => i.Id == id && i.DoctorId == doctorId);

                if (invitation == null) return (false, "Taklif topilmadi");
                if (invitation.Status != "pending") return (false, "Taklif allaqachon ko'rib chiqilgan");

                // UNIQUE constraint: (ClinicId, DoctorId) tekshirish
                var existingLink = await _db.ClinicConsultants
                    .FirstOrDefaultAsync(cc => cc.ClinicId == invitation.ClinicId && cc.DoctorId == doctorId);

                if (existingLink != null)
                {
                    existingLink.Status      = "active";
                    existingLink.CurrentPrice = invitation.PricePerSession;
                    existingLink.LinkedAt    = DateTime.UtcNow;
                    existingLink.InvitationId = invitation.Id;
                }
                else
                {
                    _db.ClinicConsultants.Add(new ClinicConsultant
                    {
                        ClinicId      = invitation.ClinicId,
                        DoctorId      = doctorId,
                        InvitationId  = invitation.Id,
                        LinkedAt      = DateTime.UtcNow,
                        Status        = "active",
                        CurrentPrice  = invitation.PricePerSession
                    });
                }

                invitation.Status      = "accepted";
                invitation.RespondedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();

                return (true, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AcceptInvitationAsync xatolik: id={Id}", id);
                return (false, "Server xatoligi yuz berdi");
            }
        }

        // ─── REJECT INVITATION (Doctor) ───────────────────────────────────────

        public async Task<(bool success, string? error)> RejectInvitationAsync(int id, int doctorId)
        {
            try
            {
                var invitation = await _db.ConsultantInvitations
                    .FirstOrDefaultAsync(i => i.Id == id && i.DoctorId == doctorId);

                if (invitation == null) return (false, "Taklif topilmadi");
                if (invitation.Status != "pending") return (false, "Taklif allaqachon ko'rib chiqilgan");

                invitation.Status      = "rejected";
                invitation.RespondedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();

                return (true, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "RejectInvitationAsync xatolik: id={Id}", id);
                return (false, "Server xatoligi yuz berdi");
            }
        }

        // ─── MY CLINICS (Doctor) ──────────────────────────────────────────────

        public async Task<List<MyClinicDto>> GetMyClinicsAsync(int doctorId)
        {
            try
            {
                return await _db.ClinicConsultants
                    .AsNoTracking()
                    .Where(cc => cc.DoctorId == doctorId && cc.Status == "active")
                    .Include(cc => cc.Clinic)
                    .OrderByDescending(cc => cc.LinkedAt)
                    .Select(cc => new MyClinicDto
                    {
                        ClinicConsultantId = cc.Id,
                        ClinicName         = cc.Clinic != null ? cc.Clinic.ClinicName ?? "" : "",
                        LinkedAt           = cc.LinkedAt,
                        TotalConsultations = cc.TotalConsultations,
                        CurrentPrice       = cc.CurrentPrice
                    })
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetMyClinicsAsync xatolik: doctorId={DoctorId}", doctorId);
                return new List<MyClinicDto>();
            }
        }

        // ─── DOCTOR CLINIC HISTORY ────────────────────────────────────────────

        public async Task<ConsultantHistoryDto> GetDoctorClinicHistoryAsync(
            int ccId, int doctorId, string? patientName, DateOnly? from, DateOnly? to)
        {
            try
            {
                // Shifokor bu clinicConsultant da haqiqatan DoctorId ekanligini tekshirish
                var ccExists = await _db.ClinicConsultants.AsNoTracking()
                    .AnyAsync(cc => cc.Id == ccId && cc.DoctorId == doctorId);

                if (!ccExists) return new ConsultantHistoryDto();

                var query = _db.Consultations
                    .AsNoTracking()
                    .Where(c => c.ClinicConsultantId == ccId)
                    .Include(c => c.Patient)
                    .Include(c => c.Conclusion)
                    .AsQueryable();

                if (!string.IsNullOrWhiteSpace(patientName))
                {
                    var n = patientName.Trim().ToLower();
                    query = query.Where(c =>
                        c.Patient != null &&
                        ((c.Patient.FirstName != null && c.Patient.FirstName.ToLower().Contains(n)) ||
                         (c.Patient.LastName  != null && c.Patient.LastName.ToLower().Contains(n))));
                }

                if (from.HasValue) query = query.Where(c => c.ConsultationDate >= from.Value);
                if (to.HasValue)   query = query.Where(c => c.ConsultationDate <= to.Value);

                var items = await query.OrderByDescending(c => c.ConsultationDate).ToListAsync();

                var rows = items.Select(c => new ConsultantHistoryItemDto
                {
                    Id               = c.Id,
                    PatientFullName  = c.Patient != null
                        ? $"{c.Patient.FirstName} {c.Patient.LastName}".Trim() : "",
                    ConsultationDate = c.ConsultationDate,
                    PriceAtCreation  = c.PriceAtCreation,
                    Status           = c.Status,
                    HasConclusion    = c.Conclusion != null
                }).ToList();

                return new ConsultantHistoryDto
                {
                    Consultations = rows,
                    TotalAmount   = rows.Sum(r => r.PriceAtCreation)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetDoctorClinicHistoryAsync xatolik: ccId={Id}", ccId);
                return new ConsultantHistoryDto();
            }
        }

        // ─── MY CONSULTATIONS (Doctor) ────────────────────────────────────────

        public async Task<List<DoctorConsultationItemDto>> GetMyConsultationsAsync(int doctorId, string? status)
        {
            try
            {
                var query = _db.Consultations
                    .AsNoTracking()
                    .Where(c => c.DoctorId == doctorId)
                    .Include(c => c.Patient)
                    .Include(c => c.Clinic)
                    .Include(c => c.Conclusion)
                    .AsQueryable();

                if (!string.IsNullOrWhiteSpace(status))
                    query = query.Where(c => c.Status == status);

                var items = await query.ToListAsync();

                // Tartiblash: "created" birinchi, keyin created_at desc
                return items
                    .OrderByDescending(c => c.Status == "created" ? 1 : 0)
                    .ThenByDescending(c => c.CreatedAt)
                    .Select(c => new DoctorConsultationItemDto
                    {
                        Id               = c.Id,
                        PatientFullName  = c.Patient != null
                            ? $"{c.Patient.FirstName} {c.Patient.LastName}".Trim() : "",
                        ClinicName       = c.Clinic?.ClinicName ?? "",
                        PriceAtCreation  = c.PriceAtCreation,
                        ConsultationDate = c.ConsultationDate,
                        CreatedAt        = c.CreatedAt,
                        Status           = c.Status,
                        HasConclusion    = c.Conclusion != null
                    })
                    .ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetMyConsultationsAsync xatolik: doctorId={DoctorId}", doctorId);
                return new List<DoctorConsultationItemDto>();
            }
        }

        // ─── ACCEPT CONSULTATION (Doctor) ─────────────────────────────────────

        public async Task<(bool success, string? error)> AcceptConsultationAsync(int id, int doctorId)
        {
            try
            {
                var c = await _db.Consultations
                    .Where(x => x.Id == id && x.DoctorId == doctorId)
                    .FirstOrDefaultAsync();

                if (c == null) return (false, "Konsultatsiya topilmadi yoki ruxsat yo'q");
                if (c.Status != "created")
                    return (false, "Faqat 'created' holatdagi konsultatsiyani qabul qilish mumkin");

                c.Status    = "reviewing";
                c.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();

                // Adminga bildirishnoma
                var adminConns = _connections.GetAdminConnectionsForClinic(c.ClinicId).ToList();
                if (adminConns.Any())
                    await _hub.Clients.Clients(adminConns).SendAsync("ConsultationReviewing", new
                    {
                        consultationId = id
                    });

                return (true, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AcceptConsultationAsync xatolik: id={Id}", id);
                return (false, "Server xatoligi yuz berdi");
            }
        }

        // ─── REJECT CONSULTATION (Doctor) ─────────────────────────────────────

        public async Task<(bool success, string? error)> RejectConsultationAsync(
            int id, string reason, int doctorId)
        {
            try
            {
                var c = await _db.Consultations
                    .Where(x => x.Id == id && x.DoctorId == doctorId)
                    .FirstOrDefaultAsync();

                if (c == null) return (false, "Konsultatsiya topilmadi yoki ruxsat yo'q");
                if (c.Status != "created" && c.Status != "reviewing")
                    return (false, "Bu holatdagi konsultatsiyani rad etib bo'lmaydi");

                c.Status          = "rejected";
                c.RejectionReason = reason;
                c.UpdatedAt       = DateTime.UtcNow;
                await _db.SaveChangesAsync();

                // Adminga bildirishnoma
                var adminConns = _connections.GetAdminConnectionsForClinic(c.ClinicId).ToList();
                if (adminConns.Any())
                    await _hub.Clients.Clients(adminConns).SendAsync("ConsultationRejected", new
                    {
                        consultationId = id,
                        reason
                    });

                return (true, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "RejectConsultationAsync xatolik: id={Id}", id);
                return (false, "Server xatoligi yuz berdi");
            }
        }

        // ─── DETAIL (Doctor) ──────────────────────────────────────────────────

        public async Task<ConsultationDetailDoctorDto?> GetConsultationDetailDoctorAsync(int id, int doctorId)
        {
            try
            {
                var c = await _db.Consultations
                    .AsNoTracking()
                    .Where(x => x.Id == id && x.DoctorId == doctorId)
                    .Include(x => x.Patient)
                    .Include(x => x.Clinic)
                    .Include(x => x.Conclusion)
                    .FirstOrDefaultAsync();

                if (c == null) return null;

                // Admin ma'lumotlari
                var admin = await _db.Users.AsNoTracking()
                    .Include(u => u.Doctor)
                    .FirstOrDefaultAsync(u => u.Id == c.CreatedByAdminId);

                var adminDoctor = admin?.Doctor;
                var adminFullName = adminDoctor != null
                    ? $"{adminDoctor.FirstName} {adminDoctor.LastName}".Trim()
                    : admin?.Username ?? "";

                // Bemorning tahlillari (shifokor klinikaga tegishli — clinic consultantId orqali)
                var analyses = await GetPatientAnalysesAsync(c.PatientId);

                return new ConsultationDetailDoctorDto
                {
                    Id               = c.Id,
                    ConsultationDate = c.ConsultationDate,
                    PriceAtCreation  = c.PriceAtCreation,
                    Status           = c.Status,
                    RejectionReason  = c.RejectionReason,
                    LiveKitRoomName  = c.LiveKitRoomName,

                    PatientFullName  = c.Patient != null
                        ? $"{c.Patient.FirstName} {c.Patient.LastName}".Trim() : "",
                    BirthDate        = c.Patient?.BirthDate,
                    Gender           = c.Patient?.Gender,
                    Phone            = c.Patient?.Phone,
                    Address          = c.Patient?.Address,

                    AdminFullName    = adminFullName,
                    AdminUserId      = admin?.Id,
                    AdminIsOnline    = admin != null && _connections.IsOnline(admin.Id),
                    AdminPhone       = adminDoctor?.Phone,
                    ClinicName       = c.Clinic?.ClinicName ?? "",

                    Conclusion = c.Conclusion == null ? null : new ConsultationConclusionDto
                    {
                        PatientCondition = c.Conclusion.PatientCondition,
                        Diagnosis        = c.Conclusion.Diagnosis,
                        Treatment        = c.Conclusion.Treatment,
                        CreatedAt        = c.Conclusion.CreatedAt,
                        UpdatedAt        = c.Conclusion.UpdatedAt
                    },

                    Analyses = analyses
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetConsultationDetailDoctorAsync xatolik: id={Id}", id);
                return null;
            }
        }

        // ─── CONCLUDE (Doctor) ────────────────────────────────────────────────

        public async Task<(bool success, string? error)> ConcludeConsultationAsync(
            int id, ConcludeConsultationDto dto, int doctorId)
        {
            try
            {
                var c = await _db.Consultations
                    .Where(x => x.Id == id && x.DoctorId == doctorId)
                    .FirstOrDefaultAsync();

                if (c == null) return (false, "Konsultatsiya topilmadi yoki ruxsat yo'q");

                var existing = await _db.ConsultationConclusions
                    .FirstOrDefaultAsync(cc => cc.ConsultationId == id);

                if (existing != null)
                {
                    existing.PatientCondition = dto.PatientCondition;
                    existing.Diagnosis        = dto.Diagnosis;
                    existing.Treatment        = dto.Treatment;
                    existing.UpdatedAt        = DateTime.UtcNow;
                }
                else
                {
                    _db.ConsultationConclusions.Add(new ConsultationConclusion
                    {
                        ConsultationId   = id,
                        PatientCondition = dto.PatientCondition,
                        Diagnosis        = dto.Diagnosis,
                        Treatment        = dto.Treatment,
                        CreatedAt        = DateTime.UtcNow,
                        UpdatedAt        = DateTime.UtcNow
                    });

                    // Birinchi marta yozilganda → completed
                    c.Status    = "completed";
                    c.UpdatedAt = DateTime.UtcNow;
                }

                await _db.SaveChangesAsync();

                // Adminga bildirishnoma (faqat birinchi marta)
                if (existing == null)
                {
                    var adminConns = _connections.GetAdminConnectionsForClinic(c.ClinicId).ToList();
                    if (adminConns.Any())
                        await _hub.Clients.Clients(adminConns).SendAsync("ConsultationCompleted", new
                        {
                            consultationId = id
                        });
                }

                return (true, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ConcludeConsultationAsync xatolik: id={Id}", id);
                return (false, "Server xatoligi yuz berdi");
            }
        }

        // ─── DOCTOR LIVEKIT TOKEN ──────────────────────────────────────────────

        public async Task<(bool success, string? error, ConsultationTokenDto? token)> GetDoctorLiveKitTokenAsync(
            int id, int userId, int doctorId)
        {
            try
            {
                var c = await _db.Consultations.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == id && x.DoctorId == doctorId);

                if (c == null) return (false, "Konsultatsiya topilmadi", null);

                var roomName = string.IsNullOrEmpty(c.LiveKitRoomName)
                    ? $"consultation-{c.Id}" : c.LiveKitRoomName;

                if (c.LiveKitRoomName == null)
                {
                    var cons = await _db.Consultations.FirstOrDefaultAsync(x => x.Id == id);
                    if (cons != null)
                    {
                        cons.LiveKitRoomName = roomName;
                        await _db.SaveChangesAsync();
                    }
                }

                var token = BuildLiveKitToken(userId, roomName, $"doctor-{userId}");
                return (true, null, new ConsultationTokenDto
                {
                    Token      = token,
                    LiveKitUrl = _config["LiveKit:Url"] ?? "",
                    RoomName   = roomName
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetDoctorLiveKitTokenAsync xatolik: id={Id}", id);
                return (false, "Server xatoligi yuz berdi", null);
            }
        }

        // ─── HELPERS ──────────────────────────────────────────────────────────

        private async Task<List<PatientAnalysisItemDto>> GetPatientAnalysesAsync(int patientId)
        {
            var result = new List<PatientAnalysisItemDto>();

            var ecg = await _db.ECGAnalyse.AsNoTracking()
                .Where(e => e.PatcientId == patientId)
                .Select(e => new { e.Id, e.CreatedAt, HasAi = e.AIAnswerData != null })
                .ToListAsync();
            result.AddRange(ecg.Select(e => new PatientAnalysisItemDto
                { Type = "EKG", Id = e.Id, Date = e.CreatedAt, HasAiResult = e.HasAi }));

            var smad = await _db.SmadAnalyses.AsNoTracking()
                .Where(e => e.PatcientId == patientId)
                .Select(e => new { e.Id, e.CreatedAt, HasAi = e.AIAnswerData != null })
                .ToListAsync();
            result.AddRange(smad.Select(e => new PatientAnalysisItemDto
                { Type = "SMAD", Id = e.Id, Date = e.CreatedAt, HasAiResult = e.HasAi }));

            var holter = await _db.HolterAnalyses.AsNoTracking()
                .Where(e => e.PatcientId == patientId)
                .Select(e => new { e.Id, e.CreatedAt, HasAi = e.AIAnswerData != null })
                .ToListAsync();
            result.AddRange(holter.Select(e => new PatientAnalysisItemDto
                { Type = "Holter", Id = e.Id, Date = e.CreatedAt, HasAiResult = e.HasAi }));

            var lab = await _db.LabAnalyse.AsNoTracking()
                .Where(e => e.PatcientId == patientId)
                .Select(e => new { e.Id, e.CreatedAt, HasAi = e.AIAnswerData != null })
                .ToListAsync();
            result.AddRange(lab.Select(e => new PatientAnalysisItemDto
                { Type = "Lab", Id = e.Id, Date = e.CreatedAt, HasAiResult = e.HasAi }));

            var parasit = await _db.ParasitologyAnalyses.AsNoTracking()
                .Where(e => e.PatcientId == patientId)
                .Select(e => new { e.Id, e.CreatedAt, HasAi = e.AiResponse != null })
                .ToListAsync();
            result.AddRange(parasit.Select(e => new PatientAnalysisItemDto
                { Type = "Parasit", Id = e.Id, Date = e.CreatedAt, HasAiResult = e.HasAi }));

            return result.OrderByDescending(r => r.Date).ToList();
        }

        private string BuildLiveKitToken(int userId, string roomName, string displayName)
        {
            var apiKey    = _config["LiveKit:ApiKey"]    ?? "";
            var apiSecret = _config["LiveKit:ApiSecret"] ?? "";
            return GenerateLiveKitToken(apiKey, apiSecret, $"user_{userId}", roomName, displayName);
        }

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

        private static string NormalizePassport(string? passport) =>
            (passport ?? "").Replace(" ", "").Trim().ToUpperInvariant();
    }
}
