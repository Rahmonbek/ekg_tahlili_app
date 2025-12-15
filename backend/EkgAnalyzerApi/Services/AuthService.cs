using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Services;

public class AuthService
{
    private readonly MedDataDB _context;
    private readonly IEmailService _emailService;
    private readonly TokenService _tokenService;

    public AuthService(
        MedDataDB context,
        IEmailService emailService,
        TokenService tokenService)
    {
        _context = context;
        _emailService = emailService;
        _tokenService = tokenService;
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
    public async Task<bool> CheckUsernameAsync(string username)
    {
        return await _context.Users
            .AnyAsync(x => x.Username.ToLower() == username.ToLower());
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

        var verification = new VerificationCode
        {
            UserId = user.Id,
            Email = user.Email,
            Code = code,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10),
            IsUsed = false
        };

        _context.VerificationCodes.Add(verification);
        await _context.SaveChangesAsync();

        await _emailService.SendAsync(
            user.Email,
            "Verification Code",
            $"Your code: {code}"
        );
    }

    // ========================= REGISTER =========================

    public async Task RegisterAsync(RegisterDto dto)
    {
        if (await _context.Users.AnyAsync(x => x.Username == dto.Username))
            throw new Exception("username_already_exists");

        if (await _context.Users.AnyAsync(x => x.Email == dto.Email))
            throw new Exception("email_already_exists");

        var user = new User
        {
            Username = dto.Username,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Status = false
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await SendVerificationCodeAsync(user);
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
            .FirstOrDefaultAsync(x => x.Username == dto.Username);

        if (user == null)
            return Fail("user_not_found");

        if (!user.Status)
            return Fail("email_not_verified");

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Fail("invalid_password");

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
