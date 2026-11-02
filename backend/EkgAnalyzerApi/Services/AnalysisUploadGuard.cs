using Microsoft.AspNetCore.Mvc;

namespace EkgAnalyzerApi.Services;

/// <summary>
/// Tahlil yuklash proksi endpointlari (EKG/Holter/SMAD/Lab/tibbiy xulosa)
/// uchun umumiy tekshiruvlar.
/// </summary>
public static class AnalysisUploadGuard
{
    public const string TooLargeMessage = "Fayllar jami hajmi juda katta";

    public const string IdentityMissingMessage =
        "Foydalanuvchining klinikasi yoki shifokor profili aniqlanmadi — tahlil yuklab bo'lmaydi";

    /// <summary>
    /// `clinic_id` va `created_doctor_id` ni JWT egasidan oladi (L-03).
    /// Ilgari ular frontend formasidan o'zgarishsiz Python ga ketardi va
    /// istalgan foydalanuvchi tahlilni boshqa klinika nomidan yarata olardi.
    /// Klinika yoki shifokor profili bo'lmasa <c>null</c> (chaqiruvchi 403 qaytaradi).
    /// </summary>
    public static async Task<IReadOnlyDictionary<string, string>?> GetIdentityOverridesAsync(
        ICurrentUser currentUser, CancellationToken ct = default)
    {
        var clinicId = await currentUser.GetClinicIdAsync(ct);
        var doctorId = await currentUser.GetDoctorIdAsync(ct);
        if (clinicId == null || doctorId == null)
            return null;

        return new Dictionary<string, string>
        {
            ["clinic_id"] = clinicId.Value.ToString(System.Globalization.CultureInfo.InvariantCulture),
            ["created_doctor_id"] = doctorId.Value.ToString(System.Globalization.CultureInfo.InvariantCulture),
        };
    }

    public static ObjectResult IdentityForbidden() =>
        new(new { message = IdentityMissingMessage }) { StatusCode = StatusCodes.Status403Forbidden };

    /// <summary>
    /// So'rov hajmi chegaradan oshganmi (L-21). Kestrel `RequestSizeLimit` dan
    /// oshganda <see cref="BadHttpRequestException"/> (413), multipart
    /// bo'lim chegarasidan oshganda <see cref="InvalidDataException"/> chiqaradi.
    /// Ilgari ikkalasi ham umumiy catch'ga tushib, chalg'ituvchi
    /// "AI xizmati bilan bog'lanib bo'lmadi" (502) qaytarilardi.
    /// </summary>
    public static bool IsRequestTooLarge(Exception ex) => ex switch
    {
        BadHttpRequestException bad => bad.StatusCode == StatusCodes.Status413PayloadTooLarge,
        InvalidDataException data => data.Message.Contains("limit", StringComparison.OrdinalIgnoreCase),
        _ => false,
    };

    public static ObjectResult TooLarge() =>
        new(new { message = TooLargeMessage }) { StatusCode = StatusCodes.Status413PayloadTooLarge };
}
