using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Services;
using EkgAnalyzerApi.Constants;

public class AuthService
{
    private readonly MedDataDB _context;
    private readonly IEmailService _emailService;
    private readonly TokenService _tokenService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        MedDataDB context,
        IEmailService emailService,
        TokenService tokenService,
        ILogger<AuthService> logger)
    {
        _context = context;
        _emailService = emailService;
        _tokenService = tokenService;
        _logger = logger;
    }

    // ========================= HELPERS =========================

    private string GenerateCode()
    {
        return Random.Shared.Next(1000, 9999).ToString();
    }

    private async Task<VerificationCode?> GetActiveCodeByUserIdAsync(int userId)
    {
        return await _context.VerificationCodes
            .Where(x => x.UserId == userId && !x.IsUsed)
            .OrderByDescending(x => x.Id)
            .FirstOrDefaultAsync();
    }
    public async Task<bool> CheckUsernameAsync(string username, int? user_id, string? email)
    {
        return await _context.Users
            .AnyAsync(x => x.Username.ToLower() == username.ToLower() && ((user_id != null && x.Id != user_id) || (user_id == null)) && ((email != null && x.Email != email) || (email == null)));
    }
    private async Task<VerificationCode?> GetActiveCodeByEmailAsync(string email)
    {
        return await _context.VerificationCodes
            .Where(x => x.Email == email && !x.IsUsed)
            .OrderByDescending(x => x.Id)
            .FirstOrDefaultAsync();
    }

    private async Task SendVerificationCodeAsync(User user)
    {
        var code = GenerateCode();

        _context.VerificationCodes.Add(new VerificationCode
        {
            UserId = user.Id,
            Email = user.Email,
            Code = code,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10),
            IsUsed = false
        });
        await _context.SaveChangesAsync();

        // Email background da yuboriladi — API ni bloklamamaslik uchun
        _ = Task.Run(async () =>
        {
            try
            {
                await _emailService.SendVerificationCodeAsync(user.Email, code);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Email yuborishda xato: {Email}", user.Email);
            }
        });
    }

    // ========================= REGISTER =========================

    public async Task RegisterAsync(RegisterDto dto)
    {
        var existingUser = await _context.Users
        .Include(x => x.Clinic)
        .FirstOrDefaultAsync(x => x.Email == dto.Email);
        if (await _context.Users.AnyAsync(x =>
        x.Username == dto.Username &&
        (existingUser == null || x.Id != existingUser.Id)))
        {
            throw new Exception("username_already_exists");
        }

        // Email mavjud va aktiv bo‘lsa
        if (existingUser != null && existingUser.Status == true)
        {
            throw new Exception("email_already_exists");
        }

        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            User user;
            Doctor doctor;

            // 🔁 Email bor, lekin status = false → UPDATE
            if (existingUser != null && existingUser.Status == false)
            {
                user = existingUser;

                user.Username = dto.Username;
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
                user.RoleId = RoleConstants.Admin;

                if (user.Clinic == null)
                {
                    user.Clinic = new Clinic
                    {
                        ClinicName = ""
                    };
                }

                doctor = await _context.Doctors
                    .FirstOrDefaultAsync(d => d.UserId == user.Id);

                if (doctor == null)
                {
                    doctor = new Doctor
                    {
                        User = user,
                        Gender = true
                    };
                    _context.Doctors.Add(doctor);
                }
            }
            else
            {
                // 🆕 Yangi user
                var clinic = new Clinic
                {
                    ClinicName = ""
                };

                user = new User
                {
                    Username = dto.Username,
                    Email = dto.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                    Status = false,
                    RoleId = RoleConstants.Admin,
                    Clinic = clinic
                };

                doctor = new Doctor
                {
                    User = user,
                    Gender = true
                };

                _context.Clinics.Add(clinic);
                _context.Users.Add(user);
                _context.Doctors.Add(doctor);
            }

            await _context.SaveChangesAsync();

            // DoctorPosition bo‘lmasa qo‘shiladi
            bool hasPosition = await _context.DoctorPositions
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

            await transaction.CommitAsync();

            await SendVerificationCodeAsync(user);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // ========================= VERIFY EMAIL =========================

    public async Task<VerifyCodeResult> VerifyCodeAsync(VerifyCodeDto dto)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(x => x.Email == dto.Email);

        if (user == null)
            return Fail("user_not_found");

        var code = await GetActiveCodeByUserIdAsync(user.Id);

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

    // ========================= LOGIN =========================

    public async Task<VerifyCodeResult> LoginAsync(LoginDto dto)
    {
        var user = await _context.Users
            .Include(u => u.Clinic)
            .FirstOrDefaultAsync(x => x.Username == dto.Username);

        if (user == null)
            return Fail("user_not_found");

        if (!user.Status)
            return Fail("email_not_verified");

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Fail("invalid_password");

        // SuperAdmin (1), Admin (2), Direktor (3) uchun klinika bloklanmaydi
        // Shifokor (4), Hamshira (5) uchun klinika is_active tekshiriladi
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

    // ========================= CHANGE PASSWORD =========================

    public async Task ChangePasswordAsync(ChangePasswordDto dto)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(x => x.Email == dto.Email);

        if (user == null)
            throw new Exception("user_not_found");

        var code = await GetActiveCodeByEmailAsync(dto.Email);

        if (code == null ||
            code.Code != dto.Code ||
            code.ExpiresAt < DateTime.UtcNow)
            throw new Exception("invalid_or_expired_code");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        code.IsUsed = true;

        await _context.SaveChangesAsync();
    }

    // ========================= RESULT HELPER =========================

    private VerifyCodeResult Fail(string message)
    {
        return new VerifyCodeResult
        {
            Success = false,
            Message = message
        };
    }
}
