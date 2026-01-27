using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("regions")]
    public class Regions
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

       

        [Column("name_uz")]
        public string NameUz { get; set; }

        [Column("name_ru")]
        public string NameRu { get; set; }
        
        [Column("name_en")]
        public string NameEn { get; set; }


    }
}