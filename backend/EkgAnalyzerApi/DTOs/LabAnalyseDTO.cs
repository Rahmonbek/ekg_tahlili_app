using EkgAnalyzerApi.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.DTOs;



/// <summary>Laboratoriya tahliliga biriktirilgan fayl (`lab_analysis_files`).</summary>
public class LabAnalysisFileDTO
{
    public string FileLink { get; set; } = null!;
    public string? OriginalFilename { get; set; }
}

/// <summary>Laboratoriya tahlilidagi bitta ko'rsatkich qiymati (`lab_analysis_values`).</summary>
public class LabValueDTO
{
    /// <summary>Ko'rsatkich kaliti (`lab_value_types.column_name`), masalan `hb`.</summary>
    public string ColumnName { get; set; } = null!;
    public decimal? Value { get; set; }
    public string? Unit { get; set; }
    /// <summary>Sifat natijasining asl yozuvi ("Отрицательный(-)").</summary>
    public string? Text { get; set; }
    public decimal? OriginalValue { get; set; }
    public string? OriginalUnit { get; set; }
    public bool UnitMismatch { get; set; }
    /// <summary>-1 past, 0 normal, 1 yuqori; null — baholanmadi.</summary>
    public short? Flag { get; set; }
    /// <summary>`lab` — fayldagi me'yor bilan baholangan, `catalog` — katalog me'yori bilan.</summary>
    public string? FlagSource { get; set; }
    public decimal? RefLow { get; set; }
    public decimal? RefHigh { get; set; }
    public string? RefText { get; set; }
    /// <summary>NEGATIVE | POSITIVE | EQUIVOCAL | INVALID | UNKNOWN (sifat natijasi).</summary>
    public string? ResultKind { get; set; }
}

public class LabAnalyseDTO
{
    /// <summary>Hujjat raqami (masalan NMED-EKG-00000096).</summary>
    public string? DocumentNumber { get; set; }

    /// <summary>
    /// AI xulosasi qaysi tilda yaratilgan (`uz`/`ru`/`en`). Interfeys tili
    /// boshqa bo'lsa sahifa tarjima taklif qiladi (L-18).
    /// </summary>
    public string? AiLang { get; set; }

    /// <summary>
    /// Shifokor xulosasi (`analysis_diagnoses`) yozilganmi. Faqat by-id
    /// javobida to'ldiriladi; boshqa joyda <c>null</c> (L-18).
    /// </summary>
    public bool? HasDiagnosis { get; set; }

    /// <summary>Tahlil aslida o'tkazilgan sana (yozuv yaratilgan sana emas).</summary>
    public DateTime? AnalysisDate { get; set; }

    public int Id { get; set; }

    public int CreatedDoctorId { get; set; }

    public int PatcientId { get; set; }

    public int? Status { get; set; } = 0;

    /// <summary>Birinchi fayl — eski kod (PDF, konsultatsiya) uchun saqlanadi.</summary>
    public string? AnalyseFileLink { get; set; }

    /// <summary>Barcha biriktirilgan fayllar, yuklangan tartibda.</summary>
    public List<LabAnalysisFileDTO>? Files { get; set; }

    public string? AIAnswerData { get; set; }

    /// <summary>
    /// Aniqlangan ko'rsatkichlar (`lab_analysis_values`), katalog tartibida.
    /// Ilgari bu yerda har bir ko'rsatkich alohida maydon edi (hb, rbc, …) —
    /// frontend ularni o'qimasdi, shuning uchun ro'yxatga almashtirildi.
    /// </summary>
    public List<LabValueDTO>? Values { get; set; }
    public List<DoctorForECGData>? Doctors { get; set; }
    public DoctorForECGData? CreatedDoctor { get; set; }
    public PatcientForECG? Patcient { get; set; }
    public ClinicForECG? Clinic { get; set; }
    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<LabCategoryDto>? Categories { get; set; }
}

