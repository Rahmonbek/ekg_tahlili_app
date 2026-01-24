using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("lab_analyse_categories")]
    public class LabAnalyseCategories
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("lab_analyse_id")]
        public int LabAnalysesId { get; set; }   // MUHIM

        [ForeignKey(nameof(LabAnalysesId))]
        public LabAnalyses LabAnalyse { get; set; } = null!;

        [Column("category_id")]
        public int CategoryId { get; set; }
        [ForeignKey(nameof(CategoryId))]
        public LabCategories LabCategory { get; set; } = null!;

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}