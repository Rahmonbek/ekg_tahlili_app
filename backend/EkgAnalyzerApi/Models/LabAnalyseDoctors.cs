using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("lab_analyse_doctors")]
    public class LabAnalyseDoctors
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("lab_analyse_id")]
        public int LabAnalysesId { get; set; }   // MUHIM

        [ForeignKey(nameof(LabAnalysesId))]
        public LabAnalyses LabAnalyse { get; set; } = null!;

        [Column("doctor_id")]
        public int DoctorId { get; set; }
        
        [ForeignKey(nameof(DoctorId))]
        public Doctor Doctor { get; set; } = null!;

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}