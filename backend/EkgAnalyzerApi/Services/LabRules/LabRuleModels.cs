namespace EkgAnalyzerApi.Services.LabRules;

/// <summary>Qoida natijasi holatlari ("NMED laboratoriya klinik qoidalari", 1-bo'lim).</summary>
public static class RuleStatus
{
    /// <summary>Kechiktirib bo'lmaydigan xavf.</summary>
    public const string Critical = "CRITICAL";
    /// <summary>Laboratoriya mezoni bajarilgan (yakuniy tashxis EMAS).</summary>
    public const string CriteriaMet = "CRITERIA_MET";
    /// <summary>Kasallikka shubha.</summary>
    public const string Suspected = "SUSPECTED";
    /// <summary>Dinamika kuzatilsin.</summary>
    public const string Monitor = "MONITOR";
    /// <summary>Qoida uchun ma'lumot yetarli emas (yosh, jins…).</summary>
    public const string InsufficientData = "INSUFFICIENT_DATA";
}

/// <summary>Bemorning bitta laboratoriya qiymati (me'yor birligida).</summary>
public sealed record Obs(
    string Col,
    decimal? Value,
    DateTime Date,
    decimal? RefLow,
    decimal? RefHigh,
    short? Flag,
    string? Kind,
    string? Text,
    int AnalysisId,
    bool UnitMismatch);

/// <summary>Katalogdagi ko'rsatkich: nomi, birligi va zaxira me'yori.</summary>
public sealed record CatalogItem(
    string Col,
    string Name,
    string? Measure,
    decimal? MinMale,
    decimal? MaxMale,
    decimal? MinFemale,
    decimal? MaxFemale);

/// <summary>Signalni asoslovchi bitta dalil.</summary>
public sealed class Evidence
{
    public string Indicator { get; init; } = "";
    public string Name { get; init; } = "";
    public decimal? Value { get; init; }
    public string? Text { get; init; }
    public string? Unit { get; init; }
    public DateTime Date { get; init; }
    public int AnalysisId { get; init; }
    /// <summary>Solishtirilgan chegara (mezon yoki laboratoriya ULN/LLN).</summary>
    public decimal? Threshold { get; init; }
    /// <summary>"&gt;", "&lt;", "≥", "≤", "Δ" …</summary>
    public string? Comparator { get; init; }
    /// <summary>`lab` — laboratoriya me'yori, `catalog` — katalog, `criterion` — qoida mezoni.</summary>
    public string? ThresholdSource { get; init; }
}

/// <summary>Bitta qoidaning bemor uchun natijasi.</summary>
public sealed class RuleSignal
{
    public string RuleId { get; init; } = "";
    public string Status { get; init; } = RuleStatus.Suspected;
    /// <summary>1 kuzatuv, 2 e'tibor, 3 shoshilinch.</summary>
    public short Severity { get; init; } = 1;
    public string Title { get; init; } = "";
    public string Message { get; init; } = "";
    public string? Recommendation { get; init; }
    public List<Evidence> Evidence { get; init; } = new();
    /// <summary>Vaqt bo'yicha dalil: oyna, mutlaq/foiz o'zgarish, oldingi qiymat.</summary>
    public Dictionary<string, object?>? Temporal { get; init; }
    public List<string> Missing { get; init; } = new();
    public int? LatestAnalysisId { get; init; }
    public DateTime? ObservedAt { get; init; }
}
