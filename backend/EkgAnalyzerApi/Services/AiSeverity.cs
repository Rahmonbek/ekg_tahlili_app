using System.Text.Json;

namespace EkgAnalyzerApi.Services;

/// <summary>
/// AI natijasining jiddiylik darajasini (<c>automatic_analysis_bool</c>) xavfsiz o'qish.
///
/// Ilgari bu qiymat SQL darajasida matn qidirish orqali aniqlanardi:
/// <code>
/// AIAnswerData.Contains("\"automatic_analysis_bool\": 1") ? 1 : ...
/// </code>
/// Bu naqsh <c>"automatic_analysis_bool": 13</c> qiymatini ham <b>1 (Normal)</b> deb
/// topardi, chunki <c>13</c> ichida <c>1</c> bor. Ya'ni xavfli natija ro'yxatda
/// yashil "Normal" bo'lib ko'rinishi mumkin edi.
///
/// Endi qiymat JSON sifatida parse qilinadi va faqat aniq 1/2/3 qabul qilinadi.
/// Boshqa har qanday holatda <c>null</c> qaytadi — ya'ni "baholanmadi",
/// hech qachon "normal" emas.
/// </summary>
public static class AiSeverity
{
    private const string FieldName = "automatic_analysis_bool";

    /// <summary>
    /// <c>ai_answer_data</c> JSON matnidan jiddiylik darajasini ajratib oladi.
    /// </summary>
    /// <returns>1, 2, 3 — yoki aniqlab bo'lmasa <c>null</c>.</returns>

