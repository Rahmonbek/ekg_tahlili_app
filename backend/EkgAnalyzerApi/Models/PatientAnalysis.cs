using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("patient_analysis")]
    public class PatientAnalysis
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("patient_id")]
        public int PatientId { get; set; }

        [Column("patient_file_link")]
        public string? PatientFileLink { get; set; }

        [Column("ai_file_link")]
        public string? AIFileLink { get; set; }

        [Column("status")]
        public int Status { get; set; } = 0;

        [Column("ai_answer")]
        public string? AIAnswerLink { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}