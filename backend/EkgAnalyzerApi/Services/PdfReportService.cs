using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using iTextSharp.text;
using iTextSharp.text.pdf;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace EkgAnalyzerApi.Services;

/// <summary>
/// NMED — klinik PDF hujjat generatori (v2).
/// iTextSharp.LGPLv2.Core · A4 · 18/12 mm chegaralar
/// Rang palitasi: #1D9E75 (NMED yashil) · #2C3E6B (to'q ko'k)
/// Imzo/muhr yo'q — NMED raqamli tasdiqlash bloki ishlatiladi.
/// </summary>
public class PdfReportService
{
    private readonly MedDataDB          _context;
    private readonly EncryptionService  _encryption;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;
    private readonly ILogger<PdfReportService> _logger;

    // ── Sahifa geometriyasi (mm → pt: 1 mm = 2.8346 pt) ────────────────
    private const float MrgSide   = 51.02f;  // 18 mm
    private const float MrgTop    = 34.02f;  // 12 mm
    private const float MrgBottom = 34.02f;  // 12 mm

    // ── NMED rang palitasi ───────────────────────────────────────────────
    private static readonly BaseColor CL_Green       = new( 29, 158, 117); // #1D9E75
    private static readonly BaseColor CL_DarkBlue    = new( 44,  62, 107); // #2C3E6B
    private static readonly BaseColor CL_Black       = new( 17,  17,  17); // #111
    private static readonly BaseColor CL_Gray        = new(102, 102, 102); // #666
    private static readonly BaseColor CL_LightGray   = new(150, 150, 150); // #999
    private static readonly BaseColor CL_Border      = new(224, 224, 224); // #E0E0E0
    private static readonly BaseColor CL_RowAlt      = new(249, 249, 249); // #F9F9F9
    private static readonly BaseColor CL_White       = new(255, 255, 255);
    private static readonly BaseColor CL_AiBg        = new(240, 250, 245); // #F0FAF5
    private static readonly BaseColor CL_DisclBg     = new(255, 245, 245); // #FFF5F5
    private static readonly BaseColor CL_DisclBorder = new(204,   0,   0); // #CC0000
    private static readonly BaseColor CL_WarnText    = new(153, 102,   0); // dark amber
    private static readonly BaseColor CL_GoodText    = new(  0, 120,  60);
    private static readonly BaseColor CL_BadText     = new(180,   0,   0);
    private static readonly BaseColor CL_HrvCardBg   = new(245, 245, 245); // #F5F5F5
    private static readonly BaseColor CL_VerifyBg    = new(250, 250, 250); // #FAFAFA

    public PdfReportService(
        MedDataDB context,
        EncryptionService encryption,
        IWebHostEnvironment env,
        IConfiguration config,
        ILogger<PdfReportService> logger)
    {
        _context    = context;
        _encryption = encryption;
        _env        = env;
        _config     = config;
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
            tr["ecg_title"], row.AnalysisDate ?? row.CreatedAt,
            GetAnalysisTypeName(tr, "ecg"),
            row.CreatedDoctor,
            DoctorNames(row.Doctors?.Select(d => d.Doctor).ToList()),
            ComplaintNames(row.Complaints),
            "ecg", id,
            doc =>
            {
                AddEcgSourceFile(doc, tr, row.AnalyseFileLink);
                AddEcgImage(doc, tr, row.GeneratedFileLink);
                AddEcgTable(doc, tr, aiData);
                AddAiBlock(doc, tr, aiData);
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
            tr["smad_title"], row.AnalysisDate ?? row.CreatedAt,
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
            tr["holter_title"], row.AnalysisDate ?? row.CreatedAt,
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
        var row = await _context.LabAnalyse
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
            tr["lab_title"], row.AnalysisDate ?? row.CreatedAt,
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
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicDetail).ThenInclude(d => d!.District).ThenInclude(d => d!.Region)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicPhoneNumber)
            .Include(e => e.CreatedDoctor)
            .Include(e => e.Doctors).ThenInclude(d => d.Doctor)
            .Include(e => e.Results)
            .FirstOrDefaultAsync(e => e.Id == id)
            ?? throw new KeyNotFoundException($"Parazitologiya #{id}");

        var docNum = row.DocumentNumber ?? DocNum("PARA", row.CreatedAt, id);

        return Build(tr, docNum, row.CreatedAt, row.Clinic, row.Patcient,
            tr["parasitology_title"], row.AnalysisDate ?? row.CreatedAt,
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

    public async Task<byte[]> GenerateCombinedReport(int patientId, string lang)
    {
        var tr = PdfTranslations.Get(lang);

        var patient = await _context.Patcients
            .FirstOrDefaultAsync(p => p.Id == patientId)
            ?? throw new KeyNotFoundException($"Bemor #{patientId}");

        var ecgList = await _context.ECGAnalyse
            .Where(e => e.PatcientId == patientId && e.Status == 2)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicDetail)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicPhoneNumber)
            .Include(e => e.CreatedDoctor)
            .Include(e => e.Doctors).ThenInclude(d => d.Doctor)
            .Include(e => e.Complaints).ThenInclude(c => c.Complaint)
            .OrderByDescending(e => e.CreatedAt).ToListAsync();

