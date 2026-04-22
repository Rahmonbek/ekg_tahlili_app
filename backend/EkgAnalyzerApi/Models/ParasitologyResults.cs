using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("parasitology_results")]
    public class ParasitologyResults
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("parasitology_analysis_id")]
        public int ParasitologyAnalysisId { get; set; }
        [ForeignKey(nameof(ParasitologyAnalysisId))]
        public ParasitologyAnalyses ParasitologyAnalysis { get; set; } = null!;

        [Column("helminth_type")]
        public string? HelminthType { get; set; }

        [Column("helminth_name_uz")]
        public string? HelminthNameUz { get; set; }

        [Column("helminth_name_ru")]
        public string? HelminthNameRu { get; set; }

        [Column("helminth_name_en")]
        public string? HelminthNameEn { get; set; }

        [Column("confidence")]
        public decimal? Confidence { get; set; }

        [Column("infection_level")]
        public string? InfectionLevel { get; set; }

        [Column("viloyat")]
        public string? Viloyat { get; set; }

        [Column("tuman")]
        public string? Tuman { get; set; }

        [Column("patient_age_group")]
        public string? PatientAgeGroup { get; set; }

        [Column("patient_gender")]
        public bool PatientGender { get; set; }

        [Column("analysis_date")]
        public DateOnly? AnalysisDate { get; set; }
    }
}
