using EkgAnalyzerApi.Constants;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Services.LabStatistics;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services;

/// <summary>Kutilgan rad javobi (400/404/409) — kontroller shu kod bilan qaytaradi.</summary>
public class SuperAdminException : Exception
{
    public int StatusCode { get; }
    public SuperAdminException(int statusCode, string message) : base(message) => StatusCode = statusCode;

    public static SuperAdminException NotFound(string what) => new(404, $"{what} topilmadi");
    public static SuperAdminException Conflict(string message) => new(409, message);
    public static SuperAdminException Bad(string message) => new(400, message);
}

/// <summary>
/// SuperAdmin kabineti — butun platforma bo'yicha kuzatuv va boshqaruv
/// (`tasks-superadmin.md`, SA-03..SA-11).
///
/// Nima uchun alohida servis: mavjud klinika servislari har so'rovda
/// `ICurrentUser.GetClinicIdAsync()` bilan klinikaga cheklaydi, SuperAdminning
/// esa klinikasi yo'q (401 → sessiya o'chadi). Bu yerda hech qanday klinika
/// filtri yo'q — kirish faqat <see cref="RoleConstants.PolicySuperAdmin"/>
/// siyosati bilan himoyalangan.
///
/// O'chirish qoidasi: tibbiy ma'lumotni yo'qotib qo'ymaslik uchun bog'liq
/// tahlili bor klinika/xodim/bemor o'chirilmaydi (409) — ularni
/// faolsizlantirish yoki bloklash kerak. Tahlillar yumshoq o'chiriladi
/// (EKG/Holter/SMAD/Lab — tiklasa bo'ladi).
/// </summary>
public class SuperAdminService
{
    private readonly MedDataDB _db;
    private readonly IConfiguration _config;
    private readonly AnalysisDeletionService _deletion;
    private readonly ILogger<SuperAdminService> _logger;

    public static readonly string[] AnalysisTypes = { "ecg", "holter", "smad", "lab", "combined", "parasitology" };

    public SuperAdminService(MedDataDB db, IConfiguration config, AnalysisDeletionService deletion,
        ILogger<SuperAdminService> logger)
    {
        _db = db;
        _config = config;
        _deletion = deletion;
        _logger = logger;
    }

    // Barcha tahlil turlari bitta shaklda. Parazitologiya holati matnli —
    // umumiy kodlarga keltiriladi (0 kutmoqda, 2 tayyor, -1 xato).
    private const string AllAnalysesSql = @"
        SELECT 'ecg' AS t, id, clinic_id, patient_id, created_doctor_id, status, ai_severity AS sev,
               document_number, created_at, deleted_at FROM ecg_analyses
        UNION ALL
        SELECT 'holter', id, clinic_id, patient_id, created_doctor_id, status, ai_severity,
               document_number, created_at, deleted_at FROM holter_analyses
        UNION ALL
        SELECT 'smad', id, clinic_id, patient_id, created_doctor_id, status, ai_severity,
               document_number, created_at, deleted_at FROM smad_analyses
        UNION ALL
        SELECT 'lab', id, clinic_id, patient_id, created_doctor_id, status, ai_severity,
               document_number, created_at, deleted_at FROM lab_analyses
        UNION ALL
        SELECT 'combined', id, clinic_id, patient_id, created_doctor_id, status, NULL,
               NULL, created_at, NULL::timestamptz FROM combined_analyses
        UNION ALL
        SELECT 'parasitology', id, clinic_id, patient_id, created_doctor_id,
               CASE analysis_status WHEN 'pending' THEN 0 WHEN 'failed' THEN -1 ELSE 2 END,
               jiddiylik_darajasi::text, document_number, created_at, NULL::timestamptz
          FROM parasitology_analyses";

    private string TzName => _config["App:TimeZone"] ?? AppTime.DefaultTimeZoneId;

    private static string FullName(string? last, string? first, string? sure)
        => string.Join(' ', new[] { last, first, sure }.Where(s => !string.IsNullOrWhiteSpace(s))).Trim();

    private static string NormalizePhone(string? phone)
    {
        var digits = new string((phone ?? "").Where(char.IsDigit).ToArray());
        if (digits.Length == 9) digits = "998" + digits;
        return digits;
    }

    private static long L(object? v) => v == null ? 0 : Convert.ToInt64(v);
    private static decimal D(object? v) => v == null ? 0 : Convert.ToDecimal(v);

    // ════════════════════════════════════════════════════════════════════
    // SA-04 — Platforma statistikasi
    // ════════════════════════════════════════════════════════════════════

