namespace EkgAnalyzerApi.DTOs;

/// <summary>Kompleks tahlilga kiritiladigan bitta tahlilga havola.</summary>
public class CombinedAnalysisItemRefDTO
{
    /// <summary>"ecg" | "holter" | "smad" | "lab"</summary>
    public string Type { get; set; } = string.Empty;
    public int Id { get; set; }
}

/// <summary>Yangi kompleks tahlil so'rovi (bemor kartasidagi checkbox tanlovi).</summary>
public class CombinedAnalysisCreateRequest
{
    public int PatientId { get; set; }
    public List<CombinedAnalysisItemRefDTO> Items { get; set; } = new();

    /// <summary>AI javobi tili: uz | ru | en.</summary>
    public string Lang { get; set; } = "uz";
}

public class CombinedAnalysisItemDTO
{
    public string Type { get; set; } = string.Empty;
    public int AnalysisId { get; set; }
    public DateTime? Date { get; set; }
    public int? Severity { get; set; }

    /// <summary>Manba tahlil bazadan o'chirilgan bo'lsa `false`.</summary>
    public bool Exists { get; set; } = true;
}

public class CombinedAnalysisListItemDTO
{
    public int Id { get; set; }
    public int Status { get; set; }
    public string Mode { get; set; } = "summary";
    public DateTime? CreatedAt { get; set; }
    public string? AiLang { get; set; }

    /// <summary>`automatic_analysis_bool` — 1/2/3 yoki null.</summary>
    public int? AIStatus { get; set; }
    public string? AiSummary { get; set; }
    public string? ErrorReason { get; set; }
    public int ItemCount { get; set; }
    public string? DoctorName { get; set; }
    public List<CombinedAnalysisItemDTO> Items { get; set; } = new();
}

/// <summary>
/// Umumiy ro'yxat sahifasi uchun qator: bemor ma'lumotlari ham kerak,
/// chunki u yerda turli bemorlarning xulosalari aralash ko'rsatiladi.
/// </summary>
public class CombinedAnalysisRowDTO : CombinedAnalysisListItemDTO
{
    public int PatientId { get; set; }
    public string? PatientFirstName { get; set; }
    public string? PatientLastName { get; set; }
    public string? PatientSureName { get; set; }
    public DateOnly? PatientBirthDate { get; set; }
    public bool PatientGender { get; set; }
}

public class CombinedAnalysisDetailDTO : CombinedAnalysisListItemDTO
{
    public int PatientId { get; set; }
    public string? PatientFirstName { get; set; }
    public string? PatientLastName { get; set; }
    public string? PatientSureName { get; set; }
    public DateOnly? PatientBirthDate { get; set; }
    public bool PatientGender { get; set; }
    public string? ModelUsed { get; set; }

    /// <summary>AI javobi — JSON matn (frontend uni o'zi parse qiladi).</summary>
    public string? AIAnswerData { get; set; }
}
