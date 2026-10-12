using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    /// <summary>
    /// Laboratoriya tahliliga biriktirilgan bitta fayl.
    ///
    /// Nima uchun alohida jadval: klinikalar bitta topshiriq natijasini
    /// ko'pincha bir nechta faylda beradi (masalan qon tahlili va siydik
    /// tahlili alohida varaqda). Ilgari bitta tahlilga faqat bitta fayl
    /// biriktirilardi va xodim har bir varaqni alohida tahlil qilib
    /// yuklashga majbur edi — AI esa natijalarni bir-biridan ajratib
    /// ko'rardi.
    ///
    /// `lab_analyses.analyse_file_link` BIRINCHI fayl bilan to'ldirilib
    /// qoladi — u ustunga tayanadigan eski kod (PDF, konsultatsiya,
    /// qayta tahlil) buzilmasligi uchun.
    /// </summary>
    [Table("lab_analysis_files")]
    public class LabAnalysisFile
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("lab_analysis_id")]
        public int LabAnalysisId { get; set; }

        [ForeignKey(nameof(LabAnalysisId))]
        public LabAnalyses LabAnalysis { get; set; } = null!;

        /// <summary>Saqlash ildiziga nisbatan yo'l (`/uploads/lab/yyyy/MM/uuid.ext`).</summary>
        [Required]
        [Column("file_link")]
        [MaxLength(500)]
        public string FileLink { get; set; } = null!;

        /// <summary>Yuklangan faylning asl nomi (T-101) — yuklab olishda taklif qilinadi.</summary>
        [Column("original_filename")]
        [MaxLength(255)]
        public string? OriginalFilename { get; set; }

        /// <summary>Mazmun SHA-256 xeshi — takroriy yuklashni aniqlash uchun (T-096).</summary>
        [Column("file_hash")]
        [MaxLength(64)]
        public string? FileHash { get; set; }

        /// <summary>Fayllar tartibi (0 dan) — foydalanuvchi tanlagan ketma-ketlik.</summary>
        [Column("position")]
        public int Position { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
