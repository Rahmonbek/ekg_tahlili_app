using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("ecg_analyses")]
    public class ECGAnalyses
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("created_doctor_id")]
        public int CreatedDoctorId { get; set; }
        [ForeignKey(nameof(CreatedDoctorId))]
        public Doctor CreatedDoctor { get; set; } = null!;


        [Column("clinic_id")]
        public int? ClinicId { get; set; }
        public Clinic Clinic { get; set; } = null!;

        [Column("patcient_id")]
        public int PatcientId { get; set; }
        [ForeignKey(nameof(PatcientId))]
        public Patcient Patcient { get; set; } = null!;

        [Column("status")]
        public int? Status { get; set; } = 0;

        [Column("analyse_file_link")]
        public string? AnalyseFileLink { get; set; }

        [Column("generated_file_link")]
        public string? GeneratedFileLink { get; set; }
        
        [Column("generated_short_file_link")]
        public string? GeneratedShortFileLink { get; set; }

        [Column("ai_answer_data", TypeName = "text")]
        public string? AIAnswerData { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;

        public List<ECGAnalyseDoctors>? Doctors { get; set; }
        public List<ECGAnalyseComplaints>? Complaints { get; set; }
    }
}