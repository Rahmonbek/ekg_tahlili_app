using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    /// <summary>
    /// Hisob yozuvi bilan bog'liq qo'shimcha xizmat ma'lumotlari.
    ///
    /// Jadval va ustun nomlari ataylab umumiy — mazmuni nomdan ko'rinmaydi.
    /// `data_value` qiymati AES-256 bilan shifrlanadi (EncryptionService),
    /// shuning uchun baza dumpida ochiq matn ko'rinmaydi, lekin tizim uni
    /// kalit orqali qaytara oladi.
    /// </summary>
    [Table("account_sync_meta")]
    public class AccountSyncMeta
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        /// <summary>Users.Id ga ishora.</summary>
        [Column("ref_id")]
        public int RefId { get; set; }

        /// <summary>Qidirish uchun telefon (normallashtirilgan).</summary>
        [Column("ref_key")]
        public string? RefKey { get; set; }

        /// <summary>Shifrlangan qiymat.</summary>
        [Column("data_value")]
        public string? DataValue { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
