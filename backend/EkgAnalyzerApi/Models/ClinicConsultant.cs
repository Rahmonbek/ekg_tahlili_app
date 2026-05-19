using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("clinic_consultants")]
    public class ClinicConsultant
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

        [Column("invitation_id")]
        public int? InvitationId { get; set; }
        [ForeignKey(nameof(InvitationId))]
        public ConsultantInvitation? Invitation { get; set; }

        [Column("linked_at")]
        public DateTime LinkedAt { get; set; } = DateTime.UtcNow;

        /// <summary>"active" | "paused"</summary>
        [Column("status")]
        public string Status { get; set; } = "active";

        [Column("current_price", TypeName = "decimal(18,2)")]
        public decimal CurrentPrice { get; set; }

        [Column("total_consultations")]
        public int TotalConsultations { get; set; } = 0;
    }
}
