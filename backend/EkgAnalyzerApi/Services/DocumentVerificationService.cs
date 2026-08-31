using System.Security.Cryptography;
using System.Text;

namespace EkgAnalyzerApi.Services;

/// <summary>
/// Hujjat haqiqiyligini tasdiqlash (QR kod) uchun token generatsiyasi.
///
/// Nima uchun kerak: ilgari verifikatsiya manzili <c>/verify/ecg/96</c> ko'rinishida,
/// ya'ni <b>ketma-ket ID</b> bilan edi va autentifikatsiya talab qilmasdi.
/// Hujjatni qo'lga kiritgan har kim ID ni oshirib borib, platformadagi barcha
/// bemorlarning ism-shariflari va tibbiy xulosalarini yig'ib olishi mumkin edi.
///
/// Endi manzil <c>/verify/{token}</c> ko'rinishida. Token — hujjat turi va ID sidan
/// HMAC-SHA256 orqali hosil qilinadi, shuning uchun:
///   • taxmin qilib bo'lmaydi (kalitni bilmasdan),
///   • bazada saqlash shart emas (migratsiya kerak emas),
///   • bir xil hujjat uchun har doim bir xil bo'ladi (QR qayta chop etilsa ham ishlaydi).
/// </summary>
public class DocumentVerificationService
{
    private readonly byte[] _key;

    public DocumentVerificationService(IConfiguration configuration)
    {
        // Alohida kalit bo'lmasa JWT kalitidan foydalanamiz — ikkalasi ham maxfiy.
        var secret = configuration["Verification:Key"]
                     ?? configuration["Jwt:Key"]
                     ?? throw new InvalidOperationException(
                         "Verification:Key yoki Jwt:Key sozlanmagan — verifikatsiya tokenlarini yaratib bo'lmaydi.");
        _key = Encoding.UTF8.GetBytes(secret);
    }

    /// <summary>Hujjat uchun verifikatsiya tokenini hosil qiladi.</summary>
    /// <param name="type">Hujjat turi: <c>ecg</c>, <c>smad</c>, <c>holter</c>, <c>lab</c>, <c>parasitology</c>, <c>consultation</c>.</param>
    public string CreateToken(string type, int id)
    {
        var payload = $"{Normalize(type)}:{id}";
        using var hmac = new HMACSHA256(_key);
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));

        // 16 bayt (128 bit) — taxmin qilish amalda imkonsiz, URL ixcham bo'ladi
        var token = Base64UrlEncode(hash.AsSpan(0, 16).ToArray());
        return $"{Normalize(type)}{id}-{token}";
    }

    /// <summary>
    /// Tokenni tekshiradi va undan hujjat turi hamda ID sini ajratib oladi.
    /// Token yaroqsiz bo'lsa <c>false</c> qaytaradi.
    /// </summary>
    public bool TryParseToken(string? token, out string type, out int id)
    {
        type = string.Empty;
        id = 0;

        if (string.IsNullOrWhiteSpace(token)) return false;

        var dash = token.IndexOf('-');
        if (dash <= 0) return false;

        var prefix = token[..dash];

        // Prefiksdan tur va ID ni ajratamiz: "ecg96" -> ("ecg", 96)
        var digitStart = prefix.Length;
        while (digitStart > 0 && char.IsDigit(prefix[digitStart - 1])) digitStart--;
        if (digitStart == 0 || digitStart == prefix.Length) return false;

        var parsedType = prefix[..digitStart];
        if (!int.TryParse(prefix[digitStart..], out var parsedId) || parsedId <= 0) return false;

        // Kutilgan tokenni qayta hisoblab, doimiy vaqtda solishtiramiz
        var expected = CreateToken(parsedType, parsedId);
        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(token)))
            return false;

        type = parsedType;
        id = parsedId;
        return true;
    }

    /// <summary>
    /// To'liq ism-sharifni bosh harflarga aylantiradi: "ISMOILOV RAHMONJON ZOHID O'G'LI" → "I. R. Z."
    /// Verifikatsiya javobida to'liq ism ko'rsatilmaydi — hujjat haqiqiyligini
    /// tasdiqlash uchun bosh harflar yetarli.
    /// </summary>
    public static string ToInitials(string? fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName)) return string.Empty;
        var parts = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return string.Join(" ", parts.Take(3).Select(p => char.ToUpperInvariant(p[0]) + "."));
    }

    private static string Normalize(string type) =>
        (type ?? string.Empty).Trim().ToLowerInvariant();

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
