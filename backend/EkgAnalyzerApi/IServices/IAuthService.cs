using BCrypt.Net;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using Microsoft.EntityFrameworkCore;
using Org.BouncyCastle.Crypto.Generators;

public class AuthService
{
    private readonly MedDataDB _context;
    private readonly IEmailService _emailService;

    public AuthService(MedDataDB context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
    }

    private string GenerateCode()
    {
        return new Random().Next(1000, 9999).ToString();
    }

    public async Task RegisterAsync(RegisterDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user == null)
        {
            user = new User
            {
                Email = dto.Email,
                PasswordPlain = dto.Password,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Status = false
            };
            _context.Users.Add(user);
        }
        else
        {
            user.PasswordPlain = dto.Password;
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        }

        await _context.SaveChangesAsync();

        var code = GenerateCode();
        var verification = new VerificationCode
        {
            Email = dto.Email,
            Code = code,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10),
            IsUsed = false
        };
        _context.VerificationCodes.Add(verification);
        await _context.SaveChangesAsync();

        await _emailService.SendAsync(dto.Email, "Verification Code", $"Your code: {code}");
    }

    public async Task VerifyCodeAsync(VerifyCodeDto dto)
    {
        var ver = await _context.VerificationCodes
            .Where(x => x.Email == dto.Email && !x.IsUsed)
            .OrderByDescending(x => x.Id)
            .FirstOrDefaultAsync();

        if (ver == null || ver.Code != dto.Code || ver.ExpiresAt < DateTime.UtcNow)
            throw new Exception("Invalid or expired code");

        ver.IsUsed = true;

        var user = await _context.Users.FirstOrDefaultAsync(x => x.Email == dto.Email);
        user.Status = true;

        await _context.SaveChangesAsync();
    }

    public async Task<string> LoginAsync(LoginDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null) throw new Exception("User not found");
        if (!user.Status) throw new Exception("Email not verified");
        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash)) throw new Exception("Invalid password");

        // Simple JWT example (replace with proper JWT service)
        var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
        return token;
    }

    public async Task ChangePasswordAsync(ChangePasswordDto dto)
    {
        var ver = await _context.VerificationCodes
            .Where(x => x.Email == dto.Email && !x.IsUsed)
            .OrderByDescending(x => x.Id)
            .FirstOrDefaultAsync();

        if (ver == null || ver.Code != dto.Code || ver.ExpiresAt < DateTime.UtcNow)
            throw new Exception("Invalid or expired code");

        ver.IsUsed = true;

        var user = await _context.Users.FirstOrDefaultAsync(x => x.Email == dto.Email);
        user.PasswordPlain = dto.NewPassword;
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);

        await _context.SaveChangesAsync();
    }
}
