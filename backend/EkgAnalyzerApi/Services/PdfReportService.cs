using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using iTextSharp.text;
using iTextSharp.text.pdf;
using Microsoft.EntityFrameworkCore;
using QRCoder;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using EkgAnalyzerApi.Helpers;

namespace EkgAnalyzerApi.Services;

/// <summary>
/// NMED — klinik PDF hujjat generatori (v2).
/// iTextSharp.LGPLv2.Core · A4 · 18/12 mm chegaralar
/// Rang palitasi: #1D9E75 (NMED yashil) · #2C3E6B (to'q ko'k)
/// Imzo/muhr yo'q — NMED raqamli tasdiqlash bloki ishlatiladi.
/// </summary>
public partial class PdfReportService
{
    private readonly MedDataDB          _context;
    private readonly EncryptionService  _encryption;
    private readonly DocumentVerificationService _verification;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;
    private readonly IFileStorage _storage;
    private readonly ILogger<PdfReportService> _logger;
    private readonly ICurrentUser _currentUser;

    // Joriy hujjat yozuvchisi — sahifada qancha joy qolganini bilish uchun
    // (bo'lim sarlavhasi sahifa oxirida yolg'iz qolmasligi kerak).
    // Servis har so'rov uchun alohida (scoped), shuning uchun maydon xavfsiz.
    private PdfWriter? _writer;

    // Sarlavha ostida kamida shuncha joy (pt) bo'lmasa, bo'lim yangi sahifadan boshlanadi
    private const float MinSpaceAfterHeader = 110f;

    // Hujjatdagi eng kichik yozuv o'lchami — bundan past shrift ishlatilmaydi.
    private const float MinFontSize = 12f;

    // Kolontitul (footer) yozuvi — "NMED | nmed.uz", hujjat raqami va sahifa
    // raqami. U 12 pt umumiy chegaradan ATAYIN kichikroq (10 pt): footer
    // yordamchi ma'lumot bo'lib, asosiy matndan ajralib turishi kerak
    // (foydalanuvchi so'rovi).
    private const float FooterFontSize = 10f;

    // ── Sahifa geometriyasi (mm → pt: 1 mm = 2.8346 pt) ────────────────
    private const float MrgSide   = 51.02f;  // 18 mm
    private const float MrgTop    = 34.02f;  // 12 mm
    private const float MrgBottom = 34.02f;  // 12 mm

    // ── NMED rang palitasi ───────────────────────────────────────────────
    // Tibbiy hujjat uslubi: asosiy rang — to'q ko'k (sarlavha, chiziqlar),
    // NMED yashili faqat urg'u sifatida (AI bo'limi, tasdiqlash bloki).
    // To'liq bo'yalgan rangli polosalar ishlatilmaydi — ular hujjatni
    // "reklama varaqasi"ga o'xshatib qo'yardi.
    private static readonly BaseColor CL_Green       = new( 22, 138, 104); // #168A68 — NMED (bosma uchun to'qroq)
    private static readonly BaseColor CL_DarkBlue    = new( 31,  58,  95); // #1F3A5F — tibbiy to'q ko'k
    private static readonly BaseColor CL_Black       = new( 26,  31,  41); // #1A1F29
    private static readonly BaseColor CL_Gray        = new( 91, 100, 114); // #5B6472
    private static readonly BaseColor CL_LightGray   = new(138, 147, 160); // #8A93A0
    private static readonly BaseColor CL_Border      = new(217, 223, 231); // #D9DFE7
    private static readonly BaseColor CL_RowAlt      = new(248, 250, 252); // #F8FAFC
    private static readonly BaseColor CL_White       = new(255, 255, 255);
    private static readonly BaseColor CL_AiBg        = new(243, 248, 246); // #F3F8F6
    private static readonly BaseColor CL_DisclBg     = new(255, 248, 235); // #FFF8EB
    private static readonly BaseColor CL_DisclBorder = new(217, 154,  30); // #D99A1E
    private static readonly BaseColor CL_DisclText   = new(122,  78,   0); // #7A4E00
    private static readonly BaseColor CL_WarnText    = new(181,  71,   8); // #B54708
    private static readonly BaseColor CL_GoodText    = new(  6, 118,  71); // #067647
    private static readonly BaseColor CL_BadText     = new(180,  35,  24); // #B42318
    private static readonly BaseColor CL_HrvCardBg   = new(248, 250, 252); // #F8FAFC
    private static readonly BaseColor CL_VerifyBg    = new(255, 255, 255);
    private static readonly BaseColor CL_HeadBg      = new(238, 242, 247); // #EEF2F7 — jadval sarlavhasi
    private static readonly BaseColor CL_PanelBg     = new(247, 249, 251); // #F7F9FB — ma'lumot paneli
    private static readonly BaseColor CL_TitleBg     = new(236, 242, 248); // #ECF2F8 — hujjat nomi paneli

    public PdfReportService(
        MedDataDB context,
        EncryptionService encryption,
        DocumentVerificationService verification,
        IWebHostEnvironment env,
        IConfiguration config,
        IFileStorage storage,
        ILogger<PdfReportService> logger,
        ICurrentUser currentUser)
    {
        _currentUser = currentUser;
        _context    = context;
        _encryption = encryption;
        _verification = verification;
        _env        = env;
        _config     = config;
        _storage    = storage;
        _logger     = logger;
    }

    // ════════════════════════════════════════════════════════════════════
    //  PUBLIC ENTRY POINTS
    // ════════════════════════════════════════════════════════════════════

