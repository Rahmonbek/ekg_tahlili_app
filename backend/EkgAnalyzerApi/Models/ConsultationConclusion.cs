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

        [Column("diagnosis")]
        public string Diagnosis { get; set; } = default!;

        [Column("recommendations")]
        public string Recommendations { get; set; } = default!;

        [Column("medications")]
        public string? Medications { get; set; }

        [Column("follow_up_required")]
        public bool FollowUpRequired { get; set; } = false;

        [Column("follow_up_note")]
        public string? FollowUpNote { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
