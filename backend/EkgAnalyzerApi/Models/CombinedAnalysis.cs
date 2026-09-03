using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EkgAnalyzerApi.Data;

namespace EkgAnalyzerApi.Models
{
    /// <summary>
    /// Bemorning bir nechta tahlilini BIRGALIKDA tahlil qilgan AI xulosasi.
    ///
    /// Nima uchun alohida jadval: bu yozuv bitta tahlilga emas, TANLANGAN
    /// TO'PLAMGA tegishli. Uni mavjud `ecg_analyses` va boshqa jadvallarga
    /// sig'dirib bo'lmaydi — har birida "bu tahlil qaysi to'plamga kirdi"
    /// degan ma'lumot takrorlanardi.
    ///
    /// Tarkibi <see cref="CombinedAnalysisItem"/> larda.
    /// </summary>
    [Table("combined_analyses")]
    public class CombinedAnalysis : ITimestamped
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("patient_id")]
        public int PatientId { get; set; }

        [ForeignKey(nameof(PatientId))]
        public Patcient? Patient { get; set; }

        /// <summary>
        /// So'rovni yuborgan xodimning klinikasi. Tahlillar boshqa
        /// klinikaniki bo'lishi MUMKIN — bemor kartasi klinika bo'yicha
        /// cheklanmaydi. Bu ustun faqat "kim so'radi" savoliga javob beradi.
        /// </summary>
        [Column("clinic_id")]
        public int ClinicId { get; set; }

        [Column("created_doctor_id")]
        public int CreatedDoctorId { get; set; }

        [ForeignKey(nameof(CreatedDoctorId))]
        public Doctor? CreatedDoctor { get; set; }

        /// <summary>
        /// Boshqa modullar bilan bir xil konventsiya:
        /// 0 = yaratildi, 1 = AI kutmoqda, 2 = tayyor, -1 = xatolik.
        /// </summary>
        [Column("status")]
        public int Status { get; set; }

        /// <summary>
        /// `summary` — faqat har bir tahlilning AI xulosasi yuboriladi (arzon, standart).
        /// `deep` — qo'shimcha ravishda EKG rasm fayllari ham yuboriladi.
        /// </summary>
        [Column("mode")]
        [MaxLength(10)]
        public string Mode { get; set; } = "summary";

        [Column("ai_answer_data", TypeName = "jsonb")]
        public string? AIAnswerData { get; set; }

        [Column("ai_lang")]
        [MaxLength(5)]
        public string? AiLang { get; set; }

        /// <summary>Qaysi model ishlatilgani — audit va narx kuzatuvi uchun.</summary>
        [Column("model_used")]
        [MaxLength(50)]
        public string? ModelUsed { get; set; }

        [Column("input_tokens")]
        public int? InputTokens { get; set; }

        [Column("output_tokens")]
        public int? OutputTokens { get; set; }

        /// <summary>
        /// Manba to'plamining barmoq izi: SHA-256(tur:id:updated_at | ... | til | rejim).
        /// Aynan shu to'plam qayta so'ralganda AI ga ikkinchi marta pul
        /// to'lamaslik uchun ishlatiladi.
        /// </summary>
        [Column("source_fingerprint")]
        [MaxLength(64)]
        public string? SourceFingerprint { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        public List<CombinedAnalysisItem> Items { get; set; } = new();
    }
}
