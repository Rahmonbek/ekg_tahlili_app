using EkgAnalyzerApi.Services;

namespace EkgAnalyzerApi.Helpers;

/// <summary>
/// Bemorning shaxsini tasdiqlovchi ma'lumotlarini ko'rsatishga tayyorlaydi.
/// </summary>
/// <remarks>
/// <b>Hozirgi siyosat: maskalash O'CHIRILGAN.</b> Loyiha egasining
/// qarori bo'yicha passport barcha ekranlarda va API javoblarida
/// <b>to'liq</b> ko'rsatiladi.
///
/// Maskalash mantig'i o'chirilmadi, faqat <see cref="MaskingEnabled"/>
/// bayrog'i bilan uzib qo'yildi — fikr o'zgarsa, bitta qiymatni
/// <c>true</c> qilish yetarli va u butun tizimda qaytadan ishlaydi.
///
/// <para>
/// <b>Muhim:</b> maskalash hech qachon <b>saqlashga</b> ta'sir qilmagan.
/// Bazada qiymat har doim to'liq turadi; maskalash faqat javob
/// shakllantirilayotganda qo'llanardi. Bu tekshirildi: `patcients.passport`
/// ustunida `AB6377391`, `AC1234567` kabi to'liq qiymatlar turibdi.
/// </para>
///
/// <para>
/// Shifrlash (AES-256) bu yerda ko'rilmaydi va o'zgarishsiz qoladi — u
/// maskalash emas, saqlash darajasidagi himoya va O'z DSt 2814:2014
/// sertifikatsiya talabi (C4).
/// </para>
/// </remarks>
public static class PatientPrivacy
{
    /// <summary>
    /// Passportni maskalash yoqilganmi.
    /// <c>false</c> — loyiha egasining qarori: barcha ma'lumot ochiq.
    /// </summary>
    /// <remarks>
    /// `const` emas, `static readonly`: `const` bo'lganda kompilyator
    /// shartni doimiy deb hisoblab, uni ishlatuvchi har bir joyda
    /// "erishib bo'lmaydigan kod" ogohlantirishini beradi (T-009).
    /// </remarks>
    public static readonly bool MaskingEnabled = false;

    /// <summary>
    /// Passportni ko'rsatishga tayyorlaydi.
    /// </summary>
    /// <remarks>
    /// Bazadagi qiymat shifrlangan bo'lishi ham, bo'lmasligi ham mumkin
    /// (eski yozuvlar ochiq matnda saqlangan). Shuning uchun deshifrlash
    /// urinib ko'riladi va muvaffaqiyatsiz bo'lsa qiymat o'zi ishlatiladi.
    /// </remarks>
    public static string? MaskPassport(EncryptionService encryption, string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return raw;

        var value = raw.Trim();

        // Shifrlangan bo'lsa ochamiz; bo'lmasa qiymat o'zgarishsiz qoladi
        try
        {
            var decrypted = encryption.Decrypt(value);
            if (!string.IsNullOrWhiteSpace(decrypted)) value = decrypted.Trim();
        }
        catch
        {
            // Ochiq matnda saqlangan eski yozuv — qiymat o'zgartirilmaydi
        }

        if (!MaskingEnabled) return value;

        return value.Length >= 4 ? $"** ****{value[^4..]}" : "**";
    }
}
