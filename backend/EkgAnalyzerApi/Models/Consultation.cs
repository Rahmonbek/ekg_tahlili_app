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

        [Column("consultant_doctor_id")]
        public int ConsultantDoctorId { get; set; }
        [ForeignKey(nameof(ConsultantDoctorId))]
        public Doctor? ConsultantDoctor { get; set; }

        [Column("clinic_consultant_id")]
        public int? ClinicConsultantId { get; set; }
        [ForeignKey(nameof(ClinicConsultantId))]
        public ClinicConsultant? ClinicConsultant { get; set; }

        [Column("requested_by_admin_id")]
        public int RequestedByAdminId { get; set; }
        [ForeignKey(nameof(RequestedByAdminId))]
        public User? RequestedByAdmin { get; set; }

        [Column("patient_id")]
        public int PatientId { get; set; }
        [ForeignKey(nameof(PatientId))]
        public Patcient? Patient { get; set; }

        [Column("is_first_request")]
        public bool IsFirstRequest { get; set; } = false;

        [Column("note")]
        public string? Note { get; set; }

        /// <summary>"pending"|"accepted"|"rejected"|"scheduled"|"concluded"|"cancelled"|"expired"</summary>
        [Column("status")]
        public string Status { get; set; } = "pending";

        [Column("rejection_reason")]
        public string? RejectionReason { get; set; }

        [Column("scheduled_at")]
        public DateTime? ScheduledAt { get; set; }

        [Column("livekit_room_name")]
        public string? LiveKitRoomName { get; set; }

        [Column("concluded_at")]
        public DateTime? ConcludedAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<ConsultationAnalysis>? Analyses { get; set; } = new List<ConsultationAnalysis>();
        public ConsultationConclusion? Conclusion { get; set; }
    }
}
