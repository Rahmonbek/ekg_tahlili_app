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

        /// <summary>Guruh kodi: cbc, carb, lipid, liver, kidney, thyroid, hormone, urine…</summary>
        [Column("category")]
        public string? Category { get; set; }

        /// <summary>
        /// `numeric` — oddiy son; `qualitative` — sifat natijasi (0 manfiy /
        /// 1 musbat yoki indeks); `code` — kod (qon guruhi 1..4, rezus 1/0).
        /// </summary>
        [Column("value_kind")]
        public string ValueKind { get; set; } = "numeric";

        [Column("sort_order")]
        public int SortOrder { get; set; }

        /// <summary>AI promptidagi tavsif (Python `lab_catalog` shundan prompt va sxemani quradi).</summary>
        [Column("ai_hint")]
        public string? AiHint { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}