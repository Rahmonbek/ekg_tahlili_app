using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("consultations")]
    public class Consultation
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("clinic_id")]
        public int ClinicId { get; set; }
        [ForeignKey(nameof(ClinicId))]
        public Clinic? Clinic { get; set; }

        [Column("clinic_consultant_id")]
        public int ClinicConsultantId { get; set; }
        [ForeignKey(nameof(ClinicConsultantId))]
        public ClinicConsultant? ClinicConsultant { get; set; }

        [Column("doctor_id")]
        public int DoctorId { get; set; }
        [ForeignKey(nameof(DoctorId))]
        public Doctor? Doctor { get; set; }

        [Column("patient_id")]
        public int PatientId { get; set; }
        [ForeignKey(nameof(PatientId))]
        public Patcient? Patient { get; set; }

        [Column("created_by_admin_id")]
        public int CreatedByAdminId { get; set; }
        [ForeignKey(nameof(CreatedByAdminId))]
        public User? CreatedByAdmin { get; set; }

        [Column("consultation_date")]
        public DateOnly ConsultationDate { get; set; }

        [Column("price_at_creation", TypeName = "decimal(18,2)")]
        public decimal PriceAtCreation { get; set; }

        /// <summary>"created" | "reviewing" | "rejected" | "completed"</summary>
        [Column("status")]
        public string Status { get; set; } = "created";

        [Column("rejection_reason")]
        public string? RejectionReason { get; set; }

        [Column("livekit_room_name")]
        public string? LiveKitRoomName { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ConsultationConclusion? Conclusion { get; set; }
        public ICollection<ConsultationAnalysis>? Analyses { get; set; } = new List<ConsultationAnalysis>();
    }
}
