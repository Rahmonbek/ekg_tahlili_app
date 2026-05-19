using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("consultant_price_history")]
    public class ConsultantPriceHistory
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("clinic_consultant_id")]
        public int ClinicConsultantId { get; set; }
        [ForeignKey(nameof(ClinicConsultantId))]
        public ClinicConsultant? ClinicConsultant { get; set; }

        [Column("old_price", TypeName = "decimal(18,2)")]
        public decimal OldPrice { get; set; }

        [Column("new_price", TypeName = "decimal(18,2)")]
        public decimal NewPrice { get; set; }

        [Column("effective_from")]
        public DateOnly EffectiveFrom { get; set; }

        [Column("changed_at")]
        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

        [Column("changed_by_user_id")]
        public int ChangedByUserId { get; set; }
        [ForeignKey(nameof(ChangedByUserId))]
        public User? ChangedByUser { get; set; }
    }
}
