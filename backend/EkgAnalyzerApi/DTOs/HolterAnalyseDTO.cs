using EkgAnalyzerApi.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.DTOs;



public class HolterAnalyseDTO
{
    /// <summary>Hujjat raqami (masalan NMED-EKG-00000096).</summary>
    public string? DocumentNumber { get; set; }

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

