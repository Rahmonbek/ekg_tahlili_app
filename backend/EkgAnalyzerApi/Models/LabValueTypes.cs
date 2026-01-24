using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("lab_value_types")]
    public class LabValueTypes
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("name_uz")]
        public string? NameUz { get; set; }

        [Column("name_ru")]
        public string? NameRu { get; set; }

        [Column("name_en")]
        public string? NameEn { get; set; }

        [Column("measure")]
        public string? Measure { get; set; }

        [Column("normal_min_male")]
        public double? NormalMinMale { get; set; }

        [Column("normal_max_male")]
        public double? NormalMaxMale { get; set; }

        [Column("normal_min_female")]
        public double? NormalMinFemale { get; set; }

        [Column("normal_max_female")]
        public double? NormalMaxFemale { get; set; }

        [Column("column_name")]
        public string? ColumnName { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}