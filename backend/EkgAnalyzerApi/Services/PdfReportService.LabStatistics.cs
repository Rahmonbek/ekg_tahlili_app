using System.Globalization;
using System.Text.Json;
using iTextSharp.text;
using iTextSharp.text.pdf;

namespace EkgAnalyzerApi.Services;

/// <summary>
/// Klinika laboratoriya statistikasi hisoboti (`/lab-statistics` sahifasining
/// PDF nusxasi): yotiq A4, umumiy shapka/kolontitul, bo'lim sarlavhalari va
/// jadvallar boshqa hujjatlar bilan bir xil yordamchilardan. Halqa
/// diagrammalar sahifadagi kabi — `RingEvent` chizadi.
/// </summary>
public partial class PdfReportService
{
    /// <summary>Hisobot ma'lumoti — statistika servisi javoblari (JSON) va filtr matni.</summary>
    public sealed class LabStatsReportData
    {
        public JsonElement Summary { get; init; }
        public JsonElement Timeline { get; init; }
        public JsonElement Indicators { get; init; }
        public JsonElement Doctors { get; init; }
        public JsonElement Signals { get; init; }
        /// <summary>(yorliq, qiymat) — davr, shifokor, jinsi… (allaqachon tilga mos).</summary>
        public List<(string Label, string Value)> Filters { get; init; } = new();
    }

    /// <summary>Halqa va legenda ranglari — sahifadagi `RING_PALETTE` bilan bir xil.</summary>
    private static readonly BaseColor[] RingPalette =
    {
        new(220, 38, 38), new(249, 115, 22), new(245, 158, 11), new(132, 204, 22), new(20, 184, 166),
        new(14, 165, 233), new(99, 102, 241), new(168, 85, 247), new(236, 72, 153), new(120, 113, 108),
    };
    private static readonly BaseColor RingOther = new(203, 213, 225);
    private static readonly BaseColor CL_Track = new(238, 242, 247);

    internal static readonly Dictionary<string, (string uz, string ru, string en)> LabCategoryNames = new()
    {
        ["cbc"] = ("Umumiy qon tahlili", "Общий анализ крови", "Complete blood count"),
        ["carb"] = ("Uglevod almashinuvi", "Углеводный обмен", "Carbohydrate metabolism"),
        ["lipid"] = ("Lipid profili", "Липидный профиль", "Lipid profile"),
        ["liver"] = ("Jigar", "Печень", "Liver"),
        ["protein"] = ("Oqsillar", "Белки", "Proteins"),
        ["kidney"] = ("Buyrak", "Почки", "Kidney"),
        ["enzyme"] = ("Fermentlar", "Ферменты", "Enzymes"),
        ["electrolyte"] = ("Elektrolitlar", "Электролиты", "Electrolytes"),
        ["iron"] = ("Temir almashinuvi", "Обмен железа", "Iron metabolism"),
        ["inflammation"] = ("Yallig'lanish", "Воспаление", "Inflammation"),
        ["cardiac"] = ("Yurak markerlari", "Кардиомаркеры", "Cardiac markers"),
        ["coagulation"] = ("Koagulogramma", "Коагулограмма", "Coagulation"),
        ["thyroid"] = ("Qalqonsimon bez", "Щитовидная железа", "Thyroid"),
        ["hormone"] = ("Gormonlar", "Гормоны", "Hormones"),
        ["vitamin"] = ("Vitaminlar", "Витамины", "Vitamins"),
        ["immunology"] = ("Immunologiya", "Иммунология", "Immunology"),
        ["infection"] = ("Infeksiya markerlari", "Маркеры инфекций", "Infection markers"),
        ["tumor"] = ("Onkomarkerlar", "Онкомаркеры", "Tumor markers"),
        ["blood_group"] = ("Qon guruhi", "Группа крови", "Blood group"),
        ["urine"] = ("Umumiy siydik tahlili", "Общий анализ мочи", "Urinalysis"),
        ["nechiporenko"] = ("Nechiporenko", "Нечипоренко", "Nechiporenko"),
        ["urine_daily"] = ("Sutkalik siydik", "Суточная моча", "24h urine"),
    };

