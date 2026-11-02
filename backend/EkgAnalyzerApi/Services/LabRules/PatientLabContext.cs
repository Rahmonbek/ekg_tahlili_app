namespace EkgAnalyzerApi.Services.LabRules;

/// <summary>
/// Qoidalar uchun bitta bemorning (bitta klinikadagi) laboratoriya tarixi.
///
/// ULN/LLN — AVVAL laboratoriyaning o'z me'yori (`ref_high`/`ref_low`,
/// fayldan), bo'lmasa katalog me'yori (jinsga mos; jinsi noma'lum bo'lsa
/// ikkala me'yorning birlashmasi). Spetsifikatsiya ko'p qoidada aynan
/// "laboratoriya ULN/LLN" ni talab qiladi.
/// </summary>
public sealed class PatientLabContext
{
    private readonly Dictionary<string, List<Obs>> _byCol;
    private readonly IReadOnlyDictionary<string, CatalogItem> _catalog;

    public int ClinicId { get; }
    public int PatientId { get; }
    /// <summary>true erkak, false ayol, null noma'lum.</summary>
    public bool? Male { get; }
    public DateTime? BirthDate { get; }

    public PatientLabContext(int clinicId, int patientId, bool? male, DateTime? birthDate,
        IEnumerable<Obs> observations, IReadOnlyDictionary<string, CatalogItem> catalog)
    {
        ClinicId = clinicId;
        PatientId = patientId;
        Male = male;
        BirthDate = birthDate;
        _catalog = catalog;
        _byCol = observations
            .GroupBy(o => o.Col)
            .ToDictionary(g => g.Key, g => g.OrderBy(o => o.Date).ThenBy(o => o.AnalysisId).ToList());
        LatestDate = _byCol.Values.SelectMany(l => l).Select(o => (DateTime?)o.Date).Max();
    }

    /// <summary>Bemorning (shu klinikadagi) eng so'nggi laboratoriya yozuvi sanasi.</summary>
    public DateTime? LatestDate { get; }

    /// <summary>Barcha yozuvlar (sifat natijalari ham), vaqt tartibida.</summary>
    public IReadOnlyList<Obs> All(string col) =>
        _byCol.TryGetValue(col, out var list) ? list : Array.Empty<Obs>();

    /// <summary>Taqqoslanadigan sonli qiymatlar (me'yor birligida), vaqt tartibida.</summary>
    public List<Obs> Series(string col) =>
        All(col).Where(o => o.Value.HasValue && !o.UnitMismatch).ToList();

    public Obs? Latest(string col) => Series(col).LastOrDefault();

    public Obs? LatestAny(string col) => All(col).LastOrDefault();

    /// <summary>`date` ga ±`days` kun ichidagi eng yaqin qiymat.</summary>
    public Obs? Near(string col, DateTime date, int days) =>
        Series(col)
            .Where(o => Math.Abs((o.Date - date).TotalDays) <= days + 0.5)
            .OrderBy(o => Math.Abs((o.Date - date).TotalDays))
            .FirstOrDefault();

    public string Name(string col) => _catalog.TryGetValue(col, out var c) ? c.Name : col;
    public string? Unit(string col) => _catalog.TryGetValue(col, out var c) ? c.Measure : null;

    public decimal? Uln(Obs o) => o.RefHigh ?? CatalogMax(o.Col);
    public decimal? Lln(Obs o) => o.RefLow ?? CatalogMin(o.Col);
    public string RefSource(Obs o, bool high) =>
        (high ? o.RefHigh : o.RefLow).HasValue ? "lab" : "catalog";

    // Jinsi noma'lum: ikkala me'yorning birlashmasi. Biror jinsda shu
    // tomonda chegara yo'q bo'lsa (FSG/LG ayolda — siklga bog'liq) birlashma
    // ham chegarasiz: aks holda erkak me'yori ayolga qo'llanardi (L-17,
    // Python `lab_catalog.norm_bounds` bilan bir xil).
    private decimal? CatalogMax(string col)
    {
        if (!_catalog.TryGetValue(col, out var c)) return null;
        if (Male == true) return c.MaxMale;
        if (Male == false) return c.MaxFemale;
        return c.MaxMale is { } m && c.MaxFemale is { } f ? Math.Max(m, f) : null;
    }

    private decimal? CatalogMin(string col)
    {
        if (!_catalog.TryGetValue(col, out var c)) return null;
        if (Male == true) return c.MinMale;
        if (Male == false) return c.MinFemale;
        return c.MinMale is { } m && c.MinFemale is { } f ? Math.Min(m, f) : null;
    }

    /// <summary>Tahlil sanasidagi to'liq yosh.</summary>
    public int? AgeAt(DateTime date)
    {
        if (BirthDate is not { } b) return null;
        var age = date.Year - b.Year;
        if (date.Date < b.Date.AddYears(age)) age--;
        return age;
    }

    /// <summary>
    /// eGFR, CKD-EPI 2021 (irqsiz) — ml/min/1.73m². Yosh va jins kerak;
    /// bo'lmasa null (REN-02 "ma'lumot yetarli emas").
    /// </summary>
    public double? Egfr(Obs creatinine)
    {
        if (creatinine.Value is not { } umol || Male is null) return null;
        var age = AgeAt(creatinine.Date);
        if (age is null || age < 18) return null;
        var scr = (double)umol / 88.4; // mg/dL
        var female = Male == false;
        var kappa = female ? 0.7 : 0.9;
        var alpha = female ? -0.241 : -0.302;
        var ratio = scr / kappa;
        var egfr = 142 * Math.Pow(Math.Min(ratio, 1), alpha) * Math.Pow(Math.Max(ratio, 1), -1.200)
                       * Math.Pow(0.9938, age.Value) * (female ? 1.012 : 1.0);
        return Math.Round(egfr, 1);
    }

    /// <summary>Dalil — qiymat va unga qo'llangan chegara bilan.</summary>
    public Evidence Ev(Obs o, decimal? threshold = null, string? comparator = null, string? source = null) => new()
    {
        Indicator = o.Col,
        Name = Name(o.Col),
        Value = o.Value,
        Text = o.Text,
        Unit = Unit(o.Col),
        Date = o.Date,
        AnalysisId = o.AnalysisId,
        Threshold = threshold,
        Comparator = comparator,
        ThresholdSource = source,
    };
}
