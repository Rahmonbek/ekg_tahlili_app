using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    /// <summary>
    /// Kompleks xulosaga kirgan bitta tahlil.
    ///
    /// `analysis_type` + `analysis_id` — polimorf havola (`analysis_diagnoses`
    /// jadvalidagi bilan bir xil naqsh). Chet el kaliti yo'q, chunki manba
    /// beshta turli jadvalda.
    ///
    /// Sana va jiddiylik SNAPSHOT sifatida saqlanadi: asl tahlil o'chirilsa
    /// ham kompleks xulosa o'qilishi kerak — u shifokor ko'rgan hujjat.
    /// </summary>
    [Table("combined_analysis_items")]
    public class CombinedAnalysisItem
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("combined_analysis_id")]
        public int CombinedAnalysisId { get; set; }

        [ForeignKey(nameof(CombinedAnalysisId))]
        public CombinedAnalysis? CombinedAnalysis { get; set; }

        /// <summary>"ecg" | "holter" | "smad" | "lab" | "para"</summary>
        [Required]
        [Column("analysis_type")]
        [MaxLength(20)]
        public string AnalysisType { get; set; } = null!;

        [Column("analysis_id")]
        public int AnalysisId { get; set; }

        [Column("snapshot_date")]
        public DateTime? SnapshotDate { get; set; }

        [Column("snapshot_severity")]
        public int? SnapshotSeverity { get; set; }
    }
}
