using EkgAnalyzerApi.Helpers;
using EkgAnalyzerApi.Models;
using iTextSharp.text;
using iTextSharp.text.pdf;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services;

/// <summary>
/// Vipiska (statsionardan chiqarish epikrizi) PDF hujjati.
///
/// Boshqa NMED hisobotlaridan farqi:
///   • shapkada FAQAT klinika (nomi, logotipi, manzili, telefonlari) —
///     NMED logotipi o'ng tomonda yo'q;
///   • hujjat raqami — shifokor kiritgan ИБ raqami;
///   • imzo joyi YO'Q (loyiha egasining qarori) — haqiqiylikni pastdagi
///     QR kod tasdiqlaydi, u ommaviy `/verify/{token}` sahifasini ochadi;
///   • AI ogohlantirishi qo'yilmaydi: hujjatni shifokor tuzadi.
/// </summary>
public partial class PdfReportService
{
    public async Task<byte[]> GenerateDischargeReport(int id, string lang)
    {
        lang = lang?.Trim().ToLowerInvariant() switch { "ru" => "ru", "en" => "en", _ => "uz" };
        var tr = PdfTranslations.Get(lang);
        var dt = DischargeTr(lang);

        var row = await _context.DischargeSummaries.AsNoTracking()
            .Include(d => d.Patient)
            .Include(d => d.Doctor)
            .Include(d => d.Clinic).ThenInclude(c => c!.ClinicDetail).ThenInclude(d => d!.District).ThenInclude(d => d!.Region)
            .Include(d => d.Clinic).ThenInclude(c => c!.ClinicPhoneNumber)
            .Include(d => d.Items)
            .Include(d => d.Complaints).ThenInclude(c => c.Complaint)
            .Include(d => d.Consultations).ThenInclude(c => c.Consultation).ThenInclude(c => c!.Conclusion)
            .Include(d => d.Consultations).ThenInclude(c => c.Consultation).ThenInclude(c => c!.Doctor)
            .Include(d => d.Consultations).ThenInclude(c => c.Consultation).ThenInclude(c => c!.Clinic)
            .Include(d => d.Prescriptions)
            .FirstOrDefaultAsync(d => d.Id == id)
            ?? throw new KeyNotFoundException($"Vipiska #{id}");

        if (row.Patient == null)
            throw new KeyNotFoundException($"Vipiska #{id} bemori topilmadi");

        var docNum = row.HistoryNumber;
        var version = AppTime.ToLocal(row.UpdatedAt ?? row.CreatedAt ?? DateTime.UtcNow, _config);
        var verifyUrl = BuildAnalysisVerifyUrl("discharge", row.Id);

        var ms = new MemoryStream();
        var fonts = BuildFonts();
        var doc = OpenPdf(ms, tr, fonts, row.Clinic, docNum);

        ComposeDocTitle(doc, fonts, tr, dt["document_date"] + ": " + row.DocumentDate.ToString("dd.MM.yyyy"),
            dt["title"], row.HistoryNumber, null, numberLabel: dt["history_number"]);

        // ── Bemor va yotish ma'lumotlari ──
        ComposeSectionHeader(doc, fonts, tr["patient_info"], CL_DarkBlue);
        var p = row.Patient;
        doc.Add(Card(InfoGrid(new List<(string, string)>
        {
            (tr["fio"], $"{p.LastName?.ToUpper()} {p.FirstName}".Trim()),
            (tr["birth_date"], BirthDateText(p.BirthDate, row.AdmissionDate.ToDateTime(TimeOnly.MinValue), tr)),
            (tr["gender"], GenderText(p.Gender, tr)),
            (dt["treating_doctor"], DoctorFullName(row.Doctor)),
            (dt["admission_date"], row.AdmissionDate.ToString("dd.MM.yyyy")),
            (dt["discharge_date"], row.DischargeDate.ToString("dd.MM.yyyy")),
            (dt["bed_days"], BedDays(row.AdmissionDate, row.DischargeDate).ToString()),
        }, fonts, boldFirstValue: true)));

        // ── Diagnoz ──
        if (HasAny(row.DiagnosisMain, row.DiagnosisConcomitant, row.DiagnosisComplications))
        {
            ComposeSectionHeader(doc, fonts, dt["diagnosis"], CL_DarkBlue);
            AddLabeledTextIfAny(doc, fonts, dt["diag_main"], row.DiagnosisMain);
            AddLabeledTextIfAny(doc, fonts, dt["diag_concomitant"], row.DiagnosisConcomitant);
            AddLabeledTextIfAny(doc, fonts, dt["diag_complications"], row.DiagnosisComplications);
        }

        // ── Shikoyatlar, anamnez, ob'ektiv ko'rik ──
        var complaintNames = row.Complaints
            .Select(c => c.Complaint == null ? null : lang switch
            {
                "ru" => c.Complaint.NameRu ?? c.Complaint.NameUz,
                "en" => c.Complaint.NameEn ?? c.Complaint.NameUz,
                _ => c.Complaint.NameUz ?? c.Complaint.NameRu,
            })
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .ToList();
        var complaintsText = string.Join("; ", complaintNames);
        if (!string.IsNullOrWhiteSpace(row.ComplaintsText))
            complaintsText = string.IsNullOrWhiteSpace(complaintsText)
                ? row.ComplaintsText
                : $"{complaintsText}. {row.ComplaintsText}";

        if (HasAny(complaintsText, row.Anamnesis, row.ObjectiveStatus))
        {
            ComposeSectionHeader(doc, fonts, dt["clinical"], CL_DarkBlue);
            AddLabeledTextIfAny(doc, fonts, dt["complaints"], complaintsText);
            AddLabeledTextIfAny(doc, fonts, dt["anamnesis"], row.Anamnesis);
            AddLabeledTextIfAny(doc, fonts, dt["objective"], row.ObjectiveStatus);
        }

        // ── Tekshiruvlar ──
        if (row.Items.Count > 0)
        {
            ComposeSectionHeader(doc, fonts, dt["examinations"], CL_DarkBlue);
            foreach (var item in row.Items.OrderBy(i => i.SnapshotDate))
                await AddDischargeExamination(doc, tr, dt, fonts, lang, item);
        }

        // ── Konsultatsiya xulosalari ──
        var consultations = row.Consultations
            .Select(c => c.Consultation)
            .Where(c => c?.Conclusion != null)
            .OrderBy(c => c!.ConsultationDate)
            .ToList();
        if (consultations.Count > 0)
        {
            ComposeSectionHeader(doc, fonts, dt["consultations"], CL_DarkBlue);
            foreach (var c in consultations)
            {
                var label = $"{dt["consultation"]} — {c!.ConsultationDate:dd.MM.yyyy}, {DoctorFullName(c.Doctor)}";
                if (!string.IsNullOrWhiteSpace(c.Clinic?.ClinicName)) label += $" ({c.Clinic.ClinicName})";

                var text = $"{dt["cons_diagnosis"]}: {c.Conclusion!.Diagnosis?.Trim()}";
                if (!string.IsNullOrWhiteSpace(c.Conclusion.Treatment))
                    text += $"\n{dt["cons_treatment"]}: {c.Conclusion.Treatment.Trim()}";
                AddLabeledText(doc, fonts, label, text);
            }
        }

        // ── Davolash va chiqishdagi holat ──
        if (HasAny(row.Treatment, row.DischargeCondition))
        {
            ComposeSectionHeader(doc, fonts, dt["course"], CL_DarkBlue);
            AddLabeledTextIfAny(doc, fonts, dt["treatment"], row.Treatment);
            AddLabeledTextIfAny(doc, fonts, dt["discharge_condition"], row.DischargeCondition);
        }

        // ── Tavsiyalar ──
        var prescriptions = row.Prescriptions.OrderBy(x => x.SortOrder).ToList();
        if (prescriptions.Count > 0 || !string.IsNullOrWhiteSpace(row.RecommendationsText))
        {
            ComposeSectionHeader(doc, fonts, dt["recommendations"], CL_DarkBlue);
            AddPrescriptionTable(doc, dt, fonts, prescriptions);
            AddLabeledTextIfAny(doc, fonts, dt["recommendations_other"], row.RecommendationsText);
        }

        // ── QR tasdiqlash (imzo o'rniga) ──
        ComposeNmedVerification(doc, tr, fonts, docNum, version, verifyUrl);

        // ── Bemor uchun nusxa ──
        if (row.IncludePatientCopy && (prescriptions.Count > 0 || !string.IsNullOrWhiteSpace(row.RecommendationsText)))
        {
            doc.NewPage();
            ComposeDocTitle(doc, fonts, tr, null, dt["patient_copy_title"], row.HistoryNumber,
                row.DischargeDate.ToDateTime(TimeOnly.MinValue), numberLabel: dt["history_number"], dateOnly: true);

            doc.Add(Card(InfoGrid(new List<(string, string)>
            {
                (tr["fio"], $"{p.LastName?.ToUpper()} {p.FirstName}{(p.BirthDate is { } bd ? $"  ({bd:yyyy})" : "")}".Trim()),
                (dt["history_number"], row.HistoryNumber),
                (dt["treating_doctor"], DoctorFullName(row.Doctor)),
                (dt["discharge_date"], row.DischargeDate.ToString("dd.MM.yyyy")),
            }, fonts, boldFirstValue: true)));

            ComposeSectionHeader(doc, fonts, dt["recommendations"], CL_DarkBlue);
            AddPrescriptionTable(doc, dt, fonts, prescriptions);
            AddLabeledTextIfAny(doc, fonts, dt["recommendations_other"], row.RecommendationsText);
        }

        doc.Close();
        return ms.ToArray();
    }