    public byte[] GenerateLabStatisticsReport(LabStatsReportData data, string lang)
    {
        var tr = PdfTranslations.Get(lang);
        var lg = (lang ?? "uz").ToLowerInvariant() switch { "ru" => "ru", "en" => "en", _ => "uz" };
        string L(string uz, string ru, string en) => lg == "ru" ? ru : lg == "en" ? en : uz;
        string Cat(string? key) => key != null && LabCategoryNames.TryGetValue(key, out var n)
            ? (lg == "ru" ? n.ru : lg == "en" ? n.en : n.uz) : key ?? "—";

        var ms = new MemoryStream();
        var fonts = BuildFonts();
        var now = AppTime.LocalNow(_config);
        var docNum = $"STAT-{now:yyyyMMdd-HHmm}";
        var doc = OpenPdf(ms, tr, fonts, null, docNum, PageSize.A4.Rotate());

        var fRed = new Font(fonts["td9bold"].BaseFont, MinFontSize, Font.NORMAL, CL_BadText);
        var fAmber = new Font(fonts["td9bold"].BaseFont, MinFontSize, Font.NORMAL, CL_WarnText);
        var fBig = new Font(fonts["td9bold"].BaseFont, 20f, Font.NORMAL, CL_DarkBlue);
        var fBigRed = new Font(fonts["td9bold"].BaseFont, 20f, Font.NORMAL, CL_BadText);
        var fBigAmber = new Font(fonts["td9bold"].BaseFont, 20f, Font.NORMAL, CL_WarnText);

        ComposeDocTitle(doc, fonts, tr, L("Klinika hisoboti", "Отчёт клиники", "Clinic report"),
            L("Laboratoriya statistikasi", "Статистика лабораторных анализов", "Laboratory statistics"),
            docNum, now, L("Hisobot", "Отчёт", "Report"));

        // ── Hisobot parametrlari ─────────────────────────────────────────
        ComposeSectionHeader(doc, fonts, L("Hisobot parametrlari", "Параметры отчёта", "Report parameters"), CL_DarkBlue);
        doc.Add(Card(InfoGrid(data.Filters.Select(f => (f.Label, f.Value)).ToList(), fonts)));

        var c = Obj(data.Summary, "counts");
        var v = Obj(data.Summary, "values");
        var analyses = Num(c, "analyses");
        if (analyses == 0)
        {
            doc.Add(new Paragraph(L("Tanlangan filtr bo'yicha ma'lumot yo'q", "По выбранному фильтру данных нет",
                "No data for the selected filter"), fonts["p9gray"]) { SpacingBefore = 16 });
            doc.Close();
            return ms.ToArray();
        }

        // ── Asosiy ko'rsatkichlar ────────────────────────────────────────
        var high = Num(v, "high");
        var low = Num(v, "low");
        var assessed = high + low + Num(v, "normal");
        var patients = Num(c, "patients");
        ComposeSectionHeader(doc, fonts, L("Asosiy ko'rsatkichlar", "Основные показатели", "Key figures"), CL_DarkBlue);
        var kpi = new PdfPTable(5) { WidthPercentage = 100, SpacingBefore = 2, SpacingAfter = 2 };
        void Kpi(string label, string value, Font vf, string sub)
        {
            var cell = new PdfPCell
            {
                Border = Rectangle.NO_BORDER, PaddingLeft = 12, PaddingRight = 8, PaddingTop = 6, PaddingBottom = 10,
                CellEvent = new RoundedCell(CL_PanelBg, CL_Border, 7f),
            };
            cell.AddElement(new Paragraph(label, fonts["th9"]) { Leading = 14f });
            cell.AddElement(new Paragraph(value, vf) { Leading = 26f });
            cell.AddElement(new Paragraph(sub, fonts["td9gray"]) { Leading = 14f });
            kpi.AddCell(Gap(cell));
        }
        Kpi(L("Tahlillar", "Анализы", "Analyses"), Fmt(analyses), fBig,
            $"{Fmt(patients > 0 ? (double)analyses / patients : 0, 1)} {L("tahlil / bemor", "анализа / пациент", "per patient")}");
        Kpi(L("Bemorlar", "Пациенты", "Patients"), Fmt(patients), fBig,
            $"{Fmt(Num(v, "value_count"))} {L("qiymat", "значений", "values")}");
        Kpi(L("Me'yordan tashqari", "Вне нормы", "Out of range"), $"{Fmt(high + low)} / {Fmt(assessed)}", fBigRed,
            $"↑ {Fmt(high)} · ↓ {Fmt(low)} · {Pct(high + low, assessed)}");
        Kpi(L("Patologiyali tahlillar", "Анализы с патологией", "Analyses with pathology"), Fmt(Num(c, "abnormal_analyses")), fBigAmber,
            $"{Pct(Num(c, "abnormal_analyses"), analyses)} {L("tahlillardan", "от анализов", "of analyses")}");
        Kpi(L("AI: og'ir holat", "ИИ: тяжёлое состояние", "AI: severe"), Fmt(Num(c, "severity3")),
            Num(c, "severity3") > 0 ? fBigRed : fBig,
            $"{Pct(Num(c, "severity3"), analyses)} {L("tahlillardan", "от анализов", "of analyses")}");
        doc.Add(kpi);

        var notes = new List<string>();
        if (Num(c, "no_date") > 0) notes.Add($"{L("sanasi noma'lum", "дата неизвестна", "date unknown")}: {Num(c, "no_date")}");
        if (Num(c, "processing") > 0) notes.Add($"{L("AI kutmoqda", "ожидают ИИ", "awaiting AI")}: {Num(c, "processing")}");
        if (Num(c, "failed") > 0) notes.Add($"{L("AI xatosi", "ошибка ИИ", "AI error")}: {Num(c, "failed")}");
        if (notes.Count > 0)
            doc.Add(new Paragraph(string.Join("   ·   ", notes), fonts["td9gray"]) { SpacingBefore = 4 });

        // ── Vaqt bo'yicha ───────────────────────────────────────────────
        var timeline = Arr(Obj(data.Timeline, "rows")).ToList();
        if (timeline.Count > 0)
        {
            ComposeSectionHeader(doc, fonts, L("Oylar bo'yicha", "По месяцам", "By month"), CL_DarkBlue);
            var t = Tbl(new[] { 18f, 14f, 14f, 18f, 22f, 14f });
            HeadCompact(t, fonts, L("Oy", "Месяц", "Month"), L("Tahlillar", "Анализы", "Analyses"),
                L("Bemorlar", "Пациенты", "Patients"), L("Patologiyali", "С патологией", "With pathology"),
                L("Patologiya ulushi", "Доля патологии", "Pathology rate"), L("Og'ir (AI)", "Тяжёлые (ИИ)", "Severe (AI)"));
            var i = 0;
            foreach (var r in timeline.AsEnumerable().Reverse())
            {
                var bg = i++ % 2 == 0 ? CL_White : CL_RowAlt;
                var p = Str(r, "period") ?? "";
                TblCell(t, p.Length >= 7 ? $"{p.Substring(5, 2)}.{p[..4]}" : p, fonts["td9bold"], bg, Element.ALIGN_LEFT);
                NumCell(t, Num(r, "analyses"), fonts["td9"], bg);
                NumCell(t, Num(r, "patients"), fonts["td9"], bg);
                NumCell(t, Num(r, "abnormal"), fonts["td9"], bg);
                PctCell(t, Num(r, "abnormal"), Num(r, "analyses"), fonts["td9bold"], bg, CL_BadText);
                NumCell(t, Num(r, "severe"), Num(r, "severe") > 0 ? fRed : fonts["td9gray"], bg);
            }
            doc.Add(t);
        }

        // ── Bemorlar va tahlillar tarkibi (4 ta halqa) ───────────────────
        ComposeSectionHeader(doc, fonts, L("Bemorlar va tahlillar tarkibi", "Состав пациентов и анализов",
            "Patients and analyses breakdown"), CL_DarkBlue);
        var unknown = L("Noma'lum", "Неизвестно", "Unknown");
        var sexNames = new Dictionary<string, string>
        {
            ["male"] = L("Erkak", "Мужской", "Male"), ["female"] = L("Ayol", "Женский", "Female"), ["unknown"] = unknown,
        };
        var sexColors = new Dictionary<string, BaseColor>
        {
            ["male"] = new(37, 99, 235), ["female"] = new(236, 72, 153), ["unknown"] = RingOther,
        };
        var sex = Arr(Obj(data.Summary, "sex"))
            .Select(r => (Str(r, "key") ?? "", Num(r, "patients")))
            .Select(x => (sexNames.GetValueOrDefault(x.Item1, x.Item1), x.Item2, sexColors.GetValueOrDefault(x.Item1, RingOther)))
            .ToList();
        var ageOrder = new[] { "0-17", "18-29", "30-44", "45-59", "60-74", "75+", "unknown" };
        var ageColors = new BaseColor[] { new(186, 230, 253), new(125, 211, 252), new(56, 189, 248), new(14, 165, 233), new(3, 105, 161), new(30, 58, 138), RingOther };
        var ageMap = Arr(Obj(data.Summary, "ages")).ToDictionary(r => Str(r, "key") ?? "", r => Num(r, "patients"));
        var ages = ageOrder.Select((g, i) => (g == "unknown" ? unknown : g, ageMap.GetValueOrDefault(g), ageColors[i])).ToList();
        var sev = new List<(string, long, BaseColor)>
        {
            (L("Yengil", "Лёгкая", "Mild"), Num(c, "severity1"), new BaseColor(15, 118, 110)),
            (L("O'rtacha", "Средняя", "Moderate"), Num(c, "severity2"), new BaseColor(245, 158, 11)),
            (L("Og'ir", "Тяжёлая", "Severe"), Num(c, "severity3"), new BaseColor(220, 38, 38)),
        };
        var fileNames = new Dictionary<string, string> { ["pdf"] = "PDF", ["image"] = L("Rasm", "Изображение", "Image"), ["xlsx"] = "Excel", ["other"] = L("Boshqa", "Другое", "Other") };
        var fileColors = new Dictionary<string, BaseColor> { ["pdf"] = new(220, 38, 38), ["image"] = new(168, 85, 247), ["xlsx"] = new(22, 163, 74) };
        var files = Arr(Obj(data.Summary, "files"))
            .Select(r => (fileNames.GetValueOrDefault(Str(r, "key") ?? "", Str(r, "key") ?? ""), Num(r, "files"),
                fileColors.GetValueOrDefault(Str(r, "key") ?? "", RingOther)))
            .ToList();

        var rings = new PdfPTable(4) { WidthPercentage = 100, SpacingBefore = 4, SpacingAfter = 2 };
        rings.DefaultCell.Border = Rectangle.NO_BORDER;
        var patientsWord = L("bemor", "пациентов", "patients");
        var analysesWord = L("tahlil", "анализов", "analyses");
        rings.AddCell(Gap(RingPanel(L("Jinsi", "Пол", "Sex"), sex, patientsWord, fonts, 62f)));
        rings.AddCell(Gap(RingPanel(L("Yosh guruhlari", "Возрастные группы", "Age groups"), ages, patientsWord, fonts, 62f)));
        rings.AddCell(Gap(RingPanel(L("AI jiddiylik darajasi", "Степень тяжести по ИИ", "AI severity"), sev, analysesWord, fonts, 62f)));
        rings.AddCell(Gap(RingPanel(L("Fayl turlari", "Типы файлов", "File types"), files, L("fayl", "файлов", "files"), fonts, 62f)));
        KeepRoomOrBreak(doc, 220f);
        doc.Add(rings);

        // ── Tahlil guruhlari ────────────────────────────────────────────
        var cats = Arr(Obj(data.Summary, "categories")).ToList();
        if (cats.Count > 0)
        {
            ComposeSectionHeader(doc, fonts, L("Tahlil guruhlari bo'yicha", "По группам анализов", "By analysis group"), CL_DarkBlue);
            var t = Tbl(new[] { 26f, 11f, 11f, 11f, 11f, 9f, 9f, 18f });
            HeadCompact(t, fonts, L("Tahlil guruhi", "Группа анализов", "Analysis group"), L("Qiymatlar", "Значения", "Values"),
                L("Tahlillar", "Анализы", "Analyses"), L("Bemorlar", "Пациенты", "Patients"), L("Me'yorda", "В норме", "Normal"),
                "↑", "↓", L("Patologiya ulushi", "Доля патологии", "Pathology rate"));
            var i = 0;
            foreach (var r in cats)
            {
                var bg = i++ % 2 == 0 ? CL_White : CL_RowAlt;
                TblCell(t, Cat(Str(r, "key")), fonts["td9bold"], bg, Element.ALIGN_LEFT);
                NumCell(t, Num(r, "value_count"), fonts["td9"], bg);
                NumCell(t, Num(r, "analyses"), fonts["td9"], bg);
                NumCell(t, Num(r, "patients"), fonts["td9"], bg);
                NumCell(t, Num(r, "normal"), fonts["td9"], bg);
                NumCell(t, Num(r, "high"), Num(r, "high") > 0 ? fRed : fonts["td9gray"], bg);
                NumCell(t, Num(r, "low"), Num(r, "low") > 0 ? fAmber : fonts["td9gray"], bg);
                PctCell(t, Num(r, "abnormal"), Num(r, "normal") + Num(r, "abnormal"), fonts["td9bold"], bg, CL_BadText);
            }
            doc.Add(t);
        }

        // ── Eng ko'p patologiya: ro'yxat chapda, halqa o'ngda ───────────
        string IndName(JsonElement r) =>
            Str(r, $"name_{lg}") ?? Str(r, "name_uz") ?? Str(r, "column_name") ?? "—";
        var inds = Arr(data.Indicators).Select(r =>
        {
            var hi = Num(r, "high"); var lo = Num(r, "low");
            return (row: r, abnormal: hi + lo, assessed: hi + lo + Num(r, "normal"));
        }).ToList();
        var withPath = inds.Where(x => x.abnormal > 0)
            .OrderByDescending(x => x.abnormal).ThenByDescending(x => x.assessed > 0 ? (double)x.abnormal / x.assessed : 0)
            .ToList();
        if (withPath.Count > 0)
        {
            // Ro'yxat (≤ 11 qator) va halqa bitta blok — sarlavha u bilan birga turadi
            KeepRoomOrBreak(doc, 120f + Math.Min(withPath.Count, 11) * 30f);
            ComposeSectionHeader(doc, fonts, L("Eng ko'p patologiya aniqlangan ko'rsatkichlar",
                "Показатели с наибольшим числом патологий", "Indicators with the most pathology"), CL_DarkBlue);
            const int topN = 10;
            var top = withPath.Take(topN).ToList();
            var restSum = withPath.Skip(topN).Sum(x => x.abnormal);
            var totalPath = withPath.Sum(x => x.abnormal);

            var legend = Tbl(new[] { 4f, 52f, 8f, 8f, 13f, 15f });
            HeadCompact(legend, fonts, 2, "", L("Ko'rsatkich", "Показатель", "Indicator"), "↑", "↓",
                L("Patologik", "Патолог.", "Abnormal"), L("Ulushi", "Доля", "Share"));
            var i = 0;
            foreach (var x in top)
            {
                var bg = i % 2 == 0 ? CL_White : CL_RowAlt;
                SwatchCell(legend, RingPalette[i % RingPalette.Length], bg);
                var name = new Phrase();
                name.Add(new Chunk(IndName(x.row), fonts["td9bold"]));
                name.Add(new Chunk($"\n{Cat(Str(x.row, "category"))} · {L("patologiya", "патология", "pathology")} {Pct(x.abnormal, x.assessed)}", fonts["td9gray"]));
                legend.AddCell(new PdfPCell(name)
                {
                    BackgroundColor = bg, Border = Rectangle.BOTTOM_BORDER, BorderColorBottom = CL_Border, BorderWidthBottom = 0.5f,
                    PaddingTop = 4, PaddingBottom = 6, PaddingLeft = 6, PaddingRight = 6, VerticalAlignment = Element.ALIGN_MIDDLE,
                });
                NumCell(legend, Num(x.row, "high"), Num(x.row, "high") > 0 ? fRed : fonts["td9gray"], bg);
                NumCell(legend, Num(x.row, "low"), Num(x.row, "low") > 0 ? fAmber : fonts["td9gray"], bg);
                NumCell(legend, x.abnormal, fonts["td9bold"], bg);
                TblCell(legend, Pct(x.abnormal, totalPath), fonts["td9bold"], bg, Element.ALIGN_RIGHT);
                i++;
            }
            if (restSum > 0)
            {
                var bg = i % 2 == 0 ? CL_White : CL_RowAlt;
                SwatchCell(legend, RingOther, bg);
                TblCell(legend, $"{L("Boshqa ko'rsatkichlar", "Другие показатели", "Other indicators")} ({withPath.Count - topN})",
                    fonts["td9gray"], bg, Element.ALIGN_LEFT);
                TblCell(legend, "", fonts["td9"], bg, Element.ALIGN_RIGHT);
                TblCell(legend, "", fonts["td9"], bg, Element.ALIGN_RIGHT);
                NumCell(legend, restSum, fonts["td9bold"], bg);
                TblCell(legend, Pct(restSum, totalPath), fonts["td9bold"], bg, Element.ALIGN_RIGHT);
            }

            var parts = top.Select((x, k) => ((double)x.abnormal, RingPalette[k % RingPalette.Length])).ToList();
            if (restSum > 0) parts.Add((restSum, RingOther));
            var split = new PdfPTable(2) { WidthPercentage = 100, SpacingBefore = 4, KeepTogether = false };
            split.SetWidths(new[] { 70f, 30f });
            split.AddCell(new PdfPCell(legend) { Border = Rectangle.NO_BORDER, Padding = 0, PaddingRight = 18 });
            split.AddCell(new PdfPCell
            {
                Border = Rectangle.NO_BORDER, FixedHeight = 230f, VerticalAlignment = Element.ALIGN_MIDDLE,
                CellEvent = new RingEvent(parts, Fmt(totalPath), L("patologik natija", "патологических", "abnormal"), fonts, 105f),
            });
            doc.Add(split);
        }

        // ── Barcha ko'rsatkichlar ───────────────────────────────────────
        if (inds.Count > 0)
        {
            ComposeSectionHeader(doc, fonts, $"{L("Barcha ko'rsatkichlar", "Все показатели", "All indicators")} ({inds.Count})", CL_DarkBlue);
            doc.Add(new Paragraph(L(
                "Natija — qiymatlar soni; Bemor — bemorlar; Me'yor — me'yordagi; ↑/↓ — yuqori/past; Patol. — patologiya ulushi; O'rt. — o'rtacha.",
                "Рез. — число значений; Пац. — пациенты; Норма — в норме; ↑/↓ — выше/ниже; Патол. — доля патологии; Сред. — среднее.",
                "N — values; Pts — patients; Norm — in range; ↑/↓ — high/low; Abn. — pathology rate."),
                fonts["td9gray"]) { SpacingBefore = 0, SpacingAfter = 2, Leading = 15f });
            // Kengliklar pt da (yotiq A4 ≈ 740 pt): 12 pt sarlavhalar bir qatorda sig'sin
            var t = Tbl(new[] { 136f, 50f, 46f, 50f, 50f, 24f, 24f, 52f, 52f, 60f, 46f, 46f, 104f });
            HeadCompact(t, fonts, 2, L("Ko'rsatkich", "Показатель", "Indicator"), L("Birlik", "Ед.", "Unit"),
                L("Natija", "Рез.", "N"), L("Bemor", "Пац.", "Pts"), L("Me'yor", "Норма", "Norm"), "↑", "↓",
                L("Patol.", "Патол.", "Abn."), L("O'rt.", "Сред.", "Mean"), L("Mediana", "Медиана", "Median"),
                "Min", "Max", "P10–P90");
            var i = 0;
            foreach (var x in inds.OrderByDescending(x => x.abnormal).ThenByDescending(x => Num(x.row, "n")))
            {
                var r = x.row;
                var bg = i++ % 2 == 0 ? CL_White : CL_RowAlt;
                var numeric = (Str(r, "value_kind") ?? "numeric") == "numeric";
                var name = new Phrase();
                name.Add(new Chunk(IndName(r), fonts["td9bold"]));
                name.Add(new Chunk($"\n{Cat(Str(r, "category"))}", fonts["td9gray"]));
                t.AddCell(new PdfPCell(name)
                {
                    BackgroundColor = bg, Border = Rectangle.BOTTOM_BORDER, BorderColorBottom = CL_Border, BorderWidthBottom = 0.5f,
                    PaddingTop = 3, PaddingBottom = 5, PaddingLeft = 4, PaddingRight = 4, VerticalAlignment = Element.ALIGN_MIDDLE,
                });
                CellCompact(t, numeric ? Str(r, "measure") ?? "—" : L("sifat", "кач.", "qual."), fonts["td9gray"], bg, Element.ALIGN_LEFT);
                CellCompact(t, Fmt(Num(r, "n")), fonts["td9"], bg, Element.ALIGN_RIGHT);
                CellCompact(t, Fmt(Num(r, "patients")), fonts["td9"], bg, Element.ALIGN_RIGHT);
                CellCompact(t, Fmt(Num(r, "normal")), fonts["td9"], bg, Element.ALIGN_RIGHT);
                CellCompact(t, Fmt(Num(r, "high")), Num(r, "high") > 0 ? fRed : fonts["td9gray"], bg, Element.ALIGN_RIGHT);
                CellCompact(t, Fmt(Num(r, "low")), Num(r, "low") > 0 ? fAmber : fonts["td9gray"], bg, Element.ALIGN_RIGHT);
                CellCompact(t, x.assessed > 0 ? Pct(x.abnormal, x.assessed) : "—", x.abnormal > 0 ? fonts["td9bold"] : fonts["td9gray"], bg, Element.ALIGN_RIGHT);
                CellCompact(t, numeric ? FmtD(Dbl(r, "mean")) : "—", fonts["td9"], bg, Element.ALIGN_RIGHT);
                CellCompact(t, numeric ? FmtD(Dbl(r, "median")) : "—", fonts["td9bold"], bg, Element.ALIGN_RIGHT);
                CellCompact(t, numeric ? FmtD(Dbl(r, "min")) : "—", fonts["td9"], bg, Element.ALIGN_RIGHT);
                CellCompact(t, numeric ? FmtD(Dbl(r, "max")) : "—", fonts["td9"], bg, Element.ALIGN_RIGHT);
                CellCompact(t, numeric && Dbl(r, "p10") != null ? $"{FmtD(Dbl(r, "p10"))}–{FmtD(Dbl(r, "p90"))}" : "—",
                    fonts["td9gray"], bg, Element.ALIGN_RIGHT);
            }
            doc.Add(t);

        }

        // ── Xodimlar kesimida ───────────────────────────────────────────
        var docs = Arr(data.Doctors).ToList();
        if (docs.Count > 0)
        {
            ComposeSectionHeader(doc, fonts, L("Xodimlar kesimida", "По сотрудникам", "By staff"), CL_DarkBlue);
            var t = Tbl(new[] { 27f, 10f, 10f, 13f, 17f, 8f, 15f });
            HeadCompact(t, fonts, L("Xodim (yuklagan)", "Сотрудник (загрузил)", "Staff (uploaded)"), L("Tahlillar", "Анализы", "Analyses"),
                L("Bemorlar", "Пациенты", "Patients"), L("Patologiyali", "С патологией", "With pathology"),
                L("Patologiya ulushi", "Доля патологии", "Pathology rate"), L("Og'ir", "Тяж.", "Severe"),
                L("Oxirgi", "Последний", "Last"));
            var i = 0;
            foreach (var r in docs.OrderByDescending(r => Num(r, "analyses")))
            {
                var bg = i++ % 2 == 0 ? CL_White : CL_RowAlt;
                TblCell(t, Str(r, "name") ?? "—", fonts["td9bold"], bg, Element.ALIGN_LEFT);
                NumCell(t, Num(r, "analyses"), fonts["td9"], bg);
                NumCell(t, Num(r, "patients"), fonts["td9"], bg);
                NumCell(t, Num(r, "abnormal"), fonts["td9"], bg);
                PctCell(t, Num(r, "abnormal"), Num(r, "analyses"), fonts["td9bold"], bg, CL_BadText);
                NumCell(t, Num(r, "severe"), Num(r, "severe") > 0 ? fRed : fonts["td9gray"], bg);
                var last = Str(r, "last_at");
                TblCell(t, DateTime.TryParse(last, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var d)
                    ? AppTime.ToLocal(d.ToUniversalTime(), _config).ToString("dd.MM.yyyy") : "—", fonts["td9"], bg, Element.ALIGN_RIGHT);
            }
            doc.Add(t);
        }

        // ── Xavf signallari (klinika bo'yicha, davr filtrisiz) ──────────
        var byStatus = Arr(Obj(data.Signals, "byStatus")).ToDictionary(r => Str(r, "key") ?? "", r => r);
        if (byStatus.Count > 0)
        {
            ComposeSectionHeader(doc, fonts, L("Xavf signallari", "Сигналы риска", "Risk signals"), CL_DarkBlue);
            var statuses = new (string key, string name, BaseColor color)[]
            {
                ("CRITICAL", L("Kritik", "Критично", "Critical"), new BaseColor(229, 72, 77)),
                ("CRITERIA_MET", L("Mezon bajarilgan", "Критерий выполнен", "Criteria met"), new BaseColor(249, 115, 22)),
                ("SUSPECTED", L("Shubha", "Подозрение", "Suspected"), new BaseColor(245, 165, 36)),
                ("MONITOR", L("Kuzatuv", "Наблюдение", "Monitor"), new BaseColor(59, 130, 246)),
                ("INSUFFICIENT_DATA", L("Ma'lumot yetarli emas", "Недостаточно данных", "Insufficient data"), RingOther),
            };
            var t = Tbl(new[] { 4f, 56f, 20f, 20f });
            HeadCompact(t, fonts, 2, "", L("Holat", "Статус", "Status"), L("Signallar", "Сигналы", "Signals"), L("Bemorlar", "Пациенты", "Patients"));
            var i = 0;
            foreach (var s in statuses)
            {
                if (!byStatus.TryGetValue(s.key, out var r)) continue;
                var bg = i++ % 2 == 0 ? CL_White : CL_RowAlt;
                SwatchCell(t, s.color, bg);
                TblCell(t, s.name, fonts["td9bold"], bg, Element.ALIGN_LEFT);
                NumCell(t, Num(r, "n"), fonts["td9"], bg);
                NumCell(t, Num(r, "patients"), fonts["td9"], bg);
            }
            var pending = Arr(Obj(data.Signals, "byReview")).Where(r => Str(r, "key") == "pending").Sum(r => Num(r, "n"));
            doc.Add(t);
            doc.Add(new Paragraph(
                $"{L("Shifokor ko'rib chiqmagan", "Не рассмотрено врачом", "Pending doctor review")}: {pending}.  " +
                L("Signal — tashxis emas: shifokor dalillarni ko'rib tasdiqlaydi yoki rad etadi. Signallar bemorning butun tarixi bo'yicha hisoblanadi — davr filtri qo'llanmaydi.",
                  "Сигнал — не диагноз: врач проверяет доказательства и подтверждает или отклоняет его. Сигналы считаются по всей истории пациента — фильтр периода не применяется.",
                  "A signal is not a diagnosis: the doctor reviews the evidence and confirms or rejects it. Signals use the patient's full history — the period filter does not apply."),
                fonts["td9gray"]) { SpacingBefore = 6, Leading = 16f });
        }

        doc.Add(new Paragraph(
            L("Manba: laboratoriya qiymatlari jadvali. Birligi mos kelmagan qiymatlar statistikaga kiritilmagan; baho avval laboratoriya me'yori, bo'lmasa katalog me'yori bo'yicha.",
              "Источник: таблица лабораторных значений. Значения с несопоставимыми единицами не учитываются; оценка — по норме лаборатории, при её отсутствии — по норме каталога.",
              "Source: laboratory values table. Values with incompatible units are excluded; assessment uses the laboratory reference range, otherwise the catalog range."),
            fonts["td9gray"]) { SpacingBefore = 14, Leading = 16f });

        doc.Close();
        return ms.ToArray();
    }

    // ── Statistika hisobotining yordamchilari ───────────────────────────

    private static JsonElement Obj(JsonElement e, string name) =>
        e.ValueKind == JsonValueKind.Object && e.TryGetProperty(name, out var p) ? p : default;

    private static IEnumerable<JsonElement> Arr(JsonElement e) =>
        e.ValueKind == JsonValueKind.Array ? e.EnumerateArray() : Enumerable.Empty<JsonElement>();

    private static string? Str(JsonElement e, string name)
    {
        var p = Obj(e, name);
        return p.ValueKind switch
        {
            JsonValueKind.String => p.GetString(),
            JsonValueKind.Number => p.GetRawText(),
            _ => null,
        };
    }

    private static long Num(JsonElement e, string name)
    {
        var p = Obj(e, name);
        if (p.ValueKind == JsonValueKind.Number) return p.TryGetInt64(out var l) ? l : (long)Math.Round(p.GetDouble());
        if (p.ValueKind == JsonValueKind.String && long.TryParse(p.GetString(), out var s)) return s;
        return 0;
    }

    private static double? Dbl(JsonElement e, string name)
    {
        var p = Obj(e, name);
        return p.ValueKind == JsonValueKind.Number ? p.GetDouble() : null;
    }

    private static string Fmt(long n) => n.ToString("N0", CultureInfo.InvariantCulture).Replace(",", " ");

    private static string Fmt(double d, int digits) => Math.Round(d, digits).ToString(CultureInfo.InvariantCulture);

    /// <summary>Sahifadagi `num()` bilan bir xil: butun — butun, 1 dan kichik — kamida 3 muhim raqam.</summary>
    private static string FmtD(double? v)
    {
        if (v is not { } d || double.IsNaN(d)) return "—";
        if (Math.Abs(d - Math.Round(d)) < 1e-9) return Math.Round(d).ToString(CultureInfo.InvariantCulture);
        var abs = Math.Abs(d);
        var digits = abs > 0 && abs < 1 ? Math.Max(2, 2 - (int)Math.Floor(Math.Log10(abs))) : 2;
        return Math.Round(d, Math.Min(digits, 6)).ToString("0.######", CultureInfo.InvariantCulture);
    }

    private static string Pct(long part, long total) =>
        total <= 0 ? "0%" : $"{Math.Round(part * 100.0 / total, 1).ToString(CultureInfo.InvariantCulture)}%";

    private static PdfPTable Tbl(float[] widths)
    {
        var t = new PdfPTable(widths.Length) { WidthPercentage = 100, SpacingBefore = 4, SpacingAfter = 2, HeaderRows = 1 };
        t.SetWidths(widths);
        return t;
    }

    /// <summary>Yumaloq kartochka katagini qo'shnilaridan 4 pt ajratadi (qatordagi kartochkalar).</summary>
    private static PdfPCell Gap(PdfPCell card)
    {
        var inner = new PdfPTable(1) { WidthPercentage = 100 };
        inner.AddCell(card);
        return new PdfPCell(inner) { Border = Rectangle.NO_BORDER, Padding = 0, PaddingLeft = 4, PaddingRight = 4 };
    }

    /// <summary>Keng jadval sarlavhasi — `TableHead` uslubida, ichki bo'shliq kichikroq, bo'linmaydi.</summary>
    private static void HeadCompact(PdfPTable tbl, Dictionary<string, Font> fonts, params string[] headers) =>
        HeadCompact(tbl, fonts, 1, headers);

    /// <summary>`leftCols` — chapga tekislanadigan boshlang'ich ustunlar (nom, birlik, rang belgisi).</summary>
    private static void HeadCompact(PdfPTable tbl, Dictionary<string, Font> fonts, int leftCols, params string[] headers)
    {
        for (var i = 0; i < headers.Length; i++)
            tbl.AddCell(new PdfPCell(new Phrase(headers[i], fonts["th9_inv"]))
            {
                BackgroundColor = CL_HeadBg,
                Border = Rectangle.TOP_BORDER | Rectangle.BOTTOM_BORDER,
                BorderColorTop = CL_DarkBlue, BorderWidthTop = 1f,
                BorderColorBottom = CL_DarkBlue, BorderWidthBottom = 0.6f,
                PaddingTop = 5, PaddingBottom = 7, PaddingLeft = 4, PaddingRight = 4,
                NoWrap = i > 0,
                HorizontalAlignment = i < leftCols ? Element.ALIGN_LEFT : Element.ALIGN_RIGHT,
                VerticalAlignment = Element.ALIGN_MIDDLE,
            });
    }

    private static void CellCompact(PdfPTable t, string text, Font f, BaseColor bg, int align) =>
        t.AddCell(new PdfPCell(new Phrase(text, f))
        {
            BackgroundColor = bg, Border = Rectangle.BOTTOM_BORDER, BorderColorBottom = CL_Border, BorderWidthBottom = 0.5f,
            PaddingTop = 3, PaddingBottom = 5, PaddingLeft = 4, PaddingRight = 4,
            HorizontalAlignment = align, VerticalAlignment = Element.ALIGN_MIDDLE, NoWrap = align == Element.ALIGN_RIGHT,
        });

    private static void NumCell(PdfPTable t, long n, Font f, BaseColor bg) =>
        TblCell(t, Fmt(n), f, bg, Element.ALIGN_RIGHT);

    /// <summary>Ulush: o'ngda foiz, chapda ingichka polosa (sahifadagi `PctBar`).</summary>
    private static void PctCell(PdfPTable t, long part, long total, Font f, BaseColor bg, BaseColor color)
    {
        var frac = total > 0 ? Math.Clamp(part / (double)total, 0, 1) : 0;
        t.AddCell(new PdfPCell(new Phrase(total > 0 ? Pct(part, total) : "—", f))
        {
            BackgroundColor = bg, Border = Rectangle.BOTTOM_BORDER, BorderColorBottom = CL_Border, BorderWidthBottom = 0.5f,
            PaddingTop = 5, PaddingBottom = 6, PaddingLeft = 6, PaddingRight = 6,
            HorizontalAlignment = Element.ALIGN_RIGHT, VerticalAlignment = Element.ALIGN_MIDDLE,
            CellEvent = total > 0 ? new BarEvent((float)frac, color) : null,
        });
    }

    private static void SwatchCell(PdfPTable t, BaseColor color, BaseColor bg) =>
        t.AddCell(new PdfPCell
        {
            BackgroundColor = bg, Border = Rectangle.BOTTOM_BORDER, BorderColorBottom = CL_Border, BorderWidthBottom = 0.5f,
            CellEvent = new SwatchEvent(color),
        });

    /// <summary>Kichik kartochka: sarlavha, halqa va legenda (rang · nom · son · %).</summary>
    private static PdfPCell RingPanel(string title, List<(string label, long value, BaseColor color)> rows,
        string unitWord, Dictionary<string, Font> fonts, float radius)
    {
        var shown = rows.Where(r => r.value > 0).ToList();
        var total = shown.Sum(r => r.value);
        var inner = new PdfPTable(1) { WidthPercentage = 100 };
        inner.AddCell(new PdfPCell(new Phrase(title.ToUpperInvariant(), fonts["th9_inv"]))
        {
            Border = Rectangle.NO_BORDER, PaddingBottom = 4, HorizontalAlignment = Element.ALIGN_CENTER,
        });
        inner.AddCell(new PdfPCell
        {
            Border = Rectangle.NO_BORDER, FixedHeight = radius * 2 + 10,
            CellEvent = new RingEvent(shown.Select(r => ((double)r.value, r.color)).ToList(),
                total > 0 ? Fmt(total) : "0", unitWord, fonts, radius),
        });
        var legend = new PdfPTable(4) { WidthPercentage = 100, SpacingBefore = 6 };
        legend.SetWidths(new[] { 6f, 56f, 14f, 24f });
        foreach (var r in shown)
        {
            PdfPCell C(Phrase ph, int align) => new(ph)
            {
                Border = Rectangle.NO_BORDER, PaddingTop = 2, PaddingBottom = 4, PaddingLeft = 2, PaddingRight = 2,
                HorizontalAlignment = align, VerticalAlignment = Element.ALIGN_MIDDLE, NoWrap = align == Element.ALIGN_RIGHT,
            };
            legend.AddCell(new PdfPCell { Border = Rectangle.NO_BORDER, CellEvent = new SwatchEvent(r.color) });
            legend.AddCell(C(new Phrase(r.label, fonts["td9"]), Element.ALIGN_LEFT));
            legend.AddCell(C(new Phrase(Fmt(r.value), fonts["td9bold"]), Element.ALIGN_RIGHT));
            legend.AddCell(C(new Phrase(Pct(r.value, total), fonts["td9gray"]), Element.ALIGN_RIGHT));
        }
        if (shown.Count == 0)
            legend.AddCell(new PdfPCell(new Phrase("—", fonts["td9gray"])) { Colspan = 4, Border = Rectangle.NO_BORDER, HorizontalAlignment = Element.ALIGN_CENTER });
        // Qatordagi eng baland kartochkaga tenglashganda bo'sh joyni shu qator
        // oladi — aks holda oxirgi legenda qatori cho'zilib, pastga tushib qolardi
        legend.AddCell(new PdfPCell { Colspan = 4, Border = Rectangle.NO_BORDER, FixedHeight = 0.1f });
        inner.AddCell(new PdfPCell(legend) { Border = Rectangle.NO_BORDER, Padding = 0 });

        return new PdfPCell(inner)
        {
            Border = Rectangle.NO_BORDER, PaddingLeft = 10, PaddingRight = 10, PaddingTop = 8, PaddingBottom = 8,
            CellEvent = new RoundedCell(CL_PanelBg, CL_Border, 7f),
        };
    }

    /// <summary>Halqa diagramma: bo'laklar soat yo'nalishida, markazda jami va birlik.</summary>
    private sealed class RingEvent : IPdfPCellEvent
    {
        private readonly List<(double value, BaseColor color)> _parts;
        private readonly string _total;
        private readonly string _unit;
        private readonly Dictionary<string, Font> _fonts;
        private readonly float _r;

        public RingEvent(List<(double value, BaseColor color)> parts, string total, string unit,
            Dictionary<string, Font> fonts, float radius)
        {
            _parts = parts; _total = total; _unit = unit; _fonts = fonts; _r = radius;
        }

        public void CellLayout(PdfPCell cell, Rectangle pos, PdfContentByte[] canvases)
        {
            // Fon qatlamida chizilsa, kartochkaning (RoundedCell) foni ustidan
            // bo'yab yuborardi — halqa ko'rinmay qolardi
            var cb = canvases[PdfPTable.LINECANVAS];
            var r = Math.Min(_r, Math.Min(pos.Width, pos.Height) / 2f - 4f);
            var cx = (pos.Left + pos.Right) / 2f;
            var cy = (pos.Top + pos.Bottom) / 2f;
            var sum = _parts.Sum(p => p.value);

            cb.SaveState();
            if (sum <= 0)
            {
                cb.SetColorFill(CL_Track);
                cb.Circle(cx, cy, r);
                cb.Fill();
            }
            else
            {
                float start = 90f; // tepadan, soat yo'nalishida
                foreach (var (value, color) in _parts)
                {
                    if (value <= 0) continue;
                    var extent = (float)(-360.0 * value / sum);
                    cb.SetColorFill(color);
                    cb.MoveTo(cx, cy);
                    var curves = PdfContentByte.BezierArc(cx - r, cy - r, cx + r, cy + r, start, extent);
                    var first = curves[0];
                    cb.LineTo(first[0], first[1]);
                    foreach (var c in curves)
                        cb.CurveTo(c[2], c[3], c[4], c[5], c[6], c[7]);
                    cb.ClosePath();
                    cb.Fill();
                    // Bo'laklar orasida oq chegara
                    cb.SetColorStroke(CL_White);
                    cb.SetLineWidth(1.2f);
                    cb.MoveTo(cx, cy);
                    cb.LineTo(cx + r * (float)Math.Cos(start * Math.PI / 180), cy + r * (float)Math.Sin(start * Math.PI / 180));
                    cb.Stroke();
                    start += extent;
                }
            }
            // Teshik (halqa)
            cb.SetColorFill(CL_White);
            cb.Circle(cx, cy, r * 0.62f);
            cb.Fill();
            cb.RestoreState();

            var big = new Font(_fonts["td9bold"].BaseFont, r > 70 ? 22f : 16f, Font.NORMAL, CL_DarkBlue);
            var small = new Font(_fonts["td9gray"].BaseFont, 12f, Font.NORMAL, CL_Gray);
            var tc = canvases[PdfPTable.TEXTCANVAS];
            ColumnText.ShowTextAligned(tc, Element.ALIGN_CENTER, new Phrase(_total, big), cx, cy + 1f, 0);
            ColumnText.ShowTextAligned(tc, Element.ALIGN_CENTER, new Phrase(_unit, small), cx, cy - 14f, 0);
        }
    }

    /// <summary>Katak o'rtasida kichik yumaloq rang belgisi (legenda).</summary>
    private sealed class SwatchEvent : IPdfPCellEvent
    {
        private readonly BaseColor _color;
        public SwatchEvent(BaseColor color) { _color = color; }

        public void CellLayout(PdfPCell cell, Rectangle pos, PdfContentByte[] canvases)
        {
            var cb = canvases[PdfPTable.TEXTCANVAS];
            const float s = 8f;
            var x = (pos.Left + pos.Right) / 2f - s / 2f;
            var y = (pos.Top + pos.Bottom) / 2f - s / 2f;
            cb.SaveState();
            cb.SetColorFill(_color);
            cb.RoundRectangle(x, y, s, s, 2f);
            cb.Fill();
            cb.RestoreState();
        }
    }

    /// <summary>Ulush katagining chap qismida ingichka polosa (fon + to'ldirilgan qism).</summary>
    private sealed class BarEvent : IPdfPCellEvent
    {
        private readonly float _frac;
        private readonly BaseColor _color;
        public BarEvent(float frac, BaseColor color) { _frac = frac; _color = color; }

        public void CellLayout(PdfPCell cell, Rectangle pos, PdfContentByte[] canvases)
        {
            var cb = canvases[PdfPTable.TEXTCANVAS];
            var x = pos.Left + 6f;
            var w = (pos.Width - 12f) * 0.48f;
            const float h = 5f;
            var y = (pos.Top + pos.Bottom) / 2f - h / 2f;
            cb.SaveState();
            cb.SetColorFill(CL_Track);
            cb.RoundRectangle(x, y, w, h, 2.5f);
            cb.Fill();
            if (_frac > 0)
            {
                cb.SetColorFill(_color);
                cb.RoundRectangle(x, y, Math.Max(h, w * _frac), h, 2.5f);
                cb.Fill();
            }
            cb.RestoreState();
        }
    }
}
