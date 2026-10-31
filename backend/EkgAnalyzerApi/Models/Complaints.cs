using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("complaints")]
    public class Complaints
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

        /// <summary>
        /// Yo'nalish (cardio, respiratory, neuro, ...) — vipiskadagi qidiruvli
        /// ro'yxatda guruhlash uchun. Eski yozuvlarda bo'sh bo'lishi mumkin.
        /// </summary>
        [Column("category")]
        [MaxLength(30)]
        public string? Category { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}