    /// <summary>Vipiskaga kiritilgan bitta tekshiruv.</summary>
    private async Task AddDischargeExamination(Document doc, Dictionary<string, string> tr,
        Dictionary<string, string> dt, Dictionary<string, Font> fonts, string lang, DischargeSummaryItem item)
    {
        var date = AppTime.ToLocal(item.SnapshotDate, _config);
        var label = $"{DischargeTypeName(lang, item.AnalysisType)} — {date:dd.MM.yyyy}";

        if (item.AnalysisType == "lab")
        {
            var lab = await _context.LabAnalyse.AsNoTracking()
                .Include(l => l.Patcient)
                .FirstOrDefaultAsync(l => l.Id == item.AnalysisId);
            if (lab == null)
            {
                AddLabeledText(doc, fonts, label, dt["source_deleted"]);
                return;
            }

            if (!string.IsNullOrWhiteSpace(lab.DocumentNumber)) label += $"  (№ {lab.DocumentNumber})";
            doc.Add(new Paragraph(label, fonts["p9label"]) { SpacingBefore = 10, SpacingAfter = 0 });
            AddLabTable(doc, tr, lab);
            await AddDischargeConclusions(doc, dt, fonts, "lab", item.AnalysisId, null);
            return;
        }

        (bool exists, string? docNumber, string? aiSummary) source = item.AnalysisType switch
        {
            "ecg" => await _context.ECGAnalyse.AsNoTracking().Where(a => a.Id == item.AnalysisId)
                .Select(a => new { a.DocumentNumber, a.AIAnswerData }).FirstOrDefaultAsync() is { } e
                ? (true, e.DocumentNumber, DischargeSummaryService.AiSummary(e.AIAnswerData, _logger)) : default,
            "holter" => await _context.HolterAnalyses.AsNoTracking().Where(a => a.Id == item.AnalysisId)
                .Select(a => new { a.DocumentNumber, a.AIAnswerData }).FirstOrDefaultAsync() is { } h
                ? (true, h.DocumentNumber, DischargeSummaryService.AiSummary(h.AIAnswerData, _logger)) : default,
            "smad" => await _context.SmadAnalyses.AsNoTracking().Where(a => a.Id == item.AnalysisId)
                .Select(a => new { a.DocumentNumber, a.AIAnswerData }).FirstOrDefaultAsync() is { } s
                ? (true, s.DocumentNumber, DischargeSummaryService.AiSummary(s.AIAnswerData, _logger)) : default,
            "para" => await _context.ParasitologyAnalyses.AsNoTracking().Where(a => a.Id == item.AnalysisId)
                .Select(a => new { a.DocumentNumber, a.AiResponse }).FirstOrDefaultAsync() is { } pa
                ? (true, pa.DocumentNumber, DischargeSummaryService.ParaSummary(pa.AiResponse, _logger)) : default,
            _ => default,
        };

        if (!source.exists)
        {
            AddLabeledText(doc, fonts, label, dt["source_deleted"]);
            return;
        }

        if (!string.IsNullOrWhiteSpace(source.docNumber)) label += $"  (№ {source.docNumber})";
        await AddDischargeConclusions(doc, dt, fonts, item.AnalysisType, item.AnalysisId, (label, source.aiSummary));
    }

