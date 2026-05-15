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

        [Column("consultant_doctor_id")]
        public int ConsultantDoctorId { get; set; }
        [ForeignKey(nameof(ConsultantDoctorId))]
        public Doctor? ConsultantDoctor { get; set; }

        [Column("linked_at")]
        public DateTime LinkedAt { get; set; } = DateTime.UtcNow;

        [Column("linked_by_consultation_id")]
        public int LinkedByConsultationId { get; set; }

        /// <summary>"active" | "paused"</summary>
        [Column("status")]
        public string Status { get; set; } = "active";

        [Column("total_consultations")]
        public int TotalConsultations { get; set; } = 0;

        [Column("last_consultation_at")]
        public DateTime? LastConsultationAt { get; set; }
    }
}
