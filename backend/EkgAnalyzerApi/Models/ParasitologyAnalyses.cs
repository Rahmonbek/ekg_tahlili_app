using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EkgAnalyzerApi.Data;

namespace EkgAnalyzerApi.Models
{
    [Table("parasitology_analyses")]
    public class ParasitologyAnalyses : ITimestamped
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("patcient_id")]
        public int PatcientId { get; set; }
        [ForeignKey(nameof(PatcientId))]
        public Patcient Patcient { get; set; } = null!;

        [Column("clinic_id")]
        public int? ClinicId { get; set; }
        [ForeignKey(nameof(ClinicId))]
        public Clinic? Clinic { get; set; }

        [Column("created_doctor_id")]
        public int CreatedDoctorId { get; set; }
        [ForeignKey(nameof(CreatedDoctorId))]
        public Doctor CreatedDoctor { get; set; } = null!;

        [Column("file_path")]
        public string? FilePath { get; set; }

        [Column("microscopy_method")]
        public string? MicroscopyMethod { get; set; }

        [Column("magnification")]
        public string? Magnification { get; set; }

        [Column("egg_count_per_field")]
        public int? EggCountPerField { get; set; }

        [Column("ai_response", TypeName = "text")]
        public string? AiResponse { get; set; }

        [Column("analysis_status")]
        public string AnalysisStatus { get; set; } = "pending";

        [Column("jiddiylik_darajasi")]
        public int? JiddiylikDarajasi { get; set; }

        [Column("lang")]
        public string? Lang { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        public List<ParasitologyAnalysisDoctors>? Doctors { get; set; }
        public List<ParasitologyResults>? Results { get; set; }
    }
}
