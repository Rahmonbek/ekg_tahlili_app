namespace EkgAnalyzerApi.DTOs;

public class HolterAnalyseListDTO
{
    /// <summary>Xatolik holatida foydalanuvchiga ko'rsatiladigan sabab.</summary>
    public string? ErrorReason { get; set; }

    /// <summary>
    /// AI xulosasining qisqartirilgan matni — ro'yxatda ko'rsatish uchun.
    /// Ilgari ro'yxatda jiddiylik chipidan boshqa hech narsa yo'q edi.
    /// </summary>
    public string? AiSummary { get; set; }

    /// <summary>Hujjat raqami — o'chirish tasdiqlash oynasida ko'rsatiladi.</summary>
    public string? DocumentNumber { get; set; }

    public int Id { get; set; }
    public int? Status { get; set; } = 0;
    public int? AIStatus { get; set; }

    /// <summary>Ichki maydon — AIStatus ni hisoblash uchun. Javobda ko'rsatilmaydi.</summary>
    [System.Text.Json.Serialization.JsonIgnore]
    public string? AIAnswerData { get; set; } // 1: Normal, 2: Average, 3: Danger
    public DateTime? CreatedAt { get; set; }
    public DateTime? AnalysisDate { get; set; }
    public bool? IsViewed { get; set; }
    public bool HasDiagnosis { get; set; }
    public PatcientForECG? Patcient { get; set; }
    public DoctorForECGData? CreatedDoctor { get; set; }
}

public class SmadAnalyseListDTO
{
    /// <summary>Xatolik holatida foydalanuvchiga ko'rsatiladigan sabab.</summary>
    public string? ErrorReason { get; set; }

    /// <summary>
    /// AI xulosasining qisqartirilgan matni — ro'yxatda ko'rsatish uchun.
    /// Ilgari ro'yxatda jiddiylik chipidan boshqa hech narsa yo'q edi.
    /// </summary>
    public string? AiSummary { get; set; }

    /// <summary>Hujjat raqami — o'chirish tasdiqlash oynasida ko'rsatiladi.</summary>
    public string? DocumentNumber { get; set; }

    public int Id { get; set; }
    public int? Status { get; set; } = 0;
    public int? AIStatus { get; set; }

    /// <summary>Ichki maydon — AIStatus ni hisoblash uchun. Javobda ko'rsatilmaydi.</summary>
    [System.Text.Json.Serialization.JsonIgnore]
    public string? AIAnswerData { get; set; } // 1: Normal, 2: Average, 3: Danger
    public DateTime? CreatedAt { get; set; }
    public DateTime? AnalysisDate { get; set; }
    public bool? IsViewed { get; set; }
    public bool HasDiagnosis { get; set; }
    public PatcientForECG? Patcient { get; set; }
    public DoctorForECGData? CreatedDoctor { get; set; }
}

public class LabAnalyseListDTO
{
    /// <summary>Xatolik holatida foydalanuvchiga ko'rsatiladigan sabab.</summary>
    public string? ErrorReason { get; set; }

    /// <summary>
    /// AI xulosasining qisqartirilgan matni — ro'yxatda ko'rsatish uchun.
    /// Ilgari ro'yxatda jiddiylik chipidan boshqa hech narsa yo'q edi.
    /// </summary>
    public string? AiSummary { get; set; }

    /// <summary>Hujjat raqami — o'chirish tasdiqlash oynasida ko'rsatiladi.</summary>
    public string? DocumentNumber { get; set; }

    public int Id { get; set; }
    public int? Status { get; set; } = 0;
    public int? AIStatus { get; set; }

    /// <summary>Ichki maydon — AIStatus ni hisoblash uchun. Javobda ko'rsatilmaydi.</summary>
    [System.Text.Json.Serialization.JsonIgnore]
    public string? AIAnswerData { get; set; } // 1: Normal, 2: Average, 3: Danger
    public DateTime? CreatedAt { get; set; }
    public DateTime? AnalysisDate { get; set; }
    public bool? IsViewed { get; set; }
    public bool HasDiagnosis { get; set; }
    public PatcientForECG? Patcient { get; set; }
    public DoctorForECGData? CreatedDoctor { get; set; }
}

public class MedicalDiagnoseListDTO
{
    public int Id { get; set; }
    public DateTime? CreatedAt { get; set; }
    public bool? IsViewed { get; set; }
    public PatcientForECG? Patcient { get; set; }
    public DoctorForECGData? CreatedDoctor { get; set; }
    public DoctorForECGData? MainDoctor { get; set; }
    public string? DiagnoseFileLink { get; set; }
}

public class UnviewedCountsDto
{
    public int Ecg { get; set; }
    public int Holter { get; set; }
    public int Smad { get; set; }
    public int Lab { get; set; }
    public int Diagnoses { get; set; }
    public int Parasitology { get; set; }
    public int Total => Ecg + Holter + Smad + Lab + Diagnoses + Parasitology;
}
