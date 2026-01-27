using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("districts")]
    public class Districts
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("region_id")]
        public int RegionId { get; set; }

        [ForeignKey(nameof(RegionId))]
        public Regions Region { get; set; } = null!;

        [Column("name_uz")]
        public string NameUz { get; set; }

        [Column("name_ru")]
        public string NameRu { get; set; }
        
        [Column("name_en")]
        public string NameEn { get; set; }


    }
}