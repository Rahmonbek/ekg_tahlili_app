using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("holter_analyse_doctors")]
    public class HolterAnalyseDoctors
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("holter_analyse_id")]
        public int HolterAnalysesId { get; set; }   // MUHIM

        [ForeignKey(nameof(HolterAnalysesId))]
        public HolterAnalyses HolterAnalyse { get; set; } = null!;

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