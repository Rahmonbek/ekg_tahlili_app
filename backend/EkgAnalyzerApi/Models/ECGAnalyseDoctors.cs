using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("ecg_analyse_doctors")]
    public class ECGAnalyseDoctors
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("ecg_analyse_id")]
        public int ECGAnalysesId { get; set; }   // MUHIM

        [ForeignKey(nameof(ECGAnalysesId))]
        public ECGAnalyses ECGAnalyse { get; set; } = null!;

        [Column("doctor_id")]
        public int DoctorId { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}