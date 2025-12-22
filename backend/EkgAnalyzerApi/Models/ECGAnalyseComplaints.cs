using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("ecg_analyse_complaints")]
    public class ECGAnalyseComplaints
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("ecg_analyse_id")]
        public int ECGAnalysesId { get; set; }   // MUHIM

        [ForeignKey(nameof(ECGAnalysesId))]
        public ECGAnalyses ECGAnalyse { get; set; } = null!;

        [Column("complaint_id")]
        public int ComplaintId { get; set; }
        [ForeignKey(nameof(ComplaintId))]
        public Complaints Complaint { get; set; } = null!;

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}