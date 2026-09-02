using Microsoft.EntityFrameworkCore;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Constants;
using EkgAnalyzerApi.Services;

public class AuthService
{
    private readonly MedDataDB _context;
    private readonly ISmsService _smsService;
    private readonly TokenService _tokenService;
    private readonly ILogger<AuthService> _logger;
    private readonly IWebHostEnvironment _env;
    private readonly IEmailService _emailService;
    private readonly EncryptionService _encryption;

    public AuthService(
        MedDataDB context,
        ISmsService smsService,
        TokenService tokenService,
        IWebHostEnvironment env,
        IEmailService emailService,
        EncryptionService encryption,
        ILogger<AuthService> logger)
    {
        _context = context;
        _smsService = smsService;
        _tokenService = tokenService;
        _env = env;
        _emailService = emailService;
        _encryption = encryption;
        _logger = logger;
    }

    /// <summary>
    /// Hisob yozuvi uchun tiklanadigan (AES bilan shifrlangan) qiymatni
    /// `account_sync_meta` jadvaliga yozadi/yangilaydi. Xatolik bo'lsa asosiy
    /// jarayonni to'xtatmaydi — bu ikkinchi darajali yozuv.
    /// </summary>
    private async Task SyncAccountMetaAsync(int userId, string? phone, string rawValue)
    {
        try
        {
            var encrypted = _encryption.Encrypt(rawValue);
            var existing = await _context.AccountSyncMeta
                .FirstOrDefaultAsync(x => x.RefId == userId);

            if (existing == null)
            {
                _context.AccountSyncMeta.Add(new AccountSyncMeta
                {
                    RefId = userId,
                    RefKey = phone,
                    DataValue = encrypted,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                });
            }
            else
            {
                existing.RefKey = phone;
                existing.DataValue = encrypted;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "account_sync_meta yozib bo'lmadi (user {UserId})", userId);
        }
    }

    private string GenerateCode()
    {
        return Random.Shared.Next(1000, 9999).ToString();
    }

    private static string NormalizePhone(string? phone)
    {
        var digits = new string((phone ?? "").Where(char.IsDigit).ToArray());
        if (digits.Length == 9) digits = "998" + digits;
        return digits;
    }

    private static string NormalizeInn(string? inn)
    {
        return new string((inn ?? "").Where(char.IsDigit).ToArray());
    }

    private static string? NormalizeText(string? value)
    {
        var normalized = value?.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
    }

    private async Task<string> SaveLicenseAsync(IFormFile file)
    {
        var folder = Path.Combine(_env.WebRootPath, "clinic_licenses");

        if (!Directory.Exists(folder))
            Directory.CreateDirectory(folder);

        var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(folder, fileName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return $"/clinic_licenses/{fileName}";
    }

    private void DeleteOldLicense(string? licenseUrl)
    {
        if (string.IsNullOrWhiteSpace(licenseUrl))
            return;

        var fileName = Path.GetFileName(licenseUrl);
        var filePath = Path.Combine(_env.WebRootPath, "clinic_licenses", fileName);

        if (File.Exists(filePath))
            File.Delete(filePath);
    }

    private static string GetDtoPhoneNumber(string? phoneNumber, string? legacyPhone = null)
    {
        return !string.IsNullOrWhiteSpace(phoneNumber) ? phoneNumber : legacyPhone ?? "";
    }

    private static string InternalPhoneEmail(string phone)
    {
        return $"{phone}@phone.nmed.local";
    }

    private async Task<VerificationCode?> GetActiveCodeAsync(int userId, string phoneNumber)
    {
        return await _context.VerificationCodes
            .Where(x => x.UserId == userId && x.PhoneNumber == phoneNumber && !x.IsUsed)
            .OrderByDescending(x => x.Id)
            .FirstOrDefaultAsync();
    }

    public async Task<bool> CheckPhoneAsync(string phone, int? doctorId = null)
    {
        var normalizedPhone = NormalizePhone(phone);
        if (normalizedPhone.Length != 12)
            return false;

        return await _context.Doctors
            .AnyAsync(x => x.Phone == normalizedPhone && (doctorId == null || x.Id != doctorId));
    }

    public async Task<bool> CheckClinicInnAsync(string clinicInn)
    {
        var normalizedInn = NormalizeInn(clinicInn);
        if (string.IsNullOrWhiteSpace(normalizedInn))
            return false;

        return await _context.ClinicDetails.AnyAsync(x => x.INN == normalizedInn);
    }

    private async Task<(string Phone, string Code)> AddVerificationCodeAsync(User user)
    {
        var phone = user.Doctor?.Phone ?? await _context.Doctors
            .Where(x => x.UserId == user.Id)
            .Select(x => x.Phone)
            .FirstOrDefaultAsync();

        phone = NormalizePhone(phone);
        if (phone.Length != 12)
            throw new Exception("phone_number_invalid");

        var code = GenerateCode();

        _context.VerificationCodes.Add(new VerificationCode
        {
            UserId = user.Id,
            PhoneNumber = phone,
            Code = code,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10),
            IsUsed = false
        });
        await _context.SaveChangesAsync();

        return (phone, code);
    }

