using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("consultant_ratings")]
    public class ConsultantRating
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("consultant_doctor_id")]
        public int ConsultantDoctorId { get; set; }
        [ForeignKey(nameof(ConsultantDoctorId))]
        public Doctor? ConsultantDoctor { get; set; }

        [Column("consultation_id")]
        public int ConsultationId { get; set; }
        [ForeignKey(nameof(ConsultationId))]
        public Consultation? Consultation { get; set; }

        [Column("clinic_id")]
        public int ClinicId { get; set; }
        [ForeignKey(nameof(ClinicId))]
        public Clinic? Clinic { get; set; }

        /// <summary>1 dan 5 gacha</summary>
        [Column("score")]
        public int Score { get; set; }

        [Column("comment")]
        public string? Comment { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
