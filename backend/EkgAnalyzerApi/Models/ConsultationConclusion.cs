using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("consultation_conclusions")]
    public class ConsultationConclusion
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("consultation_id")]
        public int ConsultationId { get; set; }
        [ForeignKey(nameof(ConsultationId))]
        public Consultation? Consultation { get; set; }

        /// <summary>"good" | "moderate" | "bad"</summary>
        [Column("patient_condition")]
        public string PatientCondition { get; set; } = default!;

        [Column("diagnosis")]
        public string Diagnosis { get; set; } = default!;

        [Column("treatment")]
        public string Treatment { get; set; } = default!;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
