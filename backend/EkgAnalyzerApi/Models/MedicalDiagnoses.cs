using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("medical_diagnoses")]
    public class MedicalDiagnoses
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("created_doctor_id")]
        public int CreatedDoctorId { get; set; }
        [ForeignKey(nameof(CreatedDoctorId))]
        public Doctor CreatedDoctor { get; set; } = null!;

        [Column("main_doctor_id")]
        public int MainDoctorId { get; set; }
        [ForeignKey(nameof(MainDoctorId))]
        public Doctor MainDoctor { get; set; } = null!;

        [Column("patcient_id")]
        public int PatcientId { get; set; }
        [ForeignKey(nameof(PatcientId))]
        public Patcient Patcient { get; set; } = null!;

        [Column("diagnose_file_link")]
        public string? DiagnoseFileLink { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;

        
    }
}