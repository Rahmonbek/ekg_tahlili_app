using Microsoft.EntityFrameworkCore;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("holter_analyses")]
    public class HolterAnalyses
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }
        
        [Column("clinic_id")]
        public int? ClinicId { get; set; }
        public Clinic Clinic { get; set; } = null!;

        [Column("created_doctor_id")]
        public int CreatedDoctorId { get; set; }
        [ForeignKey(nameof(CreatedDoctorId))]
        public Doctor CreatedDoctor { get; set; } = null!;

        [Column("patcient_id")]
        public int PatcientId { get; set; }
        [ForeignKey(nameof(PatcientId))]
        public Patcient Patcient { get; set; } = null!;

        [Column("main_doctor_id")]
        public int MainDoctorId { get; set; }
        [ForeignKey(nameof(MainDoctorId))]
        public Doctor MainDoctor { get; set; } = null!;

        [Column("status")]
        public int? Status { get; set; } = 0;

        [Column("analyse_file_link")]
        public string? AnalyseFileLink { get; set; }
       
        [Column("ai_answer_data", TypeName = "text")]
        public string? AIAnswerData { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("analysis_date")]
        public DateTime? AnalysisDate { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;

        public List<HolterAnalyseDoctors>? Doctors { get; set; }

    }
}