    public async Task<byte[]> GenerateEcgReport(int id, string lang)
    {
        var tr  = PdfTranslations.Get(lang);
        var row = await _context.ECGAnalyse
            .Include(e => e.Patcient)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicDetail).ThenInclude(d => d!.District).ThenInclude(d => d!.Region)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicPhoneNumber)
            .Include(e => e.CreatedDoctor)
            .Include(e => e.Doctors).ThenInclude(d => d.Doctor)
            .Include(e => e.Complaints).ThenInclude(c => c.Complaint)
            .FirstOrDefaultAsync(e => e.Id == id)
            ?? throw new KeyNotFoundException($"EKG #{id}");

        var docNum = row.DocumentNumber ?? DocNum("EKG", row.CreatedAt, id);
        var aiData = ParseAi(row.AIAnswerData);

        return Build(tr, docNum, row.CreatedAt, row.Clinic, row.Patcient,
            tr["ecg_title"], row.AnalysisDate,
            GetAnalysisTypeName(tr, "ecg"),
            row.CreatedDoctor,
            DoctorNames(row.Doctors?.Select(d => d.Doctor).ToList()),
            ComplaintNames(row.Complaints),
            "ecg", id,
            doc =>
            {
                AddEcgTable(doc, tr, aiData);
                AddAiBlock(doc, tr, aiData);
            },
            doc =>
            {
                AddEcgImage(doc, tr, row.GeneratedFileLink);
            });
    }

    public async Task<byte[]> GenerateSmadReport(int id, string lang)
    {
        var tr  = PdfTranslations.Get(lang);
        var row = await _context.SmadAnalyses
            .Include(e => e.Patcient)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicDetail).ThenInclude(d => d!.District).ThenInclude(d => d!.Region)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicPhoneNumber)
            .Include(e => e.CreatedDoctor)
            .Include(e => e.Doctors).ThenInclude(d => d.Doctor)
            .FirstOrDefaultAsync(e => e.Id == id)
            ?? throw new KeyNotFoundException($"SMAD #{id}");

        var docNum = row.DocumentNumber ?? DocNum("SMAD", row.CreatedAt, id);
        var aiData = ParseAi(row.AIAnswerData);

        return Build(tr, docNum, row.CreatedAt, row.Clinic, row.Patcient,
            tr["smad_title"], row.AnalysisDate,
            GetAnalysisTypeName(tr, "smad"),
            row.CreatedDoctor,
            DoctorNames(row.Doctors?.Select(d => d.Doctor).ToList()),
            null,
            "smad", id,
            doc =>
            {
                AddSmadTable(doc, tr, aiData);
                AddAiBlock(doc, tr, aiData);
            });
    }

    public async Task<byte[]> GenerateHolterReport(int id, string lang)
    {
        var tr  = PdfTranslations.Get(lang);
        var row = await _context.HolterAnalyses
            .Include(e => e.Patcient)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicDetail).ThenInclude(d => d!.District).ThenInclude(d => d!.Region)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicPhoneNumber)
            .Include(e => e.CreatedDoctor)
            .Include(e => e.Doctors).ThenInclude(d => d.Doctor)
            .FirstOrDefaultAsync(e => e.Id == id)
            ?? throw new KeyNotFoundException($"Holter #{id}");

        var docNum = row.DocumentNumber ?? DocNum("HOL", row.CreatedAt, id);
        var aiData = ParseAi(row.AIAnswerData);

        return Build(tr, docNum, row.CreatedAt, row.Clinic, row.Patcient,
            tr["holter_title"], row.AnalysisDate,
            GetAnalysisTypeName(tr, "holter"),
            row.CreatedDoctor,
            DoctorNames(row.Doctors?.Select(d => d.Doctor).ToList()),
            null,
            "holter", id,
            doc =>
            {
                AddHolterResults(doc, tr, aiData);
                AddAiBlock(doc, tr, aiData);
            });
    }

    public async Task<byte[]> GenerateLabReport(int id, string lang)
    {
        var tr  = PdfTranslations.Get(lang);
        var row = await WithLabValues(_context.LabAnalyse)
            .Include(e => e.Patcient)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicDetail).ThenInclude(d => d!.District).ThenInclude(d => d!.Region)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicPhoneNumber)
            .Include(e => e.CreatedDoctor)
            .Include(e => e.Doctors).ThenInclude(d => d.Doctor)
            .FirstOrDefaultAsync(e => e.Id == id)
            ?? throw new KeyNotFoundException($"Lab #{id}");

        var docNum = row.DocumentNumber ?? DocNum("LAB", row.CreatedAt, id);
        var aiData = ParseAi(row.AIAnswerData);

        return Build(tr, docNum, row.CreatedAt, row.Clinic, row.Patcient,
            tr["lab_title"], row.AnalysisDate,
            GetAnalysisTypeName(tr, "lab"),
            row.CreatedDoctor,
            DoctorNames(row.Doctors?.Select(d => d.Doctor).ToList()),
            null,
            "lab", id,
            doc =>
            {
                AddLabTable(doc, tr, row);
                AddAiBlock(doc, tr, aiData);
            });
    }

    public async Task<byte[]> GenerateParasitologyReport(int id, string lang)
    {
        var tr  = PdfTranslations.Get(lang);
        var row = await _context.ParasitologyAnalyses
            .Include(e => e.Patcient)
            .Include(e => e.Clinic!).ThenInclude(c => c.ClinicDetail!).ThenInclude(d => d!.District).ThenInclude(d => d!.Region)
            .Include(e => e.Clinic!).ThenInclude(c => c.ClinicPhoneNumber!)
            .Include(e => e.CreatedDoctor)
            .Include(e => e.Doctors).ThenInclude(d => d.Doctor)
            .Include(e => e.Results)
            .FirstOrDefaultAsync(e => e.Id == id)
            ?? throw new KeyNotFoundException($"Parazitologiya #{id}");

        var docNum = row.DocumentNumber ?? DocNum("PARA", row.CreatedAt, id);

        return Build(tr, docNum, row.CreatedAt, row.Clinic, row.Patcient,
            tr["parasitology_title"], row.AnalysisDate,
            GetAnalysisTypeName(tr, "para"),
            row.CreatedDoctor,
            DoctorNames(row.Doctors?.Select(d => d.Doctor).ToList()),
            null,
            "para", id,
             doc =>
             {
                 AddParaResults(doc, tr, row, lang);
                 AddParaAiBlock(doc, tr, row, lang);
             });
     }

    /// <summary>
    /// Kompleks (ko'p tahlilli) AI xulosasi uchun PDF.
    ///
    /// <see cref="GenerateCombinedReport"/> dan farqi: u BEMORNING barcha
    /// tahlillarini bitta hujjatga yig'adi, bu esa AI tanlangan tahlillarni
    /// birgalikda ko'rib chiqib chiqargan YAGONA xulosani chop etadi.
    /// </summary>
    public async Task<byte[]> GenerateCombinedAiReport(int combinedId, string lang)
    {
        var tr = PdfTranslations.Get(lang);

        var row = await _context.CombinedAnalyses
            .Include(c => c.Items)
            .Include(c => c.Patient)
            .Include(c => c.CreatedDoctor)
            .FirstOrDefaultAsync(c => c.Id == combinedId)
            ?? throw new KeyNotFoundException($"Kompleks xulosa #{combinedId}");

        if (row.Patient == null)
            throw new KeyNotFoundException($"Kompleks xulosa #{combinedId} bemori topilmadi");

        // Klinika — so'rovni yuborgan xodimning klinikasi (blank sarlavhasi uchun)
        var clinic = await _context.Clinics
            .Include(c => c.ClinicDetail).ThenInclude(d => d!.District).ThenInclude(d => d!.Region)
            .Include(c => c.ClinicPhoneNumber)
            .FirstOrDefaultAsync(c => c.Id == row.ClinicId);

        var docNum = DocNum("KAI", row.CreatedAt, combinedId);
        var result = ParseCombinedAi(row.AIAnswerData);

        // Shifokor xulosalari (`analysis_diagnoses`, `analysis_type = "combined"`)
        // `Build` ichidagi umumiy "SHIFOKOR TASHXISI" bo'limida chiqadi.
        // Ilgari ular bu yerda alohida ham chizilardi va hujjatda bir xil
        // matn ikki marta turardi.
        return Build(tr, docNum, row.CreatedAt, clinic, row.Patient,
            tr["combined_ai_title"], row.CreatedAt,
            tr["combined_ai_type"],
            row.CreatedDoctor,
            null,
            null,
            "combined", combinedId,
            doc =>
            {
                AddCombinedSources(doc, tr, row.Items);
                AddCombinedAiBlock(doc, tr, result);
            },
            showResultsHeader: false,
            showTreatingDoctors: false);
    }

    /// <summary>Kompleks xulosaning JSON javobini o'qiydi (sxemasi boshqacha).</summary>
    private static JsonElement? ParseCombinedAi(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var d = JsonDocument.Parse(json);
            return d.RootElement.Clone();
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>JSON dan satr maydonini xavfsiz o'qiydi.</summary>
    private static string? CombinedStr(JsonElement? root, string name) =>
        root is { } r && r.ValueKind == JsonValueKind.Object
            && r.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String
                ? v.GetString()
                : null;

    /// <summary>Xulosaga kirgan tahlillar ro'yxati.</summary>
    private void AddCombinedSources(Document doc, Dictionary<string, string> tr,
        List<CombinedAnalysisItem> items)
    {
        var fonts = BuildFonts();
        ComposeSectionHeader(doc, fonts, tr["combined_sources"], CL_DarkBlue);

        var table = new PdfPTable(3) { WidthPercentage = 100, SpacingBefore = 4, SpacingAfter = 4 };
        table.SetWidths(new[] { 8f, 64f, 28f });

        var n = 0;
        foreach (var item in items.OrderBy(i => i.SnapshotDate))
        {
            var bg = n % 2 == 0 ? CL_White : CL_RowAlt;
            TblCell(table, (++n).ToString(), fonts["td9gray"], bg, Element.ALIGN_CENTER);
            TblCell(table, GetAnalysisTypeName(tr, item.AnalysisType), fonts["td9"], bg, Element.ALIGN_LEFT);
            TblCell(table, AppTime.ToLocal(item.SnapshotDate, _config)?.ToString("dd.MM.yyyy") ?? "—",
                fonts["td9"], bg, Element.ALIGN_CENTER);
        }

        doc.Add(table);
    }

    /// <summary>AI xulosasining matnli bo'limlari.</summary>
    private void AddCombinedAiBlock(Document doc, Dictionary<string, string> tr, JsonElement? ai)
    {
        var fonts = BuildFonts();
        ComposeSectionHeader(doc, fonts, tr["ai_section_title"], CL_Green);

        if (ai == null)
        {
            doc.Add(new Paragraph($"[ {tr["not_analyzed"]} ]", fonts["p9gray"])
                { SpacingBefore = 4, SpacingAfter = 4 });
            return;
        }

        var summary = CombinedStr(ai, "final_summary");
        if (!string.IsNullOrWhiteSpace(summary))
            AddAiTextBlock(doc, fonts, summary.Trim());

        // Jiddiylik darajasi
        if (ai.Value.TryGetProperty("automatic_analysis_bool", out var sev)
            && sev.ValueKind == JsonValueKind.Number
            && sev.TryGetInt32(out var severity) && severity > 0)
        {
            doc.Add(ComposeSeverityWidget(tr, fonts, severity));
        }

        AddLabeledTextIfAny(doc, fonts, tr["combined_cross"], CombinedStr(ai, "cross_findings"));
        AddLabeledTextIfAny(doc, fonts, tr["combined_findings"], CombinedStr(ai, "automatic_analysis"));

        AddCombinedList(doc, fonts, tr["combined_red_flags"], ai, "red_flags");
        AddCombinedDifferential(doc, fonts, tr, ai);

        AddLabeledTextIfAny(doc, fonts, tr["recommendations"], CombinedStr(ai, "AI_recommendations"));
    }

    private static void AddLabeledTextIfAny(Document doc, Dictionary<string, Font> fonts,
        string label, string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return;
        AddLabeledText(doc, fonts, label, text);
    }

    /// <summary>Matnlar massivini punktli ro'yxat qilib chiqaradi.</summary>
    private static void AddCombinedList(Document doc, Dictionary<string, Font> fonts,
        string label, JsonElement? ai, string property)
    {
        if (ai is not { } root || !root.TryGetProperty(property, out var arr)
            || arr.ValueKind != JsonValueKind.Array || arr.GetArrayLength() == 0)
            return;

        var items = arr.EnumerateArray()
            .Where(e => e.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(e.GetString()))
            .Select(e => $"•  {e.GetString()!.Trim()}");
        AddLabeledText(doc, fonts, label, string.Join("\n", items));
    }

    /// <summary>Ehtimoliy tashxislar jadvali.</summary>
    private void AddCombinedDifferential(Document doc, Dictionary<string, Font> fonts,
        Dictionary<string, string> tr, JsonElement? ai)
    {
        if (ai is not { } root || !root.TryGetProperty("differential_diagnosis", out var arr)
            || arr.ValueKind != JsonValueKind.Array || arr.GetArrayLength() == 0)
            return;

        // Alohida sarlavha-paragraf QO'YILMAYDI: iTextSharp uni jadval
        // buferidan oldin chiqarib yuborar va u boshqa bo'limning ustida
        // paydo bo'lardi. Nom jadvalning birinchi ustun sarlavhasida.
        var table = new PdfPTable(3)
            { WidthPercentage = 100, SpacingBefore = 10, SpacingAfter = 6, HeaderRows = 1 };
        table.SetWidths(new[] { 34f, 16f, 50f });
        TableHead(table, fonts,
            tr["combined_differential"], tr["combined_probability"], tr["combined_evidence"]);

        var n = 0;
        foreach (var element in arr.EnumerateArray())
        {
            if (element.ValueKind != JsonValueKind.Object) continue;
            var bg = n++ % 2 == 0 ? CL_White : CL_RowAlt;

            string Field(string key) =>
                element.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.String
                    ? v.GetString() ?? "—" : "—";

            TblCell(table, Field("diagnosis"), fonts["td9bold"], bg, Element.ALIGN_LEFT);

            // Ehtimollik rang bilan: yuqori — qizil, o'rtacha — sariq, past — kulrang
            var probability = Field("probability");
            var probColor = probability.ToLowerInvariant() switch
            {
                "yuqori" or "высокая" or "high" => CL_BadText,
                "o'rtacha" or "o‘rtacha" or "средняя" or "moderate" or "medium" => CL_WarnText,
                _ => CL_Gray,
            };
            TblCell(table, probability, new Font(fonts["td9bold"].BaseFont, MinFontSize, Font.NORMAL, probColor),
                bg, Element.ALIGN_CENTER);
            TblCell(table, Field("evidence"), fonts["td9"], bg, Element.ALIGN_LEFT);
        }

        doc.Add(table);
    }

    public async Task<byte[]> GenerateCombinedReport(int patientId, string lang)
    {
        var tr = PdfTranslations.Get(lang);

        var patient = await _context.Patcients
            .FirstOrDefaultAsync(p => p.Id == patientId)
            ?? throw new KeyNotFoundException($"Bemor #{patientId}");

        var ecgList = await _context.ECGAnalyse
            .Where(e => e.PatcientId == patientId && e.Status == 2)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicDetail).ThenInclude(d => d!.District).ThenInclude(d => d!.Region)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicPhoneNumber)
            .Include(e => e.CreatedDoctor)
            .Include(e => e.Doctors).ThenInclude(d => d.Doctor)
            .Include(e => e.Complaints).ThenInclude(c => c.Complaint)
            .OrderByDescending(e => e.CreatedAt).ToListAsync();

        var smadList = await _context.SmadAnalyses
            .Where(e => e.PatcientId == patientId && e.Status == 2)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicDetail).ThenInclude(d => d!.District).ThenInclude(d => d!.Region)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicPhoneNumber)
            .Include(e => e.CreatedDoctor)
            .Include(e => e.Doctors).ThenInclude(d => d.Doctor)
            .OrderByDescending(e => e.CreatedAt).ToListAsync();

        var holterList = await _context.HolterAnalyses
            .Where(e => e.PatcientId == patientId && e.Status == 2)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicDetail).ThenInclude(d => d!.District).ThenInclude(d => d!.Region)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicPhoneNumber)
            .Include(e => e.CreatedDoctor)
            .Include(e => e.Doctors).ThenInclude(d => d.Doctor)
            .OrderByDescending(e => e.CreatedAt).ToListAsync();

        var labList = await WithLabValues(_context.LabAnalyse)
            .Where(e => e.PatcientId == patientId && e.Status == 2)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicDetail).ThenInclude(d => d!.District).ThenInclude(d => d!.Region)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicPhoneNumber)
            .Include(e => e.CreatedDoctor)
            .Include(e => e.Doctors).ThenInclude(d => d.Doctor)
            .OrderByDescending(e => e.CreatedAt).ToListAsync();

        var paraList = await _context.ParasitologyAnalyses
            .Where(e => e.PatcientId == patientId && e.AnalysisStatus == "analyzed")
            .Include(e => e.Clinic!).ThenInclude(c => c.ClinicDetail!).ThenInclude(d => d!.District).ThenInclude(d => d!.Region)
            .Include(e => e.Clinic!).ThenInclude(c => c.ClinicPhoneNumber!)
            .Include(e => e.CreatedDoctor)
            .Include(e => e.Doctors).ThenInclude(d => d.Doctor)
            .Include(e => e.Results)
            .OrderByDescending(e => e.CreatedAt).ToListAsync();

        var docNum  = DocNum("COMB", AppTime.LocalNow(_config), patientId);
        var clinic  = ecgList.FirstOrDefault()?.Clinic
            ?? smadList.FirstOrDefault()?.Clinic
            ?? holterList.FirstOrDefault()?.Clinic
            ?? labList.FirstOrDefault()?.Clinic
            ?? paraList.FirstOrDefault()?.Clinic;

        var ms     = new MemoryStream();
        var fonts  = BuildFonts();
        var doc    = OpenPdf(ms, tr, fonts, clinic, docNum);

        ComposeDocTitle(doc, fonts, tr, tr["doc_title"], tr["combined_title"], docNum, AppTime.LocalNow(_config));
        ComposePatientBlock(doc, tr, fonts, patient, AppTime.LocalNow(_config));

        // Birinchi tahlil bemor ma'lumotlari ostidan davom etadi — ilgari u
        // ham yangi sahifadan boshlanib, 1-sahifa deyarli bo'sh qolardi
        var firstSection = true;
        void Divider(string title)
        {
            if (!firstSection) doc.NewPage();
            firstSection = false;

            var p = new Paragraph(title, fonts["doc_title"])
            {
                Alignment = Element.ALIGN_CENTER,
                SpacingBefore = 14,
                SpacingAfter = 2,
            };
            doc.Add(p);
        }

        foreach (var ecg in ecgList)
        {
            var ai = ParseAi(ecg.AIAnswerData);
            Divider($"{tr["ecg_title"]}  —  {AppTime.ToLocal(ecg.AnalysisDate ?? ecg.CreatedAt, _config):dd.MM.yyyy HH:mm}");
             ComposeAnalysisBlock(doc, tr, fonts, AppTime.ToLocal(ecg.AnalysisDate ?? ecg.CreatedAt, _config),
                 GetAnalysisTypeName(tr, "ecg"), ecg.CreatedDoctor,
                 DoctorNames(ecg.Doctors?.Select(d => d.Doctor).ToList()),
                 ComplaintNames(ecg.Complaints));
             AddEcgImage(doc, tr, ecg.GeneratedFileLink);
             AddEcgTable(doc, tr, ai);
             AddAiBlock(doc, tr, ai);
         }

        foreach (var smad in smadList)
        {
            var ai = ParseAi(smad.AIAnswerData);
            Divider($"{tr["smad_title"]}  —  {AppTime.ToLocal(smad.AnalysisDate ?? smad.CreatedAt, _config):dd.MM.yyyy HH:mm}");
            ComposeAnalysisBlock(doc, tr, fonts, AppTime.ToLocal(smad.AnalysisDate ?? smad.CreatedAt, _config),
                GetAnalysisTypeName(tr, "smad"), smad.CreatedDoctor,
                DoctorNames(smad.Doctors?.Select(d => d.Doctor).ToList()), null);
            AddSmadTable(doc, tr, ai);
            AddAiBlock(doc, tr, ai);
        }

        foreach (var h in holterList)
        {
            var ai = ParseAi(h.AIAnswerData);
            Divider($"{tr["holter_title"]}  —  {AppTime.ToLocal(h.AnalysisDate ?? h.CreatedAt, _config):dd.MM.yyyy HH:mm}");
            ComposeAnalysisBlock(doc, tr, fonts, AppTime.ToLocal(h.AnalysisDate ?? h.CreatedAt, _config),
                GetAnalysisTypeName(tr, "holter"), h.CreatedDoctor,
                DoctorNames(h.Doctors?.Select(d => d.Doctor).ToList()), null);
            AddHolterResults(doc, tr, ai);
            AddAiBlock(doc, tr, ai);
        }

        foreach (var lab in labList)
        {
            var ai = ParseAi(lab.AIAnswerData);
            Divider($"{tr["lab_title"]}  —  {AppTime.ToLocal(lab.AnalysisDate ?? lab.CreatedAt, _config):dd.MM.yyyy HH:mm}");
            ComposeAnalysisBlock(doc, tr, fonts, AppTime.ToLocal(lab.AnalysisDate ?? lab.CreatedAt, _config),
                GetAnalysisTypeName(tr, "lab"), lab.CreatedDoctor,
                DoctorNames(lab.Doctors?.Select(d => d.Doctor).ToList()), null);
            AddLabTable(doc, tr, lab);
            AddAiBlock(doc, tr, ai);
        }

        foreach (var para in paraList)
        {
            Divider($"{tr["parasitology_title"]}  —  {AppTime.ToLocal(para.AnalysisDate ?? para.CreatedAt, _config):dd.MM.yyyy HH:mm}");
            ComposeAnalysisBlock(doc, tr, fonts, AppTime.ToLocal(para.AnalysisDate ?? para.CreatedAt, _config),
                GetAnalysisTypeName(tr, "para"), para.CreatedDoctor,
                DoctorNames(para.Doctors?.Select(d => d.Doctor).ToList()), null);
            AddParaResults(doc, tr, para, lang);
            AddParaAiBlock(doc, tr, para, lang);
        }

        ComposeNmedVerification(doc, tr, fonts, docNum, AppTime.LocalNow(_config), null);
        ComposeDisclaimer(doc, tr, fonts);
        doc.Close();
        return ms.ToArray();
    }

    // ════════════════════════════════════════════════════════════════════
    //  ASOSIY BUILDER
    // ════════════════════════════════════════════════════════════════════

    public async Task<byte[]> GenerateConsultationReport(int id, string lang)
    {
        var tr = PdfTranslations.Get(lang);
        var row = await _context.Consultations
            .Include(c => c.Patient)
            .Include(c => c.Clinic).ThenInclude(c => c!.ClinicDetail).ThenInclude(d => d!.District).ThenInclude(d => d!.Region)
            .Include(c => c.Clinic).ThenInclude(c => c!.ClinicPhoneNumber)
            .Include(c => c.Doctor)
            .Include(c => c.CreatedByAdmin).ThenInclude(u => u!.Doctor)
            .Include(c => c.Conclusion)
            .FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new KeyNotFoundException($"Konsultatsiya #{id}");

        if (row.Conclusion == null)
            throw new KeyNotFoundException($"Konsultatsiya #{id} xulosasi mavjud emas");

        var docNum = DocNum("CONS", row.CreatedAt, row.Id);
        var verifyUrl = BuildConsultationVerifyUrl(row.Id);
        var ms = new MemoryStream();
        var fonts = BuildFonts();
        var doc = OpenPdf(ms, tr, fonts, row.Clinic, docNum);

        ComposeDocTitle(doc, fonts, tr, "NMED konsultatsiya hujjati", "Online konsultatsiya xulosasi",
            docNum, AppTime.ToLocal(row.Conclusion.CreatedAt, _config));

        if (row.Patient != null)
            ComposePatientBlock(doc, tr, fonts, row.Patient, row.ConsultationDate.ToDateTime(TimeOnly.MinValue));

        ComposeSectionHeader(doc, fonts, "Konsultatsiya ma'lumotlari", CL_DarkBlue);
        var info = InfoTable();
        InfoRow(info, "Konsultatsiya sanasi:", row.ConsultationDate.ToString("dd.MM.yyyy"), fonts, 0);
        InfoRow(info, "Konsultant shifokor:", DoctorFullName(row.Doctor), fonts, 1);
        InfoRow(info, "Klinika:", row.Clinic?.ClinicName ?? "—", fonts, 0);
        InfoRow(info, "Yuborgan admin:", BuildUserFullName(row.CreatedByAdmin), fonts, 1);
        InfoRow(info, "Bemor holati:", ConditionLabel(row.Conclusion.PatientCondition), fonts, 0);
        InfoRow(info, "Xulosa sanasi:", row.Conclusion.CreatedAt.ToString("dd.MM.yyyy HH:mm"), fonts, 1);
        doc.Add(info);

        ComposeSectionHeader(doc, fonts, "Shifokor xulosasi", CL_Green);
        AddLabeledText(doc, fonts, "Bemor holati", ConditionLabel(row.Conclusion.PatientCondition));
        AddLabeledText(doc, fonts, "Tashxis", row.Conclusion.Diagnosis);
        AddLabeledText(doc, fonts, "Davolash yo'riqnomasi", row.Conclusion.Treatment);

        ComposeConsultationQrVerification(doc, fonts, docNum, verifyUrl, row.Conclusion.CreatedAt);
        

        doc.Close();
        return ms.ToArray();
    }

    private byte[] Build(
        Dictionary<string, string> tr,
        string docNum,
        DateTime? createdAt,
        Clinic? clinic,
        Patcient patient,
        string analysisTitle,
        DateTime? analysisDate,
        string analysisTypeName,
        Doctor? createdDoctor,
        string? treatingDoctors,
        string? complaints,
        string? analysisType,
        int? analysisId,
        Action<Document> content,
        Action<Document>? beforeResultsContent = null,
        bool showResultsHeader = true,
        bool showTreatingDoctors = true)
    {
        var ms     = new MemoryStream();
        var fonts  = BuildFonts();
        var doc    = OpenPdf(ms, tr, fonts, clinic, docNum);

        // Bazadagi vaqtlar UTC da saqlanadi. Hisobotda ular klinika
        // mintaqasida ko'rsatilishi kerak — aks holda ekranda `10:41`,
        // hisobotda `05:41` bo'lib chiqadi va ikki hujjat bir-biriga zid
        // ma'lumot beradi (T-089).
        var localCreatedAt = AppTime.ToLocal(createdAt, _config);
        var localAnalysisDate = AppTime.ToLocal(analysisDate, _config);

        ComposeDocTitle(doc, fonts, tr, tr["doc_title"], analysisTitle, docNum, localCreatedAt);
        // Yosh hisoblash uchun mos sana: tahlil sanasi bo'lmasa hujjat sanasi
        ComposePatientBlock(doc, tr, fonts, patient, localAnalysisDate ?? localCreatedAt);
        ComposeAnalysisBlock(doc, tr, fonts, localAnalysisDate, analysisTypeName,
            createdDoctor, treatingDoctors, complaints, showTreatingDoctors);

        beforeResultsContent?.Invoke(doc);

        // Kontent o'z bo'lim sarlavhasini chizsa, umumiy "NATIJALAR"
        // sarlavhasi qo'yilmaydi — aks holda ikki sarlavha ketma-ket turardi
        if (showResultsHeader)
            ComposeSectionHeader(doc, fonts, tr["results_title"], CL_DarkBlue);
        content(doc);

        // Shifokor tashxislari (agar mavjud bo'lsa)
        if (!string.IsNullOrEmpty(analysisType) && analysisId.HasValue)
            ComposeDoctorDiagnoses(doc, tr, fonts, analysisType, analysisId.Value);

        var verifyUrl = analysisType != null && analysisId.HasValue
            ? BuildAnalysisVerifyUrl(analysisType, analysisId.Value)
            : null;
        ComposeNmedVerification(doc, tr, fonts, docNum, localCreatedAt ?? AppTime.LocalNow(_config), verifyUrl);
        ComposeDisclaimer(doc, tr, fonts);

        doc.Close();
        return ms.ToArray();
    }

    private static Document CreateDoc() =>
        new Document(PageSize.A4, MrgSide, MrgSide, MrgTop, MrgBottom);

    // ════════════════════════════════════════════════════════════════════
    //  BLOK 1 — SHAPKA VA HUJJAT SARLAVHASI
    // ════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Hujjatni ochadi va HAR BIR sahifaga shapka (NMED + hujjatni
    /// chiqarayotgan klinika) hamda kolontitul chizadigan hodisani ulaydi.
    /// 1-sahifada to'liq shapka, keyingilarida ixcham variant.
    /// </summary>
    private Document OpenPdf(MemoryStream ms, Dictionary<string, string> tr,
        Dictionary<string, Font> fonts, Clinic? documentClinic, string docNum)
    {
        var clinic = ResolveIssuerClinic(documentClinic);
        var (full, compact) = BuildHeaderTables(tr, fonts, clinic);

        var doc = CreateDoc();
        doc.SetMargins(MrgSide, MrgSide, PageChromeEvent.TopMarginFor(full), MrgBottom);

        var writer = PdfWriter.GetInstance(doc, ms);
        _writer = writer;
        writer.PageEvent = new PageChromeEvent(full, compact, fonts, tr, docNum);
        doc.Open();
        return doc;
    }

    /// <summary>
    /// Shapkadagi klinika — hujjatni CHIQARAYOTGAN foydalanuvchining klinikasi
    /// (loyiha egasining talabi). Foydalanuvchi yoki uning klinikasi
    /// aniqlanmasa — hujjat yozuvidagi klinika.
    /// </summary>
    private Clinic? ResolveIssuerClinic(Clinic? fallback)
    {
        var userId = _currentUser.UserId;
        if (userId <= 0) return fallback;

        var clinicId = _context.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.ClinicId)
            .FirstOrDefault();
        if (clinicId == null) return fallback;
        if (fallback != null && fallback.Id == clinicId && fallback.ClinicPhoneNumber != null)
            return fallback;

        return _context.Clinics.AsNoTracking()
            .Include(c => c.ClinicPhoneNumber)
            .FirstOrDefault(c => c.Id == clinicId) ?? fallback;
    }

    /// <summary>"NMED Milliy tibbiy diagnostika platformasi" → "Milliy tibbiy diagnostika platformasi".</summary>
    private static string PlatformTagline(Dictionary<string, string> tr)
    {
        var text = tr["footer_platform"].Trim();
        return text.StartsWith("NMED ", StringComparison.OrdinalIgnoreCase) ? text[5..] : text;
    }

    /// <summary>
    /// Shapka jadvallari: chapda NMED (logotip, nom, platforma, sayt), o'ngda
    /// hujjatni chiqarayotgan klinika (nom, telefon, logotip). Ular sahifa
    /// hodisasida (<see cref="PageChromeEvent"/>) har sahifaga chiziladi.
    /// </summary>
    private (PdfPTable full, PdfPTable compact) BuildHeaderTables(
        Dictionary<string, string> tr, Dictionary<string, Font> fonts, Clinic? clinic)
    {
        var width = PageSize.A4.Width - MrgSide * 2;
        var clinicName = string.IsNullOrWhiteSpace(clinic?.ClinicName) ? "—" : clinic!.ClinicName!.Trim();
        var phones = clinic?.ClinicPhoneNumber?
            .Select(p => p.PhoneNumber?.Trim())
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .Distinct()
            .ToList() ?? new List<string?>();
        var phoneText = phones.Count > 0 ? $"{tr["phone"]}: {string.Join(", ", phones)}" : null;
        var clinicLogoPath = GetLogoPath(clinic);
        var nmedLogoPath = Path.Combine(_env.WebRootPath ?? "", "nmed-logo.png");

        // ── To'liq shapka (1-sahifa) ─────────────────────────────────
        var full = new PdfPTable(3) { TotalWidth = width, LockedWidth = true };
        full.SetWidths(new[] { 48f, 4f, 48f });

        var nmed = new PdfPTable(2) { WidthPercentage = 100 };
        nmed.SetWidths(new[] { 21f, 79f });
        nmed.AddCell(ImageCell(LoadImage(nmedLogoPath), 46f, Element.ALIGN_LEFT) ?? BadgeCell("N", fonts, CL_Green));
        var nmedText = new PdfPCell
        {
            Border = Rectangle.NO_BORDER, Padding = 0, PaddingLeft = 9,
            VerticalAlignment = Element.ALIGN_MIDDLE,
        };
        nmedText.AddElement(new Paragraph("NMED", fonts["hdr_brand"]) { Leading = 18f });
        nmedText.AddElement(new Paragraph(PlatformTagline(tr), fonts["p9gray"]) { Leading = 14f });
        nmedText.AddElement(new Paragraph("nmed.uz", fonts["nmed_url"]) { Leading = 14f });
        nmed.AddCell(nmedText);
        full.AddCell(new PdfPCell(nmed) { Border = Rectangle.NO_BORDER, Padding = 0, VerticalAlignment = Element.ALIGN_MIDDLE });

        // O'rtadagi ingichka vertikal ajratuvchi
        full.AddCell(new PdfPCell
        {
            Border = Rectangle.NO_BORDER, Padding = 0,
            CellEvent = new VerticalRuleEvent(CL_Border, 0.8f, 4f),
        });

        var cl = new PdfPTable(2) { WidthPercentage = 100 };
        cl.SetWidths(new[] { 79f, 21f });
        var clText = new PdfPCell
        {
            Border = Rectangle.NO_BORDER, Padding = 0, PaddingRight = 9,
            VerticalAlignment = Element.ALIGN_MIDDLE,
        };
        clText.AddElement(new Paragraph(clinicName, fonts["hdr_clinic"]) { Alignment = Element.ALIGN_RIGHT, Leading = 17f });
        if (phoneText != null)
            clText.AddElement(new Paragraph(phoneText, fonts["p9gray"]) { Alignment = Element.ALIGN_RIGHT, Leading = 14f });
        cl.AddCell(clText);
        cl.AddCell(ImageCell(LoadImage(clinicLogoPath), 46f, Element.ALIGN_RIGHT) ?? BadgeCell(Initials(clinicName), fonts, CL_DarkBlue));
        full.AddCell(new PdfPCell(cl) { Border = Rectangle.NO_BORDER, Padding = 0, VerticalAlignment = Element.ALIGN_MIDDLE });

        // ── Ixcham shapka (2-sahifadan) ──────────────────────────────
        var compact = new PdfPTable(2) { TotalWidth = width, LockedWidth = true };
        compact.SetWidths(new[] { 50f, 50f });

        var cLeft = new PdfPTable(2) { WidthPercentage = 100 };
        cLeft.SetWidths(new[] { 9f, 91f });
        cLeft.AddCell(ImageCell(LoadImage(nmedLogoPath), 20f, Element.ALIGN_LEFT) ?? new PdfPCell { Border = Rectangle.NO_BORDER });
        var brand = new Phrase();
        brand.Add(new Chunk("NMED", fonts["td9bold"]));
        brand.Add(new Chunk("  ·  nmed.uz", fonts["p9gray"]));
        cLeft.AddCell(new PdfPCell(brand)
        {
            Border = Rectangle.NO_BORDER, Padding = 0, PaddingLeft = 5,
            VerticalAlignment = Element.ALIGN_MIDDLE,
        });
        compact.AddCell(new PdfPCell(cLeft) { Border = Rectangle.NO_BORDER, Padding = 0, VerticalAlignment = Element.ALIGN_MIDDLE });

        var cRight = new Phrase();
        cRight.Add(new Chunk(clinicName, fonts["td9bold"]));
        if (phones.Count > 0) cRight.Add(new Chunk($"  ·  {phones[0]}", fonts["p9gray"]));
        compact.AddCell(new PdfPCell(cRight)
        {
            Border = Rectangle.NO_BORDER, Padding = 0,
            HorizontalAlignment = Element.ALIGN_RIGHT, VerticalAlignment = Element.ALIGN_MIDDLE,
        });

        return (full, compact);
    }

    private Image? LoadImage(string? path)
    {
        if (string.IsNullOrWhiteSpace(path) || !File.Exists(path)) return null;
        try
        {
            return Image.GetInstance(path);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "PDF shapkasi uchun rasm yuklanmadi: {p}", path);
            return null;
        }
    }

    private static PdfPCell? ImageCell(Image? image, float size, int align)
    {
        if (image == null) return null;
        var img = image;
        img.ScaleToFit(size, size);
        img.Alignment = align;
        var cell = new PdfPCell { Border = Rectangle.NO_BORDER, Padding = 0, VerticalAlignment = Element.ALIGN_MIDDLE };
        cell.AddElement(img);
        return cell;
    }

    /// <summary>Logotip yo'q bo'lsa — nomning bosh harflari yozilgan rangli kvadrat.</summary>
    private static PdfPCell BadgeCell(string text, Dictionary<string, Font> fonts, BaseColor color) =>
        new(new Phrase(text, fonts["badge"]))
        {
            Border = Rectangle.NO_BORDER,
            FixedHeight = 46f,
            HorizontalAlignment = Element.ALIGN_CENTER,
            VerticalAlignment = Element.ALIGN_MIDDLE,
            PaddingBottom = 5,
            CellEvent = new RoundedCell(color, null, 9f),
        };

    private static string Initials(string name)
    {
        var parts = name.Split(new[] { ' ', '-', '"', '«', '»' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(p => char.IsLetterOrDigit(p[0]))
            .Take(2)
            .Select(p => char.ToUpperInvariant(p[0]));
        var initials = string.Concat(parts);
        return initials.Length > 0 ? initials : "+";
    }

    /// <summary>
    /// Hujjat nomi paneli: och fon, chapda NMED yashil urg'u chizig'i;
    /// chapda turkum va nom, o'ngda hujjat raqami va sanasi.
    /// </summary>
    private static void ComposeDocTitle(Document doc, Dictionary<string, Font> fonts,
        Dictionary<string, string> tr, string? kicker, string title,
        string? docNum, DateTime? date, string? numberLabel = null, bool dateOnly = false)
    {
        var band = new PdfPTable(2) { WidthPercentage = 100 };
        band.SetWidths(new[] { 70f, 30f });

        var left = new PdfPCell
        {
            Border = Rectangle.NO_BORDER,
            PaddingLeft = 18, PaddingRight = 6, PaddingTop = 8, PaddingBottom = 12,
            VerticalAlignment = Element.ALIGN_MIDDLE,
        };
        if (!string.IsNullOrWhiteSpace(kicker))
            left.AddElement(new Paragraph(kicker.ToUpperInvariant(), fonts["doc_kicker"]) { Leading = 15f });
        left.AddElement(new Paragraph(title.ToUpperInvariant(), fonts["title_big"]) { Leading = 21f });
        band.AddCell(left);

        var right = new PdfPCell
        {
            Border = Rectangle.NO_BORDER,
            PaddingLeft = 6, PaddingRight = 16, PaddingTop = 8, PaddingBottom = 12,
            VerticalAlignment = Element.ALIGN_MIDDLE,
        };
        var meta = new Paragraph { Alignment = Element.ALIGN_RIGHT, Leading = 15f };
        if (!string.IsNullOrWhiteSpace(docNum))
        {
            meta.Add(new Chunk($"{numberLabel ?? tr["doc_number_prefix"]}\n", fonts["doc_kicker"]));
            meta.Add(new Chunk(docNum, fonts["p10bold"]));
        }
        if (date.HasValue)
        {
            var dateText = dateOnly ? $"{date:dd.MM.yyyy}" : $"{date:dd.MM.yyyy  HH:mm}";
            meta.Add(new Chunk((meta.Count > 0 ? "\n" : "") + dateText, fonts["p9gray"]));
        }
        right.AddElement(meta);
        band.AddCell(right);

        var wrap = new PdfPTable(1) { WidthPercentage = 100, SpacingBefore = 0, SpacingAfter = 4 };
        wrap.AddCell(new PdfPCell(band)
        {
            Border = Rectangle.NO_BORDER,
            Padding = 0,
            CellEvent = new RoundedCell(CL_TitleBg, null, 8f, CL_Green),
        });
        doc.Add(wrap);
    }

    /// <summary>Ma'lumot jadvalini yumaloq burchakli och kartochkaga o'raydi.</summary>
    private static PdfPTable Card(PdfPTable inner)
    {
        var wrap = new PdfPTable(1) { WidthPercentage = 100, SpacingBefore = 2, SpacingAfter = 2 };
        wrap.AddCell(new PdfPCell(inner)
        {
            Border = Rectangle.NO_BORDER,
            PaddingLeft = 12, PaddingRight = 12, PaddingTop = 3, PaddingBottom = 5,
            CellEvent = new RoundedCell(CL_PanelBg, CL_Border, 7f),
        });
        return wrap;
    }

    /// <summary>Yumaloq burchakli fon/chegara (ixtiyoriy chap urg'u chizig'i bilan).</summary>
    private sealed class RoundedCell : IPdfPCellEvent
    {
        private readonly BaseColor? _fill;
        private readonly BaseColor? _stroke;
        private readonly BaseColor? _accent;
        private readonly float _radius;

        public RoundedCell(BaseColor? fill, BaseColor? stroke, float radius, BaseColor? accent = null)
        {
            _fill = fill; _stroke = stroke; _radius = radius; _accent = accent;
        }

        public void CellLayout(PdfPCell cell, Rectangle position, PdfContentByte[] canvases)
        {
            var cb = canvases[PdfPTable.BACKGROUNDCANVAS];
            var x = position.Left + 0.5f;
            var y = position.Bottom + 0.5f;
            var w = position.Width - 1f;
            var h = position.Height - 1f;

            cb.SaveState();
            if (_fill != null)
            {
                cb.SetColorFill(_fill);
                cb.RoundRectangle(x, y, w, h, _radius);
                cb.Fill();
            }
            if (_accent != null)
            {
                cb.SetColorFill(_accent);
                cb.RoundRectangle(x, y, 4.5f, h, 2.2f);
                cb.Fill();
            }
            if (_stroke != null)
            {
                cb.SetColorStroke(_stroke);
                cb.SetLineWidth(0.7f);
                cb.RoundRectangle(x, y, w, h, _radius);
                cb.Stroke();
            }
            cb.RestoreState();
        }
    }

    /// <summary>Katak o'rtasidan vertikal ingichka chiziq (shapkadagi ajratuvchi).</summary>
    private sealed class VerticalRuleEvent : IPdfPCellEvent
    {
        private readonly BaseColor _color;
        private readonly float _width;
        private readonly float _inset;

        public VerticalRuleEvent(BaseColor color, float width, float inset)
        {
            _color = color; _width = width; _inset = inset;
        }

        public void CellLayout(PdfPCell cell, Rectangle position, PdfContentByte[] canvases)
        {
            var cb = canvases[PdfPTable.LINECANVAS];
            var x = (position.Left + position.Right) / 2f;
            cb.SaveState();
            cb.SetColorStroke(_color);
            cb.SetLineWidth(_width);
            cb.MoveTo(x, position.Bottom + _inset);
            cb.LineTo(x, position.Top - _inset);
            cb.Stroke();
            cb.RestoreState();
        }
    }

    // ════════════════════════════════════════════════════════════════════
    //  BLOK 2 — BEMOR MA'LUMOTLARI
    // ════════════════════════════════════════════════════════════════════

    private void ComposePatientBlock(
        Document doc,
        Dictionary<string, string> tr,
        Dictionary<string, Font> fonts,
        Patcient patient,
        DateTime? refDate)
    {
        ComposeSectionHeader(doc, fonts, tr["patient_info"], CL_DarkBlue);

        // Sharif chiqarilmaydi — platformadagi barcha ko'rsatish joylari
        // bilan bir xil qoida. Manzil ham ataylab chiqarilmaydi (loyiha
        // egasi qarori).
        var pairs = new List<(string, string)>
        {
            (tr["fio"], $"{patient.LastName?.ToUpper()} {patient.FirstName}".Trim()),
            (tr["birth_date"], BirthDateText(patient.BirthDate, refDate ?? AppTime.LocalNow(_config), tr)),
            (tr["gender"], GenderText(patient.Gender, tr)),
            (tr["passport"], MaskPassport(patient.Passport)),
        };
        if (!string.IsNullOrWhiteSpace(patient.Phone))
            pairs.Add((tr["phone"], patient.Phone));

        doc.Add(Card(InfoGrid(pairs, fonts, boldFirstValue: true)));
    }

    /// <summary>
    /// Ikki juft ustunli (yorliq | qiymat | yorliq | qiymat) ixcham ma'lumot
    /// paneli. `wide` juftliklar butun qator bo'ylab chiziladi (uzun matn uchun).
    /// </summary>
    private static PdfPTable InfoGrid(List<(string label, string value)> pairs,
        Dictionary<string, Font> fonts, bool boldFirstValue = false,
        List<(string label, string value)>? wide = null)
    {
        // "Yorliq tepada, qiymat pastda" maydonlari, qatorda 3 tadan.
        // Ilgari yorliq | qiymat | yorliq | qiymat edi: 12 pt shriftda tor
        // ustunlarga sig'masdan "Tahlil / o'tkazilgan / sana" bo'lib 3 qatorga
        // sinardi, bemor ismi ham ikkiga bo'linardi.
        const int cols = 3;
        var tbl = new PdfPTable(cols) { WidthPercentage = 100, SpacingBefore = 0, SpacingAfter = 0 };

        PdfPCell Field(string label, string value, bool bold)
        {
            var cell = new PdfPCell
            {
                Border = Rectangle.NO_BORDER,
                PaddingLeft = 0, PaddingRight = 10, PaddingTop = 6, PaddingBottom = 6,
            };
            cell.AddElement(new Paragraph(label, fonts["th9"]) { Leading = 14f });
            cell.AddElement(new Paragraph(string.IsNullOrWhiteSpace(value) ? "\u2014" : value,
                bold ? fonts["td9bold"] : fonts["td9"]) { Leading = 15f });
            return cell;
        }

        for (var i = 0; i < pairs.Count; i++)
            tbl.AddCell(Field(pairs[i].label, pairs[i].value, boldFirstValue && i == 0));

        var rest = pairs.Count % cols;
        if (rest != 0)
            for (var i = rest; i < cols; i++)
                tbl.AddCell(new PdfPCell { Border = Rectangle.NO_BORDER });

        foreach (var (label, value) in wide ?? new())
        {
            var cell = Field(label, value, false);
            cell.Colspan = cols;
            tbl.AddCell(cell);
        }

        return tbl;
    }

    // ════════════════════════════════════════════════════════════════════
    //  BLOK 3 — TAHLIL MA'LUMOTLARI
    // ════════════════════════════════════════════════════════════════════

    private void ComposeAnalysisBlock(
        Document doc,
        Dictionary<string, string> tr,
        Dictionary<string, Font> fonts,
        DateTime? date,
        string typeName,
        Doctor? createdDoctor,
        string? doctors,
        string? complaints,
        bool showTreatingDoctors = true)
    {
        ComposeSectionHeader(doc, fonts, tr["analysis_info"], CL_DarkBlue);

        // Tahlil aslida o'tkazilgan sana. Agar kiritilmagan bo'lsa ATAYLAB
        // `created_at` o'rniga qo'yilmaydi — noto'g'ri sana yozilgan hujjat
        // sud-tibbiy yoki sug'urta masalasida yaroqsiz bo'lib qoladi.
        var pairs = new List<(string, string)>
        {
            (tr["analysis_performed_date"],
                date.HasValue ? $"{date:dd.MM.yyyy}  {date:HH:mm}" : tr["date_not_specified"]),
            (tr["analysis_type"], typeName),
            (tr["device"], tr["device_value"]),
        };

        if (createdDoctor != null)
            pairs.Add((tr["created_by"], DoctorFullName(createdDoctor)));

        // Kompleks xulosada "davolovchi shifokor" tushunchasi yo'q —
        // u yerda "Belgilanmagan" qatori faqat chalg'itardi
        if (showTreatingDoctors)
            pairs.Add((tr["treating_doctors"],
                string.IsNullOrWhiteSpace(doctors) ? tr["not_assigned"] : doctors));

        var wide = string.IsNullOrWhiteSpace(complaints)
            ? null
            : new List<(string, string)> { (tr["complaints"], complaints) };

        doc.Add(Card(InfoGrid(pairs, fonts, wide: wide)));
    }

    // ════════════════════════════════════════════════════════════════════
    //  BLOK 4 — TAHLIL NATIJALARI: EKG
    // ════════════════════════════════════════════════════════════════════

    private void AddEcgSourceFile(Document doc, Dictionary<string, string> tr, string? fileLink)
    {
        if (string.IsNullOrWhiteSpace(fileLink)) return;

        var path = PhysicalPath(fileLink);
        if (!File.Exists(path)) return;

        var fonts = BuildFonts();

        ComposeSectionHeader(doc, fonts,
            tr.GetValueOrDefault("ecg_source_file", "Yuklangan manba fayli"), CL_DarkBlue);

        try
        {
            // Extensionga bog'lanmaymiz: real fayl image bo'lsa PDF'ga chiqaramiz.
            var img = Image.GetInstance(path);
            img.ScaleToFit(doc.PageSize.Width - MrgSide * 2, 360f);
            img.Alignment     = Element.ALIGN_CENTER;
            img.SpacingBefore = 8;
            img.SpacingAfter  = 10;
            doc.Add(img);
            return;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "EKG manba fayli rasm formatida emas yoki parse bo'lmadi: {p}", path);
        }

        // Image bo'lmasa baribir fayl identifikatori ko'rsatiladi.
        doc.Add(new Paragraph(Path.GetFileName(path),
            fonts["p9gray"]) { SpacingBefore = 4, SpacingAfter = 4 });
        if (!string.IsNullOrWhiteSpace(fileLink))
        {
            doc.Add(new Paragraph(fileLink, fonts["p8gray"]) { SpacingAfter = 4 });
        }
    }

    private void AddEcgImage(Document doc, Dictionary<string, string> tr, string? fileLink)
    {
        if (string.IsNullOrWhiteSpace(fileLink)) return;

        var path = PhysicalPath(fileLink);
        if (!File.Exists(path)) return;

        try
        {
            var img = Image.GetInstance(path);
            img.ScaleToFit(doc.PageSize.Width - MrgSide * 2, 180f);
            img.Alignment   = Element.ALIGN_CENTER;
            img.SpacingBefore = 4;
            img.SpacingAfter  = 4;
            doc.Add(img);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "EKG rasmi yuklanmadi: {p}", path);
        }
    }

    private static readonly (string key, string label, string unit, string normal)[] EcgRows =
    {
        ("HR",           "Yurak urish tezligi", "bpm",  "60–100"),
        ("PR_interval",  "PR interval",          "ms",   "120–200"),
        ("QRS_duration", "QRS davomiyligi",       "ms",   "60–120"),
        ("QT_interval",  "QT interval",           "ms",   "350–450"),
        ("QTc_Bazett",   "QTc (Bazett)",           "ms",   "< 440 (erkak)"),
        ("ST_depression","ST depressiya",          "mV",   "≤ 0.1"),
        ("ST_elevation", "ST elevatsiya",          "mV",   "≤ 0.1"),
        ("Sokolow_Lyon", "Sokolov-Lyon indeksi",   "mV",   "< 3.5"),
    };

    private void AddEcgTable(Document doc, Dictionary<string, string> tr, AIAnswerDataDTO? ai)
    {
        if (ai?.DigitalMeasurements == null || ai.DigitalMeasurements.Count == 0) return;

        var fonts = BuildFonts();
        var tbl   = new PdfPTable(4) { WidthPercentage = 100, SpacingBefore = 6, SpacingAfter = 4, HeaderRows = 1 };
        tbl.SetWidths(new[] { 27f, 17f, 17f, 39f });

        TableHead(tbl, fonts,
            tr["parameter"], tr["value"], tr["normal_range"], tr["assessment"]);

        int rowIdx = 0;
        foreach (var (key, label, unit, normal) in EcgRows)
        {
            if (!FindDmValue(ai.DigitalMeasurements, key, out var rawVal)) continue;

            // AI qiymatni ko'pincha izoh bilan yozadi: "73 bpm — normal yurak
            // urish tezligi". Ilgari butun satr "Qiymat" ustuniga tiqilardi
            // (ustiga birlik yana qo'shilib "... bpm bpm"), "Baho" esa doim
            // "—" edi. Endi qiymat va izoh ajratiladi.
            var raw = rawVal?.ToString()?.Trim() ?? "";
            // AI o'lchay olmagan ko'rsatkich chizilmaydi (Holter jadvalidagi
            // bilan bir xil qoida): "—" qatorlari o'lchov o'tkazilgandek
            // taassurot qoldiradi
            if (raw.Length == 0 || raw is "—" or "-" or "null" or "N/A") continue;
            var sep = raw.IndexOf(" — ", StringComparison.Ordinal);
            var valuePart = (sep > 0 ? raw[..sep] : raw).Trim();
            var note = sep > 0 ? raw[(sep + 3)..].Trim() : null;
            if (valuePart.Length == 0) valuePart = "—";
            if (!string.IsNullOrEmpty(unit) && Regex.IsMatch(valuePart, @"^[-+]?\d+([.,]\d+)?$"))
                valuePart = $"{valuePart} {unit}";

            var (assess, color) = EcgAssess(key, valuePart);
            var bg = rowIdx++ % 2 == 0 ? CL_White : CL_RowAlt;

            TblCell(tbl, label,     fonts["td9"],     bg, Element.ALIGN_LEFT);
            TblCell(tbl, valuePart,
                assess == null || color.Equals(CL_GoodText)
                    ? fonts["td9bold"]
                    : new Font(fonts["td9bold"].BaseFont, MinFontSize, Font.NORMAL, color),
                bg, Element.ALIGN_CENTER);
            TblCell(tbl, normal,    fonts["td9gray"], bg, Element.ALIGN_CENTER);

            var assessPhrase = new Phrase();
            if (assess != null)
                assessPhrase.Add(new Chunk(assess, color.Equals(CL_GoodText)
                    ? fonts["td9gray"]
                    : new Font(fonts["td9bold"].BaseFont, MinFontSize, Font.NORMAL, color)));
            if (note != null && assess != null
                && string.Equals(note.Trim().TrimEnd('.'), assess.Trim(), StringComparison.OrdinalIgnoreCase))
                note = null;
            if (!string.IsNullOrWhiteSpace(note))
                assessPhrase.Add(new Chunk((assess != null ? "\n" : "") + Capitalize(note), fonts["td9gray"]));
            if (assessPhrase.Count == 0)
                assessPhrase.Add(new Chunk("—", fonts["td9gray"]));

            tbl.AddCell(new PdfPCell(assessPhrase)
            {
                BackgroundColor   = bg,
                Border            = Rectangle.BOTTOM_BORDER,
                BorderColorBottom = CL_Border,
                BorderWidthBottom = 0.5f,
                PaddingTop        = 5,
                PaddingBottom     = 6,
                PaddingLeft       = 6,
                PaddingRight      = 4,
                HorizontalAlignment = Element.ALIGN_LEFT,
            });
        }

        doc.Add(tbl);
    }

    private static string Capitalize(string s) =>
        string.IsNullOrEmpty(s) ? s : char.ToUpper(s[0]) + s[1..];

    /// <summary>
    /// Raqamli o'lchov bahosi. Matndagi BIRINCHI sonni oladi ("413 ms",
    /// "Maksimal +0.16 mV"). Son topilmasa — baho yo'q (null).
    /// </summary>
    private (string? text, BaseColor color) EcgAssess(string key, string valStr)
    {
        var m = Regex.Match(valStr ?? "", @"[-+]?\d+(?:[.,]\d+)?");
        if (!m.Success || !decimal.TryParse(m.Value.Replace(',', '.'), System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture, out var v))
            return (null, CL_LightGray);

        return key switch
        {
            "HR"           => v < 60   ? ("↓ Bradikardiya", CL_BadText)
                            : v > 100  ? ("↑ Taxikardiya",  CL_BadText)
                            :            ("Normal",        CL_GoodText),
            "PR_interval"  => v < 120  ? ("↓ Qisqa",       CL_WarnText)
                            : v > 200  ? ("↑ Uzun",         CL_BadText)
                            :            ("Normal",        CL_GoodText),
            "QRS_duration" => v > 120  ? ("↑ Keng QRS",    CL_BadText)
                            :            ("Normal",        CL_GoodText),
            "QTc_Bazett"   => v > 500  ? ("Juda uzun",   CL_BadText)
                            : v > 440  ? ("Uzaygan",      CL_WarnText)
                            :            ("Normal",        CL_GoodText),
            "Sokolow_Lyon" => v >= 3.5m? ("Gipertrofiya", CL_WarnText)
                            :            ("Normal",        CL_GoodText),
            _              =>            ("Normal",        CL_GoodText),
        };
    }

    // ════════════════════════════════════════════════════════════════════
    //  BLOK 4 — TAHLIL NATIJALARI: SMAD
    // ════════════════════════════════════════════════════════════════════

    private static readonly (string dmKey, string label, string normal)[] SmadRows =
    {
        // Kalitlar `python_back/ai_schema.py` dagi SMAD_MEASUREMENTS bilan
        // bir xil bo'lishi SHART — aks holda jadval bo'sh chiqadi
        ("SBP_24h_avg",    "Sutkalik o'rtacha sistolik",  "< 130 mmHg"),
        ("DBP_24h_avg",    "Sutkalik o'rtacha diastolik", "< 80 mmHg"),
        ("SBP_day_avg",    "Kunduzi sistolik",            "< 135 mmHg"),
        ("DBP_day_avg",    "Kunduzi diastolik",           "< 85 mmHg"),
        ("SBP_night_avg",  "Tunda sistolik",              "< 120 mmHg"),
        ("DBP_night_avg",  "Tunda diastolik",             "< 75 mmHg"),
        ("max_bp",         "Maksimal bosim",              "—"),
        ("min_bp",         "Minimal bosim",               "—"),
        ("load_index_sbp", "Sistolik yuk indeksi",        "< 25 %"),
        ("load_index_dbp", "Diastolik yuk indeksi",       "< 25 %"),
        ("circadian_index","Tungi pasayish",              "10–20 %"),
        ("dipping_status", "Tungi profil",                "dipper"),
        ("heart_rate_avg", "O'rtacha puls",               "60–80 /min"),
    };

    private void AddSmadTable(Document doc, Dictionary<string, string> tr, AIAnswerDataDTO? ai)
    {
        if (ai?.DigitalMeasurements == null) return;

        var fonts = BuildFonts();
        var tbl   = new PdfPTable(3) { WidthPercentage = 100, SpacingBefore = 6 };
        tbl.SetWidths(new[] { 48f, 26f, 26f });
        TableHead(tbl, fonts, tr["parameter"], tr["value"], tr["normal_range"]);

        int rowIdx = 0;
        foreach (var (dmKey, label, normal) in SmadRows)
        {
            if (!FindDmValue(ai.DigitalMeasurements, dmKey, out var v) || v is null)
                continue;
            var val = v.ToString();
            if (string.IsNullOrWhiteSpace(val)) continue;

            var bg = rowIdx++ % 2 == 0 ? CL_White : CL_RowAlt;
            TblCell(tbl, label,  fonts["td9"],     bg, Element.ALIGN_LEFT);
            TblCell(tbl, val,    fonts["td9bold"], bg, Element.ALIGN_CENTER);
            TblCell(tbl, normal, fonts["td9gray"], bg, Element.ALIGN_CENTER);
        }

        doc.Add(tbl);
    }

    // ════════════════════════════════════════════════════════════════════
    //  BLOK 4 — TAHLIL NATIJALARI: HOLTER
    // ════════════════════════════════════════════════════════════════════

    private void AddHolterResults(Document doc, Dictionary<string, string> tr, AIAnswerDataDTO? ai)
    {
        if (ai?.DigitalMeasurements == null || ai.DigitalMeasurements.Count == 0) return;

        var dm    = ai.DigitalMeasurements;
        var fonts = BuildFonts();

        // ── Asosiy ko'rsatkichlar: 2 ustunli mini-jadval ─────────────
        var mainKeys = new[]
        {
            // Kalitlar `python_back/ai_schema.py` dagi HOLTER_MEASUREMENTS
            // bilan bir xil bo'lishi SHART
            ("HR_avg",                        "O'rtacha ChSS"),
            ("HR_min",                        "Eng past ChSS"),
            ("HR_max",                        "Eng yuqori ChSS"),
            ("total_beats",                   "Jami komplekslar"),
            ("supraventricular_extrasystoles","SVE / NJES"),
            ("ventricular_extrasystoles",     "VE / JES"),
            ("pauses_count",                  "Pauzalar (>2 s)"),
            ("max_pause",                     "Eng uzun pauza"),
            ("st_deviation",                  "ST siljishi"),
            ("QTc",                           "QTc"),
        };

        // Bitta keng jadval: ilgari ikki ustunli mini-jadvallar edi va uzun
        // qiymatlar ("17 425 ta JQS; bigeminiya 359 epizod...") tor
        // katakda 5-6 qatorga sinib ketardi
        var tbl = new PdfPTable(2) { WidthPercentage = 100, SpacingBefore = 6, SpacingAfter = 4, HeaderRows = 1 };
        tbl.SetWidths(new[] { 34f, 66f });
        TableHead(tbl, fonts, tr["parameter"], tr["value"]);

        int i = 0;
        foreach (var (key, label) in mainKeys)
        {
            // AI aniqlay olmagan ko'rsatkich uchun qator umuman chizilmaydi:
            // "—" bilan to'ldirilgan jadval o'lchov o'tkazilgandek taassurot
            // qoldiradi, holbuki qiymat shunchaki topilmagan
            if (!FindDmValue(dm, key, out var v) || v is null) continue;
            var val = v.ToString();
            if (string.IsNullOrWhiteSpace(val)) continue;

            var bg = i++ % 2 == 0 ? CL_White : CL_RowAlt;
            TblCell(tbl, label, fonts["td9"],     bg, Element.ALIGN_LEFT);
            TblCell(tbl, val,   fonts["td9bold"], bg, Element.ALIGN_LEFT);
        }

        if (i > 0) doc.Add(tbl);

        // ── HRV kartochkalar ──────────────────────────────────────────
        ComposeHrvCards(doc, dm, fonts);
    }

    private static void ComposeHrvCards(
        Document doc,
        Dictionary<string, object> dm,
        Dictionary<string, Font> fonts)
    {
        var hrv = new[]
        {
            ("SDNN",   "sdnn"),
            ("SDANN",  "sdann"),
            ("rMSSD",  "rmssd"),
            ("pNN50",  "pnn50"),
        };

        bool anyFound = hrv.Any(h => FindDmValue(dm, h.Item2, out _));
        if (!anyFound) return;

        var tbl = new PdfPTable(4) { WidthPercentage = 100, SpacingBefore = 4, SpacingAfter = 4 };
        tbl.SetWidths(new[] { 25f, 25f, 25f, 25f });

        foreach (var (display, key) in hrv)
        {
            var val = FindDmValue(dm, key, out var v) ? v?.ToString() ?? "—" : "—";

            var inner = new PdfPTable(1) { WidthPercentage = 100 };
            inner.AddCell(new PdfPCell(new Phrase(val, fonts["hrv_val"]))
            {
                BackgroundColor     = CL_HrvCardBg,
                Border              = Rectangle.NO_BORDER,
                HorizontalAlignment = Element.ALIGN_CENTER,
                Padding             = 6,
                PaddingBottom       = 2,
            });
            inner.AddCell(new PdfPCell(new Phrase(display, fonts["hrv_label"]))
            {
                BackgroundColor     = CL_HrvCardBg,
                Border              = Rectangle.NO_BORDER,
                HorizontalAlignment = Element.ALIGN_CENTER,
                Padding             = 4,
                PaddingTop          = 0,
            });

            var outer = new PdfPCell(inner)
            {
                Border        = Rectangle.BOX,
                BorderColor   = CL_White,
                BorderWidth   = 3f,
                Padding       = 0,
            };
            tbl.AddCell(outer);
        }

        doc.Add(tbl);
    }

    // ════════════════════════════════════════════════════════════════════
    //  BLOK 4 — TAHLIL NATIJALARI: LABORATORIYA
    // ════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Laboratoriya ko'rsatkichlari jadvali — `lab_analysis_values` va
    /// `lab_value_types` dan quriladi (nom, birlik, me'yor — ekrandagi bilan
    /// BIR XIL manba). Ilgari bu yerda nom va me'yorlar kodda alohida
    /// yozilgan massiv edi: faqat o'zbekcha, 6 ta ko'rsatkich umuman
    /// chiqmasdi va me'yorlar ekrandagidan farq qilardi.
    ///
    /// Chaqiruvchi `lab.Values` ni `ValueType` bilan birga yuklashi SHART
    /// (<see cref="WithLabValues"/>).
    /// </summary>
    private void AddLabTable(Document doc, Dictionary<string, string> tr, LabAnalyses lab)
    {
        var values = lab.Values?
            .Where(v => v.ValueType != null && (v.Value != null || !string.IsNullOrWhiteSpace(v.Text)))
            .OrderBy(v => v.ValueType.Id)
            .ToList();
        if (values == null || values.Count == 0) return;

        var fonts  = BuildFonts();
        var gender = lab.Patcient?.Gender;
        var lang   = tr.TryGetValue("lab_lang", out var l) ? l : "uz";

        var tbl = new PdfPTable(5) { WidthPercentage = 100, SpacingBefore = 6 };
        tbl.SetWidths(new[] { 32f, 14f, 14f, 20f, 20f });
        TableHead(tbl, fonts,
            tr["parameter"], tr["value"],
            tr["lab_param_unit"], tr["normal_range"], tr["assessment"]);

        int rowIdx = 0;
        foreach (var v in values)
        {
            var type = v.ValueType;
            var name = (lang switch
            {
                "ru" => type.NameRu,
                "en" => type.NameEn,
                _    => type.NameUz,
            }) ?? type.NameUz ?? type.ColumnName ?? "";

            // Laboratoriyaning o'z me'yori (fayldan) — ustun; bo'lmasa katalog
            // me'yori. Me'yor assayga xos: masalan erkin T3 uchun klinika
            // 1.2–4.2 beradi, katalogda 3.1–6.8 — katalog bilan hamma natija "past" bo'lardi.
            var hasLabRef = v.RefLow.HasValue || v.RefHigh.HasValue;
            var (lo, hi) = hasLabRef
                ? ((double?)v.RefLow, (double?)v.RefHigh)
                : (v.UnitMismatch ? (null, null) : LabNormBounds(type, gender));
            // Sifat natijasida sonli chegara ("< 0.99") ma'nosiz — fayldagi
            // me'yor matni ("Отрицательный") ko'rsatiladi
            var norm = type.ValueKind == "qualitative" ? (v.RefText ?? "") : LabNormText(lo, hi);
            if (norm == "" && !string.IsNullOrWhiteSpace(v.RefText)) norm = v.RefText!;
            var unit = v.UnitMismatch ? (v.Unit ?? "") : (type.Measure ?? v.Unit ?? "");

            // Sifat natijasi (HBsAg "Отрицательный(-)") va chegara yozuvi (">50")
            // raqam o'rniga asl ko'rinishida chiqadi
            var valStr = !string.IsNullOrWhiteSpace(v.Text)
                ? v.Text!
                : v.Value!.Value.ToString("G6");

            var (badge, color, prefix) = LabAssess(v, type, lo, hi, tr);
            var bg = rowIdx++ % 2 == 0 ? CL_White : CL_RowAlt;

            // Normal qiymat oddiy qora, baho kulrang; faqat normadan og'ganlari
            // rangli va qalin — ko'z darhol patologiyaga tushadi
            var isNormal = color.Equals(CL_GoodText);
            var valFont  = isNormal ? fonts["td9"]
                : new Font(fonts["td9bold"].BaseFont, MinFontSize, Font.NORMAL, color);
            var badgeFont= isNormal ? fonts["td9gray"]
                : new Font(fonts["td9bold"].BaseFont, MinFontSize, Font.NORMAL, color);

            TblCell(tbl, name,           fonts["td9"],    bg, Element.ALIGN_LEFT);
            TblCell(tbl, prefix + valStr,valFont,         bg, Element.ALIGN_CENTER);
            TblCell(tbl, unit,           fonts["td9gray"],bg, Element.ALIGN_CENTER);
            TblCell(tbl, norm,           fonts["td9gray"],bg, Element.ALIGN_CENTER);

            TblCell(tbl, badge, badgeFont, bg, Element.ALIGN_CENTER);
        }

        doc.Add(tbl);
    }

    /// <summary>
    /// Bemor jinsiga mos me'yor chegaralari. Jinsi noma'lum bo'lsa ikkala
    /// me'yorning birlashmasi olinadi (frontend `evaluate` bilan bir xil) —
    /// NULL jinsni erkak deb hisoblash noto'g'ri baho berardi.
    /// </summary>
    private static (double? lo, double? hi) LabNormBounds(LabValueTypes t, bool? gender)
    {
        if (gender == true)  return (t.NormalMinMale, t.NormalMaxMale);
        if (gender == false) return (t.NormalMinFemale, t.NormalMaxFemale);
        var mins = new[] { t.NormalMinMale, t.NormalMinFemale }.Where(x => x.HasValue).Select(x => x!.Value).ToList();
        var maxs = new[] { t.NormalMaxMale, t.NormalMaxFemale }.Where(x => x.HasValue).Select(x => x!.Value).ToList();
        return (mins.Count > 0 ? mins.Min() : null, maxs.Count > 0 ? maxs.Max() : null);
    }

    private static string LabNormText(double? lo, double? hi)
    {
        static string F(double d) => d.ToString("0.###", System.Globalization.CultureInfo.InvariantCulture);
        if (lo.HasValue && hi.HasValue) return $"{F(lo.Value)}–{F(hi.Value)}";
        if (hi.HasValue) return $"< {F(hi.Value)}";
        if (lo.HasValue) return $"> {F(lo.Value)}";
        return "";
    }

    private (string badge, BaseColor color, string prefix) LabAssess(
        LabAnalysisValue v, LabValueTypes type, double? lo, double? hi, Dictionary<string, string> tr)
    {
        string T(string key, string fallback) => tr.TryGetValue(key, out var s) ? s : fallback;

        if (type.ValueKind == "qualitative")
        {
            // Holat alohida saqlanadi — "shubhali" musbat bilan birlashtirilmaydi
            return v.ResultKind switch
            {
                "POSITIVE"  => (T("lab_positive", "Musbat"), CL_BadText, ""),
                "EQUIVOCAL" => (T("lab_equivocal", "Shubhali"), CL_WarnText, ""),
                "NEGATIVE"  => (T("lab_negative", "Manfiy"), CL_GoodText, ""),
                "INVALID"   => (T("lab_invalid", "Yaroqsiz"), CL_Gray, ""),
                _           => ("—", CL_Gray, ""),
            };
        }
        if (v.UnitMismatch && lo == null && hi == null)
            return (T("lab_not_assessed", "Baholanmadi"), CL_Gray, "");
        if (v.Value == null)
            return ("—", CL_GoodText, "");

        var val = (double)v.Value.Value;
        if (type.ValueKind == "code" || (lo == null && hi == null))
            return ("—", CL_GoodText, "");

        if (lo.HasValue && val < lo.Value) return (T("lab_low", "↓ Past"),   CL_WarnText, "↓ ");
        if (hi.HasValue && val > hi.Value) return (T("lab_high", "↑ Yuqori"), CL_BadText,  "↑ ");
        return (T("lab_normal", "Normal"), CL_GoodText, "");
    }

    /// <summary>Laboratoriya PDF lari uchun: qiymatlar katalog yozuvi bilan birga.</summary>
    private static IQueryable<LabAnalyses> WithLabValues(IQueryable<LabAnalyses> q) =>
        q.Include(e => e.Values!).ThenInclude(v => v.ValueType);

    // ════════════════════════════════════════════════════════════════════
    //  BLOK 4 — TAHLIL NATIJALARI: PARAZITOLOGIYA
    // ════════════════════════════════════════════════════════════════════

    private void AddParaResults(Document doc, Dictionary<string, string> tr,
        ParasitologyAnalyses row, string lang)
    {
        var fonts = BuildFonts();

        // Mikroskop rasmi
        if (!string.IsNullOrWhiteSpace(row.FilePath))
        {
            var imgPath = PhysicalPath(row.FilePath);
            if (File.Exists(imgPath))
            {
                try
                {
                    var img = Image.GetInstance(imgPath);
                    img.ScaleToFit(doc.PageSize.Width - MrgSide * 2, 200f);
                    img.Alignment = Element.ALIGN_CENTER;
                    img.SpacingBefore = 4;
                    img.SpacingAfter  = 4;
                    doc.Add(img);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Parazitologiya rasmi yuklanmadi: {p}", imgPath);
                }
            }
        }

        // Usul va kattalashtirish
        var infoTbl = InfoTable();
        int ri = 0;
        if (!string.IsNullOrWhiteSpace(row.MicroscopyMethod))
            InfoRow(infoTbl, tr["para_method"] + ":", row.MicroscopyMethod, fonts, ri++);
        if (!string.IsNullOrWhiteSpace(row.Magnification))
            InfoRow(infoTbl, tr["para_magnification"] + ":", row.Magnification, fonts, ri++);
        if (row.EggCountPerField.HasValue)
            InfoRow(infoTbl, tr["para_egg_count"] + ":",
                row.EggCountPerField.Value.ToString(), fonts, ri);
        doc.Add(infoTbl);

        if (row.Results == null || row.Results.Count == 0)
        {
            doc.Add(new Paragraph($"[ {tr["para_no_parasites"]} ]",
                fonts["p9gray"]) { SpacingBefore = 4 });
            return;
        }

        var tbl = new PdfPTable(3) { WidthPercentage = 100, SpacingBefore = 4 };
        tbl.SetWidths(new[] { 40f, 40f, 20f });
        TableHead(tbl, fonts,
            tr["para_helminth_type"], tr["para_latin_name"], tr["para_level"]);

        int rowIdx = 0;
        foreach (var r in row.Results)
        {
            var name = lang == "ru" ? r.HelminthNameRu
                     : lang == "en" ? r.HelminthNameEn
                     : r.HelminthNameUz;
            var bg = rowIdx++ % 2 == 0 ? CL_White : CL_RowAlt;
            TblCell(tbl, name ?? r.HelminthType ?? "—", fonts["td9bold"], bg, Element.ALIGN_LEFT);
            TblCell(tbl, r.HelminthType ?? "—",         fonts["td9gray"], bg, Element.ALIGN_LEFT);
            TblCell(tbl, r.InfectionLevel ?? "—",       fonts["td9"],     bg, Element.ALIGN_CENTER);
        }

        doc.Add(tbl);
    }

    private void AddParaAiBlock(Document doc, Dictionary<string, string> tr,
        ParasitologyAnalyses row, string lang)
    {
        if (string.IsNullOrWhiteSpace(row.AiResponse)) return;

        var fonts = BuildFonts();
        ComposeSectionHeader(doc, fonts, tr["ai_section_title"], CL_Green);

        var raw = row.AiResponse.Trim();
        var jsonText = ExtractJsonObject(raw);

        if (jsonText == null)
        {
            AddParaAiLooseFallback(doc, tr, fonts, raw, lang);
            if (row.JiddiylikDarajasi.HasValue)
                ComposeSeverityBar(doc, tr, fonts, row.JiddiylikDarajasi.Value);
            return;
        }

        if (TryParseJsonDocument(jsonText, out var jsonDoc) && jsonDoc != null)
        {
            using var json = jsonDoc;
            var root = json.RootElement;

            // Qisqa umumiy ma'lumotlar (key/value)
            var infoTbl = InfoTable();
            int ri = 0;

            if (TryGetBool(root, "gijja_topildimi", out var found))
                InfoRow(infoTbl, tr["para_worm_found"] + ":", found ? tr["yes"] : tr["no"], fonts, ri++);

            if (TryGetInt(root, "jami_tuxum_soni", out var totalEggs))
                InfoRow(infoTbl, tr["para_total_eggs"] + ":", totalEggs.ToString(), fonts, ri++);

            if (TryGetInt(root, "jami_jiddiylik", out var totalSeverity))
                InfoRow(infoTbl, tr["para_total_severity"] + ":", totalSeverity.ToString(), fonts, ri++);

            if (TryGetString(root, "rasm_sifati", out var imageQuality))
                InfoRow(infoTbl, tr["para_image_quality"] + ":", imageQuality, fonts, ri++);

            if (ri > 0) doc.Add(infoTbl);

            // Aniqlangan turlar
            if (root.TryGetProperty("aniqlangan_turlar", out var types) &&
                types.ValueKind == JsonValueKind.Array &&
                types.GetArrayLength() > 0)
            {
                doc.Add(new Paragraph(tr["para_detected_types"], fonts["p10bold"])
                {
                    SpacingBefore = 6,
                    SpacingAfter = 4,
                });

                var tbl = new PdfPTable(4) { WidthPercentage = 100, SpacingBefore = 0, SpacingAfter = 4 };
                tbl.SetWidths(new[] { 42f, 18f, 20f, 20f });
                TableHead(tbl, fonts,
                    tr["para_type_name"], tr["para_egg_count_short"], tr["para_adult_present"], tr["para_level"]);

                int idx = 0;
                foreach (var t in types.EnumerateArray())
                {
                    var bg = idx++ % 2 == 0 ? CL_White : CL_RowAlt;
                    var latin = GetString(t, "lotin_nomi") ?? "—";
                    var localName = lang == "ru" ? GetString(t, "ru_nomi")
                                  : lang == "en" ? GetString(t, "en_nomi")
                                  : GetString(t, "uz_nomi");

                    var nameCell = string.IsNullOrWhiteSpace(localName) ? latin : $"{localName} ({latin})";
                    TblCell(tbl, nameCell, fonts["td9bold"], bg, Element.ALIGN_LEFT);

                    var eggs = GetInt(t, "tuxum_soni");
                    TblCell(tbl, eggs?.ToString() ?? "—", fonts["td9"], bg, Element.ALIGN_CENTER);

                    var adult = GetBool(t, "voyaga_yetgan_bor");
                    TblCell(tbl, adult.HasValue ? (adult.Value ? tr["yes"] : tr["no"]) : "—",
                        fonts["td9"], bg, Element.ALIGN_CENTER);

                    var level = lang == "uz" ? GetString(t, "infektsiya_uz") : null;
                    level ??= GetString(t, "infektsiya_darajasi");
                    TblCell(tbl, level ?? "—", fonts["td9"], bg, Element.ALIGN_CENTER);
                }
                doc.Add(tbl);

                // Qo'shimcha tafsilotlar (morfologiya) — ishonch darajasisiz
                foreach (var t in types.EnumerateArray())
                {
                    var latin = GetString(t, "lotin_nomi");
                    var localName = lang == "ru" ? GetString(t, "ru_nomi")
                                  : lang == "en" ? GetString(t, "en_nomi")
                                  : GetString(t, "uz_nomi");

                    var title = string.IsNullOrWhiteSpace(localName) ? latin : $"{localName} ({latin})";
                    var morphology = GetString(t, "tuxum_morfologiyasi");
                    if (!string.IsNullOrWhiteSpace(title) && !string.IsNullOrWhiteSpace(morphology))
                    {
                        doc.Add(new Paragraph($"{tr["para_morphology"]}: {title}", fonts["p9bold"])
                        {
                            SpacingBefore = 2,
                            SpacingAfter = 2,
                        });
                        doc.Add(new Paragraph(morphology.Trim(), fonts["p9gray"]) { SpacingAfter = 2 });
                    }
                }
            }

            // Tavsiyalar va yakuniy xulosa
            AddParaAiTextIfExists(doc, fonts, tr["para_treatment"] + ":", GetString(root, "davolash_tavsiyasi"));
            AddParaAiTextIfExists(doc, fonts, tr["recommendations"] + ":", GetString(root, "shifokorga_tavsiya"));
            AddParaAiTextIfExists(doc, fonts, tr["para_additional_note"] + ":", GetString(root, "qoshimcha_izoh"));
            AddParaAiTextIfExists(doc, fonts, tr["final_summary"] + ":", GetString(root, "yakuniy_xulosa"));

            if (row.JiddiylikDarajasi.HasValue)
                ComposeSeverityBar(doc, tr, fonts, row.JiddiylikDarajasi.Value);
        }
        else
        {
            AddParaAiLooseFallback(doc, tr, fonts, raw, lang);
            if (row.JiddiylikDarajasi.HasValue)
                ComposeSeverityBar(doc, tr, fonts, row.JiddiylikDarajasi.Value);
        }

    }

    // ════════════════════════════════════════════════════════════════════
    private static string? ExtractJsonObject(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var start = raw.IndexOf('{');
        if (start < 0) return null;
        var end = raw.LastIndexOf('}');
        if (end <= start) return null;
        return raw.Substring(start, end - start + 1);
    }

    private static bool TryParseJsonDocument(string raw, out JsonDocument? document)
    {
        document = null;
        if (string.IsNullOrWhiteSpace(raw)) return false;

        var candidates = new List<string>
        {
            raw.Trim(),
            SanitizeJsonForParsing(raw),
            Regex.Unescape(raw),
            SanitizeJsonForParsing(Regex.Unescape(raw)),
            raw.Replace("\\\"", "\""),
        }
        .Where(s => !string.IsNullOrWhiteSpace(s))
        .Distinct()
        .ToList();

        foreach (var item in candidates)
        {
            try
            {
                document = JsonDocument.Parse(item);
                return true;
            }
            catch
            {
                // next candidate
            }
        }

        return false;
    }

    private static string SanitizeJsonForParsing(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return text;

        var sb = new StringBuilder(text.Length);
        bool inString = false;
        bool escaped = false;

        foreach (var ch in text)
        {
            if (escaped)
            {
                sb.Append(ch);
                escaped = false;
                continue;
            }

            if (ch == '\\')
            {
                sb.Append(ch);
                escaped = true;
                continue;
            }

            if (ch == '"')
            {
                sb.Append(ch);
                inString = !inString;
                continue;
            }

            if (inString && (ch == '\r' || ch == '\n' || ch == '\t'))
            {
                sb.Append(' ');
                continue;
            }

            if (!inString && char.IsControl(ch))
                continue;

            sb.Append(ch);
        }

        return sb.ToString();
    }

    private void AddParaAiLooseFallback(Document doc, Dictionary<string, string> tr,
        Dictionary<string, Font> fonts, string raw, string lang)
    {
        var cleaned = SanitizeJsonForParsing(raw);
        var infoTbl = InfoTable();
        int ri = 0;

        var found = GetLooseBool(cleaned, "gijja_topildimi");
        if (found.HasValue)
            InfoRow(infoTbl, tr["para_worm_found"] + ":", found.Value ? tr["yes"] : tr["no"], fonts, ri++);

        var totalEggs = GetLooseInt(cleaned, "jami_tuxum_soni");
        if (totalEggs.HasValue)
            InfoRow(infoTbl, tr["para_total_eggs"] + ":", totalEggs.Value.ToString(), fonts, ri++);

        var totalSeverity = GetLooseInt(cleaned, "jami_jiddiylik");
        if (totalSeverity.HasValue)
            InfoRow(infoTbl, tr["para_total_severity"] + ":", totalSeverity.Value.ToString(), fonts, ri++);

        var imageQuality = GetLooseString(cleaned, "rasm_sifati");
        if (!string.IsNullOrWhiteSpace(imageQuality))
            InfoRow(infoTbl, tr["para_image_quality"] + ":", imageQuality, fonts, ri++);

        if (ri > 0)
            doc.Add(infoTbl);

        var names = GetLooseDetectedTypeNames(cleaned, lang).ToList();
        if (names.Count > 0)
        {
            doc.Add(new Paragraph(tr["para_detected_types"], fonts["p10bold"])
            {
                SpacingBefore = 6,
                SpacingAfter = 4,
            });

            foreach (var name in names)
                doc.Add(new Paragraph($"• {name}", fonts["p8"]) { SpacingAfter = 2 });
        }

        AddParaAiTextIfExists(doc, fonts, tr["para_treatment"] + ":", GetLooseString(cleaned, "davolash_tavsiyasi"));
        AddParaAiTextIfExists(doc, fonts, tr["recommendations"] + ":", GetLooseString(cleaned, "shifokorga_tavsiya"));
        AddParaAiTextIfExists(doc, fonts, tr["para_additional_note"] + ":", GetLooseString(cleaned, "qoshimcha_izoh"));
        AddParaAiTextIfExists(doc, fonts, tr["final_summary"] + ":", GetLooseString(cleaned, "yakuniy_xulosa"));

        if (ri == 0 && names.Count == 0)
        {
            AddAiTextBlock(doc, fonts, cleaned);
        }
    }

    private static bool? GetLooseBool(string raw, string key)
    {
        var match = Regex.Match(raw, $"\"{Regex.Escape(key)}\"\\s*:\\s*(true|false)", RegexOptions.IgnoreCase);
        if (!match.Success) return null;
        return string.Equals(match.Groups[1].Value, "true", StringComparison.OrdinalIgnoreCase);
    }

    private static int? GetLooseInt(string raw, string key)
    {
        var match = Regex.Match(raw, $"\"{Regex.Escape(key)}\"\\s*:\\s*(-?\\d+)");
        if (!match.Success) return null;
        return int.TryParse(match.Groups[1].Value, out var number) ? number : null;
    }

    private static string? GetLooseString(string raw, string key)
    {
        var match = Regex.Match(raw,
            $"\"{Regex.Escape(key)}\"\\s*:\\s*\"(?<v>(?:\\\\.|[^\"])*)\"",
            RegexOptions.Singleline);
        if (!match.Success) return null;
        var value = Regex.Unescape(match.Groups["v"].Value).Trim();
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static IEnumerable<string> GetLooseDetectedTypeNames(string raw, string lang)
    {
        var keys = lang switch
        {
            "ru" => new[] { "ru_nomi", "uz_nomi", "lotin_nomi" },
            "en" => new[] { "en_nomi", "uz_nomi", "lotin_nomi" },
            _ => new[] { "uz_nomi", "lotin_nomi", "ru_nomi", "en_nomi" },
        };

        var results = new List<string>();
        foreach (var key in keys)
        {
            var matches = Regex.Matches(raw,
                $"\"{Regex.Escape(key)}\"\\s*:\\s*\"(?<v>(?:\\\\.|[^\"])*)\"",
                RegexOptions.Singleline);

            foreach (Match match in matches)
            {
                var value = Regex.Unescape(match.Groups["v"].Value).Trim();
                if (!string.IsNullOrWhiteSpace(value))
                    results.Add(value);
            }

            if (results.Count > 0)
                break;
        }

        return results.Distinct();
    }

    private static bool TryGetString(JsonElement el, string prop, out string value)
    {
        value = string.Empty;
        if (!el.TryGetProperty(prop, out var p)) return false;
        if (p.ValueKind != JsonValueKind.String) return false;
        value = p.GetString() ?? string.Empty;
        return !string.IsNullOrWhiteSpace(value);
    }

    private static bool TryGetBool(JsonElement el, string prop, out bool value)
    {
        value = default;
        if (!el.TryGetProperty(prop, out var p)) return false;
        if (p.ValueKind == JsonValueKind.True) { value = true; return true; }
        if (p.ValueKind == JsonValueKind.False) { value = false; return true; }
        if (p.ValueKind == JsonValueKind.String && bool.TryParse(p.GetString(), out var b)) { value = b; return true; }
        return false;
    }

    private static bool TryGetInt(JsonElement el, string prop, out int value)
    {
        value = default;
        if (!el.TryGetProperty(prop, out var p)) return false;
        if (p.ValueKind == JsonValueKind.Number && p.TryGetInt32(out var n)) { value = n; return true; }
        if (p.ValueKind == JsonValueKind.String && int.TryParse(p.GetString(), out var s)) { value = s; return true; }
        return false;
    }

    private static string? GetString(JsonElement el, string prop)
        => el.TryGetProperty(prop, out var p) && p.ValueKind == JsonValueKind.String ? p.GetString() : null;

    private static int? GetInt(JsonElement el, string prop)
    {
        if (!el.TryGetProperty(prop, out var p)) return null;
        if (p.ValueKind == JsonValueKind.Number && p.TryGetInt32(out var n)) return n;
        if (p.ValueKind == JsonValueKind.String && int.TryParse(p.GetString(), out var s)) return s;
        return null;
    }

    private static bool? GetBool(JsonElement el, string prop)
    {
        if (!el.TryGetProperty(prop, out var p)) return null;
        if (p.ValueKind == JsonValueKind.True) return true;
        if (p.ValueKind == JsonValueKind.False) return false;
        if (p.ValueKind == JsonValueKind.String && bool.TryParse(p.GetString(), out var b)) return b;
        return null;
    }

    private void AddParaAiTextIfExists(Document doc, Dictionary<string, Font> fonts, string label, string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return;
        doc.Add(new Paragraph(label, fonts["p10bold"]) { SpacingBefore = 4, SpacingAfter = 2 });
        AddAiTextBlock(doc, fonts, text.Trim());
    }

    //  BLOK 5 — AI XULOSASI
    // ════════════════════════════════════════════════════════════════════

    private void AddAiBlock(Document doc, Dictionary<string, string> tr, AIAnswerDataDTO? ai)
    {
        var fonts = BuildFonts();
        ComposeSectionHeader(doc, fonts, tr["ai_section_title"], CL_Green);

        if (ai == null)
        {
            doc.Add(new Paragraph($"[ {tr["not_analyzed"]} ]", fonts["p9gray"])
                { SpacingBefore = 4, SpacingAfter = 4 });
            return;
        }

        // Xulosa matni
        var text = ai.AutomaticAnalysis ?? ai.FinalSummary ?? ai.Raw;
        if (!string.IsNullOrWhiteSpace(text))
            AddAiTextBlock(doc, fonts, text.Trim());

        // Holter/SMAD: har bir patologik epizod — alohida qator
        var episodes = ai.PathologyEpisodes?
            .Where(e => !string.IsNullOrWhiteSpace(e.Finding))
            .ToList();
        if (episodes is { Count: > 0 })
        {
            doc.Add(new Paragraph(tr["pathology_episodes"] + ":", fonts["p9label"])
                { SpacingBefore = 4, SpacingAfter = 2 });
            foreach (var e in episodes)
            {
                var time = string.IsNullOrWhiteSpace(e.Time) ? "" : $"{e.Time!.Trim()} — ";
                doc.Add(new Paragraph($"• {time}{e.Finding!.Trim()}", fonts["p8"])
                    { SpacingBefore = 1, IndentationLeft = 6 });
            }
        }

        // Jiddiylik darajasi — ixcham bitta qator
        var severityRaw = ai.AutomaticAnalysisBool?.ToString() ?? "0";
        int.TryParse(severityRaw, out var severityInt);
        if (severityInt > 0)
            doc.Add(ComposeSeverityWidget(tr, fonts, severityInt));

        // Tavsiyalar — punktli ro'yxat (to'liq kenglikda: ilgari tor o'ng
        // ustunga siqilib, har bir so'z yangi qatorga tushardi)
        if (!string.IsNullOrWhiteSpace(ai.AIRecommendations))
        {
            var lines = ai.AIRecommendations!
                .Split('\n', StringSplitOptions.RemoveEmptyEntries)
                .Select(l => l.Trim().TrimStart('•', '-', '*').Trim())
                .Where(l => l.Length > 0);
            AddLabeledText(doc, fonts, tr["recommendations"],
                string.Join("\n", lines.Select(l => $"•  {l}")));
        }

        // Yakuniy xulosa (alohida bo'lsa)
        if (!string.IsNullOrWhiteSpace(ai.FinalSummary) && ai.FinalSummary != text)
            AddLabeledText(doc, fonts, tr["final_summary"], ai.FinalSummary.Trim());
    }

    /// <summary>AI matni: och fon, chapda NMED yashil chizig'i.</summary>
    private static void AddAiTextBlock(Document doc, Dictionary<string, Font> fonts, string text)
    {
        var cell = new PdfPCell
        {
            BackgroundColor = CL_AiBg,
            Border          = Rectangle.LEFT_BORDER,
            BorderColorLeft = CL_Green,
            BorderWidthLeft = 2.5f,
            PaddingLeft     = 11,
            PaddingRight    = 10,
            PaddingTop      = 7,
            PaddingBottom   = 10,
        };
        cell.AddElement(new Paragraph(text, fonts["p8_ai"]) { Leading = 16f });
        var w = new PdfPTable(1) { WidthPercentage = 100, SpacingBefore = 6, SpacingAfter = 4 };
        w.AddCell(cell);
        doc.Add(w);
    }

    private static void ComposeSeverityBar(Document doc, Dictionary<string, string> tr,
        Dictionary<string, Font> fonts, int level)
    {
        doc.Add(ComposeSeverityWidget(tr, fonts, level));
    }

    private static IElement ComposeSeverityWidget(Dictionary<string, string> tr,
        Dictionary<string, Font> fonts, int level)
    {
        // 3 ta rangli blok (progress bar)
        var (label, barColor) = level switch
        {
            1 => (tr["severity_mild"],     CL_GoodText),
            2 => (tr["severity_moderate"], CL_WarnText),
            3 => (tr["severity_severe"],   CL_BadText),
            _ => (tr["severity_mild"],     CL_GoodText),
        };

        // Bitta qator: [Jiddiylik darajasi] [■■□] [O'RTACHA (2/3)]
        var barTbl = new PdfPTable(3) { WidthPercentage = 100 };
        barTbl.SetWidths(new[] { 33f, 33f, 34f });
        for (int i = 1; i <= 3; i++)
        {
            barTbl.AddCell(new PdfPCell(new Phrase(" "))
            {
                BackgroundColor = i <= level ? barColor : CL_Border,
                Border          = Rectangle.BOX,
                BorderColor     = CL_White,
                BorderWidth     = 1.2f,
                FixedHeight     = 8f,
            });
        }

        var row = new PdfPTable(3) { WidthPercentage = 100, SpacingBefore = 8, SpacingAfter = 2 };
        row.SetWidths(new[] { 30f, 22f, 48f });

        row.AddCell(new PdfPCell(new Phrase($"{tr["severity"]}:", fonts["th9"]))
        {
            Border = Rectangle.NO_BORDER, Padding = 0, PaddingRight = 6,
            VerticalAlignment = Element.ALIGN_MIDDLE,
        });
        row.AddCell(new PdfPCell(barTbl)
        {
            Border = Rectangle.NO_BORDER, Padding = 0,
            VerticalAlignment = Element.ALIGN_MIDDLE,
        });

        var labelFont = new Font(fonts["td9bold"].BaseFont, MinFontSize, Font.NORMAL, barColor);
        row.AddCell(new PdfPCell(new Phrase($"{label.ToUpper()}  ({level}/3)", labelFont))
        {
            Border = Rectangle.NO_BORDER, Padding = 0, PaddingLeft = 10,
            VerticalAlignment = Element.ALIGN_MIDDLE,
        });

        return row;
    }

    // ════════════════════════════════════════════════════════════════════
    //  BLOK 5.5 — SHIFOKOR TASHXISLARI
    // ════════════════════════════════════════════════════════════════════

    private void ComposeDoctorDiagnoses(Document doc, Dictionary<string, string> tr,
        Dictionary<string, Font> fonts, string analysisType, int analysisId)
    {
        var diagnoses = _context.AnalysisDiagnoses
            .Where(d => d.AnalysisType == analysisType && d.AnalysisId == analysisId)
            .Include(d => d.Doctor)
            .OrderByDescending(d => d.CreatedAt)
            .ToList();

        if (diagnoses.Count == 0) return;

        ComposeSectionHeader(doc, fonts, tr["doctor_diagnosis_title"], CL_DarkBlue);

        foreach (var diag in diagnoses)
        {
            var doctorName = $"{diag.Doctor?.LastName ?? ""} {diag.Doctor?.FirstName ?? ""}".Trim();
            if (string.IsNullOrWhiteSpace(doctorName))
                doctorName = tr["no_info"];

            // Rasmiy xulosa ko'rinishi: matn, ostida chiziq va shifokor/sana
            // (qog'ozdagi "Shifokor: ____ Sana: ____" satri kabi)
            var diagnosisText = string.IsNullOrWhiteSpace(diag.DiagnosisText) ? tr["no_info"] : diag.DiagnosisText.Trim();
            var createdAt = diag.CreatedAt.HasValue
                ? AppTime.ToLocal(diag.CreatedAt.Value, _config).ToString("dd.MM.yyyy HH:mm")
                : tr["no_info"];

            var body = new PdfPCell
            {
                Border = Rectangle.LEFT_BORDER,
                BorderColorLeft = CL_DarkBlue,
                BorderWidthLeft = 2.5f,
                BackgroundColor = CL_PanelBg,
                PaddingLeft = 11,
                PaddingRight = 10,
                PaddingTop = 7,
                PaddingBottom = 9,
            };
            body.AddElement(new Paragraph(diagnosisText, fonts["td9"]) { Leading = 16f, SpacingAfter = 6 });

            var metaTbl = new PdfPTable(2) { WidthPercentage = 100 };
            metaTbl.SetWidths(new[] { 62f, 38f });
            var who = new Phrase();
            who.Add(new Chunk($"{tr["diagnosed_by"]}: ", fonts["td9gray"]));
            who.Add(new Chunk(doctorName, fonts["td9bold"]));
            metaTbl.AddCell(new PdfPCell(who) { Border = Rectangle.NO_BORDER, Padding = 0 });
            metaTbl.AddCell(new PdfPCell(new Phrase(createdAt, fonts["td9gray"]))
            {
                Border = Rectangle.NO_BORDER, Padding = 0, HorizontalAlignment = Element.ALIGN_RIGHT,
            });
            body.AddElement(metaTbl);

            var wrapper = new PdfPTable(1) { WidthPercentage = 100, SpacingBefore = 6, SpacingAfter = 4 };
            wrapper.AddCell(body);
            doc.Add(wrapper);
        }
    }

    // ════════════════════════════════════════════════════════════════════
    //  BLOK 6 — NMED RAQAMLI TASDIQLASH (imzo o'rniga)
    // ════════════════════════════════════════════════════════════════════

    private void ComposeNmedVerification(Document doc, Dictionary<string, string> tr,
        Dictionary<string, Font> fonts, string docNum, DateTime date, string? verifyUrl)
    {
        // ── Ikki ustunli: [Logo + matnlar | bo'sh (QR kelajakda)] ─────
        var outer = new PdfPTable(1) { WidthPercentage = 100, SpacingBefore = 8, SpacingAfter = 4 };
        var hasQr = !string.IsNullOrWhiteSpace(verifyUrl);

        var inner = new PdfPTable(hasQr ? 3 : 2) { WidthPercentage = 100 };
        inner.SetWidths(hasQr ? new[] { 14f, 62f, 24f } : new[] { 15f, 85f });

        // ── CHAP: NMED logotipi ───────────────────────────────────────
        var logoCell = new PdfPCell { Border = Rectangle.NO_BORDER, Padding = 6, VerticalAlignment = Element.ALIGN_MIDDLE };

        var nmedLogoPath = Path.Combine(_env.WebRootPath ?? "", "nmed-logo.png");
        if (File.Exists(nmedLogoPath))
        {
            try
            {
                var nmedLogo = Image.GetInstance(nmedLogoPath);
                nmedLogo.ScaleToFit(50f, 30f);
                nmedLogo.Alignment = Element.ALIGN_CENTER;
                logoCell.AddElement(nmedLogo);
            }
            catch
            {
                logoCell.AddElement(new Paragraph("NMED", fonts["nmed_logo"]) { Alignment = Element.ALIGN_CENTER });
            }
        }
        else
        {
            logoCell.AddElement(new Paragraph("NMED", fonts["nmed_logo"]) { Alignment = Element.ALIGN_CENTER });
        }
        inner.AddCell(logoCell);

        // ── O'NG: Tasdiqlash matnlari ─────────────────────────────────
        var textCell = new PdfPCell { Border = Rectangle.NO_BORDER, Padding = 6 };
        textCell.AddElement(new Paragraph(tr["nmed_verified"], fonts["verify_title"])
            { SpacingAfter = 1 });
        textCell.AddElement(new Paragraph(
            $"{tr["doc_number_prefix"]}: {docNum}", fonts["verify_sub"])
            { SpacingAfter = 1 });
        textCell.AddElement(new Paragraph(
            $"{tr["verified_at"]}: {date:dd.MM.yyyy  HH:mm}", fonts["verify_sub"])
            { SpacingAfter = 1 });
        textCell.AddElement(new Paragraph(
            hasQr
                ? "QR kodni skaner qilib hujjat NMED platformasida shakllantirilganini tekshiring."
                : "nmed.uz",
            hasQr ? fonts["verify_sub"] : fonts["verify_url"]));
        if (hasQr)
            textCell.AddElement(new Paragraph(verifyUrl!, fonts["verify_url"]));
        inner.AddCell(textCell);

        if (hasQr)
        {
            var qrCell = new PdfPCell
            {
                Border = Rectangle.NO_BORDER,
                Padding = 6,
                HorizontalAlignment = Element.ALIGN_CENTER,
                VerticalAlignment = Element.ALIGN_MIDDLE
            };

            try
            {
                var image = iTextSharp.text.Image.GetInstance(CreateQrPng(verifyUrl!));
                image.ScaleToFit(74f, 74f);
                image.Alignment = Element.ALIGN_CENTER;
                qrCell.AddElement(image);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "PDF QR kodi yaratilmadi: {Url}", verifyUrl);
                qrCell.AddElement(new Paragraph("QR", fonts["nmed_logo"]) { Alignment = Element.ALIGN_CENTER });
            }

            inner.AddCell(qrCell);
        }

        var outerCell = new PdfPCell(inner)
        {
            Border       = Rectangle.NO_BORDER,
            PaddingLeft  = 8,
            PaddingRight = 6,
            PaddingTop   = 2,
            PaddingBottom= 2,
            CellEvent    = new RoundedCell(CL_VerifyBg, CL_Border, 8f, CL_Green),
        };
        outer.AddCell(outerCell);
        doc.Add(outer);
    }

    // ════════════════════════════════════════════════════════════════════
    //  BLOK 7 — MUHIM ESLATMA
    // ════════════════════════════════════════════════════════════════════

    private void ComposeConsultationQrVerification(Document doc, Dictionary<string, Font> fonts,
        string docNum, string verifyUrl, DateTime date)
    {
        var outer = new PdfPTable(1) { WidthPercentage = 100, SpacingBefore = 8, SpacingAfter = 4 };
        var inner = new PdfPTable(2) { WidthPercentage = 100 };
        inner.SetWidths(new[] { 72f, 28f });

        var textCell = new PdfPCell { Border = Rectangle.NO_BORDER, Padding = 8 };
        textCell.AddElement(new Paragraph("NMED raqamli tasdiqlash", fonts["verify_title"]) { SpacingAfter = 2 });
        textCell.AddElement(new Paragraph($"Hujjat raqami: {docNum}", fonts["verify_sub"]) { SpacingAfter = 2 });
        textCell.AddElement(new Paragraph($"Shakllantirildi: {date:dd.MM.yyyy HH:mm}", fonts["verify_sub"]) { SpacingAfter = 2 });
        textCell.AddElement(new Paragraph("QR kodni skaner qilib hujjat NMED platformasida shakllantirilganini tekshiring.", fonts["verify_sub"]) { SpacingAfter = 2 });
        textCell.AddElement(new Paragraph(verifyUrl, fonts["verify_url"]));
        inner.AddCell(textCell);

        var qrCell = new PdfPCell { Border = Rectangle.NO_BORDER, Padding = 8, HorizontalAlignment = Element.ALIGN_CENTER };
        try
        {
            var image = iTextSharp.text.Image.GetInstance(CreateQrPng(verifyUrl));
            image.ScaleToFit(86f, 86f);
            image.Alignment = Element.ALIGN_CENTER;
            qrCell.AddElement(image);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Konsultatsiya QR kodi yaratilmadi");
            qrCell.AddElement(new Paragraph("QR", fonts["nmed_logo"]) { Alignment = Element.ALIGN_CENTER });
        }
        inner.AddCell(qrCell);

        outer.AddCell(new PdfPCell(inner)
        {
            Border = Rectangle.NO_BORDER,
            PaddingLeft = 8,
            PaddingRight = 6,
            PaddingTop = 2,
            PaddingBottom = 2,
            CellEvent = new RoundedCell(CL_VerifyBg, CL_Border, 8f, CL_Green),
        });
        doc.Add(outer);
    }

    private static void ComposeDisclaimer(Document doc,
        Dictionary<string, string> tr, Dictionary<string, Font> fonts)
    {
        // Sariq chap chiziqli yumshoq blok. Ilgari qizil ramkali qizil matn
        // edi — tibbiy hujjatda xavf signalidek "baqirardi". "⚠" belgisi
        // olib tashlandi: Arial shriftida yo'q va bo'sh joy bo'lib chiqardi.
        var cell = new PdfPCell
        {
            BackgroundColor = CL_DisclBg,
            Border          = Rectangle.LEFT_BORDER,
            BorderColorLeft = CL_DisclBorder,
            BorderWidthLeft = 2.5f,
            PaddingLeft     = 11,
            PaddingRight    = 10,
            PaddingTop      = 5,
            PaddingBottom   = 8,
        };
        cell.AddElement(new Paragraph(tr["disclaimer"], fonts["disclaimer"]) { Leading = 15f });

        var tbl = new PdfPTable(1) { WidthPercentage = 100, SpacingBefore = 8, SpacingAfter = 4 };
        tbl.AddCell(cell);
        doc.Add(tbl);
    }

    // ════════════════════════════════════════════════════════════════════
    //  UMUMIY YORDAMCHI METODLAR
    // ════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Bo'lim sarlavhasi: to'q ko'k qalin harflar, ostida ingichka chiziq.
    /// Ilgari to'liq bo'yalgan yashil/ko'k polosa edi (oq matn) — hujjat
    /// tibbiy xulosadan ko'ra reklama varaqasiga o'xshardi.
    /// `bg` endi faqat chiziq rangini belgilaydi: yashil — AI bo'limi.
    /// </summary>
    private void ComposeSectionHeader(Document doc,
        Dictionary<string, Font> fonts, string title, BaseColor bg)
    {
        KeepRoomOrBreak(doc, MinSpaceAfterHeader);

        var accent = bg.Equals(CL_Green) ? CL_Green : CL_DarkBlue;
        var font = new Font(fonts["h_white"].BaseFont, fonts["h_white"].Size, Font.NORMAL, accent);
        // [▌] SARLAVHA ─────────── : chapda kichik rangli belgi, ostida chiziq
        var tbl = new PdfPTable(2) { WidthPercentage = 100, SpacingBefore = 16, SpacingAfter = 6 };
        tbl.SetWidths(new[] { 1.3f, 98.7f });
        tbl.AddCell(new PdfPCell
        {
            Border = Rectangle.NO_BORDER,
            Padding = 0,
            CellEvent = new RoundedCell(accent, null, 1.6f),
        });
        tbl.AddCell(new PdfPCell(new Phrase(title.ToUpperInvariant(), font))
        {
            Border            = Rectangle.BOTTOM_BORDER,
            BorderColorBottom = CL_Border,
            BorderWidthBottom = 0.8f,
            PaddingLeft       = 8,
            PaddingTop        = 2,
            PaddingBottom     = 6,
            VerticalAlignment = Element.ALIGN_MIDDLE,
        });
        doc.Add(tbl);
    }

    /// <summary>
    /// Sahifada <paramref name="needed"/> pt joy qolmagan bo'lsa yangi sahifa ochadi.
    /// Ilgari "SHIFOKOR TASHXISI" kabi sarlavha sahifa tagida yolg'iz qolib,
    /// matni keyingi sahifaga o'tib ketardi.
    /// </summary>
    private void KeepRoomOrBreak(Document doc, float needed)
    {
        if (_writer == null) return;
        var remaining = _writer.GetVerticalPosition(true) - doc.BottomMargin;
        if (remaining < needed) doc.NewPage();
    }

    /// <summary>2-ustunli ma'lumot jadvali (yorliq | qiymat).</summary>
    private static PdfPTable InfoTable()
    {
        var tbl = new PdfPTable(2) { WidthPercentage = 100, SpacingBefore = 2, SpacingAfter = 2 };
        tbl.SetWidths(new[] { 34f, 66f });
        return tbl;
    }

    private static void InfoRow(PdfPTable tbl, string label, string val,
        Dictionary<string, Font> fonts, int rowIndex)
    {
        // Yorliq oxiridagi ":" olib tashlanadi — kulrang yorliq va qora
        // qiymat o'zi ajralib turadi, ikki nuqta faqat shovqin qo'shardi
        var cleanLabel = label.TrimEnd().TrimEnd(':');

        tbl.AddCell(new PdfPCell(new Phrase(cleanLabel, fonts["th9"]))
        {
            Border            = Rectangle.BOTTOM_BORDER,
            BorderColorBottom = CL_Border,
            BorderWidthBottom = 0.5f,
            PaddingTop        = 5,
            PaddingBottom     = 6,
            PaddingLeft       = 0,
            PaddingRight      = 8,
        });

        tbl.AddCell(new PdfPCell(new Phrase(string.IsNullOrWhiteSpace(val) ? "—" : val, fonts["td9"]))
        {
            Border            = Rectangle.BOTTOM_BORDER,
            BorderColorBottom = CL_Border,
            BorderWidthBottom = 0.5f,
            PaddingTop        = 5,
            PaddingBottom     = 6,
            PaddingLeft       = 0,
        });
    }

    /// <summary>Jadval sarlavhasi: och kulrang-ko'k fon, to'q ko'k qalin matn, ostida chiziq.</summary>
    private static void TableHead(PdfPTable tbl,
        Dictionary<string, Font> fonts, params string[] headers)
    {
        for (var i = 0; i < headers.Length; i++)
        {
            tbl.AddCell(new PdfPCell(new Phrase(headers[i], fonts["th9_inv"]))
            {
                BackgroundColor     = CL_HeadBg,
                Border              = Rectangle.TOP_BORDER | Rectangle.BOTTOM_BORDER,
                BorderColorTop      = CL_DarkBlue,
                BorderWidthTop      = 1f,
                BorderColorBottom   = CL_DarkBlue,
                BorderWidthBottom   = 0.6f,
                PaddingTop          = 5,
                PaddingBottom       = 7,
                PaddingLeft         = 6,
                PaddingRight        = 6,
                // Birinchi ustun (parametr nomi) chapga — qolganlari markazda.
                // Ikki ustunli jadvalda (parametr | qiymat) hammasi chapga.
                HorizontalAlignment = i == 0 || headers.Length <= 2 ? Element.ALIGN_LEFT : Element.ALIGN_CENTER,
                VerticalAlignment   = Element.ALIGN_MIDDLE,
            });
        }
    }

    private static void TblCell(PdfPTable tbl, string text, Font font,
        BaseColor bg, int align)
    {
        tbl.AddCell(new PdfPCell(new Phrase(text, font))
        {
            BackgroundColor     = bg,
            Border              = Rectangle.BOTTOM_BORDER,
            BorderColorBottom   = CL_Border,
            BorderWidthBottom   = 0.5f,
            PaddingTop          = 5,
            PaddingBottom       = 6,
            PaddingLeft         = 6,
            PaddingRight        = 6,
            HorizontalAlignment = align,
            VerticalAlignment   = Element.ALIGN_MIDDLE,
        });
    }

    private static void HLine(Document doc, float width, BaseColor color, float spacingBefore = 0f)
    {
        var cell = new PdfPCell { FixedHeight = width, BackgroundColor = color,
            Border = Rectangle.NO_BORDER, Padding = 0 };
        var tbl  = new PdfPTable(1) { WidthPercentage = 100, SpacingBefore = spacingBefore };
        tbl.AddCell(cell);
        doc.Add(tbl);
    }

    private string? GetLogoPath(Clinic? clinic)
    {
        if (string.IsNullOrWhiteSpace(clinic?.ClinicLogo)) return null;
        try
        {
            var path = Path.Combine(
                _env.WebRootPath ?? "",
                clinic.ClinicLogo.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            return File.Exists(path) ? path : null;
        }
        catch { return null; }
    }

    /// <summary>
    /// Bazadagi havolani diskdagi yo'lga aylantiradi.
    ///
    /// Ilgari bu metod fayl ildizini O'ZI hisoblardi va `Storage:UploadsRoot`
    /// sozlamasini umuman o'qimasdi. Natijada faqat shu kalit sozlangan
    /// o'rnatmada fayllarni yuklab olish ishlardi, PDF hisobotga esa rasm
    /// tushmasdi — hisobot jimgina rasmsiz chiqardi. Endi ildiz bitta
    /// joydan (`IFileStorage`) olinadi.
    /// </summary>
    private string PhysicalPath(string rel) =>
        _storage.ResolveStoredLink(rel) ?? string.Empty;

    /// <summary>
    /// Hisobotdagi passport. PDF'da HAR DOIM maskalanadi: birinchi belgi
    /// ochiq, o'rtasi yulduzcha, oxirgi ikki belgi ochiq — masalan
    /// "AB6377391" → "A******91".
    /// </summary>
    private string MaskPassport(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "—";

        var value = raw.Trim();
        // Shifrlangan bo'lsa ochamiz; ochiq matn bo'lsa o'zgarishsiz qoladi
        try
        {
            var decrypted = _encryption.Decrypt(value);
            if (!string.IsNullOrWhiteSpace(decrypted)) value = decrypted.Trim();
        }
        catch { /* ochiq matnda saqlangan eski yozuv */ }

        if (value.Length <= 3)
            return new string('*', Math.Max(value.Length, 1));

        var stars = new string('*', value.Length - 3);
        return $"{value[0]}{stars}{value[^2..]}";
    }

    private static int Age(DateOnly bd, DateTime now)
    {
        var a = now.Year - bd.Year;
        // AddYears: 29-fevralda tug'ilganlar kabisa bo'lmagan yilda ham to'g'ri
        // (ilgari `new DateOnly(now.Year, 2, 29)` istisno tashlardi)
        if (bd.AddYears(a) > DateOnly.FromDateTime(now)) a--;
        return a;
    }

    /// <summary>
    /// "18.03.2001  (25 yosh)". Tug'ilgan sana ixtiyoriy — kiritilmagan
    /// bo'lsa "—" (yosh ham hisoblanmaydi).
    /// </summary>
    private static string BirthDateText(DateOnly? bd, DateTime now, Dictionary<string, string> tr) =>
        bd is { } d ? $"{d:dd.MM.yyyy}  ({Age(d, now)} {tr["age_suffix"]})" : "—";

    /// <summary>Jins ixtiyoriy — kiritilmagan bo'lsa "—".</summary>
    private static string GenderText(bool? gender, Dictionary<string, string> tr) => gender switch
    {
        true => tr["gender_male"],
        false => tr["gender_female"],
        null => "—",
    };

    private static string DoctorFullName(Doctor? d)
    {
        if (d == null) return "—";
        return PersonNameHelper.Display(d.LastName, d.FirstName);
    }

    private static string BuildUserFullName(User? user)
    {
        if (user?.Doctor != null)
            return PersonNameHelper.Display(user.Doctor.LastName, user.Doctor.FirstName);
        return "—";
    }

    private static string ConditionLabel(string? value) =>
        value switch
        {
            "good" => "Yaxshi",
            "moderate" => "O'rtacha",
            "bad" => "Yomon",
            _ => value ?? "—"
        };

    private string BuildConsultationVerifyUrl(int id)
    {
        return $"{BuildPublicFrontendUrl()}/verify/{_verification.CreateToken("consultation", id)}";
    }

    private string BuildAnalysisVerifyUrl(string type, int id)
    {
        return $"{BuildPublicFrontendUrl()}/verify/{_verification.CreateToken(type, id)}";
    }

    private string BuildPublicFrontendUrl()
    {
        var baseUrl = _config["App:PublicUrl"]
            ?? _config["Frontend:PublicUrl"]
            ?? _config["Frontend:Url"]
            ?? "https://nmed.uz";
        return baseUrl.TrimEnd('/');
    }

    private static byte[] CreateQrPng(string text)
    {
        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(text, QRCodeGenerator.ECCLevel.Q);
        var png = new PngByteQRCode(data);
        return png.GetGraphic(10);
    }

    private static void AddLabeledText(Document doc, Dictionary<string, Font> fonts, string label, string? text)
    {
        // Yorliq (qalin, to'q ko'k) va matn; chapda ingichka kulrang chiziq.
        // Ilgari har biri kulrang ramkali "karta" edi — ketma-ket kelganda
        // sahifa qutichalar to'plamiga aylanardi.
        var wrapper = new PdfPTable(1) { WidthPercentage = 100, SpacingBefore = 8, SpacingAfter = 2 };
        var cell = new PdfPCell
        {
            Border          = Rectangle.LEFT_BORDER,
            BorderColorLeft = CL_Border,
            BorderWidthLeft = 2f,
            PaddingLeft     = 10,
            PaddingRight    = 0,
            PaddingTop      = 0,
            PaddingBottom   = 3,
        };
        cell.AddElement(new Paragraph(label.TrimEnd().TrimEnd(':'), fonts["p9label"]) { SpacingAfter = 3, Leading = 15f });
        cell.AddElement(new Paragraph(string.IsNullOrWhiteSpace(text) ? "—" : text.Trim(), fonts["td9"])
        {
            Leading = 16f,
        });
        wrapper.AddCell(cell);
        doc.Add(wrapper);
    }

    private static string? DoctorNames(IEnumerable<Doctor?>? list)
    {
        if (list == null) return null;
        var doctors = list
            .Where(d => d != null)
            .ToList();
        if (doctors.Count == 0) return null;

        return string.Join(", ", doctors
            // Davolovchi shifokorning TO'LIQ ism-familiyasi chiqariladi
            // (ilgari ism bosh harfga qisqartirilardi: "AMRULLAYEV A.")
            .Select(d => $"{d!.LastName} {d.FirstName}".Trim()));
    }

    private static string? ComplaintNames(IEnumerable<ECGAnalyseComplaints>? list)
    {
        if (list == null) return null;
        var names = list
            .Where(c => c.Complaint != null)
            .Select(c => c.Complaint!.NameUz ?? c.Complaint.NameRu ?? c.Complaint.NameEn)
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .ToList();
        return names.Count > 0 ? string.Join(", ", names) : null;
    }

    // Statik metod — `_config` mavjud emas. Hujjat raqamida faqat yil-oy
    // ishlatiladi, mintaqa farqi esa besh soat: u oy chegarasida hujjat
    // raqamini bir oyga surib yuborishi mumkin, shuning uchun bu yerda ham
    // mahalliy vaqt olinadi (sozlamasiz — standart mintaqa bilan).
    private static string DocNum(string prefix, DateTime? dt, int id) =>
        $"{prefix}-{dt ?? AppTime.LocalNow():yyyyMM}-{id:D4}";

    private static string GetAnalysisTypeName(Dictionary<string, string> tr, string key) =>
        key switch
        {
            "ecg"    => "EKG (Elektrokardiografiya)",
            "smad"   => "SMAD (Sutkali qon bosimi monitoringi)",
            "holter" => "Holter (24 soatlik yurak monitoringi)",
            "lab"    => "Laboratoriya tahlili",
            "para"   => "Parazitologik tahlil",
            _        => key,
        };

    /// <summary>DigitalMeasurements ga case-insensitive qidiruv</summary>
    private static bool FindDmValue(Dictionary<string, object> dm, string key,
        out object? value)
    {
        foreach (var kv in dm)
        {
            if (string.Equals(kv.Key, key, StringComparison.OrdinalIgnoreCase))
            {
                value = kv.Value;
                return true;
            }
        }
        value = null;
        return false;
    }

    // ════════════════════════════════════════════════════════════════════
    //  AI JSON PARSE
    // ════════════════════════════════════════════════════════════════════

    private AIAnswerDataDTO? ParseAi(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        try
        {
            var s = raw.Trim()
                .Replace("\r\n", "\\n").Replace("\n", "\\n").Replace("\t", "\\t")
                .Replace("\\n", "");
            if (s.StartsWith("`") && s.EndsWith("`")) s = s[1..^1];

            return JsonSerializer.Deserialize<AIAnswerDataDTO>(s,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AI JSON parse xatolik");
            return new AIAnswerDataDTO { Raw = raw };
        }
    }

    // ════════════════════════════════════════════════════════════════════
    //  SHRIFTLAR
    // ════════════════════════════════════════════════════════════════════

    private Dictionary<string, Font>? _fontsCache;

    private Dictionary<string, Font> BuildFonts()
    {
        if (_fontsCache != null) return _fontsCache;

        // Oddiy va QALIN shrift alohida fayllardan olinadi. Ilgari faqat
        // oddiy shrift yuklanardi va qalin yozuv "BOLD → NORMAL" qilib
        // o'chirilgan edi (iText qalinlikni chiziq bilan taqlid qilib, harflar
        // surtilgandek chiqardi). Natijada hujjatda sarlavha bilan oddiy matn
        // farq qilmasdi. Haqiqiy Bold fayl bilan bu muammo yo'q.
        var bf = LoadBaseFont(
            @"C:\Windows\Fonts\arial.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "/usr/share/fonts/liberation-sans/LiberationSans-Regular.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/dejavu/DejaVuSans.ttf");
        var bfb = LoadBaseFont(
            @"C:\Windows\Fonts\arialbd.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/usr/share/fonts/liberation-sans/LiberationSans-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf") ?? bf;
        bf ??= BaseFont.CreateFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
        bfb ??= bf;

        // PDF hujjatidagi eng kichik yozuv o'lchami 12 bo'lishi kerak
        // (foydalanuvchi so'rovi): 12 dan past har qanday o'lcham 12 ga
        // ko'tariladi. Katta o'lchamlar (sarlavha, logotip) o'zgarmaydi.
        Font R(float sz, BaseColor? c = null) => new Font(bf, Math.Max(sz, MinFontSize), Font.NORMAL, c ?? CL_Black);
        Font B(float sz, BaseColor? c = null) => new Font(bfb, Math.Max(sz, MinFontSize), Font.NORMAL, c ?? CL_Black);

        _fontsCache = new Dictionary<string, Font>
        {
            // Sarlavha (blank)
            ["h_13b"]         = B(15, CL_DarkBlue),   // klinika nomi
            ["doc_title"]     = B(15, CL_DarkBlue),   // hujjat nomi
            ["analysis_title"]= R(12, CL_Green),
            ["doc_kicker"]    = R(12, CL_LightGray),  // hujjat nomi ustidagi kichik yozuv
            ["title_big"]     = B(17, CL_DarkBlue),   // hujjat nomi paneli
            ["hdr_brand"]     = B(17, CL_Green),      // shapka: NMED
            ["hdr_clinic"]    = B(15, CL_DarkBlue),   // shapka: klinika nomi
            ["badge"]         = B(17, CL_White),      // logotip o'rnidagi bosh harflar
            ["nmed_logo"]     = B(14, CL_Green),
            ["nmed_url"]      = R(12, CL_Green),
            ["p9bold"]        = B(12, CL_Black),
            ["p9gray"]        = R(12, CL_Gray),
            ["p8gray"]        = R(12, CL_Gray),
            ["p10bold"]       = B(12, CL_DarkBlue),

            // Bo'lim ichidagi yorliqlar
            ["p9label"]       = B(12, CL_DarkBlue),

            // Bo'lim sarlavhasi (endi oq emas — to'q ko'k matn, ostida chiziq)
            ["h_white"]       = B(12, CL_DarkBlue),

            // Ma'lumot jadvali
            ["th9"]           = R(12, CL_Gray),
            ["td9"]           = R(12, CL_Black),
            ["td9bold"]       = B(12, CL_Black),
            ["td9gray"]       = R(12, CL_Gray),
            ["th9_inv"]       = B(12, CL_DarkBlue),   // jadval ustun sarlavhasi

            // AI
            ["p8_ai"]         = R(12, CL_Black),
            ["p8"]            = R(12, CL_Black),

            // HRV kartochkalar
            ["hrv_val"]       = B(14, CL_DarkBlue),
            ["hrv_label"]     = R(12, CL_Gray),

            // NMED tasdiqlash bloki
            ["verify_title"]  = B(12, CL_Green),
            ["verify_sub"]    = R(12, CL_Gray),
            ["verify_url"]    = R(12, CL_Green),

            // Ogohlantirish
            ["disclaimer"]    = R(12, CL_DisclText),
        };

        return _fontsCache;
    }

    /// <summary>Birinchi mavjud TTF faylidan kirill qo'llab-quvvatlaydigan shrift.</summary>
    private BaseFont? LoadBaseFont(params string[] candidates)
    {
        var found = candidates.FirstOrDefault(File.Exists);
        if (found == null) return null;
        try
        {
            return BaseFont.CreateFont(found, BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "PDF shrifti yuklanmadi: {Font}", found);
            return null;
        }
    }

    // ════════════════════════════════════════════════════════════════════
    //  FOOTER — har bir sahifa pastida (total pages bilan)
    // ════════════════════════════════════════════════════════════════════

    private static class SimpleQrPng
    {
        private const int Version = 4;
        private const int Size = 17 + Version * 4;
        private const int DataCodewords = 80;
        private const int EccCodewords = 20;

        public static byte[] CreateVersion4Low(string text)
        {
            using var generator = new QRCodeGenerator();
            using var data = generator.CreateQrCode(text, QRCodeGenerator.ECCLevel.Q);
            return new PngByteQRCode(data).GetGraphic(10);
        }

        private static byte[] BuildDataCodewords(byte[] data)
        {
            var bits = new List<int>(DataCodewords * 8);
            AppendBits(bits, 0x4, 4);
            AppendBits(bits, data.Length, 8);
            foreach (var b in data)
                AppendBits(bits, b, 8);

            var remaining = DataCodewords * 8 - bits.Count;
            AppendBits(bits, 0, Math.Min(4, remaining));
            while (bits.Count % 8 != 0)
                bits.Add(0);

            var result = new List<byte>(DataCodewords);
            for (var i = 0; i < bits.Count; i += 8)
            {
                var value = 0;
                for (var j = 0; j < 8; j++)
                    value = (value << 1) | bits[i + j];
                result.Add((byte)value);
            }

            for (var pad = 0; result.Count < DataCodewords; pad++)
                result.Add((byte)(pad % 2 == 0 ? 0xEC : 0x11));

            return result.ToArray();
        }

        private static void AppendBits(List<int> bits, int value, int count)
        {
            for (var i = count - 1; i >= 0; i--)
                bits.Add((value >> i) & 1);
        }

        private static void DrawFunctionPatterns(bool[,] modules, bool[,] reserved)
        {
            DrawFinder(modules, reserved, 0, 0);
            DrawFinder(modules, reserved, Size - 7, 0);
            DrawFinder(modules, reserved, 0, Size - 7);

            for (var i = 0; i < Size; i++)
            {
                SetFunction(modules, reserved, 6, i, i % 2 == 0);
                SetFunction(modules, reserved, i, 6, i % 2 == 0);
            }

            DrawAlignment(modules, reserved, 26, 26);
            SetFunction(modules, reserved, 8, 4 * Version + 9, true);

            for (var i = 0; i < 9; i++)
            {
                Reserve(reserved, 8, i);
                Reserve(reserved, i, 8);
                Reserve(reserved, Size - 1 - i, 8);
                Reserve(reserved, 8, Size - 1 - i);
            }
        }

        private static void DrawFinder(bool[,] modules, bool[,] reserved, int left, int top)
        {
            for (var y = -1; y <= 7; y++)
            {
                for (var x = -1; x <= 7; x++)
                {
                    var xx = left + x;
                    var yy = top + y;
                    if (xx < 0 || xx >= Size || yy < 0 || yy >= Size)
                        continue;
                    var dark = x >= 0 && x <= 6 && y >= 0 && y <= 6 &&
                               (x == 0 || x == 6 || y == 0 || y == 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
                    SetFunction(modules, reserved, xx, yy, dark);
                }
            }
        }

        private static void DrawAlignment(bool[,] modules, bool[,] reserved, int cx, int cy)
        {
            for (var y = -2; y <= 2; y++)
                for (var x = -2; x <= 2; x++)
                    SetFunction(modules, reserved, cx + x, cy + y,
                        Math.Max(Math.Abs(x), Math.Abs(y)) != 1);
        }

        private static void SetFunction(bool[,] modules, bool[,] reserved, int x, int y, bool dark)
        {
            modules[y, x] = dark;
            reserved[y, x] = true;
        }

        private static void Reserve(bool[,] reserved, int x, int y)
        {
            if (x >= 0 && x < Size && y >= 0 && y < Size)
                reserved[y, x] = true;
        }

        private static void DrawCodewords(bool[,] modules, bool[,] reserved, byte[] codewords)
        {
            var bitIndex = 0;
            var upward = true;

            for (var right = Size - 1; right >= 1; right -= 2)
            {
                if (right == 6)
                    right--;

                for (var vert = 0; vert < Size; vert++)
                {
                    var y = upward ? Size - 1 - vert : vert;
                    for (var j = 0; j < 2; j++)
                    {
                        var x = right - j;
                        if (reserved[y, x])
                            continue;

                        var dark = false;
                        if (bitIndex < codewords.Length * 8)
                            dark = ((codewords[bitIndex >> 3] >> (7 - (bitIndex & 7))) & 1) != 0;
                        modules[y, x] = dark;
                        bitIndex++;
                    }
                }
                upward = !upward;
            }
        }

        private static void ApplyMask0(bool[,] modules, bool[,] reserved)
        {
            for (var y = 0; y < Size; y++)
                for (var x = 0; x < Size; x++)
                    if (!reserved[y, x] && ((x + y) & 1) == 0)
                        modules[y, x] = !modules[y, x];
        }

        private static void DrawFormatBits(bool[,] modules, bool[,] reserved, int mask)
        {
            var data = (1 << 3) | mask; // L correction level + mask pattern.
            var bits = ((data << 10) | GetBchRemainder(data << 10, 0x537)) ^ 0x5412;

            for (var i = 0; i <= 5; i++) SetFunction(modules, reserved, 8, i, GetBit(bits, i));
            SetFunction(modules, reserved, 8, 7, GetBit(bits, 6));
            SetFunction(modules, reserved, 8, 8, GetBit(bits, 7));
            SetFunction(modules, reserved, 7, 8, GetBit(bits, 8));
            for (var i = 9; i < 15; i++) SetFunction(modules, reserved, 14 - i, 8, GetBit(bits, i));

            for (var i = 0; i < 8; i++) SetFunction(modules, reserved, Size - 1 - i, 8, GetBit(bits, i));
            for (var i = 8; i < 15; i++) SetFunction(modules, reserved, 8, Size - 15 + i, GetBit(bits, i));
            SetFunction(modules, reserved, 8, Size - 8, true);
        }

        private static bool GetBit(int value, int index) => ((value >> index) & 1) != 0;

        private static int GetBchRemainder(int value, int generator)
        {
            var genDegree = BitLength(generator) - 1;
            while (BitLength(value) - 1 >= genDegree)
                value ^= generator << (BitLength(value) - 1 - genDegree);
            return value;
        }

        private static int BitLength(int value)
        {
            var result = 0;
            while (value != 0)
            {
                result++;
                value >>= 1;
            }
            return result;
        }

        private static byte[] ReedSolomonComputeRemainder(byte[] data, int degree)
        {
            var generator = ReedSolomonGenerator(degree);
            var result = new byte[degree];

            foreach (var b in data)
            {
                var factor = (byte)(b ^ result[0]);
                Array.Copy(result, 1, result, 0, degree - 1);
                result[degree - 1] = 0;

                for (var i = 0; i < degree; i++)
                    result[i] ^= GfMultiply(generator[i], factor);
            }
            return result;
        }

        private static byte[] ReedSolomonGenerator(int degree)
        {
            var result = new byte[] { 1 };
            for (var i = 0; i < degree; i++)
            {
                var next = new byte[result.Length + 1];
                for (var j = 0; j < result.Length; j++)
                {
                    next[j] ^= GfMultiply(result[j], 1);
                    next[j + 1] ^= GfMultiply(result[j], GfPow(2, i));
                }
                result = next;
            }
            return result.Skip(1).ToArray();
        }

        private static byte GfPow(byte value, int power)
        {
            var result = (byte)1;
            for (var i = 0; i < power; i++)
                result = GfMultiply(result, value);
            return result;
        }

        private static byte GfMultiply(byte x, byte y)
        {
            var result = 0;
            var a = (int)x;
            var b = (int)y;

            while (b != 0)
            {
                if ((b & 1) != 0)
                    result ^= a;
                a <<= 1;
                if ((a & 0x100) != 0)
                    a ^= 0x11D;
                b >>= 1;
            }
            return (byte)result;
        }

        private static byte[] RenderPng(bool[,] modules, int scale, int quietZone)
        {
            throw new NotSupportedException("Legacy QR renderer ishlatilmaydi. QRCoder PngByteQRCode cross-platform renderer ishlatiladi.");
        }
    }

    /// <summary>
    /// Har bir sahifa "ramkasi": tepada brend chizig'i va shapka (NMED +
    /// klinika), pastda kolontitul (platforma, hujjat raqami, sahifa X / Y).
    /// 1-sahifada to'liq shapka, keyingilarida ixcham — matn uchun joy qolsin.
    /// </summary>
    private sealed class PageChromeEvent : PdfPageEventHelper
    {
        private const float BarHeight  = 5f;   // sahifa tepasidagi to'q ko'k polosa
        private const float HeaderTop  = 22f;  // sahifa chetidan shapka boshigacha
        private const float RuleGap    = 9f;   // shapkadan ostidagi chiziqqacha
        private const float ContentGap = 14f;  // chiziqdan asosiy matngacha

        private readonly PdfPTable _full;
        private readonly PdfPTable _compact;
        private readonly Dictionary<string, Font>   _f;
        private readonly Dictionary<string, string> _tr;
        private readonly string _docNum;
        private readonly Font _foot;
        private PdfTemplate? _totalPages;

        public PageChromeEvent(PdfPTable full, PdfPTable compact,
            Dictionary<string, Font> f, Dictionary<string, string> tr, string docNum)
        {
            _full = full; _compact = compact;
            _f = f; _tr = tr; _docNum = docNum;
            // Footer shrifti — p8gray bilan bir xil shrift va rang, lekin
            // 10 pt (umumiy 12 pt chegarasidan past — atayin kichik).
            _foot = new Font(_f["p8gray"].BaseFont, FooterFontSize, Font.NORMAL, CL_Gray);
        }

        /// <summary>Shu shapka bilan sahifaning yuqori chegarasi (matn shapkaga tegmasin).</summary>
        public static float TopMarginFor(PdfPTable header) =>
            HeaderTop + header.TotalHeight + RuleGap + ContentGap;

        public override void OnOpenDocument(PdfWriter writer, Document document)
        {
            _totalPages = writer.DirectContent.CreateTemplate(30, 16);
        }

        public override void OnEndPage(PdfWriter writer, Document document)
        {
            var cb = writer.DirectContent;
            var ps = document.PageSize;

            // ── Brend chizig'i: sahifaning yuqori va pastki chetida ─────
            cb.SaveState();
            cb.SetColorFill(CL_DarkBlue);
            cb.Rectangle(0, ps.Height - BarHeight, ps.Width, BarHeight);
            cb.Fill();
            cb.SetColorFill(CL_Green);
            cb.Rectangle(0, ps.Height - BarHeight - 1.6f, ps.Width, 1.6f);
            cb.Fill();
            cb.SetColorFill(CL_DarkBlue);
            cb.Rectangle(0, 0, ps.Width, 3f);
            cb.Fill();
            cb.RestoreState();

            // ── Shapka ──────────────────────────────────────────────────
            var header = writer.PageNumber == 1 ? _full : _compact;
            var top = ps.Height - HeaderTop;
            header.WriteSelectedRows(0, -1, MrgSide, top, cb);

            var ruleY = top - header.TotalHeight - RuleGap;
            cb.SaveState();
            cb.SetColorStroke(CL_Border);
            cb.SetLineWidth(0.8f);
            cb.MoveTo(MrgSide, ruleY);
            cb.LineTo(ps.Width - MrgSide, ruleY);
            cb.Stroke();
            cb.RestoreState();

            // Keyingi sahifalarda ixcham shapka — yuqori chegara ham kichrayadi
            document.SetMargins(MrgSide, MrgSide, TopMarginFor(_compact), MrgBottom);

            DrawFooter(writer, document, cb, ps);
        }

        private void DrawFooter(PdfWriter writer, Document document, PdfContentByte cb, Rectangle ps)
        {
            // Chiziq pastki chegara balandligida turadi; footer matni esa
            // undan ~14 pt pastda chiziladi — ilgari matn 10 pt shrift bilan
            // chiziqqa tegib/yopishib qolardi (foydalanuvchi so'rovi).
            var lineY = document.BottomMargin;
            var y     = lineY - 14;

            cb.SaveState();
            cb.SetColorStroke(CL_Border);
            cb.SetLineWidth(0.6f);
            cb.MoveTo(MrgSide, lineY);
            cb.LineTo(ps.Width - MrgSide, lineY);
            cb.Stroke();
            cb.RestoreState();

            // ── CHAP: platforma nomi ──────────────────────────────────
            // Uzun nom markazdagi hujjat raqamiga tegib ketardi, shuning
            // uchun joyiga sig'masa qisqartiriladi.
            var leftText = $"{_tr["footer_platform"]} | nmed.uz";
            var maxLeft = ps.Width / 2
                - _f["p8gray"].BaseFont.GetWidthPoint($"{_tr["doc_number_prefix"]}: {_docNum}", FooterFontSize) / 2
                - MrgSide - 10;
            if (_f["p8gray"].BaseFont.GetWidthPoint(leftText, FooterFontSize) > maxLeft)
                leftText = "NMED | nmed.uz";

            ColumnText.ShowTextAligned(cb, Element.ALIGN_LEFT,
                new Phrase(leftText, _foot), MrgSide, y, 0);

            // ── MARKAZDA: hujjat raqami ───────────────────────────────
            ColumnText.ShowTextAligned(cb, Element.ALIGN_CENTER,
                new Phrase($"{_tr["doc_number_prefix"]}: {_docNum}", _foot),
                ps.Width / 2, y, 0);

            // ── O'NG: sahifa raqami (X / Y) ───────────────────────────
            var pageText = $"{_tr["footer_page"]} {writer.PageNumber} {_tr["footer_of"]} ";
            var rightX = ps.Width - MrgSide;
            var textWidth = _f["p8gray"].BaseFont.GetWidthPoint(pageText, FooterFontSize);
            var totalWidth = _f["p8gray"].BaseFont.GetWidthPoint("00", FooterFontSize); // max 2 raqam
            var startX = rightX - textWidth - totalWidth;

            ColumnText.ShowTextAligned(cb, Element.ALIGN_LEFT,
                new Phrase(pageText, _foot), startX, y, 0);
            cb.AddTemplate(_totalPages!, startX + textWidth, y);
        }

        public override void OnCloseDocument(PdfWriter writer, Document document)
        {
            if (_totalPages == null) return;
            _totalPages.BeginText();
            _totalPages.SetFontAndSize(_f["p8gray"].BaseFont, FooterFontSize);
            _totalPages.SetColorFill(CL_Gray);
            // `writer.PageNumber` hujjat yopilganda KEYINGI sahifa raqamini
            // qaytaradi, ya'ni 2 sahifali hujjatda 3 bo'ladi. Shu sababli
            // kolontitulda "Sahifa 1 / 3" deb yozilardi va hujjatni qabul
            // qiluvchi "uchinchi sahifa yo'qolgan" deb hisoblardi.
            _totalPages.ShowText((writer.PageNumber - 1).ToString());
            _totalPages.EndText();
        }
    }
}
