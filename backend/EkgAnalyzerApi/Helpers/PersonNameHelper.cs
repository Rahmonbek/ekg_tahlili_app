namespace EkgAnalyzerApi.Helpers;

/// <summary>
/// Ekranga va eksport fayllariga chiqadigan ism-familiyani bir joydan
/// shakllantiradi.
/// </summary>
/// <remarks>
/// Platformada foydalanuvchi ma'lumotlari <b>faqat familiya va ism</b> bilan
/// ko'rsatiladi — sharif (otasining ismi) chiqarilmaydi. U bazada saqlanadi,
/// formalarda tahrirlanadi va qidiruvda qatnashadi, faqat ko'rsatilmaydi:
/// jadval qatorlari qisqaradi va boshqa ustunlarga joy chiqadi.
///
/// Ilgari bu mantiq kod bo'ylab tarqoq edi va tartibi ham har xil edi:
/// bir joyda <c>FirstName LastName</c>, boshqa joyda <c>LastName FirstName
/// SureName</c>. Endi bitta manba.
/// </remarks>
public static class PersonNameHelper
{
    /// <summary>Familiya va ism — sharifsiz.</summary>
    public static string Display(string? lastName, string? firstName)
    {
        var parts = new[] { lastName?.Trim(), firstName?.Trim() }
            .Where(p => !string.IsNullOrEmpty(p));
        return string.Join(" ", parts);
    }
}