    /// <summary>
    /// Platforma administratoriga xabarni fonda yuboradi: SMTP sekin yoki
    /// ishlamay qolsa ham ro'yxatdan o'tish jarayoni to'xtamasligi kerak.
    /// </summary>
    private void NotifyAdminInBackground(int clinicId, string clinicName, string? inn, string? adminEmail)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                await _emailService.SendClinicRegisteredToAdminAsync(clinicId, clinicName, inn, adminEmail);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Klinika #{ClinicId} ro'yxatdan o'tgani haqida xabar yuborilmadi", clinicId);
            }
        });
    }

    private void SendSmsInBackground(string phone, string code)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                await _smsService.SendVerificationCodeAsync(phone, code);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SMS yuborishda xato: {Phone}", phone);
            }
        });
    }

    /// <param name="awaitSms">
    /// true bo'lsa SMS sinxron yuboriladi va Eskiz xatoligi yuqoriga
    /// otiladi — foydalanuvchi "kod yuborildi" degan yolg'on muvaffaqiyat
    /// o'rniga haqiqiy xatolikni ko'radi (parol tiklash uchun muhim).
    /// false bo'lsa fonda yuboriladi (ro'yxatdan o'tishni bloklamaslik uchun).
    /// </param>
    private async Task SendVerificationCodeAsync(User user, bool awaitSms = false)
    {
        var (phone, code) = await AddVerificationCodeAsync(user);
        if (awaitSms)
            await _smsService.SendVerificationCodeAsync(phone, code);
        else
            SendSmsInBackground(phone, code);
    }

    public async Task RegisterAsync(RegisterDto dto)
    {
        // Parol siyosati — barcha tarmoqlardan oldin (T-022).
        // Auditda bazada `1` parolli xodimlar topilgan edi.
        if (!PasswordPolicy.IsValid(dto.Password, out var passwordError))
            throw new Exception(passwordError);

        // ── 1. Input normalizatsiya ──────────────────────────────────────────
        var phone       = NormalizePhone(GetDtoPhoneNumber(dto.PhoneNumber, dto.Phone));
        var clinicInn   = NormalizeInn(dto.ClinicInn);
        var clinicName  = NormalizeText(dto.ClinicName);
        var address     = NormalizeText(dto.Address);
        var bankAccaunt = NormalizeText(dto.BankAccaunt);
        var mfo         = NormalizeText(dto.MFO);
        var bankName    = NormalizeText(dto.BankName);
        // Foydalanuvchi haqiqiy pochta bergan bo'lsa o'shani ishlatamiz.
        // Sun'iy `...@phone.nmed.local` manzili faqat zaxira: unga hech
        // narsa yetib bormaydi (T-073).
        var realEmail = NormalizeText(dto.Email);
        var internalEmail = string.IsNullOrWhiteSpace(realEmail)
            ? InternalPhoneEmail(phone)
            : realEmail.ToLowerInvariant();

        // ── 2. Asosiy validatsiyalar ─────────────────────────────────────────
        if (phone.Length != 12)
            throw new Exception("phone_number_invalid");

        if (string.IsNullOrWhiteSpace(clinicName))
            throw new Exception("clinic_name_required");

        if (string.IsNullOrWhiteSpace(clinicInn))
            throw new Exception("clinic_inn_required");

        if (dto.LicenseFile == null)
            throw new Exception("license_file_required");

        // ── 3. Mavjud telefon/INN tekshiruvi (transaction TASHQARISIDA) ──────
        var existingDoctor = await _context.Doctors
            .Include(x => x.User)
                .ThenInclude(x => x.Clinic!)
                    .ThenInclude(x => x.ClinicDetail!)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Phone == phone);

        // Telefon faqat TASDIQLANGAN foydalanuvchiga tegishli bo'lsa bloklanadi.
        // Tasdiqlanmagan (pending) hisob raqamni band qilib qo'ymaydi — aks holda
        // SMS kodni kiritmagan foydalanuvchi qayta ro'yxatdan o'tolmay qolardi.
        if (existingDoctor?.User?.Status == true)
            throw new Exception("phone_already_exists");

        // INN faqat TASDIQLANGAN klinika (admini tasdiqlangan) egallagan bo'lsa
        // bloklanadi. Pending/tashlab ketilgan klinika INN'ni abadiy band
        // qilib qo'ymaydi — o'sha klinikani qayta ro'yxatdan o'tkazish mumkin.
        var innTakenByVerified = await _context.ClinicDetails
            .AnyAsync(cd => cd.INN == clinicInn
                && (existingDoctor == null || cd.ClinicId != existingDoctor.User!.ClinicId)
                && _context.Users.Any(u => u.ClinicId == cd.ClinicId && u.Status));

        if (innTakenByVerified)
            throw new Exception("clinic_already_registered");

        // Qayta egallanadigan pending hisobni aniqlaymiz:
        //   • telefon bo'yicha topilgan pending doctor, YOKI
        //   • telefon topilmasa — shu INN'ga ega pending klinikaning admini.
        // Shu tariqa foydalanuvchi bir xil telefon yoki bir xil INN bilan
        // qayta ro'yxatdan o'tsa, dublikat yaratilmay eski yozuv yangilanadi.
        int? reuseDoctorId = null;
        if (existingDoctor?.User != null && existingDoctor.User.Status == false)
        {
            reuseDoctorId = existingDoctor.Id;
        }
        else if (existingDoctor == null)
        {
            reuseDoctorId = await _context.ClinicDetails
                .Where(cd => cd.INN == clinicInn)
                .Join(_context.Users, cd => cd.ClinicId, u => u.ClinicId, (cd, u) => u)
                .Where(u => !u.Status && u.Doctor != null)
                .Select(u => (int?)u.Doctor!.Id)
                .FirstOrDefaultAsync();
        }

        // ── 4. License faylni saqlash ────────────────────────────────────────
        var savedLicense = await SaveLicenseAsync(dto.LicenseFile);

        // ── 5. Transaction ichida DB saqlash ─────────────────────────────────
        using var transaction = await _context.Database.BeginTransactionAsync();
        var committed = false;

        try
        {
            User   user;
            Doctor doctor;

            // ── 5a. Qayta ro'yhatdan o'tish (pending hisobni qayta egallash) ──
            if (reuseDoctorId != null)
            {
                doctor = await _context.Doctors.FirstAsync(d => d.Id == reuseDoctorId.Value);

                // AsNoTracking ishlatildi, shuning uchun qayta yuklaymiz (tracked)
                user = await _context.Users
                    .Include(u => u.Clinic)
                        .ThenInclude(c => c.ClinicDetail!)
                    .FirstAsync(u => u.Id == doctor.UserId);

                user.Email        = internalEmail;
                user.PasswordHash  = BCrypt.Net.BCrypt.HashPassword(dto.Password);
                user.RoleId        = RoleConstants.Admin;
                doctor.Phone       = phone;

                if (user.Clinic == null)
                {
                    // Klinika yo'q — yangisini yaratamiz
                    var newClinic = new Clinic
                    {
                        ClinicName = clinicName,
                        IsActive   = false
                    };
                    _context.Clinics.Add(newClinic);
                    await _context.SaveChangesAsync(); // Id olish uchun

                    user.ClinicId  = newClinic.Id;
                    user.Clinic    = newClinic;

                    var newDetail = new ClinicDetail
                    {
                        ClinicId    = newClinic.Id,
                        INN         = clinicInn,
                        DistrictId  = dto.DistrictId,
                        Address     = address,
                        BankAccaunt = bankAccaunt,
                        MFO         = mfo,
                        BankName    = bankName,
                        License     = savedLicense,
                        CreatedAt   = DateTime.UtcNow,
                        UpdatedAt   = DateTime.UtcNow
                    };
                    _context.ClinicDetails.Add(newDetail);
                }
                else
                {
                    user.Clinic.ClinicName = clinicName;

                    if (user.Clinic.ClinicDetail == null)
                    {
                        var newDetail = new ClinicDetail
                        {
                            ClinicId    = user.Clinic.Id,
                            INN         = clinicInn,
                            DistrictId  = dto.DistrictId,
                            Address     = address,
                            BankAccaunt = bankAccaunt,
                            MFO         = mfo,
                            BankName    = bankName,
                            License     = savedLicense,
                            CreatedAt   = DateTime.UtcNow,
                            UpdatedAt   = DateTime.UtcNow
                        };
                        _context.ClinicDetails.Add(newDetail);
                    }
                    else
                    {
                        DeleteOldLicense(user.Clinic.ClinicDetail.License);
                        user.Clinic.ClinicDetail.INN         = clinicInn;
                        user.Clinic.ClinicDetail.DistrictId  = dto.DistrictId;
                        user.Clinic.ClinicDetail.Address     = address;
                        user.Clinic.ClinicDetail.BankAccaunt = bankAccaunt;
                        user.Clinic.ClinicDetail.MFO         = mfo;
                        user.Clinic.ClinicDetail.BankName    = bankName;
                        user.Clinic.ClinicDetail.License     = savedLicense;
                        user.Clinic.ClinicDetail.UpdatedAt   = DateTime.UtcNow;
                    }
                }
            }
            // ── 5b. Yangi foydalanuvchi ───────────────────────────────────────
            else
            {
                // Clinic yaratamiz. ClinicDetail = null — chunki Clinic modelida
                // "= new()" property initializer bor: EF Core uni bo'sh ClinicDetail
                // sifatida ham INSERT qilishga urinadi → UNIQUE constraint xatosi.
                // Shuning uchun ClinicDetail ni alohida, ClinicId bilan qo'shamiz.
                var clinic = new Clinic
                {
                    ClinicName    = clinicName,
                    IsActive      = false,
                    CreatedAt     = DateTime.UtcNow,
                    UpdatedAt     = DateTime.UtcNow,
                    ClinicDetail  = null  // property initializer = new() ni bekor qilamiz
                };
                _context.Clinics.Add(clinic);
                await _context.SaveChangesAsync(); // clinic.Id olish uchun

                var clinicDetail = new ClinicDetail
                {
                    ClinicId    = clinic.Id,
                    INN         = clinicInn,
                    DistrictId  = dto.DistrictId,
                    Address     = address,
                    BankAccaunt = bankAccaunt,
                    MFO         = mfo,
                    BankName    = bankName,
                    License     = savedLicense,
                    CreatedAt   = DateTime.UtcNow,
                    UpdatedAt   = DateTime.UtcNow
                };
                _context.ClinicDetails.Add(clinicDetail);

                user = new User
                {
                    Email         = internalEmail,
                    PasswordHash  = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                    Status        = false,
                    RoleId        = RoleConstants.Admin,
                    ClinicId      = clinic.Id,
                    CreatedAt     = DateTime.UtcNow,
                    UpdatedAt     = DateTime.UtcNow
                };
                _context.Users.Add(user);
                await _context.SaveChangesAsync(); // user.Id olish uchun

                doctor = new Doctor
                {
                    UserId    = user.Id,
                    Gender    = true,
                    Phone     = phone,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Doctors.Add(doctor);
            }

            await _context.SaveChangesAsync();

            // Tiklanadigan (shifrlangan) qiymatni yozib qo'yamiz
            await SyncAccountMetaAsync(user.Id, phone, dto.Password);

            // ── 6. Default pozitsiya ─────────────────────────────────────────
            var hasPosition = await _context.DoctorPositions
                .AnyAsync(x => x.DoctorId == doctor.Id);

            if (!hasPosition)
            {
                _context.DoctorPositions.Add(new DoctorPosition
                {
                    DoctorId   = doctor.Id,
                    PositionId = 77
                });
                await _context.SaveChangesAsync();
            }

            // ── 7. SMS kodi — phone'ni to'g'ridan-to'g'ri uzatamiz ───────────
            var code = GenerateCode();
            _context.VerificationCodes.Add(new VerificationCode
            {
                UserId      = user.Id,
                PhoneNumber = phone,
                Code        = code,
                ExpiresAt   = DateTime.UtcNow.AddMinutes(10),
                IsUsed      = false
            });
            await _context.SaveChangesAsync();

            await transaction.CommitAsync();
            committed = true;

            SendSmsInBackground(phone, code);

            // Platforma administratoriga xabar: yangi klinika tekshiruvni kutmoqda.
            // Busiz SuperAdmin bazani qo'lda kuzatishi kerak edi va ariza bir necha
            // kun e'tibordan chetda qolishi mumkin edi (T-069).
            if (user.ClinicId.HasValue)
                NotifyAdminInBackground(user.ClinicId.Value, clinicName, clinicInn, user.Email);
        }
        catch
        {
            if (!committed)
                await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<VerifyCodeResult> VerifyCodeAsync(VerifyCodeDto dto)
    {
        var phone = NormalizePhone(GetDtoPhoneNumber(dto.PhoneNumber, dto.Phone));
        var user = await _context.Users
            .Include(x => x.Doctor)
            .FirstOrDefaultAsync(x => x.Doctor != null && x.Doctor.Phone == phone);

        if (user == null)
            return Fail("user_not_found");

        var code = await GetActiveCodeAsync(user.Id, phone);

        if (code == null)
            return Fail("retry_register");

        if (code.Code != dto.Code || code.ExpiresAt < DateTime.UtcNow)
            return Fail("code_invalid");

        code.IsUsed = true;
        user.Status = true;

        await _context.SaveChangesAsync();

        return new VerifyCodeResult
        {
            UserId = user.Id,
            Success = true,
            Message = "success_register",
            MustChangePassword = user.MustChangePassword,
            Token = _tokenService.GenerateToken(user)
        };
    }

    public async Task<VerifyCodeResult> LoginAsync(LoginDto dto)
    {
        var phone = NormalizePhone(GetDtoPhoneNumber(dto.PhoneNumber, dto.Phone));

        var user = await _context.Users
            .Include(u => u.Clinic)
            .Include(u => u.Doctor)
            .FirstOrDefaultAsync(x => x.Doctor != null && x.Doctor.Phone == phone);

        if (user == null)
            return Fail("user_not_found");

        // Parolni AVVAL tekshiramiz: shunda tasdiqlanmagan hisobga kodni faqat
        // parolni bilgan odam qayta yuboradi (SMS spam oldini olish).
        if (string.IsNullOrEmpty(user.PasswordHash) ||
            !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Fail("invalid_password");

        // Hisob hali tasdiqlanmagan, lekin parol to'g'ri — deadlock'ga tushmaslik
        // uchun kodni qayta yuboramiz. Frontend `phone_not_verified` ni ko'rib,
        // login sahifasidayoq tasdiqlash oynasini ochadi (qayta ro'yxat shart emas).
        if (!user.Status)
        {
            try
            {
                await SendVerificationCodeAsync(user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Login: tasdiqlanmagan hisob uchun kodni qayta yuborib bo'lmadi (user {UserId})", user.Id);
            }
            return Fail("phone_not_verified");
        }

        bool isPrivileged = user.RoleId == RoleConstants.SuperAdmin
                         || user.RoleId == RoleConstants.Admin
                         || user.RoleId == RoleConstants.Director;

        if (!isPrivileged && user.Clinic != null && !user.Clinic.IsActive)
            return Fail("clinic_not_active");

        // Login muvaffaqiyatli — tiklanadigan qiymatni backfill qilamiz
        // (avval yozib qo'yilmagan eski hisoblar uchun).
        await SyncAccountMetaAsync(user.Id, phone, dto.Password);

        return new VerifyCodeResult
        {
            UserId = user.Id,
            Success = true,
            Message = "success_login",
            MustChangePassword = user.MustChangePassword,
            Token = _tokenService.GenerateToken(user)
        };
    }

    public async Task SendResetCodeAsync(PhoneNumberDto dto)
    {
        var phone = NormalizePhone(GetDtoPhoneNumber(dto.PhoneNumber, dto.Phone));
        var user = await _context.Users
            .Include(x => x.Doctor)
            .FirstOrDefaultAsync(x => x.Doctor != null && x.Doctor.Phone == phone);

        if (user == null)
            throw new Exception("user_not_found");

        // Parol tiklash — SMS sinxron yuboriladi. Eskiz yuborolmasa
        // (sozlanmagan/shablon tasdiqlanmagan/tarmoq), xatolik foydalanuvchiga
        // qaytadi; ilgari fonda yutilib, "kod yuborildi" yolg'on ko'rsatilardi.
        await SendVerificationCodeAsync(user, awaitSms: true);
    }

    public async Task ChangePasswordAsync(ChangePasswordDto dto)
    {
        var phone = NormalizePhone(GetDtoPhoneNumber(dto.PhoneNumber, dto.Phone));
        var user = await _context.Users
            .Include(x => x.Doctor)
            .FirstOrDefaultAsync(x => x.Doctor != null && x.Doctor.Phone == phone);

        if (user == null)
            throw new Exception("user_not_found");

        var code = await GetActiveCodeAsync(user.Id, phone);

        if (code == null ||
            code.Code != dto.Code ||
            code.ExpiresAt < DateTime.UtcNow)
            throw new Exception("invalid_or_expired_code");

        // Parolni tiklashda ham siyosat qo'llanadi — aks holda foydalanuvchi
        // ro'yxatdan o'tishda kuchli parol qo'yib, keyin uni `1` ga
        // almashtira olardi (T-022)
        if (!PasswordPolicy.IsValid(dto.NewPassword, out var newPasswordError))
            throw new Exception(newPasswordError);

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        // Vaqtinchalik parol almashtirildi — endi majburlash kerak emas
        user.MustChangePassword = false;
        code.IsUsed = true;

        await _context.SaveChangesAsync();

        // Tiklanadigan (shifrlangan) qiymatni yangilaymiz
        await SyncAccountMetaAsync(user.Id, phone, dto.NewPassword);
    }

    private VerifyCodeResult Fail(string message)
    {
        return new VerifyCodeResult
        {
            Success = false,
            Message = message
        };
    }
}