    /// <summary>
    /// Tekshiruv xulosasi: shifokor xulosasi bo'lsa — u, bo'lmasa AI xulosasi
    /// («AI xulosasi» deb belgilanadi). Laboratoriyada jadval allaqachon
    /// chiqarilgan, shuning uchun faqat shifokor xulosasi qo'shiladi.
    /// </summary>
    private async Task AddDischargeConclusions(Document doc, Dictionary<string, string> dt,
        Dictionary<string, Font> fonts, string type, int analysisId, (string label, string? ai)? fallback)
    {
        var notes = await _context.AnalysisDiagnoses.AsNoTracking()
            .Include(d => d.Doctor)
            .Where(d => d.AnalysisType == type && d.AnalysisId == analysisId)
            .OrderBy(d => d.CreatedAt)
            .Select(d => d.DiagnosisText)
            .ToListAsync();
        notes = notes.Where(n => !string.IsNullOrWhiteSpace(n)).Select(n => n.Trim()).ToList();

        if (notes.Count > 0)
        {
            AddLabeledText(doc, fonts,
                fallback?.label ?? dt["doctor_conclusion"],
                (fallback == null ? "" : $"{dt["doctor_conclusion"]}: ") + string.Join("\n", notes));
            return;
        }

        if (fallback is { } f)
            AddLabeledText(doc, fonts, f.label,
                string.IsNullOrWhiteSpace(f.ai) ? "—" : $"{dt["ai_conclusion"]}: {f.ai}");
    }