        var smadList = await _context.SmadAnalyses
            .Where(e => e.PatcientId == patientId && e.Status == 2)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicDetail)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicPhoneNumber)
            .Include(e => e.CreatedDoctor)
            .Include(e => e.Doctors).ThenInclude(d => d.Doctor)
            .OrderByDescending(e => e.CreatedAt).ToListAsync();

        var holterList = await _context.HolterAnalyses
            .Where(e => e.PatcientId == patientId && e.Status == 2)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicDetail)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicPhoneNumber)
            .Include(e => e.CreatedDoctor)
            .Include(e => e.Doctors).ThenInclude(d => d.Doctor)
            .OrderByDescending(e => e.CreatedAt).ToListAsync();

        var labList = await _context.LabAnalyse
            .Where(e => e.PatcientId == patientId && e.Status == 2)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicDetail)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicPhoneNumber)
            .Include(e => e.CreatedDoctor)
            .Include(e => e.Doctors).ThenInclude(d => d.Doctor)
            .OrderByDescending(e => e.CreatedAt).ToListAsync();

        var paraList = await _context.ParasitologyAnalyses
            .Where(e => e.PatcientId == patientId && e.AnalysisStatus == "analyzed")
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicDetail)
            .Include(e => e.Clinic).ThenInclude(c => c.ClinicPhoneNumber)
            .Include(e => e.CreatedDoctor)
            .Include(e => e.Doctors).ThenInclude(d => d.Doctor)
            .Include(e => e.Results)
            .OrderByDescending(e => e.CreatedAt).ToListAsync();

        var docNum  = DocNum("COMB", DateTime.UtcNow, patientId);
        var clinic  = ecgList.FirstOrDefault()?.Clinic
            ?? smadList.FirstOrDefault()?.Clinic
            ?? holterList.FirstOrDefault()?.Clinic
            ?? labList.FirstOrDefault()?.Clinic
            ?? paraList.FirstOrDefault()?.Clinic;

        var ms     = new MemoryStream();
        var doc    = CreateDoc();
        var writer = PdfWriter.GetInstance(doc, ms);
        var fonts  = BuildFonts();
        writer.PageEvent = new FooterEvent(fonts, tr, docNum);
        doc.Open();

        ComposeHeader(doc, tr, fonts, clinic, docNum, DateTime.UtcNow,
            tr["combined_title"], tr["combined_title"]);
        ComposePatientBlock(doc, tr, fonts, patient, DateTime.UtcNow);

        void Divider(string title)
        {
            doc.NewPage();
            var p = new Paragraph(title, fonts["h_white"]) { SpacingBefore = 4, SpacingAfter = 6 };
            p.Alignment = Element.ALIGN_CENTER;
            doc.Add(p);
        }

        foreach (var ecg in ecgList)
        {
            var ai = ParseAi(ecg.AIAnswerData);
            Divider($"{tr["ecg_title"]}  —  {(ecg.AnalysisDate ?? ecg.CreatedAt):dd.MM.yyyy HH:mm}");
             ComposeAnalysisBlock(doc, tr, fonts, (ecg.AnalysisDate ?? ecg.CreatedAt),
                 GetAnalysisTypeName(tr, "ecg"), ecg.CreatedDoctor,
                 DoctorNames(ecg.Doctors?.Select(d => d.Doctor).ToList()),
                 ComplaintNames(ecg.Complaints));
             AddEcgSourceFile(doc, tr, ecg.AnalyseFileLink);
             AddEcgImage(doc, tr, ecg.GeneratedFileLink);
             AddEcgTable(doc, tr, ai);
             AddAiBlock(doc, tr, ai);
         }

        foreach (var smad in smadList)
        {
            var ai = ParseAi(smad.AIAnswerData);
            Divider($"{tr["smad_title"]}  —  {(smad.AnalysisDate ?? smad.CreatedAt):dd.MM.yyyy HH:mm}");
            ComposeAnalysisBlock(doc, tr, fonts, (smad.AnalysisDate ?? smad.CreatedAt),
                GetAnalysisTypeName(tr, "smad"), smad.CreatedDoctor,
                DoctorNames(smad.Doctors?.Select(d => d.Doctor).ToList()), null);
            AddSmadTable(doc, tr, ai);
            AddAiBlock(doc, tr, ai);
        }

        foreach (var h in holterList)
        {
            var ai = ParseAi(h.AIAnswerData);
            Divider($"{tr["holter_title"]}  —  {(h.AnalysisDate ?? h.CreatedAt):dd.MM.yyyy HH:mm}");
            ComposeAnalysisBlock(doc, tr, fonts, (h.AnalysisDate ?? h.CreatedAt),
                GetAnalysisTypeName(tr, "holter"), h.CreatedDoctor,
                DoctorNames(h.Doctors?.Select(d => d.Doctor).ToList()), null);
            AddHolterResults(doc, tr, ai);
            AddAiBlock(doc, tr, ai);
        }

        foreach (var lab in labList)
        {
            var ai = ParseAi(lab.AIAnswerData);
            Divider($"{tr["lab_title"]}  —  {(lab.AnalysisDate ?? lab.CreatedAt):dd.MM.yyyy HH:mm}");
            ComposeAnalysisBlock(doc, tr, fonts, (lab.AnalysisDate ?? lab.CreatedAt),
                GetAnalysisTypeName(tr, "lab"), lab.CreatedDoctor,
                DoctorNames(lab.Doctors?.Select(d => d.Doctor).ToList()), null);
            AddLabTable(doc, tr, lab);
            AddAiBlock(doc, tr, ai);
        }

        foreach (var para in paraList)
        {
            Divider($"{tr["parasitology_title"]}  —  {(para.AnalysisDate ?? para.CreatedAt):dd.MM.yyyy HH:mm}");
            ComposeAnalysisBlock(doc, tr, fonts, (para.AnalysisDate ?? para.CreatedAt),
                GetAnalysisTypeName(tr, "para"), para.CreatedDoctor,
                DoctorNames(para.Doctors?.Select(d => d.Doctor).ToList()), null);
            AddParaResults(doc, tr, para, lang);
            AddParaAiBlock(doc, tr, para, lang);
        }

        ComposeNmedVerification(doc, tr, fonts, docNum, DateTime.UtcNow);
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
        var doc = CreateDoc();
        var writer = PdfWriter.GetInstance(doc, ms);
        var fonts = BuildFonts();

        writer.PageEvent = new FooterEvent(fonts, tr, docNum);
        doc.Open();

        ComposeHeader(doc, tr, fonts, row.Clinic, docNum, row.Conclusion.CreatedAt,
            "Online konsultatsiya xulosasi", "NMED konsultatsiya hujjati");

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
        ComposeDisclaimer(doc, tr, fonts);

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
        Action<Document> content)
    {
        var ms     = new MemoryStream();
        var doc    = CreateDoc();
        var writer = PdfWriter.GetInstance(doc, ms);
        var fonts  = BuildFonts();

        writer.PageEvent = new FooterEvent(fonts, tr, docNum);
        doc.Open();

        ComposeHeader(doc, tr, fonts, clinic, docNum, createdAt,
            analysisTitle, tr["doc_title"]);
        ComposePatientBlock(doc, tr, fonts, patient, analysisDate);
        ComposeAnalysisBlock(doc, tr, fonts, analysisDate, analysisTypeName,
            createdDoctor, treatingDoctors, complaints);

        ComposeSectionHeader(doc, fonts, tr["results_title"], CL_DarkBlue);
        content(doc);

        // Shifokor tashxislari (agar mavjud bo'lsa)
        if (!string.IsNullOrEmpty(analysisType) && analysisId.HasValue)
            ComposeDoctorDiagnoses(doc, tr, fonts, analysisType, analysisId.Value);

        ComposeNmedVerification(doc, tr, fonts, docNum, createdAt ?? DateTime.UtcNow);
        ComposeDisclaimer(doc, tr, fonts);

        doc.Close();
        return ms.ToArray();
    }

    private static Document CreateDoc() =>
        new Document(PageSize.A4, MrgSide, MrgSide, MrgTop, MrgBottom);

    // ════════════════════════════════════════════════════════════════════
    //  BLOK 1 — HEADER
    // ════════════════════════════════════════════════════════════════════

    private void ComposeHeader(
        Document doc,
        Dictionary<string, string> tr,
        Dictionary<string, Font> fonts,
        Clinic? clinic,
        string docNum,
        DateTime? date,
        string analysisTitle,
        string docTitle)
    {
        // ── 2-ustunli jadval: [Klinika | NMED] ─────────────────────────
        var tbl = new PdfPTable(2) { WidthPercentage = 100 };
        tbl.SetWidths(new[] { 55f, 45f });
        tbl.SpacingAfter = 0;

        // ──── CHAP: klinika logotipi + nomi ──────────────────────────
        var leftCell = new PdfPCell
        {
            Border           = Rectangle.RIGHT_BORDER,
            BorderColorRight = CL_Border,
            BorderWidthRight = 0.5f,
            PaddingRight     = 10,
            PaddingBottom    = 8,
            PaddingTop       = 6,
            BackgroundColor  = new BaseColor(250, 252, 255),
        };

        // Klinika logotipi
        var logoPath = GetLogoPath(clinic);
        if (logoPath != null)
        {
            try
            {
                var logo = Image.GetInstance(logoPath);
                logo.ScaleToFit(110f, 55f);
                logo.Alignment = Element.ALIGN_LEFT;
                leftCell.AddElement(logo);
                leftCell.AddElement(new Phrase(" ", fonts["p8gray"]));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Klinika logotipi yuklanmadi: {p}", logoPath);
            }
        }

        var clinicPhrase = new Phrase();
        clinicPhrase.Add(new Chunk(clinic?.ClinicName ?? "Shifoxona", fonts["h_13b"]));

        // Region va District ko'rsatish
        var district = clinic?.ClinicDetail?.District;
        var region   = district?.Region;
        if (region != null || district != null)
        {
            var regionName   = region?.NameUz   ?? region?.NameRu ?? "";
            var districtName = district?.NameUz ?? district?.NameRu ?? "";
            var geo = string.Join(", ",
                new[] { regionName, districtName }
                    .Where(s => !string.IsNullOrWhiteSpace(s)));
            if (!string.IsNullOrWhiteSpace(geo))
                clinicPhrase.Add(new Chunk($"\n{geo}", fonts["p9gray"]));
        }

        if (clinic?.ClinicDetail?.Address is { } addr)
            clinicPhrase.Add(new Chunk($"\n{addr}", fonts["p9gray"]));

        var clinicPhones = clinic?.ClinicPhoneNumber?
            .Select(p => p.PhoneNumber?.Trim())
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .Distinct()
            .ToList();

        if (clinicPhones?.Count > 0)
        {
            var phones = string.Join("  |  ", clinicPhones);
            clinicPhrase.Add(new Chunk($"\n{tr["phone"]}: {phones}", fonts["p9gray"]));
        }

        leftCell.AddElement(new Paragraph(clinicPhrase) { Leading = 13f });
        tbl.AddCell(leftCell);

        // ──── O'NG: NMED logotipi + nomed.uz + hujjat ma'lumotlari ───
        var rightCell = new PdfPCell
        {
            Border      = Rectangle.NO_BORDER,
            PaddingLeft = 10,
            PaddingBottom = 8,
            PaddingTop  = 6,
            BackgroundColor = new BaseColor(247, 252, 249),
            HorizontalAlignment = Element.ALIGN_RIGHT,
        };

        // NMED logotipi
        var nmedLogoPath = Path.Combine(_env.WebRootPath ?? "", "nmed-logo.png");
        if (File.Exists(nmedLogoPath))
        {
            try
            {
                var nmedLogo = Image.GetInstance(nmedLogoPath);
                nmedLogo.ScaleToFit(104f, 42f);
                nmedLogo.Alignment = Element.ALIGN_RIGHT;
                rightCell.AddElement(nmedLogo);
            }
            catch { /* fallback matn */ }
        }
        else
        {
            // Fallback: "NMED" matn + nmed.uz
            rightCell.AddElement(new Paragraph("NMED", fonts["nmed_logo"]));
        }

        var rightPhrase = new Phrase();
        rightPhrase.Add(new Chunk("nmed.uz", fonts["nmed_url"]));
        rightPhrase.Add(new Chunk(
            $"\n{tr["doc_number_prefix"]}: {docNum}",
            fonts["p9bold"]));
        rightPhrase.Add(new Chunk(
            $"\n{tr["analysis_date"]}: {date:dd.MM.yyyy}  {date:HH:mm}",
            fonts["p9gray"]));

        rightCell.AddElement(new Paragraph(rightPhrase) { Alignment = Element.ALIGN_RIGHT, Leading = 13f });
        tbl.AddCell(rightCell);

        doc.Add(tbl);

        // ── Header osti: #1D9E75 chiziq (2 pt) ───────────────────────
        HLine(doc, 2f, CL_Green);

        // ── Hujjat sarlavhasi ─────────────────────────────────────────
        var title1 = new Paragraph(docTitle, fonts["doc_title"])
        {
            Alignment    = Element.ALIGN_CENTER,
            SpacingBefore = 6,
            SpacingAfter  = 2,
        };
        doc.Add(title1);

        var title2 = new Paragraph(analysisTitle, fonts["analysis_title"])
        {
            Alignment    = Element.ALIGN_CENTER,
            SpacingAfter = 8,
        };
        doc.Add(title2);
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
        ComposeSectionHeader(doc, fonts, tr["patient_info"], CL_Green);

        var tbl = InfoTable();

        var fio = $"{patient.LastName?.ToUpper()} {patient.FirstName} {patient.SureName}".Trim();
        InfoRow(tbl, tr["fio"] + ":", fio, fonts, 0);

        var age = Age(patient.BirthDate, refDate ?? DateTime.Now);
        InfoRow(tbl, tr["birth_date"] + ":",
            $"{patient.BirthDate:dd.MM.yyyy}  ({age} {tr["age_suffix"]})", fonts, 1);

        InfoRow(tbl, tr["gender"] + ":",
            patient.Gender ? tr["gender_male"] : tr["gender_female"], fonts, 0);

        InfoRow(tbl, tr["passport"] + ":",
            MaskPassport(patient.Passport), fonts, 1);

        if (!string.IsNullOrWhiteSpace(patient.Address))
            InfoRow(tbl, tr["address"] + ":", patient.Address, fonts, 0);

        if (!string.IsNullOrWhiteSpace(patient.Phone))
            InfoRow(tbl, tr["phone"] + ":", patient.Phone, fonts, 1);

        doc.Add(tbl);
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
        string? complaints)
    {
        ComposeSectionHeader(doc, fonts, tr["analysis_info"], CL_DarkBlue);

        var tbl = InfoTable();
        int row = 0;

        InfoRow(tbl, tr["analysis_date"] + ":",
            $"{date:dd.MM.yyyy}  {date:HH:mm}", fonts, row++);

        InfoRow(tbl, tr["analysis_type"] + ":", typeName, fonts, row++);

        InfoRow(tbl, tr["device"] + ":", tr["device_value"], fonts, row++);

        if (createdDoctor != null)
            InfoRow(tbl, tr["created_by"] + ":",
                DoctorFullName(createdDoctor), fonts, row++);

        InfoRow(tbl, tr["treating_doctors"] + ":",
            string.IsNullOrWhiteSpace(doctors) ? tr["not_assigned"] : doctors,
            fonts, row++);

        if (!string.IsNullOrWhiteSpace(complaints))
            InfoRow(tbl, tr["complaints"] + ":", complaints, fonts, row);

        doc.Add(tbl);
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
            img.ScaleToFit(doc.PageSize.Width - MrgSide * 2, 200f);
            img.Alignment     = Element.ALIGN_CENTER;
            img.SpacingBefore = 4;
            img.SpacingAfter  = 4;
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
        var tbl   = new PdfPTable(4) { WidthPercentage = 100, SpacingBefore = 6, SpacingAfter = 4 };
        tbl.SetWidths(new[] { 38f, 20f, 22f, 20f });

        TableHead(tbl, fonts,
            tr["parameter"], tr["value"], tr["normal_range"], tr["assessment"]);

        int rowIdx = 0;
        foreach (var (key, label, unit, normal) in EcgRows)
        {
            if (!FindDmValue(ai.DigitalMeasurements, key, out var rawVal)) continue;

            var valStr = rawVal?.ToString() ?? "-";
            var (assess, color) = EcgAssess(key, valStr);
            var bg = rowIdx++ % 2 == 0 ? CL_White : CL_RowAlt;

            TblCell(tbl, label,              fonts["td9"],        bg, Element.ALIGN_LEFT);
            TblCell(tbl, $"{valStr} {unit}", fonts["td9bold"],    bg, Element.ALIGN_CENTER);
            TblCell(tbl, normal,             fonts["td9gray"],    bg, Element.ALIGN_CENTER);

            var assessFont = new Font(fonts["td9bold"].BaseFont, 9, Font.NORMAL, color);
            var ac = new PdfPCell(new Phrase(assess, assessFont))
            {
                BackgroundColor     = bg,
                Border              = Rectangle.BOTTOM_BORDER,
                BorderColorBottom   = CL_Border,
                BorderWidthBottom   = 0.3f,
                Padding             = 4f,
                HorizontalAlignment = Element.ALIGN_CENTER,
            };
            tbl.AddCell(ac);
        }

        doc.Add(tbl);
    }

    private (string text, BaseColor color) EcgAssess(string key, string valStr)
    {
        if (!decimal.TryParse(valStr, System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture, out var v))
            return ("—", CL_LightGray);

        return key switch
        {
            "HR"           => v < 60   ? ("↓ Bradikardiya", CL_BadText)
                            : v > 100  ? ("↑ Taxikardiya",  CL_BadText)
                            :            ("✓ Normal",        CL_GoodText),
            "PR_interval"  => v < 120  ? ("↓ Qisqa",       CL_WarnText)
                            : v > 200  ? ("↑ Uzun",         CL_BadText)
                            :            ("✓ Normal",        CL_GoodText),
            "QRS_duration" => v > 120  ? ("↑ Keng QRS",    CL_BadText)
                            :            ("✓ Normal",        CL_GoodText),
            "QTc_Bazett"   => v > 500  ? ("✗ Juda uzun",   CL_BadText)
                            : v > 440  ? ("⚠ Uzaygan",      CL_WarnText)
                            :            ("✓ Normal",        CL_GoodText),
            "Sokolow_Lyon" => v >= 3.5m? ("⚠ Gipertrofiya", CL_WarnText)
                            :            ("✓ Normal",        CL_GoodText),
            _              =>            ("✓ Normal",        CL_GoodText),
        };
    }

    // ════════════════════════════════════════════════════════════════════
    //  BLOK 4 — TAHLIL NATIJALARI: SMAD
    // ════════════════════════════════════════════════════════════════════

    private static readonly (string dmKey, string label, string normal)[] SmadRows =
    {
        ("day_systolic",   "Kunduzi sistolik",  "< 135 mmHg"),
        ("day_diastolic",  "Kunduzi diastolik", "< 85 mmHg"),
        ("night_systolic", "Tunda sistolik",    "< 120 mmHg"),
        ("night_diastolic","Tunda diastolik",   "< 75 mmHg"),
        ("pulse_pressure", "Impuls bosimi",     "40–60 mmHg"),
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
            var val = FindDmValue(ai.DigitalMeasurements, dmKey, out var v)
                ? v?.ToString() ?? "—" : "—";
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
            ("monitoring_duration", "Monitoring davomiyligi"),
            ("total_complexes",     "Jami komplekslar"),
            ("mean_hr",             "O'rtacha ChSS"),
            ("max_min_hr",          "Maks/Min ChSS"),
            ("sve",                 "SVE / NJES"),
            ("ve",                  "VE / JES"),
            ("st_changes",          "ST siljishi"),
            ("qtc_mean",            "QTc o'rtacha"),
        };

        var left  = mainKeys.Take(4).ToArray();
        var right = mainKeys.Skip(4).ToArray();

        var tbl2 = new PdfPTable(2) { WidthPercentage = 100, SpacingBefore = 6, SpacingAfter = 4 };
        tbl2.SetWidths(new[] { 50f, 50f });

        var leftSubTbl  = BuildHolterSubTable(dm, left,  fonts);
        var rightSubTbl = BuildHolterSubTable(dm, right, fonts);

        var lc = new PdfPCell(leftSubTbl)  { Border = Rectangle.NO_BORDER, PaddingRight = 4 };
        var rc = new PdfPCell(rightSubTbl) { Border = Rectangle.NO_BORDER, PaddingLeft  = 4 };
        tbl2.AddCell(lc);
        tbl2.AddCell(rc);
        doc.Add(tbl2);

        // ── HRV kartochkalar ──────────────────────────────────────────
        ComposeHrvCards(doc, dm, fonts);
    }

    private static PdfPTable BuildHolterSubTable(
        Dictionary<string, object> dm,
        (string key, string label)[] rows,
        Dictionary<string, Font> fonts)
    {
        var tbl = new PdfPTable(2) { WidthPercentage = 100 };
        tbl.SetWidths(new[] { 58f, 42f });

        int i = 0;
        foreach (var (key, label) in rows)
        {
            var val = FindDmValue(dm, key, out var v) ? v?.ToString() ?? "—" : "—";
            var bg  = i++ % 2 == 0 ? CL_White : CL_RowAlt;

            TblCell(tbl, label, fonts["td9"],     bg, Element.ALIGN_LEFT);
            TblCell(tbl, val,   fonts["td9bold"], bg, Element.ALIGN_CENTER);
        }

        return tbl;
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
                BorderColor   = CL_Border,
                BorderWidth   = 0.4f,
                Padding       = 0,
                PaddingLeft   = 3,
                PaddingRight  = 3,
            };
            tbl.AddCell(outer);
        }

        doc.Add(tbl);
    }

    // ════════════════════════════════════════════════════════════════════
    //  BLOK 4 — TAHLIL NATIJALARI: LABORATORIYA
    // ════════════════════════════════════════════════════════════════════

    private static readonly (string name, string unit, string normM, string normF,
        Func<LabAnalyses, decimal?> get)[] LabRows =
    {
        ("Gemoglobin (Hb)",      "g/L",      "130–170",  "120–155", e => e.hb),
        ("Eritrositlar (RBC)",   "×10¹²/L",  "4.5–5.5",  "3.8–4.8", e => e.rbc),
        ("Leykositlar (WBC)",    "×10⁹/L",   "4.0–9.0",  "4.0–9.0", e => e.wbc),
        ("Trombotsitlar (PLT)",  "×10⁹/L",   "150–400",  "150–400", e => e.plt),
        ("Gematokrit (HCT)",     "%",         "40–50",    "37–47",   e => e.hct),
        ("MCV",                  "fL",        "80–100",   "80–100",  e => e.mcv),
        ("MCH",                  "pg",        "27–34",    "27–34",   e => e.mch),
        ("MCHC",                 "g/L",       "315–360",  "315–360", e => e.mchc),
        ("EChT (ESR)",           "mm/soat",   "0–15",     "0–20",    e => e.esr),
        ("Glyukoza",             "mmol/L",    "3.9–5.5",  "3.9–5.5", e => e.glucose),
        ("Umumiy xolesterol",    "mmol/L",    "< 5.2",    "< 5.2",   e => e.cholesterol),
        ("ALT",                  "U/L",       "0–40",     "0–40",    e => e.alt),
        ("AST",                  "U/L",       "0–40",     "0–40",    e => e.ast),
        ("Bilirubin umumiy",     "µmol/L",    "5–21",     "5–21",    e => e.bilirubin_total),
        ("Bilirubin to'g'ri",    "µmol/L",    "0–5",      "0–5",     e => e.bilirubin_direct),
        ("Kreatinin",            "µmol/L",    "62–115",   "53–97",   e => e.creatinine),
        ("Siydikchil (Urea)",    "mmol/L",    "2.5–8.3",  "2.5–8.3", e => e.urea),
        ("Umumiy oqsil",         "g/L",       "65–85",    "65–85",   e => e.total_protein),
        ("Albumin",              "g/L",       "35–52",    "35–52",   e => e.albumin),
        ("Kaltsiy",              "mmol/L",    "2.12–2.62","2.12–2.62",e => e.calcium),
        ("Natriy",               "mmol/L",    "136–145",  "136–145", e => e.sodium),
        ("Kaliy",                "mmol/L",    "3.5–5.1",  "3.5–5.1", e => e.potassium),
        ("Temir",                "µmol/L",    "11.6–30.4","8.8–27.0",e => e.iron),
        ("TTG",                  "µIU/mL",    "0.27–4.2", "0.27–4.2",e => e.tsh),
        ("Erkin T4",             "pmol/L",    "12–22",    "12–22",   e => e.free_t4),
        ("Insulin",              "µIU/mL",    "2–25",     "2–25",    e => e.insulin),
        ("Siydik hajmi",         "mL/kun",    "1000–2000","1000–2000",e => e.urine_volume),
        ("Siydik zichligi",      "",          "1.010–1.025","1.010–1.025",e => e.urine_density),
        ("Siydik pH",            "",          "5.0–8.0",  "5.0–8.0", e => e.urine_ph),
        ("Siydik oqsili",        "g/L",       "0–0.1",    "0–0.1",   e => e.urine_protein),
        ("Siydik glyukozasi",    "mmol/L",    "0",        "0",       e => e.urine_glucose),
        ("Siydik eritrosit",     "maydon",    "0–2",      "0–2",     e => e.urine_rbc),
        ("Siydik leykosit",      "maydon",    "0–5",      "0–5",     e => e.urine_wbc),
        ("Kunlik oqsil",         "mg/24h",    "0–150",    "0–150",   e => e.daily_protein),
    };

    private void AddLabTable(Document doc, Dictionary<string, string> tr, LabAnalyses lab)
    {
        var fonts  = BuildFonts();
        var isMale = lab.Patcient?.Gender ?? true;

        var tbl = new PdfPTable(5) { WidthPercentage = 100, SpacingBefore = 6 };
        tbl.SetWidths(new[] { 32f, 14f, 14f, 20f, 20f });
        TableHead(tbl, fonts,
            tr["parameter"], tr["value"],
            tr["lab_param_unit"], tr["normal_range"], tr["assessment"]);

        int rowIdx = 0;
        foreach (var (name, unit, normM, normF, getter) in LabRows)
        {
            var val = getter(lab);
            if (val == null) continue;

            var norm   = isMale ? normM : normF;
            var valStr = val.Value.ToString("G6");
            var (badge, color, prefix) = LabAssess(val.Value, norm);
            var bg     = rowIdx++ % 2 == 0 ? CL_White : CL_RowAlt;

            var valFont  = new Font(fonts["td9bold"].BaseFont, 9, Font.NORMAL, color);
            var badgeFont= new Font(fonts["td9bold"].BaseFont, 9, Font.NORMAL, color);

            TblCell(tbl, name,           fonts["td9"],   bg, Element.ALIGN_LEFT);
            TblCell(tbl, prefix + valStr,valFont,        bg, Element.ALIGN_CENTER);
            TblCell(tbl, unit,           fonts["td9gray"],bg, Element.ALIGN_CENTER);
            TblCell(tbl, norm,           fonts["td9gray"],bg, Element.ALIGN_CENTER);

            var bc = new PdfPCell(new Phrase(badge, badgeFont))
            {
                BackgroundColor     = bg,
                Border              = Rectangle.BOTTOM_BORDER,
                BorderColorBottom   = CL_Border,
                BorderWidthBottom   = 0.3f,
                Padding             = 3,
                HorizontalAlignment = Element.ALIGN_CENTER,
            };
            tbl.AddCell(bc);
        }

        doc.Add(tbl);
    }

    private (string badge, BaseColor color, string prefix) LabAssess(decimal val, string norm)
    {
        try
        {
            if (norm.StartsWith("< ") &&
                decimal.TryParse(norm[2..], System.Globalization.NumberStyles.Any,
                    System.Globalization.CultureInfo.InvariantCulture, out var up))
                return val > up
                    ? ("↑ Yuqori", CL_BadText,  "↑ ")
                    : ("✓ Normal",  CL_GoodText, "");

            if (norm == "0")
                return val > 0
                    ? ("↑ Aniqlandi", CL_WarnText, "")
                    : ("✓ Normal",     CL_GoodText, "");

            if (norm.Contains('–') || norm.Contains('-'))
            {
                var sep   = norm.Contains('–') ? '–' : '-';
                var parts = norm.Split(sep);
                if (parts.Length == 2 &&
                    decimal.TryParse(parts[0].Trim(), System.Globalization.NumberStyles.Any,
                        System.Globalization.CultureInfo.InvariantCulture, out var lo) &&
                    decimal.TryParse(parts[1].Trim(), System.Globalization.NumberStyles.Any,
                        System.Globalization.CultureInfo.InvariantCulture, out var hi))
                {
                    if (val < lo) return ("↓ Past",    CL_WarnText,  "↓ ");
                    if (val > hi) return ("↑ Yuqori",  CL_BadText,   "↑ ");
                    return              ("✓ Normal",   CL_GoodText,  "");
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Lab norma parsingda xatolik. Norm: {Norm}", norm);
        }

        return ("✓ Normal", CL_GoodText, "");
    }

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

        // Jiddiylik va tavsiyalar — 2 ustunli blok
        var severityRaw = ai.AutomaticAnalysisBool?.ToString() ?? "0";
        int.TryParse(severityRaw, out var severityInt);

        bool hasRecs = !string.IsNullOrWhiteSpace(ai.AIRecommendations);

        if (severityInt > 0 || hasRecs)
        {
            var bottomTbl = new PdfPTable(hasRecs ? 2 : 1)
            {
                WidthPercentage = 100,
                SpacingBefore   = 4,
                SpacingAfter    = 4,
            };
            if (hasRecs) bottomTbl.SetWidths(new[] { 40f, 60f });

            // CHAP: jiddiylik
            if (severityInt > 0)
            {
                var leftContent = new PdfPCell { Border = Rectangle.NO_BORDER, Padding = 0 };
                leftContent.AddElement(ComposeSeverityWidget(tr, fonts, severityInt));

                bottomTbl.AddCell(leftContent);
            }

            // O'NG: tavsiyalar
            if (hasRecs)
            {
                var recCell = new PdfPCell { Border = Rectangle.NO_BORDER, PaddingLeft = 6 };
                recCell.AddElement(new Paragraph(tr["recommendations"] + ":", fonts["p9label"])
                    { SpacingAfter = 2 });

                foreach (var line in ai.AIRecommendations!
                             .Split('\n', StringSplitOptions.RemoveEmptyEntries))
                {
                    recCell.AddElement(new Paragraph($"• {line.Trim()}", fonts["p8"])
                        { SpacingBefore = 1 });
                }

                bottomTbl.AddCell(recCell);
            }

            doc.Add(bottomTbl);
        }

        // Yakuniy xulosa (ayrı bo'lsa)
        if (!string.IsNullOrWhiteSpace(ai.FinalSummary) && ai.FinalSummary != text)
        {
            doc.Add(new Paragraph(tr["final_summary"] + ":", fonts["p9label"])
                { SpacingBefore = 4 });
            doc.Add(new Paragraph(ai.FinalSummary.Trim(), fonts["p8"])
                { SpacingAfter = 4 });
        }
    }

    private static void AddAiTextBlock(Document doc, Dictionary<string, Font> fonts, string text)
    {
        var cell = new PdfPCell(new Phrase(text, fonts["p8_ai"]))
        {
            BackgroundColor = CL_AiBg,
            Border          = Rectangle.BOX,
            BorderColor     = CL_Green,
            BorderWidth     = 0.8f,
            Padding         = 8,
        };
        var w = new PdfPTable(1) { WidthPercentage = 100, SpacingBefore = 4, SpacingAfter = 4 };
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

        var barTbl = new PdfPTable(3) { WidthPercentage = 60 };
        barTbl.SetWidths(new[] { 33f, 33f, 34f });

        for (int i = 1; i <= 3; i++)
        {
            var bg = i <= level ? barColor : CL_Border;
            var c  = new PdfPCell(new Phrase(" "))
            {
                BackgroundColor = bg,
                Border          = Rectangle.BOX,
                BorderColor     = CL_White,
                BorderWidth     = 1.5f,
                FixedHeight     = 10f,
            };
            barTbl.AddCell(c);
        }

        var wrapper = new PdfPTable(1) { WidthPercentage = 100 };
        wrapper.AddCell(new PdfPCell(
            new Phrase($"{tr["severity"]}:", fonts["p9label"]))
        {
            Border        = Rectangle.NO_BORDER,
            PaddingBottom = 2,
        });

        var barCell = new PdfPCell(barTbl) { Border = Rectangle.NO_BORDER, PaddingBottom = 2 };
        wrapper.AddCell(barCell);

        var labelFont = new Font(fonts["p9label"].BaseFont, 10, Font.NORMAL, barColor);
        wrapper.AddCell(new PdfPCell(new Phrase($"{label.ToUpper()}  ({level}/3)", labelFont))
        {
            Border        = Rectangle.NO_BORDER,
            PaddingBottom = 4,
        });

        return wrapper;
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

            // Tashxis matni
            var diagCell = new PdfPCell(new Phrase(diag.DiagnosisText, fonts["td9"]))
            {
                BackgroundColor = CL_White,
                Border          = Rectangle.BOX,
                BorderColor     = CL_Border,
                BorderWidth     = 0.5f,
                Padding         = 6,
            };
            var diagTbl = new PdfPTable(1) { WidthPercentage = 100, SpacingBefore = 4 };
            diagTbl.AddCell(diagCell);
            doc.Add(diagTbl);

            // Shifokor nomi va sana
            var metaPhrase = new Phrase();
            metaPhrase.Add(new Chunk($"{tr["diagnosed_by"]}: {doctorName}", fonts["p8gray"]));
            if (diag.CreatedAt.HasValue)
                metaPhrase.Add(new Chunk(
                    $"   |   {tr["diagnosed_at"]}: {diag.CreatedAt.Value:dd.MM.yyyy HH:mm}",
                    fonts["p8gray"]));

            doc.Add(new Paragraph(metaPhrase) { SpacingAfter = 4 });
        }
    }

    // ════════════════════════════════════════════════════════════════════
    //  BLOK 6 — NMED RAQAMLI TASDIQLASH (imzo o'rniga)
    // ════════════════════════════════════════════════════════════════════

    private void ComposeNmedVerification(Document doc, Dictionary<string, string> tr,
        Dictionary<string, Font> fonts, string docNum, DateTime date)
    {
        // ── Ikki ustunli: [Logo + matnlar | bo'sh (QR kelajakda)] ─────
        var outer = new PdfPTable(1) { WidthPercentage = 100, SpacingBefore = 8, SpacingAfter = 4 };

        var inner = new PdfPTable(2) { WidthPercentage = 100 };
        inner.SetWidths(new[] { 15f, 85f });

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
        textCell.AddElement(new Paragraph("nmed.uz", fonts["verify_url"]));
        inner.AddCell(textCell);

        var outerCell = new PdfPCell(inner)
        {
            BackgroundColor = CL_VerifyBg,
            Border          = Rectangle.BOX,
            BorderColor     = CL_Border,
            BorderWidth     = 0.5f,
            Padding         = 0,
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
            var image = iTextSharp.text.Image.GetInstance(SimpleQrPng.CreateVersion4Low(verifyUrl));
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
            BackgroundColor = CL_VerifyBg,
            Border = Rectangle.BOX,
            BorderColor = CL_Border,
            BorderWidth = 0.5f,
            Padding = 0,
        });
        doc.Add(outer);
    }

    private static void ComposeDisclaimer(Document doc,
        Dictionary<string, string> tr, Dictionary<string, Font> fonts)
    {
        var cell = new PdfPCell(new Phrase($"⚠  {tr["disclaimer"]}", fonts["disclaimer"]))
        {
            BackgroundColor = CL_DisclBg,
            Border          = Rectangle.BOX,
            BorderColor     = CL_DisclBorder,
            BorderWidth     = 0.5f,
            Padding         = 7,
        };

        var tbl = new PdfPTable(1) { WidthPercentage = 100, SpacingBefore = 6, SpacingAfter = 4 };
        tbl.AddCell(cell);
        doc.Add(tbl);
    }

    // ════════════════════════════════════════════════════════════════════
    //  UMUMIY YORDAMCHI METODLAR
    // ════════════════════════════════════════════════════════════════════

    /// <summary>Rangli sarlavha satri — ComposeSectionHeader</summary>
    private static void ComposeSectionHeader(Document doc,
        Dictionary<string, Font> fonts, string title, BaseColor bg)
    {
        var cell = new PdfPCell(new Phrase(title, fonts["h_white"]))
        {
            BackgroundColor = bg,
            Border          = Rectangle.NO_BORDER,
            Padding         = 5,
            PaddingLeft     = 6,
        };

        var tbl = new PdfPTable(1)
        {
            WidthPercentage = 100,
            SpacingBefore   = 8,
            SpacingAfter    = 0,
        };
        tbl.AddCell(cell);
        doc.Add(tbl);
    }

    /// <summary>2-ustunli ma'lumot jadvali</summary>
    private static PdfPTable InfoTable()
    {
        var tbl = new PdfPTable(2) { WidthPercentage = 100, SpacingAfter = 0 };
        tbl.SetWidths(new[] { 35f, 65f });
        return tbl;
    }

    private static void InfoRow(PdfPTable tbl, string label, string val,
        Dictionary<string, Font> fonts, int rowIndex)
    {
        var bg = rowIndex % 2 == 0 ? CL_White : CL_RowAlt;

        var lc = new PdfPCell(new Phrase(label, fonts["th9"]))
        {
            BackgroundColor   = bg,
            Border            = Rectangle.BOTTOM_BORDER,
            BorderColorBottom = CL_Border,
            BorderWidthBottom = 0.3f,
            Padding           = 4,
            PaddingLeft       = 6,
        };

        var vc = new PdfPCell(new Phrase(val, fonts["td9"]))
        {
            BackgroundColor   = bg,
            Border            = Rectangle.BOTTOM_BORDER,
            BorderColorBottom = CL_Border,
            BorderWidthBottom = 0.3f,
            Padding           = 4,
        };

        tbl.AddCell(lc);
        tbl.AddCell(vc);
    }

    private static void TableHead(PdfPTable tbl,
        Dictionary<string, Font> fonts, params string[] headers)
    {
        foreach (var h in headers)
        {
            tbl.AddCell(new PdfPCell(new Phrase(h, fonts["th9_inv"]))
            {
                BackgroundColor     = CL_DarkBlue,
                Border              = Rectangle.NO_BORDER,
                Padding             = 5,
                HorizontalAlignment = Element.ALIGN_CENTER,
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
            BorderWidthBottom   = 0.3f,
            Padding             = 4,
            HorizontalAlignment = align,
        });
    }

    private static void HLine(Document doc, float width, BaseColor color)
    {
        var cell = new PdfPCell { FixedHeight = width, BackgroundColor = color,
            Border = Rectangle.NO_BORDER };
        var tbl  = new PdfPTable(1) { WidthPercentage = 100 };
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

    private string PhysicalPath(string rel) =>
        Path.Combine(_env.WebRootPath ?? "",
            rel.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

    private string MaskPassport(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "—";
        try
        {
            var d = _encryption.Decrypt(raw);
            return d.Length >= 4 ? $"** ****{d[^4..]}" : "**";
        }
        catch { return "**"; }
    }

    private static int Age(DateOnly bd, DateTime now)
    {
        var a = now.Year - bd.Year;
        if (new DateOnly(now.Year, bd.Month, bd.Day) > DateOnly.FromDateTime(now)) a--;
        return a;
    }

    private static string DoctorFullName(Doctor? d)
    {
        if (d == null) return "—";
        return $"{d.LastName} {d.FirstName} {d.SureName}".Trim();
    }

    private static string BuildUserFullName(User? user)
    {
        if (user?.Doctor != null)
            return $"{user.Doctor.LastName} {user.Doctor.FirstName} {user.Doctor.SureName}".Trim();
        return user?.Username ?? "—";
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
        var baseUrl = _config["App:PublicUrl"]
            ?? _config["Frontend:PublicUrl"]
            ?? _config["Frontend:Url"]
            ?? "https://nmed.uz";
        return $"{baseUrl.TrimEnd('/')}/consultation/verify/{id}";
    }

    private static void AddLabeledText(Document doc, Dictionary<string, Font> fonts, string label, string? text)
    {
        var wrapper = new PdfPTable(1) { WidthPercentage = 100, SpacingBefore = 5, SpacingAfter = 4 };
        var phrase = new Phrase();
        phrase.Add(new Chunk($"{label}:\n", fonts["th9"]));
        phrase.Add(new Chunk(string.IsNullOrWhiteSpace(text) ? "—" : text.Trim(), fonts["td9"]));

        wrapper.AddCell(new PdfPCell(phrase)
        {
            Border = Rectangle.BOX,
            BorderColor = CL_Border,
            BackgroundColor = new BaseColor(252, 253, 253),
            Padding = 7,
        });
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
            .Select(d => $"{d!.LastName} {d.FirstName?[..1]}. {d.SureName?[..1]}."));
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

    private static string DocNum(string prefix, DateTime? dt, int id) =>
        $"{prefix}-{dt ?? DateTime.UtcNow:yyyyMM}-{id:D4}";

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

        BaseFont bf;
        try
        {
            string[] candidates =
            {
                @"C:\Windows\Fonts\arial.ttf",
                @"C:\Windows\Fonts\Arial.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/dejavu/DejaVuSans.ttf",
            };
            var found = candidates.FirstOrDefault(File.Exists);
            bf = found != null
                ? BaseFont.CreateFont(found, BaseFont.IDENTITY_H, BaseFont.EMBEDDED)
                : BaseFont.CreateFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
        }
        catch
        {
            bf = BaseFont.CreateFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
        }

        Font F(float sz, int style = Font.NORMAL, BaseColor? c = null) =>
            new Font(bf, sz, style, c ?? CL_Black);

        _fontsCache = new Dictionary<string, Font>
        {
            // Header
            ["h_13b"]         = F(13, Font.NORMAL),
            ["doc_title"]     = F(11, Font.NORMAL),
            ["analysis_title"]= F(10, Font.NORMAL,  CL_Green),
            ["nmed_logo"]     = F(14, Font.NORMAL,  CL_Green),
            ["nmed_url"]      = F(9,  Font.ITALIC,CL_Green),
            ["p9bold"]        = F(9,  Font.NORMAL), // BOLD -> NORMAL
            ["p9gray"]        = F(9,  Font.NORMAL,CL_Gray),
            ["p8gray"]        = F(8,  Font.NORMAL,CL_Gray),
            ["p10bold"]       = F(10, Font.NORMAL,CL_Black),

            // Label (section sub-labels — yengil)
            ["p9label"]       = F(9,  Font.NORMAL,new BaseColor(68,68,68)), // #444 yengil label

            // Section headers
            ["h_white"]       = F(9,  Font.NORMAL,  CL_White),

            // Info table
            ["th9"]           = F(9,  Font.NORMAL,  new BaseColor(51,51,51)),
            ["td9"]           = F(9,  Font.NORMAL,CL_Black),
            ["td9bold"]       = F(9,  Font.NORMAL,CL_Black),   // BOLD → NORMAL (o'qish oson)
            ["td9gray"]       = F(9,  Font.NORMAL,CL_Gray),
            ["th9_inv"]       = F(9,  Font.NORMAL,  CL_White),

            // AI
            ["p8_ai"]         = F(8,  Font.NORMAL,new BaseColor(34,34,34)),
            ["p8"]            = F(8,  Font.NORMAL,CL_Black),

            // HRV cards
            ["hrv_val"]       = F(12, Font.NORMAL,  CL_Black),
            ["hrv_label"]     = F(8,  Font.NORMAL,CL_Gray),

            // NMED verification
            ["verify_title"]  = F(8,  Font.NORMAL,CL_Green),   // BOLD → NORMAL
            ["verify_sub"]    = F(8,  Font.NORMAL,new BaseColor(85,85,85)),
            ["verify_url"]    = F(8,  Font.ITALIC,CL_Green),

            // Disclaimer
            ["disclaimer"]    = F(8,  Font.NORMAL,CL_DisclBorder), // BOLD → NORMAL (o'qish oson)
        };

        return _fontsCache;
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
            var data = Encoding.UTF8.GetBytes(text);
            if (data.Length > 78)
                throw new InvalidOperationException("QR tasdiqlash URL juda uzun. App:PublicUrl qiymatini qisqartiring.");

            var dataCodewords = BuildDataCodewords(data);
            var eccCodewords = ReedSolomonComputeRemainder(dataCodewords, EccCodewords);
            var allCodewords = dataCodewords.Concat(eccCodewords).ToArray();

            var modules = new bool[Size, Size];
            var reserved = new bool[Size, Size];
            DrawFunctionPatterns(modules, reserved);
            DrawCodewords(modules, reserved, allCodewords);
            ApplyMask0(modules, reserved);
            DrawFormatBits(modules, reserved, 0);

            return RenderPng(modules, 6, 4);
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
            var pixels = (Size + quietZone * 2) * scale;
            using var bitmap = new System.Drawing.Bitmap(pixels, pixels);
            using (var graphics = System.Drawing.Graphics.FromImage(bitmap))
            {
                graphics.Clear(System.Drawing.Color.White);
                using var brush = new System.Drawing.SolidBrush(System.Drawing.Color.Black);

                for (var y = 0; y < Size; y++)
                {
                    for (var x = 0; x < Size; x++)
                    {
                        if (!modules[y, x])
                            continue;
                        graphics.FillRectangle(brush,
                            (x + quietZone) * scale,
                            (y + quietZone) * scale,
                            scale,
                            scale);
                    }
                }
            }

            using var ms = new MemoryStream();
            bitmap.Save(ms, System.Drawing.Imaging.ImageFormat.Png);
            return ms.ToArray();
        }
    }

    private class FooterEvent : PdfPageEventHelper
    {
        private readonly Dictionary<string, Font>   _f;
        private readonly Dictionary<string, string> _tr;
        private readonly string _docNum;
        private PdfTemplate? _totalPages;

        public FooterEvent(Dictionary<string, Font> f,
            Dictionary<string, string> tr, string docNum)
        {
            _f = f; _tr = tr; _docNum = docNum;
        }

        public override void OnOpenDocument(PdfWriter writer, Document document)
        {
            _totalPages = writer.DirectContent.CreateTemplate(30, 16);
        }

        public override void OnEndPage(PdfWriter writer, Document document)
        {
            var cb = writer.DirectContent;
            var ps = document.PageSize;
            var y  = document.BottomMargin - 8;

            // ── #1D9E75 chiziq ────────────────────────────────────────
            cb.SetColorStroke(CL_Green);
            cb.SetLineWidth(0.5f);
            cb.MoveTo(document.LeftMargin, y + 8);
            cb.LineTo(ps.Width - document.RightMargin, y + 8);
            cb.Stroke();

            // ── CHAP: platforma nomi ──────────────────────────────────
            ColumnText.ShowTextAligned(cb, Element.ALIGN_LEFT,
                new Phrase($"{_tr["footer_platform"]} | nmed.uz", _f["p8gray"]),
                document.LeftMargin, y, 0);

            // ── MARKAZDA: hujjat raqami ───────────────────────────────
            ColumnText.ShowTextAligned(cb, Element.ALIGN_CENTER,
                new Phrase($"{_tr["doc_number_prefix"]}: {_docNum}", _f["p8gray"]),
                ps.Width / 2, y, 0);

            // ── O'NG: sahifa raqami (X / Y) ───────────────────────────
            var pageText = $"{_tr["footer_page"]} {writer.PageNumber} {_tr["footer_of"]} ";
            var rightX = ps.Width - document.RightMargin;
            var textWidth = _f["p8gray"].BaseFont.GetWidthPoint(pageText, 8);
            var totalWidth = _f["p8gray"].BaseFont.GetWidthPoint("00", 8); // max 2 raqam
            var startX = rightX - textWidth - totalWidth;

            // Avval matn, keyin template
            ColumnText.ShowTextAligned(cb, Element.ALIGN_LEFT,
                new Phrase(pageText, _f["p8gray"]), startX, y, 0);
            cb.AddTemplate(_totalPages!, startX + textWidth, y);
        }

        public override void OnCloseDocument(PdfWriter writer, Document document)
        {
            if (_totalPages == null) return;
            _totalPages.BeginText();
            _totalPages.SetFontAndSize(_f["p8gray"].BaseFont, 8);
            _totalPages.SetColorFill(new BaseColor(136, 136, 136)); // #888
            _totalPages.ShowText(writer.PageNumber.ToString());
            _totalPages.EndText();
        }
    }
}
