using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("consultation_analyses")]
    public class ConsultationAnalysis
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("consultation_id")]
        public int ConsultationId { get; set; }
        [ForeignKey(nameof(ConsultationId))]
        public Consultation? Consultation { get; set; }

        /// <summary>"EKG"|"SMAD"|"Holter"|"Lab"|"Parasit"</summary>
        [Column("analysis_type")]
        public string AnalysisType { get; set; } = default!;

        [Column("analysis_id")]
        public int AnalysisId { get; set; }

        [Column("shared_at")]
        public DateTime SharedAt { get; set; } = DateTime.UtcNow;
    }
}
