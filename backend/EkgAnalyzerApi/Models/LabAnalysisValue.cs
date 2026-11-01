using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    /// <summary>
    /// Laboratoriya tahlilidagi BITTA ko'rsatkich qiymati (bitta qator).
    ///
    /// Nima uchun alohida jadval: ilgari har bir ko'rsatkich `lab_analyses`
    /// da alohida ustun edi — yangi ko'rsatkich migratsiya va ko'p joyda kod
    /// talab qilardi, statistika (masalan "HbA1c &gt; 6.5 bo'lgan bemorlar")
    /// va bemor dinamikasi esa har bir ustun uchun alohida so'rov edi. Endi
    /// yangi ko'rsatkich = `lab_value_types` ga bitta qator.
    ///
    /// Yozuvchi — faqat Python AI xizmati (`lab_analyse.replace_lab_values`):
    /// har tahlil (qayta tahlil) natijasida tahlilning BARCHA qatorlari
    /// o'chirilib, yangilari qo'yiladi — eski fayldagi qiymat qolib ketmaydi.
    ///
    /// Statistikada `UnitMismatch = true` qatorlar chiqarib tashlanishi SHART:
    /// ularning qiymati me'yor birligida emas.
    /// </summary>
    [Table("lab_analysis_values")]
    public class LabAnalysisValue
    {
        [Key]
        [Column("id")]
        public long Id { get; set; }

        [Column("lab_analysis_id")]
        public int LabAnalysisId { get; set; }

        [ForeignKey(nameof(LabAnalysisId))]
        public LabAnalyses LabAnalysis { get; set; } = null!;

        [Column("value_type_id")]
        public int ValueTypeId { get; set; }

        [ForeignKey(nameof(ValueTypeId))]
        public LabValueTypes ValueType { get; set; } = null!;

        /// <summary>Statistika/dinamika so'rovlari JOIN siz ishlashi uchun nusxa.</summary>
        [Column("patient_id")]
        public int PatientId { get; set; }

        /// <summary>Tahlil sanasi (`analysis_date ?? created_at`) — vaqt qatori o'qi.</summary>
        [Column("measured_at")]
        public DateTime MeasuredAt { get; set; }

        /// <summary>Me'yor birligiga keltirilgan qiymat (sifat natijasida kod: 0/1, qon guruhi 1..4).</summary>
        [Column("value")]
        public decimal? Value { get; set; }

        [Column("unit")]
        [MaxLength(64)]
        public string? Unit { get; set; }

        /// <summary>Fayldagi sifat yozuvi aynan o'zicha ("Отрицательный(-)", "A(II) Rh+").</summary>
        [Column("text")]
        [MaxLength(200)]
        public string? Text { get; set; }

        /// <summary>Fayldagi asl qiymat — boshqa birlikdan aylantirilgan bo'lsa.</summary>
        [Column("original_value")]
        public decimal? OriginalValue { get; set; }

        [Column("original_unit")]
        [MaxLength(64)]
        public string? OriginalUnit { get; set; }

        /// <summary>Birlikni me'yor birligiga keltirib bo'lmadi — baholanmaydi.</summary>
        [Column("unit_mismatch")]
        public bool UnitMismatch { get; set; }

        /// <summary>-1 past, 0 normal, 1 yuqori; null — baholanmadi (me'yor yo'q / birlik mos emas).</summary>
        [Column("flag")]
        public short? Flag { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
