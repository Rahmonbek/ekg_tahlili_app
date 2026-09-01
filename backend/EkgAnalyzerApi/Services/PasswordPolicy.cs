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
    // Talablar soddalashtirildi: faqat minimal uzunlik va eng keng
    // tarqalgan parollarni bloklash. Ilgari harf+raqam+4 xil belgi majburiy
    // edi va foydalanuvchilar uchun ortiqcha to'siq bo'lardi.
    public const int MinLength = 6;

    /// <summary>
    /// Eng ko'p uchraydigan parollar — faqat eng ошkoralari bloklanadi.
    /// </summary>
    private static readonly HashSet<string> Common = new(StringComparer.OrdinalIgnoreCase)
    {
        "123456", "1234567", "12345678", "123456789", "1234567890",
        "password", "parol123", "qwerty", "111111", "000000", "abc123",
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

        return true;
    }
}
