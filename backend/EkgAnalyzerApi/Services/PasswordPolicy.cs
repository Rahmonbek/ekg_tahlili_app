namespace EkgAnalyzerApi.Services;

/// <summary>
/// Parolga qo'yiladigan minimal talablar (T-022).
/// </summary>
/// <remarks>
/// Auditda bazadagi mavjud xodimlarning parollari topildi: <c>1</c>,
/// <c>1</c>, <c>1</c>, <c>1</c>, <c>12345678</c>. Ya'ni bir belgili parol
/// qabul qilinardi va tizimda hech qanday talab yo'q edi.
///
/// <c>1</c> paroli bilan akkauntni topish uchun brute-force ham kerak
/// emas — bu klinikaning barcha bemor ma'lumotlariga ochiq eshik.
///
/// Talablar ataylab kamtarona: 8 belgi, harf va raqam. Maxsus belgi
/// majburiy qilinmadi — u parolni sezilarli kuchaytirmaydi, lekin
/// foydalanuvchini qog'ozga yozib qo'yishga undaydi. Uzunlik esa
/// kuchaytiradi, shuning uchun 12 belgidan uzun parol uchun raqam
/// talabi bekor qilinadi (parol iborasi).
/// </remarks>
public static class PasswordPolicy
{
    public const int MinLength = 8;

    /// <summary>Shu uzunlikdan boshlab parol iborasi deb hisoblanadi.</summary>
    private const int PassphraseLength = 12;

    /// <summary>
    /// Eng ko'p uchraydigan parollar. To'liq ro'yxat emas — bu yerda
    /// faqat aynan shu loyihada va mintaqada real uchraganlari hamda
    /// klaviatura ketma-ketliklari.
    /// </summary>
    private static readonly HashSet<string> Common = new(StringComparer.OrdinalIgnoreCase)
    {
        "12345678", "123456789", "1234567890", "password", "parol123",
        "qwertyui", "qwerty123", "11111111", "00000000", "87654321",
        "admin123", "adminadmin", "doctor123", "nmed1234", "nmedadmin",
        "iloveyou", "welcome1", "abc12345", "1q2w3e4r", "zxcvbnm1",
    };

    /// <summary>
    /// Parol talablarga javob beradimi?
    /// </summary>
    /// <param name="password">Tekshiriladigan parol.</param>
    /// <param name="error">Mos kelmasa — foydalanuvchiga ko'rsatiladigan sabab.</param>
    public static bool IsValid(string? password, out string error)
    {
        error = "";

        if (string.IsNullOrWhiteSpace(password))
        {
            error = "Parol kiritilmagan.";
            return false;
        }

        if (password.Length < MinLength)
        {
            error = $"Parol kamida {MinLength} ta belgidan iborat bo'lishi kerak.";
            return false;
        }

        if (Common.Contains(password))
        {
            error = "Bu parol juda ko'p ishlatiladi. Boshqasini tanlang.";
            return false;
        }

        var hasLetter = password.Any(char.IsLetter);
        if (!hasLetter)
        {
            error = "Parolda kamida bitta harf bo'lishi kerak.";
            return false;
        }

        // Uzun parol iborasi raqamsiz ham yetarli darajada kuchli
        if (password.Length < PassphraseLength && !password.Any(char.IsDigit))
        {
            error = "Parolda kamida bitta raqam bo'lishi kerak "
                  + $"(yoki parolni {PassphraseLength} belgidan uzun qiling).";
            return false;
        }

        // "aaaaaaaa" kabi bir xil belgidan iborat parol uzunlik shartini
        // qanoatlantiradi, lekin amalda himoya bermaydi
        if (password.Distinct().Count() < 4)
        {
            error = "Parolda kamida 4 xil belgi bo'lishi kerak.";
            return false;
        }

        return true;
    }
}
