using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("smad_analyse_doctors")]
    public class SmadAnalyseDoctors
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("smad_analyse_id")]
        public int SmadAnalysesId { get; set; }   // MUHIM

        [ForeignKey(nameof(SmadAnalysesId))]
        public SmadAnalyses SmadAnalyse { get; set; } = null!;

        [Column("doctor_id")]
        public int DoctorId { get; set; }
        
        [ForeignKey(nameof(DoctorId))]
        public Doctor Doctor { get; set; } = null!;

        [Column("is_viewed")]
        public bool IsViewed { get; set; } = false;

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}