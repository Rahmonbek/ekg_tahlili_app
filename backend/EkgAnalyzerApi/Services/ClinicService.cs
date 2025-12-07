using BCrypt.Net;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using Microsoft.EntityFrameworkCore;
using Org.BouncyCastle.Bcpg;
using Org.BouncyCastle.Crypto.Generators;

public class ClinicService
{
    private readonly MedDataDB _context;

    public ClinicService(MedDataDB context)
    {
        _context = context;
    }

    private string GenerateCode()
    {
        return new Random().Next(1000, 9999).ToString();
    }

    public async Task RegisterAsync(RegisterDto dto)
    {
        // Userni topamiz yoki yangi yaratamiz
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
            await _context.SaveChangesAsync(); // Id olish uchun
        }
        else
        {
            user.PasswordPlain = dto.Password;
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            user.Status = false;
            await _context.SaveChangesAsync();
        }

        // Verification code yaratamiz yoki mavjudini yangilaymiz
        var code = GenerateCode();

        var existingCode = await _context.VerificationCodes
            .FirstOrDefaultAsync(v => v.UserId == user.Id);

        if (existingCode != null)
        {
            // Mavjud kodni yangilaymiz
            existingCode.Email = dto.Email;
            existingCode.Code = code;
            existingCode.ExpiresAt = DateTime.UtcNow.AddMinutes(10);
            existingCode.IsUsed = false;
        }
        else
        {
            // Yangi kod yaratamiz
            var verification = new VerificationCode
            {
                UserId = user.Id,
                Email = dto.Email,
                Code = code,
                ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                IsUsed = false
            };
            _context.VerificationCodes.Add(verification);
        }

        await _context.SaveChangesAsync();

    }

    public class VerifyCodeResult
    {
        public int UserId { get; set; }
        public bool Success { get; set; }
        public string Message { get; set; } = default!;
        public string? Token { get; set; }
    }

    public async Task<VerifyCodeResult> VerifyCodeAsync(VerifyCodeDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null)
            return new VerifyCodeResult
            {
                Success = false,
                Message = "User with this email does not exist"
            };

        var ver = await _context.VerificationCodes
            .Where(v => v.UserId == user.Id && !v.IsUsed)
            .OrderByDescending(v => v.Id)
            .FirstOrDefaultAsync();

        if (ver == null)
            return new VerifyCodeResult
            {
                Success = false,
                Message = "retry_register"
            };

        if (ver.Code != dto.Code)
            return new VerifyCodeResult
            {
                Success = false,
                Message = "code_incorrect"
            };

        
        // Kod to‘g‘ri → mark as used va user status true
        ver.IsUsed = true;
        user.Status = true;
        await _context.SaveChangesAsync();

        var tokenBytes = System.Text.Encoding.UTF8.GetBytes(user.Email);
        var token = Convert.ToBase64String(tokenBytes);

        return new VerifyCodeResult
        {
            UserId = user.Id,
            Success = true,
            Message = "success_register",
            Token = token
        };
    }

    public async Task<VerifyCodeResult> LoginAsync(LoginDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null)
            return new VerifyCodeResult
            {
                Success = false,
                Message = "user_not_find"
            }; ;

        if (!user.Status)
            return new VerifyCodeResult
            {
                Success = false,
                Message = "email_not_verified"
            }; ;

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return new VerifyCodeResult
            {
                Success = false,
                Message = "invalid_password"
            }; ;

       
        var tokenBytes = System.Text.Encoding.UTF8.GetBytes(user.Email);
        var token = Convert.ToBase64String(tokenBytes);
        return new VerifyCodeResult
        {
            UserId = user.Id,
            Success = true,
            Message = "success_login",
            Token = token
        }; ;
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
