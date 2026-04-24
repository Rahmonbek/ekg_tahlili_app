using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("parasitology_analysis_doctors")]
    public class ParasitologyAnalysisDoctors
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("parasitology_analysis_id")]
        public int ParasitologyAnalysisId { get; set; }
        [ForeignKey(nameof(ParasitologyAnalysisId))]
        public ParasitologyAnalyses ParasitologyAnalysis { get; set; } = null!;

        [Column("doctor_id")]
        public int DoctorId { get; set; }
        [ForeignKey(nameof(DoctorId))]
        public Doctor Doctor { get; set; } = null!;

        [Column("is_viewed")]
        public bool IsViewed { get; set; } = false;

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