    /// <summary>
    /// Matndan BIRINCHI to'liq JSON obyektini o'qiydi.
    /// </summary>
    /// <remarks>
    /// <c>JsonDocument.Parse</c> butun matn bitta JSON qiymati bo'lishini
    /// talab qiladi va ortiqcha ma'lumot bo'lsa istisno beradi. Bazada
    /// esa ikkita obyekt ketma-ket yozilgan yozuvlar bor (masalan
    /// <c>ecg_analyses#92</c>) — ular eski kod tomonidan qoldirilgan.
    ///
    /// Bunday yozuvni butunlay "o'qib bo'lmadi" deb hisoblash yomon
    /// oqibatga olib kelardi: ro'yxat filtri (matn qidiruvi) uni topardi,
    /// ko'rsatish esa "Baholanmadi" deb chizardi — ya'ni "O'rtacha"
    /// filtrida "Baholanmadi" qator chiqardi.
    ///
    /// `Utf8JsonReader` birinchi qiymat tugagach to'xtaydi, shuning uchun
    /// ortiqcha ma'lumot xalaqit bermaydi.
    /// </remarks>
    private static JsonDocument? TryParseFirstObject(string text)
    {
        try
        {
            return JsonDocument.Parse(text);
        }
        catch (JsonException)
        {
            // Ortiqcha ma'lumot bo'lishi mumkin — birinchi qiymatni o'qiymiz
        }

        try
        {
            var bytes = System.Text.Encoding.UTF8.GetBytes(text);
            var reader = new Utf8JsonReader(bytes, isFinalBlock: true, state: default);
            return JsonDocument.TryParseValue(ref reader, out var doc) ? doc : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    public static int? Parse(string? aiAnswerData)
    {
        if (string.IsNullOrWhiteSpace(aiAnswerData)) return null;

        try
        {
            using var doc = TryParseFirstObject(aiAnswerData);
            if (doc == null) return null;
            if (doc.RootElement.ValueKind != JsonValueKind.Object) return null;
            if (!doc.RootElement.TryGetProperty(FieldName, out var prop)) return null;

            int? value = prop.ValueKind switch
            {
                JsonValueKind.Number when prop.TryGetInt32(out var n) => n,
                // AI ba'zan raqamni satr sifatida qaytaradi: "2"
                JsonValueKind.String when int.TryParse(prop.GetString()?.Trim(), out var s) => s,
                _ => null
            };

            return value is 1 or 2 or 3 ? value : null;
        }
        catch (JsonException)
        {
            // Yaroqsiz JSON (masalan eski yozuvlardagi xom xatolik matni) — baholanmadi
            return null;
        }
    }

    /// <summary>
    /// Ro'yxat filtri uchun: yozuv berilgan jiddiylik darajasiga mos keladimi?
    /// Filtrlash xotirada bajariladi, chunki SQL matn qidiruvi ishonchsiz.
    /// </summary>
    public static bool Matches(string? aiAnswerData, int expected) =>
        Parse(aiAnswerData) == expected;

    /// <summary>
    /// Ro'yxat filtri uchun SQL naqshlari.
    ///
    /// Nima uchun bu yerda: ilgari har bir servisda to'rtta
    /// <c>Contains</c> qo'lda yozilardi va ularning hech biri qiymat
    /// tugaganini tekshirmasdi:
    /// <code>
    /// AIAnswerData.Contains("\"automatic_analysis_bool\": 1")
    /// </code>
    /// Bu naqsh <c>"automatic_analysis_bool": 13</c> ni ham topardi —
    /// ya'ni "Normal" filtri xavfli natijani ham qaytarishi mumkin edi.
    /// Ko'rsatishda <see cref="Parse"/> ishlatilgani uchun bunday yozuv
    /// ro'yxatda **boshqa** rang bilan chiqardi: filtr "Normal" desa ham,
    /// qator qizil bo'lardi.
    ///
    /// Endi naqsh qiymatdan keyingi ajratuvchini ham talab qiladi
    /// (<c>,</c> yoki <c>}</c>), ya'ni qiymat aynan tugagan bo'lishi shart.
    ///
    /// Sakkizta variant: bo'shliqli/bo'shliqsiz × tirnoqli/tirnoqsiz ×
    /// vergul/qavs. AI ba'zan raqamni satr sifatida qaytaradi ("2"), JSON
    /// esa turli kutubxonalarda turlicha bo'shliq bilan yoziladi.
    /// </summary>
    public static string[] FilterPatterns(int level)
    {
        var patterns = new List<string>(8);
        foreach (var separator in new[] { "\": ", "\":" })
        {
            foreach (var value in new[] { level.ToString(), $"\"{level}\"" })
            {
                foreach (var terminator in new[] { ",", "}" })
                {
                    patterns.Add($"\"{FieldName}{separator}{value}{terminator}");
                }
            }
        }
        return patterns.ToArray();
    }

    /// <summary>Ro'yxatda ko'rsatish uchun AI xulosasining qisqa ko'rinishi.</summary>
    /// <remarks>
    /// Ro'yxatda shifokor har bir tahlilni ochmasdan turib nima
    /// topilganini bilishi kerak. To'liq xulosa bir necha ming belgi
    /// bo'lishi mumkin, shuning uchun u qisqartiriladi.
    ///
    /// Manba tartibi muhim: avval `automatic_analysis` (aniqlangan
    /// patologiya), keyin `final_summary` (umumiy baho). Tavsiya
    /// (`AI_recommendations`) ATAYIN olinmaydi — u "shifokorga murojaat
    /// qiling" kabi umumiy matn bilan boshlanadi va ro'yxatdagi barcha
    /// qatorlar bir xil ko'rinib qolardi.
    /// </remarks>
    public static string? Summarize(string? aiAnswerData, int maxLength = 160)
    {
        if (string.IsNullOrWhiteSpace(aiAnswerData)) return null;

        try
        {
            using var doc = TryParseFirstObject(aiAnswerData);
            if (doc == null) return null;
            if (doc.RootElement.ValueKind != JsonValueKind.Object) return null;

            foreach (var field in new[] { "automatic_analysis", "final_summary" })
            {
                if (!doc.RootElement.TryGetProperty(field, out var prop)) continue;
                if (prop.ValueKind != JsonValueKind.String) continue;

                var text = prop.GetString()?.Trim();
                if (string.IsNullOrWhiteSpace(text)) continue;

                // Ko'p qatorli matn ro'yxat qatorini buzadi
                text = System.Text.RegularExpressions.Regex.Replace(text, @"\s+", " ");

                return text.Length <= maxLength
                    ? text
                    : text[..maxLength].TrimEnd() + "…";
            }

            return null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>
    /// Xatolik bilan tugagan tahlil uchun foydalanuvchiga ko'rsatiladigan sabab.
    /// </summary>
    /// <remarks>
    /// Ilgari ro'yxatda faqat qizil "Xatolik" chipi turardi va shifokor
    /// nima bo'lganini — fayl yaroqsizmi yoki xizmat ishlamayaptimi —
    /// bilmasdi. `ai_errors.to_ai_answer` yozgan tarjima qilingan xabar
    /// shu yerda o'qiladi.
    /// </remarks>
    public static string? ExtractErrorMessage(string? aiAnswerData)
    {
        if (string.IsNullOrWhiteSpace(aiAnswerData)) return null;

        try
        {
            using var doc = TryParseFirstObject(aiAnswerData);
            if (doc == null) return null;
            if (doc.RootElement.ValueKind != JsonValueKind.Object) return null;

            foreach (var field in new[] { "xabar", "message", "xato_sababi", "detail" })
            {
                if (doc.RootElement.TryGetProperty(field, out var prop)
                    && prop.ValueKind == JsonValueKind.String)
                {
                    var text = prop.GetString()?.Trim();
                    if (!string.IsNullOrWhiteSpace(text)) return text;
                }
            }

            return null;
        }
        catch (JsonException)
        {
            // Eski yozuvlarda bu ustunda xom istisno matni bo'lishi mumkin.
            // Uni foydalanuvchiga KO'RSATMAYMIZ: u API kalitining prefiksini
            // yoki ichki stek izini o'z ichiga olishi mumkin.
            return null;
        }
    }
}

/// <summary>
/// AI aniqlagan jiddiylik darajasi.
///
/// Maydon nomi <c>automatic_analysis_bool</c> — "bool" so'zi chalg'ituvchi,
/// bu mantiqiy qiymat emas, uch darajali shkala. Nom tarixiy sabablarga
/// ko'ra saqlanadi (u AI javobida, bazadagi minglab yozuvlarda va
/// frontendda ishlatiladi), lekin uning MA'NOSI shu yerda qat'iy
/// belgilangan.
/// </summary>
public enum SeverityLevel
{
    /// <summary>Normal — patologiya aniqlanmadi (yashil).</summary>
    Normal = 1,

    /// <summary>E'tibor talab qiladi — reja bo'yicha shifokor ko'rigi (sariq).</summary>
    Attention = 2,

    /// <summary>Shoshilinch — tezkor tibbiy baholash zarur (qizil).</summary>
    Critical = 3,
}
