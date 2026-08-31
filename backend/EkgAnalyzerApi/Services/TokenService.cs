using EkgAnalyzerApi.Constants;
using EkgAnalyzerApi.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

public class TokenService
{
    private readonly IConfiguration _configuration;
    public TokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(User user)
    {
        var displayName = user.Doctor?.Phone ?? user.Email ?? user.Id.ToString();
        var claims = new List<Claim>
    {
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
        // Raqamli rol — siyosatlar (policy) va kod ichidagi tekshiruvlar shunga tayanadi
        new Claim("roleId", user.RoleId.ToString()),
        new Claim(ClaimTypes.Name, displayName),
        // Matnli rol nomi — [Authorize(Roles = "SuperAdmin")] atributlari uchun.
        // Ilgari bu yerga raqam yozilardi va shu sababli Roles= atributlari
        // hech qachon ishlamasdi (hatto to'g'ri rol uchun ham 403 qaytarardi).
        new Claim(ClaimTypes.Role, RoleConstants.Name(user.RoleId))
    };

        // Ishga tushish tekshiruvi bor, lekin konfiguratsiya ish
        // vaqtida qayta yuklanishi mumkin. Kalitsiz `GetBytes` sababi
        // ko'rinmaydigan `ArgumentNullException` berardi (T-009).
        var jwtKey = _configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(jwtKey))
            throw new InvalidOperationException(
                "Jwt:Key sozlanmagan — token imzolab bo'lmaydi");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