    public async Task<object> GetOverviewAsync(int days)
    {
        days = Math.Clamp(days, 7, 365);
        var (todayUtc, _) = AppTime.LocalDayBoundsUtc(_config);
        var fromUtc = todayUtc.AddDays(-(days - 1));
        var args = new Dictionary<string, object?> { ["@from"] = fromUtc, ["@today"] = todayUtc };

        // ── Klinikalar, xodimlar, bemorlar ─────────────────────────────
        var clinicsTotal = await _db.Clinics.CountAsync();
        var clinicsActive = await _db.Clinics.CountAsync(c => c.IsActive);
        var clinicsNew = await _db.Clinics.CountAsync(c => c.CreatedAt >= fromUtc);

        var usersByRole = await _db.Users.GroupBy(u => u.RoleId)
            .Select(g => new { roleId = g.Key, count = g.Count(), blocked = g.Count(u => !u.Status) })
            .ToListAsync();

        var patientsTotal = await _db.Patcients.CountAsync();
        var patientsNew = await _db.Patcients.CountAsync(p => p.CreatedAt >= fromUtc);

        // ── Tahlillar: tur bo'yicha ────────────────────────────────────
        var byType = await SqlRows.QueryAsync(_db, $@"
            WITH a AS ({AllAnalysesSql})
            SELECT t,
                   count(*)                                         AS total,
                   count(*) FILTER (WHERE created_at >= @today)     AS today,
                   count(*) FILTER (WHERE created_at >= @from)      AS period,
                   count(*) FILTER (WHERE status = -1)              AS failed,
                   count(*) FILTER (WHERE status IN (0, 1))         AS pending,
                   count(*) FILTER (WHERE status = 2 AND sev = '3') AS severe
              FROM a WHERE deleted_at IS NULL
             GROUP BY t", args);

        var types = AnalysisTypes.Select(t =>
        {
            var r = byType.FirstOrDefault(x => (string?)x["t"] == t);
            return new
            {
                type = t,
                total = L(r?["total"]), today = L(r?["today"]), period = L(r?["period"]),
                failed = L(r?["failed"]), pending = L(r?["pending"]), severe = L(r?["severe"]),
            };
        }).ToList();

        // ── Kunlik grafik (mahalliy sana) ───────────────────────────────
        var daily = await SqlRows.QueryAsync(_db, $@"
            WITH a AS ({AllAnalysesSql})
            SELECT (created_at AT TIME ZONE '{TzName}')::date AS d, t, count(*) AS n,
                   count(*) FILTER (WHERE status = -1) AS failed
              FROM a WHERE deleted_at IS NULL AND created_at >= @from
             GROUP BY 1, 2", args);

        var localToday = AppTime.LocalNow(_config).Date;
        var series = Enumerable.Range(0, days).Select(i =>
        {
            var day = localToday.AddDays(-(days - 1) + i);
            var rows = daily.Where(r => ((DateTime)r["d"]!).Date == day).ToList();
            var counts = AnalysisTypes.ToDictionary(t => t,
                t => L(rows.FirstOrDefault(r => (string?)r["t"] == t)?["n"]));
            return new
            {
                date = day.ToString("yyyy-MM-dd"),
                counts,
                total = counts.Values.Sum(),
                failed = rows.Sum(r => L(r["failed"])),
            };
        }).ToList();

        // ── Jiddiylik (tayyor natijalar, davr ichida) ──────────────────
        var sevRows = await SqlRows.QueryAsync(_db, $@"
            WITH a AS ({AllAnalysesSql})
            SELECT COALESCE(sev, '0') AS sev, count(*) AS n
              FROM a WHERE deleted_at IS NULL AND status = 2 AND created_at >= @from
             GROUP BY 1", args);
        var severity = new
        {
            normal = L(sevRows.FirstOrDefault(r => (string?)r["sev"] == "1")?["n"]),
            moderate = L(sevRows.FirstOrDefault(r => (string?)r["sev"] == "2")?["n"]),
            severe = L(sevRows.FirstOrDefault(r => (string?)r["sev"] == "3")?["n"]),
            unknown = sevRows.Where(r => !new[] { "1", "2", "3" }.Contains((string?)r["sev"])).Sum(r => L(r["n"])),
        };

        // ── Eng faol klinikalar ────────────────────────────────────────
        var top = await SqlRows.QueryAsync(_db, $@"
            WITH a AS ({AllAnalysesSql})
            SELECT c.id, c.clinic_name, c.is_active,
                   count(a.id)                                  AS period,
                   count(a.id) FILTER (WHERE a.status = -1)     AS failed,
                   count(DISTINCT a.patient_id)                 AS patients
              FROM a JOIN clinics c ON c.id = a.clinic_id
             WHERE a.deleted_at IS NULL AND a.created_at >= @from
             GROUP BY c.id, c.clinic_name, c.is_active
             ORDER BY period DESC
             LIMIT 10", args);

        // ── Yangi klinikalar (faollashtirishni kutayotganlar ham) ─────
        var recentClinics = await _db.Clinics.AsNoTracking()
            .OrderByDescending(c => c.CreatedAt)
            .Take(8)
            .Select(c => new
            {
                c.Id, c.ClinicName, c.IsActive, c.CreatedAt,
                adminPhone = c.Users!.Where(u => u.RoleId == RoleConstants.Admin || u.RoleId == RoleConstants.Director)
                    .Select(u => u.Doctor!.Phone).FirstOrDefault(),
            })
            .ToListAsync();

        // ── Oxirgi xatolar ─────────────────────────────────────────────
        var recentFailed = await SqlRows.QueryAsync(_db, $@"
            WITH a AS ({AllAnalysesSql})
            SELECT a.t, a.id, a.created_at, c.clinic_name,
                   concat_ws(' ', p.lastname, p.firstname) AS patient
              FROM a
              LEFT JOIN clinics c  ON c.id = a.clinic_id
              LEFT JOIN patients p ON p.id = a.patient_id
             WHERE a.deleted_at IS NULL AND a.status = -1
             ORDER BY a.created_at DESC
             LIMIT 8", args);

        return new
        {
            days,
            from = fromUtc,
            clinics = new { total = clinicsTotal, active = clinicsActive, inactive = clinicsTotal - clinicsActive, newInPeriod = clinicsNew },
            users = new
            {
                total = usersByRole.Sum(x => x.count),
                blocked = usersByRole.Sum(x => x.blocked),
                byRole = usersByRole.OrderBy(x => x.roleId),
            },
            patients = new { total = patientsTotal, newInPeriod = patientsNew },
            analyses = new
            {
                total = types.Sum(x => x.total),
                today = types.Sum(x => x.today),
                period = types.Sum(x => x.period),
                failed = types.Sum(x => x.failed),
                pending = types.Sum(x => x.pending),
                byType = types,
            },
            series,
            severity,
            topClinics = top.Select(r => new
            {
                id = Convert.ToInt32(r["id"]), name = r["clinic_name"], isActive = r["is_active"],
                period = L(r["period"]), failed = L(r["failed"]), patients = L(r["patients"]),
            }),
            recentClinics,
            recentFailed = recentFailed.Select(r => new
            {
                type = r["t"], id = Convert.ToInt32(r["id"]), createdAt = r["created_at"],
                clinic = r["clinic_name"], patient = r["patient"],
            }),
            ai = await AiTotalsAsync(fromUtc),
        };
    }

    // ════════════════════════════════════════════════════════════════════
    // SA-05 — Klinikalar
    // ════════════════════════════════════════════════════════════════════

    public async Task<object> GetClinicsAsync(string? search, bool? active, int page, int pageSize)
    {
        var q = _db.Clinics.AsNoTracking().AsQueryable();
        if (active.HasValue) q = q.Where(c => c.IsActive == active.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = $"%{search.Trim()}%";
            q = q.Where(c => EF.Functions.ILike(c.ClinicName ?? "", s)
                          || (c.ClinicDetail != null && EF.Functions.ILike(c.ClinicDetail.INN ?? "", s)));
        }

        var total = await q.CountAsync();
        var data = await q.OrderByDescending(c => c.CreatedAt)
            .ApplyPaging(page, pageSize)
            .Select(c => new
            {
                c.Id, c.ClinicName, c.ClinicLogo, c.IsActive, c.CreatedAt,
                inn = c.ClinicDetail != null ? c.ClinicDetail.INN : null,
                address = c.ClinicDetail != null ? c.ClinicDetail.Address : null,
                usersCount = _db.Users.Count(u => u.ClinicId == c.Id),
                analysesCount = _db.ECGAnalyse.Count(x => x.ClinicId == c.Id)
                              + _db.HolterAnalyses.Count(x => x.ClinicId == c.Id)
                              + _db.SmadAnalyses.Count(x => x.ClinicId == c.Id)
                              + _db.LabAnalyse.Count(x => x.ClinicId == c.Id)
                              + _db.CombinedAnalyses.Count(x => x.ClinicId == c.Id)
                              + _db.ParasitologyAnalyses.Count(x => x.ClinicId == c.Id),
                adminPhone = c.Users!.Where(u => u.RoleId == RoleConstants.Admin || u.RoleId == RoleConstants.Director)
                    .Select(u => u.Doctor!.Phone).FirstOrDefault(),
            })
            .ToListAsync();

        return new { data, totalCount = total };
    }

    public async Task<object> GetClinicAsync(int id)
    {
        var c = await _db.Clinics.AsNoTracking()
            .Include(x => x.ClinicDetail).ThenInclude(d => d!.District)
            .Include(x => x.ClinicPhoneNumber)
            .FirstOrDefaultAsync(x => x.Id == id)
            ?? throw SuperAdminException.NotFound("Klinika");

        var users = await _db.Users.AsNoTracking()
            .Where(u => u.ClinicId == id)
            .OrderBy(u => u.RoleId)
            .Select(u => new
            {
                u.Id, u.RoleId, u.Status, u.Email, u.CreatedAt,
                phone = u.Doctor != null ? u.Doctor.Phone : null,
                firstName = u.Doctor != null ? u.Doctor.FirstName : null,
                lastName = u.Doctor != null ? u.Doctor.LastName : null,
                sureName = u.Doctor != null ? u.Doctor.SureName : null,
            })
            .ToListAsync();

        var stats = await SqlRows.QueryAsync(_db, $@"
            WITH a AS ({AllAnalysesSql})
            SELECT t, count(*) AS total,
                   count(*) FILTER (WHERE status = -1) AS failed,
                   count(*) FILTER (WHERE status IN (0, 1)) AS pending,
                   max(created_at) AS last_at
              FROM a WHERE deleted_at IS NULL AND clinic_id = @clinic
             GROUP BY t", new() { ["@clinic"] = id });

        var patients = await SqlRows.QueryAsync(_db, $@"
            WITH a AS ({AllAnalysesSql})
            SELECT count(DISTINCT patient_id) AS n FROM a WHERE deleted_at IS NULL AND clinic_id = @clinic",
            new() { ["@clinic"] = id });

        return new
        {
            c.Id, c.ClinicName, c.ClinicLogo, c.IsActive, c.CreatedAt, c.UpdatedAt,
            detail = c.ClinicDetail == null ? null : new
            {
                inn = c.ClinicDetail.INN, address = c.ClinicDetail.Address,
                districtId = c.ClinicDetail.DistrictId,
                regionId = c.ClinicDetail.District != null ? (int?)c.ClinicDetail.District.RegionId : null,
                district = c.ClinicDetail.District != null ? c.ClinicDetail.District.NameUz : null,
                bankName = c.ClinicDetail.BankName, bankAccount = c.ClinicDetail.BankAccaunt,
                mfo = c.ClinicDetail.MFO, license = c.ClinicDetail.License,
            },
            phones = c.ClinicPhoneNumber?.Select(p => p.PhoneNumber).ToList() ?? new List<string>(),
            users,
            patientsCount = L(patients.FirstOrDefault()?["n"]),
            analyses = AnalysisTypes.Select(t =>
            {
                var r = stats.FirstOrDefault(x => (string?)x["t"] == t);
                return new
                {
                    type = t, total = L(r?["total"]), failed = L(r?["failed"]),
                    pending = L(r?["pending"]), lastAt = r?["last_at"],
                };
            }),
        };
    }

    public async Task<int> CreateClinicAsync(SaClinicUpsertDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ClinicName))
            throw SuperAdminException.Bad("Klinika nomi kiritilmagan");

        var hasAdmin = !string.IsNullOrWhiteSpace(dto.AdminPhone);
        string adminPhone = "";
        if (hasAdmin)
        {
            adminPhone = NormalizePhone(dto.AdminPhone);
            await EnsurePhoneFreeAsync(adminPhone, null);
            if (!PasswordPolicy.IsValid(dto.AdminPassword, out var err))
                throw SuperAdminException.Bad(err);
            if (string.IsNullOrWhiteSpace(dto.AdminFirstName))
                throw SuperAdminException.Bad("Admin ismi kiritilmagan");
        }

        await using var tx = await _db.Database.BeginTransactionAsync();
        var clinic = new Clinic
        {
            ClinicName = dto.ClinicName.Trim(),
            IsActive = dto.IsActive,
            ClinicDetail = null,
        };
        _db.Clinics.Add(clinic);
        await _db.SaveChangesAsync();

        ApplyClinicDetail(clinic, dto);
        await ReplacePhonesAsync(clinic.Id, dto.Phones);

        if (hasAdmin)
        {
            var user = new User
            {
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.AdminPassword),
                MustChangePassword = true,
                Email = $"{adminPhone}@phone.nmed.local",
                Status = true,
                RoleId = RoleConstants.Admin,
                ClinicId = clinic.Id,
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
            _db.Doctors.Add(new Doctor
            {
                UserId = user.Id,
                FirstName = dto.AdminFirstName!.Trim(),
                LastName = dto.AdminLastName?.Trim(),
                Phone = adminPhone,
                Gender = true,
            });
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return clinic.Id;
    }

    public async Task UpdateClinicAsync(int id, SaClinicUpsertDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ClinicName))
            throw SuperAdminException.Bad("Klinika nomi kiritilmagan");

        var clinic = await _db.Clinics.Include(c => c.ClinicDetail).FirstOrDefaultAsync(c => c.Id == id)
            ?? throw SuperAdminException.NotFound("Klinika");

        clinic.ClinicName = dto.ClinicName.Trim();
        clinic.IsActive = dto.IsActive;
        clinic.UpdatedAt = DateTime.UtcNow;
        ApplyClinicDetail(clinic, dto);
        await ReplacePhonesAsync(id, dto.Phones);
        await _db.SaveChangesAsync();
    }

    private void ApplyClinicDetail(Clinic clinic, SaClinicUpsertDto dto)
    {
        var d = clinic.ClinicDetail;
        if (d == null)
        {
            d = new ClinicDetail { ClinicId = clinic.Id };
            _db.ClinicDetails.Add(d);
            clinic.ClinicDetail = d;
        }
        d.INN = dto.Inn?.Trim();
        d.Address = dto.Address?.Trim();
        d.DistrictId = dto.DistrictId;
        d.BankName = dto.BankName?.Trim();
        d.BankAccaunt = dto.BankAccount?.Trim();
        d.MFO = dto.Mfo?.Trim();
        d.License = dto.License?.Trim();
        d.UpdatedAt = DateTime.UtcNow;
    }

    private async Task ReplacePhonesAsync(int clinicId, List<string>? phones)
    {
        if (phones == null) return;
        var old = await _db.ClinicPhoneNumbers.Where(p => p.ClinicId == clinicId).ToListAsync();
        _db.ClinicPhoneNumbers.RemoveRange(old);
        foreach (var p in phones.Select(NormalizePhone).Where(p => p.Length >= 7).Distinct())
            _db.ClinicPhoneNumbers.Add(new ClinicPhoneNumber { ClinicId = clinicId, PhoneNumber = p });
    }

    public async Task SetClinicActiveAsync(int id, bool isActive)
    {
        var clinic = await _db.Clinics.FirstOrDefaultAsync(c => c.Id == id)
            ?? throw SuperAdminException.NotFound("Klinika");
        clinic.IsActive = isActive;
        clinic.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task DeleteClinicAsync(int id)
    {
        var clinic = await _db.Clinics.FirstOrDefaultAsync(c => c.Id == id)
            ?? throw SuperAdminException.NotFound("Klinika");

        var analyses = await SqlRows.QueryAsync(_db, $@"
            WITH a AS ({AllAnalysesSql}) SELECT count(*) AS n FROM a WHERE clinic_id = @clinic",
            new() { ["@clinic"] = id });
        if (L(analyses.FirstOrDefault()?["n"]) > 0)
            throw SuperAdminException.Conflict(
                "Klinikada tahlillar bor — tibbiy ma'lumot yo'qolmasligi uchun o'chirilmaydi. Klinikani faolsizlantiring.");

        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var userIds = await _db.Users.Where(u => u.ClinicId == id).Select(u => u.Id).ToListAsync();
            foreach (var uid in userIds)
                await RemoveUserRowsAsync(uid);

            _db.ClinicPhoneNumbers.RemoveRange(_db.ClinicPhoneNumbers.Where(p => p.ClinicId == id));
            _db.ClinicDetails.RemoveRange(_db.ClinicDetails.Where(d => d.ClinicId == id));
            _db.Clinics.Remove(clinic);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch (DbUpdateException ex)
        {
            _logger.LogWarning(ex, "SuperAdmin: klinika {ClinicId} ni o'chirib bo'lmadi (bog'liq yozuvlar)", id);
            throw SuperAdminException.Conflict(
                "Klinikaga bog'liq yozuvlar bor (konsultatsiya, vipiska va h.k.) — o'chirib bo'lmaydi. Faolsizlantiring.");
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // SA-06 / SA-07 — Xodimlar
    // ════════════════════════════════════════════════════════════════════

    public async Task<object> GetUsersAsync(string? search, int? roleId, int? clinicId, bool? status, int page, int pageSize)
    {
        var q = _db.Users.AsNoTracking().AsQueryable();
        if (roleId.HasValue) q = q.Where(u => u.RoleId == roleId.Value);
        if (clinicId.HasValue) q = q.Where(u => u.ClinicId == clinicId.Value);
        if (status.HasValue) q = q.Where(u => u.Status == status.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = $"%{search.Trim()}%";
            q = q.Where(u => EF.Functions.ILike(u.Email ?? "", s)
                || (u.Doctor != null && (EF.Functions.ILike(u.Doctor.Phone ?? "", s)
                                      || EF.Functions.ILike(u.Doctor.FirstName ?? "", s)
                                      || EF.Functions.ILike(u.Doctor.LastName ?? "", s)
                                      || EF.Functions.ILike(u.Doctor.SureName ?? "", s))));
        }

        var total = await q.CountAsync();
        var data = await q.OrderByDescending(u => u.CreatedAt)
            .ApplyPaging(page, pageSize)
            .Select(u => new
            {
                u.Id, u.RoleId, u.Status, u.Email, u.ClinicId, u.MustChangePassword, u.CreatedAt,
                clinicName = u.Clinic != null ? u.Clinic.ClinicName : null,
                doctorId = u.Doctor != null ? (int?)u.Doctor.Id : null,
                phone = u.Doctor != null ? u.Doctor.Phone : null,
                firstName = u.Doctor != null ? u.Doctor.FirstName : null,
                lastName = u.Doctor != null ? u.Doctor.LastName : null,
                sureName = u.Doctor != null ? u.Doctor.SureName : null,
                gender = u.Doctor != null ? (bool?)u.Doctor.Gender : null,
                analysesCount = u.Doctor == null ? 0
                    : _db.ECGAnalyse.Count(x => x.CreatedDoctorId == u.Doctor.Id)
                    + _db.HolterAnalyses.Count(x => x.CreatedDoctorId == u.Doctor.Id)
                    + _db.SmadAnalyses.Count(x => x.CreatedDoctorId == u.Doctor.Id)
                    + _db.LabAnalyse.Count(x => x.CreatedDoctorId == u.Doctor.Id),
            })
            .ToListAsync();

        return new { data, totalCount = total };
    }

    private async Task EnsurePhoneFreeAsync(string phone, int? exceptUserId)
    {
        if (phone.Length != 12)
            throw SuperAdminException.Bad("Telefon raqami noto'g'ri (998XXXXXXXXX)");
        var taken = await _db.Doctors.AnyAsync(d => d.Phone == phone && (exceptUserId == null || d.UserId != exceptUserId));
        if (taken)
            throw SuperAdminException.Conflict("Bu telefon raqami bilan foydalanuvchi allaqachon mavjud");
    }

    private async Task ValidateRoleClinicAsync(int roleId, int? clinicId)
    {
        if (roleId < RoleConstants.SuperAdmin || roleId > RoleConstants.Nurse)
            throw SuperAdminException.Bad("Rol noto'g'ri");
        if (roleId == RoleConstants.SuperAdmin) return;
        if (clinicId == null)
            throw SuperAdminException.Bad("Klinika xodimi uchun klinika tanlanishi shart");
        if (!await _db.Clinics.AnyAsync(c => c.Id == clinicId))
            throw SuperAdminException.NotFound("Klinika");
    }

    public async Task<int> CreateUserAsync(SaUserUpsertDto dto)
    {
        var phone = NormalizePhone(dto.Phone);
        await EnsurePhoneFreeAsync(phone, null);
        await ValidateRoleClinicAsync(dto.RoleId, dto.ClinicId);
        if (string.IsNullOrWhiteSpace(dto.FirstName))
            throw SuperAdminException.Bad("Ism kiritilmagan");
        if (!PasswordPolicy.IsValid(dto.Password, out var err))
            throw SuperAdminException.Bad(err);

        await using var tx = await _db.Database.BeginTransactionAsync();
        var user = new User
        {
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            MustChangePassword = dto.MustChangePassword,
            Email = string.IsNullOrWhiteSpace(dto.Email) ? $"{phone}@phone.nmed.local" : dto.Email.Trim(),
            Status = dto.Status,
            RoleId = dto.RoleId,
            ClinicId = dto.RoleId == RoleConstants.SuperAdmin ? null : dto.ClinicId,
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        _db.Doctors.Add(new Doctor
        {
            UserId = user.Id,
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName?.Trim(),
            SureName = dto.SureName?.Trim(),
            Gender = dto.Gender,
            Phone = phone,
        });
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return user.Id;
    }

    public async Task UpdateUserAsync(int id, SaUserUpsertDto dto, int currentUserId)
    {
        var user = await _db.Users.Include(u => u.Doctor).FirstOrDefaultAsync(u => u.Id == id)
            ?? throw SuperAdminException.NotFound("Foydalanuvchi");

        var phone = NormalizePhone(dto.Phone);
        await EnsurePhoneFreeAsync(phone, id);
        await ValidateRoleClinicAsync(dto.RoleId, dto.ClinicId);
        if (string.IsNullOrWhiteSpace(dto.FirstName))
            throw SuperAdminException.Bad("Ism kiritilmagan");

        if (id == currentUserId && (dto.RoleId != RoleConstants.SuperAdmin || !dto.Status))
            throw SuperAdminException.Bad("O'zingizning rolingizni o'zgartira yoki o'zingizni bloklay olmaysiz");
        if (user.RoleId == RoleConstants.SuperAdmin && dto.RoleId != RoleConstants.SuperAdmin)
            await EnsureNotLastSuperAdminAsync(id);

        user.RoleId = dto.RoleId;
        user.ClinicId = dto.RoleId == RoleConstants.SuperAdmin ? null : dto.ClinicId;
        user.Status = dto.Status;
        if (!string.IsNullOrWhiteSpace(dto.Email)) user.Email = dto.Email.Trim();
        user.UpdatedAt = DateTime.UtcNow;

        var doctor = user.Doctor;
        if (doctor == null)
        {
            doctor = new Doctor { UserId = user.Id };
            _db.Doctors.Add(doctor);
        }
        doctor.FirstName = dto.FirstName.Trim();
        doctor.LastName = dto.LastName?.Trim();
        doctor.SureName = dto.SureName?.Trim();
        doctor.Gender = dto.Gender;
        doctor.Phone = phone;
        doctor.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    public async Task SetPasswordAsync(int id, SaPasswordDto dto)
    {
        if (!PasswordPolicy.IsValid(dto.Password, out var err))
            throw SuperAdminException.Bad(err);
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id)
            ?? throw SuperAdminException.NotFound("Foydalanuvchi");
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        user.MustChangePassword = dto.MustChangePassword;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task SetUserStatusAsync(int id, bool status, int currentUserId)
    {
        if (id == currentUserId && !status)
            throw SuperAdminException.Bad("O'zingizni bloklay olmaysiz");
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id)
            ?? throw SuperAdminException.NotFound("Foydalanuvchi");
        if (!status && user.RoleId == RoleConstants.SuperAdmin)
            await EnsureNotLastSuperAdminAsync(id);
        user.Status = status;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private async Task EnsureNotLastSuperAdminAsync(int exceptId)
    {
        var others = await _db.Users.CountAsync(u => u.RoleId == RoleConstants.SuperAdmin && u.Status && u.Id != exceptId);
        if (others == 0)
            throw SuperAdminException.Bad("Bu oxirgi faol SuperAdmin — platforma boshqaruvsiz qoladi");
    }

    public async Task DeleteUserAsync(int id, int currentUserId)
    {
        if (id == currentUserId)
            throw SuperAdminException.Bad("O'zingizni o'chira olmaysiz");
        var user = await _db.Users.Include(u => u.Doctor).FirstOrDefaultAsync(u => u.Id == id)
            ?? throw SuperAdminException.NotFound("Foydalanuvchi");
        if (user.RoleId == RoleConstants.SuperAdmin)
            await EnsureNotLastSuperAdminAsync(id);

        if (user.Doctor != null)
        {
            var did = user.Doctor.Id;
            var used = await _db.ECGAnalyse.IgnoreQueryFilters().AnyAsync(x => x.CreatedDoctorId == did)
                    || await _db.HolterAnalyses.IgnoreQueryFilters().AnyAsync(x => x.CreatedDoctorId == did || x.MainDoctorId == did)
                    || await _db.SmadAnalyses.IgnoreQueryFilters().AnyAsync(x => x.CreatedDoctorId == did || x.MainDoctorId == did)
                    || await _db.LabAnalyse.IgnoreQueryFilters().AnyAsync(x => x.CreatedDoctorId == did)
                    || await _db.CombinedAnalyses.AnyAsync(x => x.CreatedDoctorId == did)
                    || await _db.ParasitologyAnalyses.AnyAsync(x => x.CreatedDoctorId == did);
            if (used)
                throw SuperAdminException.Conflict(
                    "Xodim yuklagan tahlillar bor — tarix yo'qolmasligi uchun o'chirilmaydi. Xodimni bloklang.");
        }

        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            await RemoveUserRowsAsync(id);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch (DbUpdateException ex)
        {
            _logger.LogWarning(ex, "SuperAdmin: foydalanuvchi {UserId} ni o'chirib bo'lmadi", id);
            throw SuperAdminException.Conflict(
                "Foydalanuvchiga bog'liq yozuvlar bor (konsultatsiya, xulosa va h.k.) — o'chirib bo'lmaydi. Bloklang.");
        }
    }

    /// <summary>Foydalanuvchi va unga 1:1 bog'liq qatorlarni o'chirishga belgilaydi (SaveChanges chaqiruvchida).</summary>
    private async Task RemoveUserRowsAsync(int userId)
    {
        var doctor = await _db.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
        if (doctor != null)
        {
            _db.DoctorPositions.RemoveRange(_db.DoctorPositions.Where(p => p.DoctorId == doctor.Id));
            _db.Doctors.Remove(doctor);
        }
        _db.VerificationCodes.RemoveRange(_db.VerificationCodes.Where(v => v.UserId == userId));
        _db.AccountSyncMeta.RemoveRange(_db.AccountSyncMeta.Where(m => m.RefId == userId));
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user != null) _db.Users.Remove(user);
    }

    public async Task<User> GetUserForTokenAsync(int id)
    {
        var user = await _db.Users.Include(u => u.Doctor).Include(u => u.Clinic)
            .FirstOrDefaultAsync(u => u.Id == id)
            ?? throw SuperAdminException.NotFound("Foydalanuvchi");
        if (user.RoleId == RoleConstants.SuperAdmin)
            throw SuperAdminException.Bad("SuperAdmin sifatida kirish shart emas");
        if (!user.Status)
            throw SuperAdminException.Bad("Foydalanuvchi bloklangan yoki tasdiqlanmagan");
        return user;
    }

    // ════════════════════════════════════════════════════════════════════
    // SA-08 — Bemorlar
    // ════════════════════════════════════════════════════════════════════

    public async Task<object> GetPatientsAsync(string? search, int? clinicId, int page, int pageSize)
    {
        var q = _db.Patcients.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            // Har bir so'z alohida: "aliyev vali" ham topilsin
            foreach (var word in search.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries))
            {
                var s = $"%{word}%";
                q = q.Where(p => EF.Functions.ILike(p.FirstName, s) || EF.Functions.ILike(p.LastName, s)
                              || EF.Functions.ILike(p.SureName, s) || EF.Functions.ILike(p.Phone, s)
                              || EF.Functions.ILike(p.Passport, s));
            }
        }
        if (clinicId.HasValue)
        {
            var cid = clinicId.Value;
            q = q.Where(p => _db.ECGAnalyse.Any(x => x.PatcientId == p.Id && x.ClinicId == cid)
                          || _db.HolterAnalyses.Any(x => x.PatcientId == p.Id && x.ClinicId == cid)
                          || _db.SmadAnalyses.Any(x => x.PatcientId == p.Id && x.ClinicId == cid)
                          || _db.LabAnalyse.Any(x => x.PatcientId == p.Id && x.ClinicId == cid));
        }

        var total = await q.CountAsync();
        var data = await q.OrderByDescending(p => p.CreatedAt)
            .ApplyPaging(page, pageSize)
            .Select(p => new
            {
                p.Id, p.FirstName, p.LastName, p.SureName, p.Passport, p.BirthDate, p.Gender,
                p.Phone, p.Address, p.CreatedAt,
                ecg = _db.ECGAnalyse.Count(x => x.PatcientId == p.Id),
                holter = _db.HolterAnalyses.Count(x => x.PatcientId == p.Id),
                smad = _db.SmadAnalyses.Count(x => x.PatcientId == p.Id),
                lab = _db.LabAnalyse.Count(x => x.PatcientId == p.Id),
                combined = _db.CombinedAnalyses.Count(x => x.PatientId == p.Id),
                lastClinic = _db.ECGAnalyse.Where(x => x.PatcientId == p.Id).OrderByDescending(x => x.CreatedAt)
                    .Select(x => x.Clinic.ClinicName).FirstOrDefault()
                    ?? _db.LabAnalyse.Where(x => x.PatcientId == p.Id).OrderByDescending(x => x.CreatedAt)
                    .Select(x => x.Clinic.ClinicName).FirstOrDefault(),
            })
            .ToListAsync();

        return new { data, totalCount = total };
    }

    public async Task UpdatePatientAsync(int id, SaPatientUpdateDto dto)
    {
        var p = await _db.Patcients.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw SuperAdminException.NotFound("Bemor");
        if (string.IsNullOrWhiteSpace(dto.FirstName) || string.IsNullOrWhiteSpace(dto.LastName))
            throw SuperAdminException.Bad("Familiya va ism majburiy");

        // Ism qoidalari bemor yaratish bilan bir xil (faqat lotin, tutuq → ')
        p.FirstName = EkgAnalyzerApi.Helpers.PatientInput.NormalizeName(dto.FirstName);
        p.LastName = EkgAnalyzerApi.Helpers.PatientInput.NormalizeName(dto.LastName);
        p.SureName = EkgAnalyzerApi.Helpers.PatientInput.NormalizeName(dto.SureName ?? "");
        p.Passport = (dto.Passport ?? "").Trim().ToUpperInvariant();
        p.BirthDate = dto.BirthDate;
        p.Gender = dto.Gender;
        p.Phone = NormalizePhone(dto.Phone);
        p.Address = dto.Address?.Trim();
        p.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task DeletePatientAsync(int id)
    {
        var p = await _db.Patcients.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw SuperAdminException.NotFound("Bemor");

        var used = await SqlRows.QueryAsync(_db, $@"
            WITH a AS ({AllAnalysesSql}) SELECT count(*) AS n FROM a WHERE patient_id = @p",
            new() { ["@p"] = id });
        if (L(used.FirstOrDefault()?["n"]) > 0
            || await _db.MedicalDiagnose.IgnoreQueryFilters().AnyAsync(x => x.PatcientId == id))
            throw SuperAdminException.Conflict(
                "Bemorning tahlillari bor — avval tahlillarni o'chiring yoki bemorni qoldiring.");

        try
        {
            _db.Patcients.Remove(p);
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            _logger.LogWarning(ex, "SuperAdmin: bemor {PatientId} ni o'chirib bo'lmadi", id);
            throw SuperAdminException.Conflict("Bemorga bog'liq yozuvlar bor (vipiska, konsultatsiya) — o'chirib bo'lmaydi.");
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // SA-09 — Tahlillar
    // ════════════════════════════════════════════════════════════════════

    public async Task<object> GetAnalysesAsync(SaAnalysesFilter f)
    {
        var where = new List<string> { f.Deleted ? "a.deleted_at IS NOT NULL" : "a.deleted_at IS NULL" };
        var args = new Dictionary<string, object?>();

        if (!string.IsNullOrWhiteSpace(f.Type))
        {
            if (!AnalysisTypes.Contains(f.Type)) throw SuperAdminException.Bad("Noma'lum tahlil turi");
            where.Add("a.t = @type"); args["@type"] = f.Type;
        }
        if (f.ClinicId.HasValue) { where.Add("a.clinic_id = @clinic"); args["@clinic"] = f.ClinicId.Value; }
        if (f.PatientId.HasValue) { where.Add("a.patient_id = @patient"); args["@patient"] = f.PatientId.Value; }
        switch (f.Status)
        {
            case "ready": where.Add("a.status = 2"); break;
            case "pending": where.Add("a.status IN (0, 1)"); break;
            case "failed": where.Add("a.status = -1"); break;
            case "severe": where.Add("a.status = 2 AND a.sev = '3'"); break;
        }
        var tz = AppTime.GetTimeZone(_config);
        if (f.From.HasValue)
        {
            where.Add("a.created_at >= @from");
            args["@from"] = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(f.From.Value.Date, DateTimeKind.Unspecified), tz);
        }
        if (f.To.HasValue)
        {
            where.Add("a.created_at < @to");
            args["@to"] = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(f.To.Value.Date.AddDays(1), DateTimeKind.Unspecified), tz);
        }
        if (!string.IsNullOrWhiteSpace(f.Search))
        {
            where.Add(@"(concat_ws(' ', p.lastname, p.firstname, p.sure_name) ILIKE @s
                         OR a.document_number ILIKE @s OR a.id::text = @raw)");
            args["@s"] = $"%{f.Search.Trim()}%";
            args["@raw"] = f.Search.Trim();
        }

        var (page, size) = Paging.Normalize(f.Page, f.PageSize);
        var sqlWhere = string.Join(" AND ", where);
        var from = $@"
            FROM ({AllAnalysesSql}) a
            LEFT JOIN patients p ON p.id = a.patient_id
            LEFT JOIN clinics c  ON c.id = a.clinic_id
            LEFT JOIN doctors d  ON d.id = a.created_doctor_id
            WHERE {sqlWhere}";

        var count = await SqlRows.QueryAsync(_db, $"SELECT count(*) AS n {from}", args);
        var rows = await SqlRows.QueryAsync(_db, $@"
            SELECT a.t, a.id, a.status, a.sev, a.document_number, a.created_at, a.deleted_at,
                   a.patient_id, concat_ws(' ', p.lastname, p.firstname, p.sure_name) AS patient,
                   a.clinic_id, c.clinic_name,
                   concat_ws(' ', d.lastname, d.firstname) AS doctor
            {from}
            ORDER BY a.created_at DESC NULLS LAST
            LIMIT {size} OFFSET {(page - 1) * size}", args);

        return new
        {
            totalCount = L(count.FirstOrDefault()?["n"]),
            data = rows.Select(r => new
            {
                type = r["t"], id = Convert.ToInt32(r["id"]), status = r["status"] == null ? (int?)null : Convert.ToInt32(r["status"]),
                severity = r["sev"], documentNumber = r["document_number"], createdAt = r["created_at"],
                deletedAt = r["deleted_at"],
                patientId = r["patient_id"], patient = r["patient"],
                clinicId = r["clinic_id"], clinicName = r["clinic_name"], doctor = r["doctor"],
            }),
        };
    }

    public async Task<object> GetAnalysisAsync(string type, int id)
    {
        object? result = type switch
        {
            "ecg" => await _db.ECGAnalyse.IgnoreQueryFilters().AsNoTracking().Where(x => x.Id == id)
                .Select(x => new
                {
                    type, x.Id, x.Status, x.DocumentNumber, x.CreatedAt, x.AnalysisDate, x.AiLang,
                    severity = x.AiSeverityRaw, aiAnswerData = x.AIAnswerData,
                    fileLink = x.AnalyseFileLink, generatedFileLink = x.GeneratedFileLink,
                    generatedShortFileLink = x.GeneratedShortFileLink, x.OriginalFilename,
                    x.DeletedAt, x.DeleteReason, x.ClinicId, clinicName = x.Clinic.ClinicName,
                    patient = new { x.Patcient.Id, x.Patcient.FirstName, x.Patcient.LastName, x.Patcient.SureName, x.Patcient.BirthDate, x.Patcient.Gender },
                    doctor = new { x.CreatedDoctor.Id, x.CreatedDoctor.FirstName, x.CreatedDoctor.LastName, x.CreatedDoctor.Phone },
                    files = (object?)null,
                }).FirstOrDefaultAsync(),
            "holter" => await _db.HolterAnalyses.IgnoreQueryFilters().AsNoTracking().Where(x => x.Id == id)
                .Select(x => new
                {
                    type, x.Id, x.Status, x.DocumentNumber, x.CreatedAt, x.AnalysisDate, x.AiLang,
                    severity = x.AiSeverityRaw, aiAnswerData = x.AIAnswerData,
                    fileLink = x.AnalyseFileLink, x.OriginalFilename,
                    x.DeletedAt, x.DeleteReason, x.ClinicId, clinicName = x.Clinic.ClinicName,
                    patient = new { x.Patcient.Id, x.Patcient.FirstName, x.Patcient.LastName, x.Patcient.SureName, x.Patcient.BirthDate, x.Patcient.Gender },
                    doctor = new { x.CreatedDoctor.Id, x.CreatedDoctor.FirstName, x.CreatedDoctor.LastName, x.CreatedDoctor.Phone },
                }).FirstOrDefaultAsync(),
            "smad" => await _db.SmadAnalyses.IgnoreQueryFilters().AsNoTracking().Where(x => x.Id == id)
                .Select(x => new
                {
                    type, x.Id, x.Status, x.DocumentNumber, x.CreatedAt, x.AnalysisDate, x.AiLang,
                    severity = x.AiSeverityRaw, aiAnswerData = x.AIAnswerData,
                    fileLink = x.AnalyseFileLink, x.OriginalFilename,
                    x.DeletedAt, x.DeleteReason, x.ClinicId, clinicName = x.Clinic.ClinicName,
                    patient = new { x.Patcient.Id, x.Patcient.FirstName, x.Patcient.LastName, x.Patcient.SureName, x.Patcient.BirthDate, x.Patcient.Gender },
                    doctor = new { x.CreatedDoctor.Id, x.CreatedDoctor.FirstName, x.CreatedDoctor.LastName, x.CreatedDoctor.Phone },
                }).FirstOrDefaultAsync(),
            "lab" => await _db.LabAnalyse.IgnoreQueryFilters().AsNoTracking().Where(x => x.Id == id)
                .Select(x => new
                {
                    type, x.Id, x.Status, x.DocumentNumber, x.CreatedAt, x.AnalysisDate, x.AiLang,
                    severity = x.AiSeverityRaw, aiAnswerData = x.AIAnswerData,
                    fileLink = x.AnalyseFileLink, x.OriginalFilename,
                    x.DeletedAt, x.DeleteReason, x.ClinicId, clinicName = x.Clinic.ClinicName,
                    patient = new { x.Patcient.Id, x.Patcient.FirstName, x.Patcient.LastName, x.Patcient.SureName, x.Patcient.BirthDate, x.Patcient.Gender },
                    doctor = new { x.CreatedDoctor.Id, x.CreatedDoctor.FirstName, x.CreatedDoctor.LastName, x.CreatedDoctor.Phone },
                    files = _db.LabAnalysisFiles.IgnoreQueryFilters().Where(f => f.LabAnalysisId == x.Id)
                        .OrderBy(f => f.Position)
                        .Select(f => new { fileLink = f.FileLink, originalFilename = f.OriginalFilename }).ToList(),
                }).FirstOrDefaultAsync(),
            "combined" => await _db.CombinedAnalyses.AsNoTracking().Where(x => x.Id == id)
                .Select(x => new
                {
                    type, x.Id, x.Status, x.CreatedAt, x.AiLang, x.Mode, x.ModelUsed,
                    x.InputTokens, x.OutputTokens, x.IsAuto,
                    aiAnswerData = x.AIAnswerData, x.ClinicId,
                    clinicName = _db.Clinics.Where(c => c.Id == x.ClinicId).Select(c => c.ClinicName).FirstOrDefault(),
                    patient = new { x.Patient!.Id, x.Patient.FirstName, x.Patient.LastName, x.Patient.SureName, x.Patient.BirthDate, x.Patient.Gender },
                    doctor = new { x.CreatedDoctor!.Id, x.CreatedDoctor.FirstName, x.CreatedDoctor.LastName, x.CreatedDoctor.Phone },
                    items = x.Items.Select(i => new { i.AnalysisType, i.AnalysisId, i.SnapshotDate, i.SnapshotSeverity }).ToList(),
                }).FirstOrDefaultAsync(),
            "parasitology" => await _db.ParasitologyAnalyses.AsNoTracking().Where(x => x.Id == id)
                .Select(x => new
                {
                    type, x.Id, status = x.AnalysisStatus, x.DocumentNumber, x.CreatedAt, x.AnalysisDate,
                    aiLang = x.Lang, severity = x.JiddiylikDarajasi, aiAnswerData = x.AiResponse,
                    fileLink = x.FilePath, x.MicroscopyMethod, x.Magnification, x.EggCountPerField,
                    x.ClinicId, clinicName = x.Clinic != null ? x.Clinic.ClinicName : null,
                    patient = new { x.Patcient.Id, x.Patcient.FirstName, x.Patcient.LastName, x.Patcient.SureName, x.Patcient.BirthDate, x.Patcient.Gender },
                    doctor = new { x.CreatedDoctor.Id, x.CreatedDoctor.FirstName, x.CreatedDoctor.LastName, x.CreatedDoctor.Phone },
                    results = x.Results!.Select(r => new { r.HelminthType, r.HelminthNameUz, r.Confidence, r.InfectionLevel }).ToList(),
                }).FirstOrDefaultAsync(),
            _ => throw SuperAdminException.Bad("Noma'lum tahlil turi"),
        };

        return result ?? throw SuperAdminException.NotFound("Tahlil");
    }

    public async Task DeleteAnalysisAsync(string type, int id, string? reason, int userId, string? username)
    {
        if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length < AnalysisDeletionService.MinReasonLength)
            throw SuperAdminException.Bad($"O'chirish sababi majburiy (kamida {AnalysisDeletionService.MinReasonLength} belgi)");

        switch (type)
        {
            case "ecg":
            case "holter":
            case "smad":
            case "lab":
            {
                // Mavjud yumshoq o'chirish servisi klinikani talab qiladi — tahlilning O'Z klinikasi beriladi
                int? clinicId = type switch
                {
                    "ecg" => await _db.ECGAnalyse.IgnoreQueryFilters().Where(x => x.Id == id).Select(x => x.ClinicId).FirstOrDefaultAsync(),
                    "holter" => await _db.HolterAnalyses.IgnoreQueryFilters().Where(x => x.Id == id).Select(x => x.ClinicId).FirstOrDefaultAsync(),
                    "smad" => await _db.SmadAnalyses.IgnoreQueryFilters().Where(x => x.Id == id).Select(x => x.ClinicId).FirstOrDefaultAsync(),
                    _ => await _db.LabAnalyse.IgnoreQueryFilters().Where(x => x.Id == id).Select(x => x.ClinicId).FirstOrDefaultAsync(),
                };
                if (clinicId == null) throw SuperAdminException.NotFound("Tahlil");
                var outcome = await _deletion.DeleteAsync(type, id, clinicId.Value, userId, username, reason);
                if (outcome == DeleteOutcome.AlreadyDeleted) throw SuperAdminException.Conflict("Tahlil allaqachon o'chirilgan");
                if (outcome != DeleteOutcome.Ok) throw SuperAdminException.NotFound("Tahlil");
                break;
            }
            case "combined":
            {
                // Kompleks xulosa — manba tahlillardan hosila, yumshoq o'chirish ustuni yo'q
                var c = await _db.CombinedAnalyses.FirstOrDefaultAsync(x => x.Id == id)
                    ?? throw SuperAdminException.NotFound("Tahlil");
                _db.AnalysisDiagnoses.RemoveRange(_db.AnalysisDiagnoses.Where(d => d.AnalysisType == "combined" && d.AnalysisId == id));
                _db.CombinedAnalyses.Remove(c);
                await _db.SaveChangesAsync();
                break;
            }
            case "parasitology":
            {
                var p = await _db.ParasitologyAnalyses.FirstOrDefaultAsync(x => x.Id == id)
                    ?? throw SuperAdminException.NotFound("Tahlil");
                _db.ParasitologyResults.RemoveRange(_db.ParasitologyResults.Where(r => r.ParasitologyAnalysisId == id));
                _db.ParasitologyAnalysisDoctors.RemoveRange(_db.ParasitologyAnalysisDoctors.Where(r => r.ParasitologyAnalysisId == id));
                _db.ParasitologyAnalyses.Remove(p);
                await _db.SaveChangesAsync();
                break;
            }
            default:
                throw SuperAdminException.Bad("Noma'lum tahlil turi");
        }
    }

    public async Task RestoreAnalysisAsync(string type, int id, int userId)
    {
        if (!new[] { "ecg", "holter", "smad", "lab" }.Contains(type))
            throw SuperAdminException.Bad("Bu turdagi tahlil tiklanmaydi");
        var outcome = await _deletion.RestoreAsync(type, id, userId, null);
        if (outcome != DeleteOutcome.Ok) throw SuperAdminException.NotFound("Tahlil");
    }

    // ════════════════════════════════════════════════════════════════════
    // SA-10 — Spravochniklar
    // ════════════════════════════════════════════════════════════════════

    public static readonly string[] DictionaryKinds =
        { "complaints", "positions", "regions", "districts", "lab-big-categories", "lab-categories" };

    public async Task<object> GetDictionaryAsync(string kind) => kind switch
    {
        "complaints" => await _db.Complaints.AsNoTracking().OrderBy(x => x.Category).ThenBy(x => x.NameUz)
            .Select(x => new { x.Id, x.NameUz, x.NameRu, x.NameEn, x.Category, parentId = (int?)null, sort = (int?)null }).ToListAsync(),
        "positions" => await _db.Positions.AsNoTracking().OrderBy(x => x.RoleId).ThenBy(x => x.Sort)
            .Select(x => new { x.Id, x.NameUz, x.NameRu, x.NameEn, category = (string?)null, parentId = x.RoleId, sort = x.Sort }).ToListAsync(),
        "regions" => await _db.Regions.AsNoTracking().OrderBy(x => x.Id)
            .Select(x => new { x.Id, NameUz = (string?)x.NameUz, NameRu = (string?)x.NameRu, NameEn = (string?)x.NameEn, category = (string?)null, parentId = (int?)null, sort = (int?)null }).ToListAsync(),
        "districts" => await _db.Districts.AsNoTracking().OrderBy(x => x.RegionId).ThenBy(x => x.NameUz)
            .Select(x => new { x.Id, NameUz = (string?)x.NameUz, NameRu = (string?)x.NameRu, NameEn = (string?)x.NameEn, category = (string?)null, parentId = (int?)x.RegionId, sort = (int?)null }).ToListAsync(),
        "lab-big-categories" => await _db.LabBigCategories.AsNoTracking().OrderBy(x => x.Id)
            .Select(x => new { x.Id, x.NameUz, x.NameRu, x.NameEn, category = (string?)null, parentId = (int?)null, sort = (int?)null }).ToListAsync(),
        "lab-categories" => await _db.LabCategories.AsNoTracking().OrderBy(x => x.BigCategoryId).ThenBy(x => x.Id)
            .Select(x => new { x.Id, x.NameUz, x.NameRu, x.NameEn, category = (string?)null, parentId = (int?)x.BigCategoryId, sort = (int?)null }).ToListAsync(),
        _ => throw SuperAdminException.Bad("Noma'lum spravochnik"),
    };

    public async Task<int> UpsertDictionaryAsync(string kind, int? id, SaDictionaryDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.NameUz))
            throw SuperAdminException.Bad("Nomi (uz) kiritilmagan");
        string uz = dto.NameUz.Trim(), ru = dto.NameRu?.Trim() ?? "", en = dto.NameEn?.Trim() ?? "";
        var now = DateTime.UtcNow;

        switch (kind)
        {
            case "complaints":
            {
                var e = id == null ? new Complaints { CreatedAt = now } : await _db.Complaints.FindAsync(id.Value) ?? throw SuperAdminException.NotFound("Yozuv");
                e.NameUz = uz; e.NameRu = ru; e.NameEn = en; e.Category = dto.Category?.Trim(); e.UpdatedAt = now;
                if (id == null) _db.Complaints.Add(e);
                await _db.SaveChangesAsync(); return e.Id;
            }
            case "positions":
            {
                var e = id == null ? new Position() : await _db.Positions.FindAsync(id.Value) ?? throw SuperAdminException.NotFound("Yozuv");
                e.NameUz = uz; e.NameRu = ru; e.NameEn = en; e.RoleId = dto.ParentId; e.Sort = dto.Sort;
                if (id == null) _db.Positions.Add(e);
                await _db.SaveChangesAsync(); return e.Id;
            }
            case "regions":
            {
                var e = id == null ? new Regions() : await _db.Regions.FindAsync(id.Value) ?? throw SuperAdminException.NotFound("Yozuv");
                e.NameUz = uz; e.NameRu = ru; e.NameEn = en;
                if (id == null) _db.Regions.Add(e);
                await _db.SaveChangesAsync(); return e.Id;
            }
            case "districts":
            {
                if (dto.ParentId == null || !await _db.Regions.AnyAsync(r => r.Id == dto.ParentId))
                    throw SuperAdminException.Bad("Viloyat tanlanmagan");
                var e = id == null ? new Districts() : await _db.Districts.FindAsync(id.Value) ?? throw SuperAdminException.NotFound("Yozuv");
                e.NameUz = uz; e.NameRu = ru; e.NameEn = en; e.RegionId = dto.ParentId.Value;
                if (id == null) _db.Districts.Add(e);
                await _db.SaveChangesAsync(); return e.Id;
            }
            case "lab-big-categories":
            {
                var e = id == null ? new LabBigCategories { CreatedAt = now } : await _db.LabBigCategories.FindAsync(id.Value) ?? throw SuperAdminException.NotFound("Yozuv");
                e.NameUz = uz; e.NameRu = ru; e.NameEn = en; e.UpdatedAt = now;
                if (id == null) _db.LabBigCategories.Add(e);
                await _db.SaveChangesAsync(); return e.Id;
            }
            case "lab-categories":
            {
                if (dto.ParentId == null || !await _db.LabBigCategories.AnyAsync(r => r.Id == dto.ParentId))
                    throw SuperAdminException.Bad("Katta guruh tanlanmagan");
                var e = id == null ? new LabCategories { CreatedAt = now } : await _db.LabCategories.FindAsync(id.Value) ?? throw SuperAdminException.NotFound("Yozuv");
                e.NameUz = uz; e.NameRu = ru; e.NameEn = en; e.BigCategoryId = dto.ParentId.Value; e.UpdatedAt = now;
                if (id == null) _db.LabCategories.Add(e);
                await _db.SaveChangesAsync(); return e.Id;
            }
            default:
                throw SuperAdminException.Bad("Noma'lum spravochnik");
        }
    }

    public async Task DeleteDictionaryAsync(string kind, int id)
    {
        object? e = kind switch
        {
            "complaints" => await _db.Complaints.FindAsync(id),
            "positions" => await _db.Positions.FindAsync(id),
            "regions" => await _db.Regions.FindAsync(id),
            "districts" => await _db.Districts.FindAsync(id),
            "lab-big-categories" => await _db.LabBigCategories.FindAsync(id),
            "lab-categories" => await _db.LabCategories.FindAsync(id),
            _ => throw SuperAdminException.Bad("Noma'lum spravochnik"),
        };
        if (e == null) throw SuperAdminException.NotFound("Yozuv");
        try
        {
            _db.Remove(e);
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            _logger.LogWarning(ex, "SuperAdmin: spravochnik {Kind}#{Id} ishlatilmoqda", kind, id);
            throw SuperAdminException.Conflict("Bu yozuv boshqa ma'lumotlarda ishlatilmoqda — o'chirib bo'lmaydi");
        }
    }

    public async Task<object> GetLabValueTypesAsync() =>
        await _db.LabValueTypes.AsNoTracking().OrderBy(x => x.SortOrder).ThenBy(x => x.Id)
            .Select(x => new
            {
                x.Id, x.NameUz, x.NameRu, x.NameEn, x.Measure, x.NormalMinMale, x.NormalMaxMale,
                x.NormalMinFemale, x.NormalMaxFemale, x.ColumnName, x.Category, x.ValueKind, x.SortOrder, x.AiHint,
                usage = _db.LabAnalysisValues.Count(v => v.ValueTypeId == x.Id),
            })
            .ToListAsync();

    public async Task<int> UpsertLabValueTypeAsync(int? id, SaLabValueTypeDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.NameUz)) throw SuperAdminException.Bad("Nomi (uz) kiritilmagan");
        if (string.IsNullOrWhiteSpace(dto.ColumnName)) throw SuperAdminException.Bad("Kalit (column_name) kiritilmagan");
        if (!new[] { "numeric", "qualitative", "code" }.Contains(dto.ValueKind))
            throw SuperAdminException.Bad("Qiymat turi noto'g'ri");

        var key = dto.ColumnName.Trim().ToLowerInvariant();
        if (await _db.LabValueTypes.AnyAsync(x => x.ColumnName == key && x.Id != (id ?? 0)))
            throw SuperAdminException.Conflict("Bu kalit bilan ko'rsatkich allaqachon bor");

        var now = DateTime.UtcNow;
        var e = id == null ? new LabValueTypes { CreatedAt = now }
            : await _db.LabValueTypes.FindAsync(id.Value) ?? throw SuperAdminException.NotFound("Ko'rsatkich");
        e.NameUz = dto.NameUz.Trim(); e.NameRu = dto.NameRu?.Trim(); e.NameEn = dto.NameEn?.Trim();
        e.Measure = dto.Measure?.Trim();
        e.NormalMinMale = dto.NormalMinMale; e.NormalMaxMale = dto.NormalMaxMale;
        e.NormalMinFemale = dto.NormalMinFemale; e.NormalMaxFemale = dto.NormalMaxFemale;
        e.ColumnName = key; e.Category = dto.Category?.Trim(); e.ValueKind = dto.ValueKind;
        e.SortOrder = dto.SortOrder; e.AiHint = dto.AiHint?.Trim(); e.UpdatedAt = now;
        if (id == null) _db.LabValueTypes.Add(e);
        await _db.SaveChangesAsync();
        return e.Id;
    }

    public async Task DeleteLabValueTypeAsync(int id)
    {
        var e = await _db.LabValueTypes.FindAsync(id) ?? throw SuperAdminException.NotFound("Ko'rsatkich");
        if (await _db.LabAnalysisValues.IgnoreQueryFilters().AnyAsync(v => v.ValueTypeId == id))
            throw SuperAdminException.Conflict("Ko'rsatkich tahlil natijalarida ishlatilgan — o'chirib bo'lmaydi");
        try
        {
            _db.LabValueTypes.Remove(e);
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            _logger.LogWarning(ex, "SuperAdmin: lab ko'rsatkichi {Id} ishlatilmoqda", id);
            throw SuperAdminException.Conflict("Ko'rsatkich boshqa ma'lumotlarda ishlatilmoqda — o'chirib bo'lmaydi");
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // SA-11 — AI xarajati (`ai_usage`, Python yozadi, EF modeli yo'q)
    // ════════════════════════════════════════════════════════════════════

    private async Task<bool> AiUsageExistsAsync()
    {
        var r = await SqlRows.QueryAsync(_db, "SELECT to_regclass('public.ai_usage') IS NOT NULL AS ok", new());
        return r.FirstOrDefault()?["ok"] is true;
    }

    private async Task<object> AiTotalsAsync(DateTime fromUtc)
    {
        if (!await AiUsageExistsAsync())
            return new { available = false, calls = 0L, inputTokens = 0L, outputTokens = 0L, costUsd = 0m };
        var r = (await SqlRows.QueryAsync(_db, @"
            SELECT count(*) AS calls, COALESCE(sum(input_tokens), 0) AS inp,
                   COALESCE(sum(output_tokens), 0) AS outp, COALESCE(sum(cost_usd), 0) AS cost
              FROM ai_usage WHERE created_at >= @from", new() { ["@from"] = fromUtc })).First();
        return new { available = true, calls = L(r["calls"]), inputTokens = L(r["inp"]), outputTokens = L(r["outp"]), costUsd = D(r["cost"]) };
    }

    public async Task<object> GetAiUsageAsync(int days)
    {
        days = Math.Clamp(days, 1, 365);
        var (todayUtc, _) = AppTime.LocalDayBoundsUtc(_config);
        var fromUtc = todayUtc.AddDays(-(days - 1));
        if (!await AiUsageExistsAsync())
            return new { available = false, days };

        var args = new Dictionary<string, object?> { ["@from"] = fromUtc };
        const string agg = @"count(*) AS calls, COALESCE(sum(input_tokens),0) AS inp, COALESCE(sum(cached_tokens),0) AS cached,
                             COALESCE(sum(output_tokens),0) AS outp, COALESCE(sum(reasoning_tokens),0) AS reasoning,
                             COALESCE(sum(cost_usd),0) AS cost";

        var daily = await SqlRows.QueryAsync(_db, $@"
            SELECT (created_at AT TIME ZONE '{TzName}')::date AS d, {agg}
              FROM ai_usage WHERE created_at >= @from GROUP BY 1", args);
        var byModule = await SqlRows.QueryAsync(_db, $@"
            SELECT module AS k, {agg} FROM ai_usage WHERE created_at >= @from GROUP BY 1 ORDER BY cost DESC, calls DESC", args);
        var byModel = await SqlRows.QueryAsync(_db, $@"
            SELECT model AS k, {agg} FROM ai_usage WHERE created_at >= @from GROUP BY 1 ORDER BY cost DESC, calls DESC", args);

        object Row(Dictionary<string, object?> r) => new
        {
            key = r.TryGetValue("k", out var k) ? k : null,
            calls = L(r["calls"]), inputTokens = L(r["inp"]), cachedTokens = L(r["cached"]),
            outputTokens = L(r["outp"]), reasoningTokens = L(r["reasoning"]), costUsd = D(r["cost"]),
        };

        var localToday = AppTime.LocalNow(_config).Date;
        var series = Enumerable.Range(0, days).Select(i =>
        {
            var day = localToday.AddDays(-(days - 1) + i);
            var r = daily.FirstOrDefault(x => ((DateTime)x["d"]!).Date == day);
            return new
            {
                date = day.ToString("yyyy-MM-dd"),
                calls = L(r?["calls"]), inputTokens = L(r?["inp"]), outputTokens = L(r?["outp"]), costUsd = D(r?["cost"]),
            };
        });

        return new
        {
            available = true,
            days,
            totals = await AiTotalsAsync(fromUtc),
            series,
            byModule = byModule.Select(Row),
            byModel = byModel.Select(Row),
        };
    }
}