    private void AddPrescriptionTable(Document doc, Dictionary<string, string> dt,
        Dictionary<string, Font> fonts, List<DischargeSummaryPrescription> rows)
    {
        if (rows.Count == 0) return;

        var tbl = new PdfPTable(6) { WidthPercentage = 100, SpacingBefore = 6, SpacingAfter = 4, HeaderRows = 1 };
        tbl.KeepTogether = rows.Count <= 12;
        tbl.SetWidths(new[] { 6f, 28f, 15f, 19f, 12f, 20f });
        TableHead(tbl, fonts, "№", dt["rx_drug"], dt["rx_dose"], dt["rx_frequency"], dt["rx_time"], dt["rx_duration"]);

        for (var i = 0; i < rows.Count; i++)
        {
            var r = rows[i];
            var bg = i % 2 == 0 ? CL_White : CL_RowAlt;
            TblCell(tbl, (i + 1).ToString(), fonts["td9"], bg, Element.ALIGN_CENTER);
            TblCell(tbl, r.DrugName, fonts["td9"], bg, Element.ALIGN_LEFT);
            TblCell(tbl, r.Dose ?? "—", fonts["td9"], bg, Element.ALIGN_LEFT);
            TblCell(tbl, r.Frequency ?? "—", fonts["td9"], bg, Element.ALIGN_LEFT);
            TblCell(tbl, r.IntakeTime ?? "—", fonts["td9"], bg, Element.ALIGN_CENTER);
            TblCell(tbl, r.Duration ?? "—", fonts["td9"], bg, Element.ALIGN_LEFT);
        }

        doc.Add(tbl);
    }

