using System.Text.RegularExpressions;

namespace EkgAnalyzerApi.Helpers;

/// <summary>
/// Bemor ma'lumotlarini kiritish qoidalari — tahlil yuklash sahifalaridagi
/// "Yangi bemor" formasi va ism bo'yicha qidiruv uchun.
/// </summary>
/// <remarks>
/// Barcha matnlar <b>faqat lotin harflarida</b> (loyiha egasining talabi):
/// kirill/rus harflari rad etiladi — aks holda "ISMOILOV" va "ИСМОИЛОВ"
/// ikki xil bemor bo'lib qolardi va qidiruvda topilmasdi.
///
/// Tutuq belgisi klaviaturaga qarab har xil kiritiladi (<c>' ‘ ’ ` ʻ ʼ</c>) —
/// ism maydonlarida hammasi oddiy <c>'</c> ga keltiriladi, shunda
/// "O‘G‘LI" va "O'G'LI" bir xil saqlanadi va bir xil qidiriladi.
/// Frontend dagi mos qoida: <c>tools/latinInput.js</c>.
/// </remarks>
public static class PatientInput
{
    /// <summary>Tutuq belgisining barcha ko'rinishlari.</summary>
    private const string Apostrophes = "'‘’`ʻʼ";

    /// <summary>Ism/familiya/otasining ismi: lotin harflari, bo'shliq, tutuq, defis, nuqta.</summary>
    private static readonly Regex NameRegex = new(@"^[A-Za-z'\-. ]+$", RegexOptions.Compiled);

    /// <summary>Boshqa matnlar (manzil, passport): faqat ASCII + № belgisi.</summary>
    private static readonly Regex LatinTextRegex = new(@"^[\x20-\x7E№]*$", RegexOptions.Compiled);

    /// <summary>Tutuqlarni bitta ko'rinishga keltiradi, ortiqcha bo'shliqlarni olib tashlaydi.</summary>
    public static string NormalizeName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var s = value.Trim();
        foreach (var ch in Apostrophes) s = s.Replace(ch, '\'');
        return Regex.Replace(s, @"\s{2,}", " ").ToUpperInvariant();
    }

    /// <summary>Normallashtirilgan ism lotincha va yaroqlimi.</summary>
    public static bool IsLatinName(string normalized) =>
        normalized.Length > 0 && NameRegex.IsMatch(normalized);

    /// <summary>Ixtiyoriy matn: bo'sh yoki faqat lotin/ASCII belgilar.</summary>
    public static bool IsLatinText(string? value) =>
        string.IsNullOrEmpty(value) || LatinTextRegex.IsMatch(value.Replace('‘', '\'').Replace('’', '\'')
            .Replace('ʻ', '\'').Replace('ʼ', '\''));

    /// <summary>
    /// Qidiruv so'zini SQL <c>ILIKE</c> naqshiga aylantiradi: <c>%</c> va <c>_</c>
    /// ekranlanadi, tutuqlar OLIB TASHLANADI — bazadagi qiymat ham tutuqsiz
    /// solishtiriladi (<see cref="EkgAnalyzerApi.Services.PatcientService.SearchByNameAsync"/>),
    /// shunda "gofurova", "g'ofurova" va "g‘ofurova" bir xil topiladi.
    /// </summary>
    public static string ToLikePattern(string token)
    {
        var escaped = token.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
        foreach (var ch in Apostrophes) escaped = escaped.Replace(ch.ToString(), "");
        return $"%{escaped}%";
    }
}
