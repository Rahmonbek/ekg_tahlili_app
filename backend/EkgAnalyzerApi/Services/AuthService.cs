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

    public AuthService(
        MedDataDB context,
        ISmsService smsService,
        TokenService tokenService,
        ILogger<AuthService> logger)
    {
        _context = context;
        _smsService = smsService;
        _tokenService = tokenService;
        _logger = logger;
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

    public async Task<bool> CheckUsernameAsync(string username, int? user_id, string? email)
    {
        return await _context.Users
            .AnyAsync(x => x.Username.ToLower() == username.ToLower() &&
                           ((user_id != null && x.Id != user_id) || user_id == null) &&
                           ((email != null && x.Email != email) || email == null));
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

    private async Task SendVerificationCodeAsync(User user)
    {
        var (phone, code) = await AddVerificationCodeAsync(user);
        SendSmsInBackground(phone, code);
    }

    public async Task RegisterAsync(RegisterDto dto)
    {
        var phone = NormalizePhone(GetDtoPhoneNumber(dto.PhoneNumber, dto.Phone));
        var clinicInn = NormalizeInn(dto.ClinicInn);
        var clinicName = NormalizeText(dto.ClinicName);
        var address = NormalizeText(dto.Address);
        var bankAccaunt = NormalizeText(dto.BankAccaunt);
        var mfo = NormalizeText(dto.MFO);
        var bankName = NormalizeText(dto.BankName);
        var license = NormalizeText(dto.License);
        var internalEmail = InternalPhoneEmail(phone);

        if (phone.Length != 12)
            throw new Exception("phone_number_invalid");

        if (string.IsNullOrWhiteSpace(clinicName))
            throw new Exception("clinic_name_required");

        if (string.IsNullOrWhiteSpace(clinicInn))
            throw new Exception("clinic_inn_required");

        if (dto.DistrictId == null || dto.DistrictId <= 0)
            throw new Exception("district_required");

        if (string.IsNullOrWhiteSpace(address))
            throw new Exception("address_required");

        var existingDoctor = await _context.Doctors
            .Include(x => x.User)
                .ThenInclude(x => x.Clinic)
                    .ThenInclude(x => x.ClinicDetail)
            .FirstOrDefaultAsync(x => x.Phone == phone);

        if (existingDoctor?.User?.Status == true)
            throw new Exception("phone_already_exists");

        var existingClinicInn = await _context.ClinicDetails
            .AnyAsync(x => x.INN == clinicInn &&
                           (existingDoctor == null || x.ClinicId != existingDoctor.User.ClinicId));

        if (existingClinicInn)
            throw new Exception("clinic_already_registered");

        using var transaction = await _context.Database.BeginTransactionAsync();
        var committed = false;

        try
        {
            User user;
            Doctor doctor;

            if (existingDoctor?.User != null && existingDoctor.User.Status == false)
            {
                user = existingDoctor.User;
                doctor = existingDoctor;

                user.Username = phone;
                user.Email = internalEmail;
                user.PasswordPlain = dto.Password;
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
                user.RoleId = RoleConstants.Admin;

                if (user.Clinic == null)
                {
                    user.Clinic = new Clinic { ClinicName = clinicName };
                }

                user.Clinic.ClinicName = clinicName;
                user.Clinic.ClinicDetail ??= new ClinicDetail();
                user.Clinic.ClinicDetail.INN = clinicInn;
                user.Clinic.ClinicDetail.DistrictId = dto.DistrictId;
                user.Clinic.ClinicDetail.Address = address;
                user.Clinic.ClinicDetail.BankAccaunt = bankAccaunt;
                user.Clinic.ClinicDetail.MFO = mfo;
                user.Clinic.ClinicDetail.BankName = bankName;
                user.Clinic.ClinicDetail.License = license;
                user.Clinic.ClinicDetail.UpdatedAt = DateTime.UtcNow;
                doctor.Phone = phone;
            }
            else
            {
                var clinic = new Clinic
                {
                    ClinicName = clinicName,
                    ClinicDetail = new ClinicDetail
                    {
                        INN = clinicInn,
                        DistrictId = dto.DistrictId,
                        Address = address,
                        BankAccaunt = bankAccaunt,
                        MFO = mfo,
                        BankName = bankName,
                        License = license
                    }
                };

                user = new User
                {
                    Username = phone,
                    Email = internalEmail,
                    PasswordPlain = dto.Password,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                    Status = false,
                    RoleId = RoleConstants.Admin,
                    Clinic = clinic
                };

                doctor = new Doctor
                {
                    User = user,
                    Gender = true,
                    Phone = phone
                };

                _context.Clinics.Add(clinic);
                _context.Users.Add(user);
                _context.Doctors.Add(doctor);
            }

            await _context.SaveChangesAsync();

            var hasPosition = await _context.DoctorPositions
                .AnyAsync(x => x.DoctorId == doctor.Id);

            if (!hasPosition)
            {
                _context.DoctorPositions.Add(new DoctorPosition
                {
                    DoctorId = doctor.Id,
                    PositionId = 77
                });

                await _context.SaveChangesAsync();
            }

            var sms = await AddVerificationCodeAsync(user);

            await transaction.CommitAsync();
            committed = true;
            SendSmsInBackground(sms.Phone, sms.Code);
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

        if (!user.Status)
            return Fail("phone_not_verified");

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Fail("invalid_password");

        bool isPrivileged = user.RoleId == RoleConstants.SuperAdmin
                         || user.RoleId == RoleConstants.Admin
                         || user.RoleId == RoleConstants.Director;

        if (!isPrivileged && user.Clinic != null && !user.Clinic.IsActive)
            return Fail("clinic_not_active");

        return new VerifyCodeResult
        {
            UserId = user.Id,
            Success = true,
            Message = "success_login",
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

        await SendVerificationCodeAsync(user);
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

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        user.PasswordPlain = dto.NewPassword;
        code.IsUsed = true;

        await _context.SaveChangesAsync();
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
