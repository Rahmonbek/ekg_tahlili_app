using EkgAnalyzerApi.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.DTOs;



public class HolterAnalyseDTO
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
    public int MainDoctorId { get; set; }

    public int PatcientId { get; set; }

    public int? Status { get; set; } = 0;

    public string? AnalyseFileLink { get; set; }

    public string? AIAnswerData { get; set; }

    public List<DoctorForECGData>? Doctors { get; set; }
    public DoctorForECGData? CreatedDoctor { get; set; }
    public DoctorForECGData? MainDoctor { get; set; }
    public PatcientForECG? Patcient { get; set; }
    public ClinicForECG? Clinic { get; set; }
    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
}

