using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EkgAnalyzerApi.Data;

namespace EkgAnalyzerApi.Models
{
    /// <summary>
    /// Variant B — alohida jadval: har bir tahlilga shifokor tashxisi.
    /// analysis_type: "ecg" | "holter" | "smad" | "lab" | "para"
    /// </summary>
    [Table("analysis_diagnoses")]
    public class AnalysisDiagnosis : ITimestamped
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("analysis_type")]
        [MaxLength(20)]
        public string AnalysisType { get; set; } = null!; // ecg, holter, smad, lab, para

        [Required]
        [Column("analysis_id")]
        public int AnalysisId { get; set; }

        [Required]
        [Column("doctor_id")]
        public int DoctorId { get; set; }

        [ForeignKey(nameof(DoctorId))]
        public Doctor Doctor { get; set; } = null!;

        [Required]
        [Column("diagnosis_text", TypeName = "text")]
        public string DiagnosisText { get; set; } = null!;

        [Column("clinic_id")]
        public int? ClinicId { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }
    }
}
