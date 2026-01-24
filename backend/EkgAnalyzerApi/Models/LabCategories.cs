using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("lab_categories")]
    public class LabCategories
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("big_category_id")]
        public int BigCategoryId { get; set; }
        
        [ForeignKey(nameof(BigCategoryId))]
        public LabBigCategories BigCategory { get; set; } = null!;

        [Column("name_uz")]
        public string? NameUz { get; set; }

        [Column("name_ru")]
        public string? NameRu { get; set; }

        [Column("name_en")]
        public string? NameEn { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}