    private static bool HasAny(params string?[] values) => values.Any(v => !string.IsNullOrWhiteSpace(v));

    /// <summary>Yotgan kunlar (койко-дни): kirgan va chiqqan kun bir xil bo'lsa ham 1 kun.</summary>
    private static int BedDays(DateOnly admission, DateOnly discharge) =>
        Math.Max(discharge.DayNumber - admission.DayNumber, 1);

    private static string DischargeTypeName(string lang, string type) => (lang, type) switch
    {
        ("ru", "ecg") => "ЭКГ",
        ("ru", "holter") => "Холтер-мониторинг",
        ("ru", "smad") => "СМАД",
        ("ru", "lab") => "Лабораторный анализ",
        ("ru", "para") => "Паразитологический анализ",
        ("en", "ecg") => "ECG",
        ("en", "holter") => "Holter monitoring",
        ("en", "smad") => "ABPM",
        ("en", "lab") => "Laboratory test",
        ("en", "para") => "Parasitology test",
        (_, "ecg") => "EKG",
        (_, "holter") => "Holter monitoring",
        (_, "smad") => "SMAD",
        (_, "lab") => "Laboratoriya tahlili",
        (_, "para") => "Parazitologik tahlil",
        _ => type,
    };

    private static Dictionary<string, string> DischargeTr(string lang) => lang switch
    {
        "ru" => DischargeRu,
        "en" => DischargeEn,
        _ => DischargeUz,
    };

    private static readonly Dictionary<string, string> DischargeUz = new()
    {
        ["title"] = "KASALLIK TARIXIDAN KO'CHIRMA (VIPISKA)",
        ["document_date"] = "Vipiska sanasi",
        ["history_number"] = "Kasallik tarixi №",
        ["admission_date"] = "Yotqizilgan sana",
        ["discharge_date"] = "Chiqarilgan sana",
        ["bed_days"] = "Yotgan kunlar",
        ["treating_doctor"] = "Davolovchi shifokor",
        ["diagnosis"] = "DIAGNOZ",
        ["diag_main"] = "Asosiy",
        ["diag_concomitant"] = "Yo'ldosh",
        ["diag_complications"] = "Asorat",
        ["clinical"] = "SHIKOYATLAR, ANAMNEZ VA OB'EKTIV KO'RIK",
        ["complaints"] = "Shikoyatlar",
        ["anamnesis"] = "Anamnez",
        ["objective"] = "Ob'ektiv ko'rik",
        ["examinations"] = "TEKSHIRUVLAR",
        ["doctor_conclusion"] = "Shifokor xulosasi",
        ["ai_conclusion"] = "AI xulosasi",
        ["source_deleted"] = "Tahlil bazadan o'chirilgan",
        ["consultations"] = "KONSULTATSIYA XULOSALARI",
        ["consultation"] = "Onlayn konsultatsiya",
        ["cons_diagnosis"] = "Tashxis",
        ["cons_treatment"] = "Tavsiya etilgan davolash",
        ["course"] = "DAVOLASH VA CHIQISHDAGI HOLAT",
        ["treatment"] = "Statsionarda o'tkazilgan davolash",
        ["discharge_condition"] = "Chiqishdagi holat",
        ["recommendations"] = "TAVSIYALAR",
        ["recommendations_other"] = "Qo'shimcha tavsiyalar",
        ["rx_drug"] = "Dori vositasi",
        ["rx_dose"] = "Doza",
        ["rx_frequency"] = "Qabul tartibi",
        ["rx_time"] = "Vaqti",
        ["rx_duration"] = "Muddati / izoh",
        ["patient_copy_title"] = "BEMOR UCHUN TAVSIYALAR",
    };

