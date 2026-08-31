namespace EkgAnalyzerApi.Services;

/// <summary>
/// Vaqt mintaqasi bilan ishlash uchun markazlashtirilgan yordamchi.
///
/// Nima uchun kerak: "bugungi tahlillar" kabi hisoblar <c>DateTime.UtcNow.Date</c>
/// asosida qilinardi. O'zbekiston UTC+5 bo'lgani uchun mahalliy vaqt bilan
/// 00:00–05:00 oralig'ida yaratilgan tahlillar "kechagi kun"ga tushib qolardi.
/// Tungi smenada ishlaydigan klinikalar uchun bu har kuni takrorlanadigan xato edi.
/// </summary>
public static class AppTime
{
    /// <summary>Klinika ishlaydigan vaqt mintaqasi (konfiguratsiyadan o'qiladi).</summary>
    public const string DefaultTimeZoneId = "Asia/Tashkent";

    private static TimeZoneInfo? _cached;
    private static string? _cachedId;

    public static TimeZoneInfo GetTimeZone(IConfiguration? config = null)
    {
        var id = config?["App:TimeZone"] ?? DefaultTimeZoneId;
        if (_cached != null && _cachedId == id) return _cached;

        TimeZoneInfo tz;
        try
        {
            tz = TimeZoneInfo.FindSystemTimeZoneById(id);
        }
        catch (Exception)
        {
            // Windows va Linux da mintaqa ID lari har xil bo'lishi mumkin
            try { tz = TimeZoneInfo.FindSystemTimeZoneById("Uzbekistan Standard Time"); }
            catch (Exception) { tz = TimeZoneInfo.CreateCustomTimeZone("UZT", TimeSpan.FromHours(5), "UZT", "UZT"); }
        }

        _cached = tz;
        _cachedId = id;
        return tz;
    }

    /// <summary>Joriy mahalliy vaqt (klinika mintaqasida).</summary>
    public static DateTime LocalNow(IConfiguration? config = null) =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, GetTimeZone(config));

    /// <summary>
    /// Bazadagi UTC vaqtni klinika mintaqasidagi vaqtga o'giradi.
    /// </summary>
    /// <remarks>
    /// Ko'rsatish uchun mo'ljallangan: hisobot va ekranda foydalanuvchi
    /// o'z mintaqasidagi vaqtni ko'rishi kerak. Ilgari PDF hisobot
    /// bazadagi UTC qiymatni to'g'ridan-to'g'ri chizardi va ekrandagi
    /// vaqtdan besh soat farq qilardi (T-089).
    ///
    /// `Kind` aniqlanmagan qiymatlar UTC deb qabul qilinadi — bazadagi
    /// ustunlar shunday saqlanadi.
    /// </remarks>
    public static DateTime ToLocal(DateTime utc, IConfiguration? config = null)
    {
        if (utc.Kind == DateTimeKind.Local) return utc;
        var asUtc = DateTime.SpecifyKind(utc, DateTimeKind.Utc);
        return TimeZoneInfo.ConvertTimeFromUtc(asUtc, GetTimeZone(config));
    }

    /// <inheritdoc cref="ToLocal(DateTime, IConfiguration?)"/>
    public static DateTime? ToLocal(DateTime? utc, IConfiguration? config = null) =>
        utc.HasValue ? ToLocal(utc.Value, config) : null;

    /// <summary>
    /// Mahalliy kunning boshlanish va tugash chegaralari — UTC da qaytariladi,
    /// chunki bazadagi ustunlar UTC saqlaydi.
    /// </summary>
    public static (DateTime FromUtc, DateTime ToUtc) LocalDayBoundsUtc(
        IConfiguration? config = null,
        DateTime? localDate = null)
    {
        var tz = GetTimeZone(config);
        var day = (localDate ?? LocalNow(config)).Date;
        var fromUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(day, DateTimeKind.Unspecified), tz);
        var toUtc = fromUtc.AddDays(1);
        return (fromUtc, toUtc);
    }

    /// <summary>
    /// Foydalanuvchi tanlagan mahalliy sanani UTC oralig'iga o'giradi.
    /// Filtrlarda ishlatiladi: "1-avgust" tanlansa, mahalliy 1-avgust 00:00 dan
    /// 2-avgust 00:00 gacha bo'lgan UTC oralig'i qaytariladi.
    /// </summary>
    public static DateTime ToUtcFromLocalDate(DateTime localDate, IConfiguration? config = null)
    {
        var tz = GetTimeZone(config);
        return TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(localDate.Date, DateTimeKind.Unspecified), tz);
    }
}
