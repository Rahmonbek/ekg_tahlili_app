using EkgAnalyzerApi.Constants;
using EkgAnalyzerApi.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

public class TokenService
{
    /// <summary>
    /// Token amal qilish muddati — soatlarda. `Jwt:ExpiresHours` sozlamasi
    /// bilan o'zgartiriladi.
    ///
    /// Ilgari qotirilgan 24 soat edi: o'g'irlangan yoki umumiy kompyuterda
    /// qolib ketgan token bir sutka davomida ishlayverardi. 3 soat — ish
    /// smenasiga yetadi, lekin qoldirilgan sessiya kechgacha ochiq turmaydi.
    ///
    /// Frontenddagi cookie muddati ham shu qiymatga mos bo'lishi kerak
    /// (`Host.js: TOKEN_TTL_HOURS`), aks holda cookie tirik bo'lgani holda
    /// token o'lik bo'lib, har bir so'rov 401 qaytaradi.
    /// </summary>
    public const int DefaultExpiresHours = 3;

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

        // Noto'g'ri yoki musbat bo'lmagan qiymat sozlamada qolib ketsa —
        // standartga qaytamiz. Aks holda `expires` o'tmishda bo'lib,
        // hech kim tizimga kira olmasdi.
        var expiresHours = int.TryParse(_configuration["Jwt:ExpiresHours"], out var configured)
            && configured > 0
                ? configured
                : DefaultExpiresHours;

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expiresHours),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