    private static readonly Dictionary<string, string> DischargeRu = new()
    {
        ["title"] = "ВЫПИСКА ИЗ ИСТОРИИ БОЛЕЗНИ",
        ["document_date"] = "Дата оформления выписки",
        ["history_number"] = "История болезни №",
        ["admission_date"] = "Дата поступления",
        ["discharge_date"] = "Дата выписки",
        ["bed_days"] = "Койко-дни",
        ["treating_doctor"] = "Лечащий врач",
        ["diagnosis"] = "ДИАГНОЗ",
        ["diag_main"] = "Основной",
        ["diag_concomitant"] = "Сопутствующий",
        ["diag_complications"] = "Осложнения",
        ["clinical"] = "ЖАЛОБЫ, АНАМНЕЗ И ОБЪЕКТИВНЫЙ СТАТУС",
        ["complaints"] = "Жалобы",
        ["anamnesis"] = "Анамнез",
        ["objective"] = "Объективно",
        ["examinations"] = "ОБСЛЕДОВАНИЯ",
        ["doctor_conclusion"] = "Заключение врача",
        ["ai_conclusion"] = "Заключение ИИ",
        ["source_deleted"] = "Анализ удалён из базы",
        ["consultations"] = "ЗАКЛЮЧЕНИЯ КОНСУЛЬТАЦИЙ",
        ["consultation"] = "Онлайн-консультация",
        ["cons_diagnosis"] = "Диагноз",
        ["cons_treatment"] = "Рекомендованное лечение",
        ["course"] = "ЛЕЧЕНИЕ И СОСТОЯНИЕ ПРИ ВЫПИСКЕ",
        ["treatment"] = "Проведённое лечение",
        ["discharge_condition"] = "Состояние при выписке",
        ["recommendations"] = "РЕКОМЕНДАЦИИ",
        ["recommendations_other"] = "Дополнительные рекомендации",
        ["rx_drug"] = "Препарат",
        ["rx_dose"] = "Доза",
        ["rx_frequency"] = "Кратность приёма",
        ["rx_time"] = "Время",
        ["rx_duration"] = "Длительность / примечание",
        ["patient_copy_title"] = "РЕКОМЕНДАЦИИ ДЛЯ ПАЦИЕНТА",
    };

    private static readonly Dictionary<string, string> DischargeEn = new()
    {
        ["title"] = "DISCHARGE SUMMARY",
        ["document_date"] = "Document date",
        ["history_number"] = "Medical record No.",
        ["admission_date"] = "Admission date",
        ["discharge_date"] = "Discharge date",
        ["bed_days"] = "Length of stay (days)",
        ["treating_doctor"] = "Attending physician",
        ["diagnosis"] = "DIAGNOSIS",
        ["diag_main"] = "Principal",
        ["diag_concomitant"] = "Concomitant",
        ["diag_complications"] = "Complications",
        ["clinical"] = "COMPLAINTS, HISTORY AND PHYSICAL EXAMINATION",
        ["complaints"] = "Complaints",
        ["anamnesis"] = "History",
        ["objective"] = "Physical examination",
        ["examinations"] = "INVESTIGATIONS",
        ["doctor_conclusion"] = "Physician's conclusion",
        ["ai_conclusion"] = "AI conclusion",
        ["source_deleted"] = "The test has been deleted",
        ["consultations"] = "CONSULTATION CONCLUSIONS",
        ["consultation"] = "Online consultation",
        ["cons_diagnosis"] = "Diagnosis",
        ["cons_treatment"] = "Recommended treatment",
        ["course"] = "TREATMENT AND CONDITION AT DISCHARGE",
        ["treatment"] = "Treatment given",
        ["discharge_condition"] = "Condition at discharge",
        ["recommendations"] = "RECOMMENDATIONS",
        ["recommendations_other"] = "Additional recommendations",
        ["rx_drug"] = "Medication",
        ["rx_dose"] = "Dose",
        ["rx_frequency"] = "Frequency",
        ["rx_time"] = "Time",
        ["rx_duration"] = "Duration / note",
        ["patient_copy_title"] = "RECOMMENDATIONS FOR THE PATIENT",
    };
}
