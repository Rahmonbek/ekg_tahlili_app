using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("consultant_invitations")]
    public class ConsultantInvitation
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("clinic_id")]
        public int ClinicId { get; set; }
        [ForeignKey(nameof(ClinicId))]
        public Clinic? Clinic { get; set; }

        [Column("doctor_id")]
        public int DoctorId { get; set; }
        [ForeignKey(nameof(DoctorId))]
        public Doctor? Doctor { get; set; }

        [Column("price_per_session", TypeName = "decimal(18,2)")]
        public decimal PricePerSession { get; set; }

        /// <summary>"pending" | "accepted" | "rejected"</summary>
        [Column("status")]
        public string Status { get; set; } = "pending";

        [Column("invited_at")]
        public DateTime InvitedAt { get; set; } = DateTime.UtcNow;

        [Column("responded_at")]
        public DateTime? RespondedAt { get; set; }

        [Column("note")]
        public string? Note { get; set; }
    }
}
