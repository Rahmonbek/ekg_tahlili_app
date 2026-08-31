using Microsoft.EntityFrameworkCore;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("smad_analyses")]
    public class SmadAnalyses : EkgAnalyzerApi.Services.IStuckDetectable
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }
        
        [Column("clinic_id")]
        public int? ClinicId { get; set; }
        public Clinic Clinic { get; set; } = null!;

        [Column("created_doctor_id")]
        public int CreatedDoctorId { get; set; }
        [ForeignKey(nameof(CreatedDoctorId))]
        public Doctor CreatedDoctor { get; set; } = null!;

        [Column("patient_id")]
        public int PatcientId { get; set; }
        [ForeignKey(nameof(PatcientId))]
        public Patcient Patcient { get; set; } = null!;

        [Column("main_doctor_id")]
        public int MainDoctorId { get; set; }
        [ForeignKey(nameof(MainDoctorId))]
        public Doctor MainDoctor { get; set; } = null!;

        [Column("status")]
        public int? Status { get; set; } = 0;

        [Column("document_number")]
        public string? DocumentNumber { get; set; }

        [Column("analyse_file_link")]
        public string? AnalyseFileLink { get; set; }

        [Column("ai_answer_data", TypeName = "jsonb")]
        public string? AIAnswerData { get; set; }

        /// <summary>
        /// Jiddiylik darajasi — bazadagi **hosila (generated) ustun**:
        /// <c>ai_answer_data -&gt;&gt; 'automatic_analysis_bool'</c>.
        ///
        /// Ilgari filtrlash sakkizta <c>LIKE '%…%'</c> sharti bilan
        /// bajarilardi (bo'shliq va tirnoq variantlari uchun) va
        /// indeksdan foydalana olmasdi. <c>-&gt;&gt;</c> operatori
        /// <c>1</c> va <c>"1"</c> ni bir xil <c>'1'</c> matniga
        /// keltiradi, ya'ni bitta aniq taqqoslash yetarli (T-036).
        ///
        /// Ustunni baza hisoblaydi — bu yerdan yozib bo'lmaydi.
        /// </summary>
        [Column("ai_severity")]
        [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
        public string? AiSeverityRaw { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("analysis_date")]
        public DateTime? AnalysisDate { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;

        public List<SmadAnalyseDoctors>? Doctors { get; set; }


        // ── Yumshoq o'chirish (T-027) ──────────────────────────────────────
        // Tibbiy yozuv fizik o'chirilmaydi: kim, qachon va nima sababdan
        // o'chirgani auditda saqlanishi shart. `deleted_at IS NULL` bo'lgan
        // yozuvlar faol hisoblanadi (global query filter — `MedDataDB`).

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }

        [Column("deleted_by_user_id")]
        public int? DeletedByUserId { get; set; }

        [Column("delete_reason")]
        public string? DeleteReason { get; set; }

        // ── Takroriy yuklashni aniqlash (T-096) ────────────────────────────
        // Yuklangan faylning SHA-256 xeshi. Bir xil bemorga bir xil mazmunli
        // fayl qayta yuborilsa, foydalanuvchidan tasdiq so'raladi.
        // Fayl NOMI bo'yicha taqqoslash ishlamaydi — nom o'zgaradi, mazmun
        // esa o'sha bo'lib qolaveradi.

        [Column("file_hash")]
        public string? FileHash { get; set; }


        // Yuklangan faylning ASL nomi (T-101). Diskdagi nom UUID — asl nom
        // yo'lga tushmaydi, chunki u bemor familiyasini yoki qanday tahlil
        // topshirilganini oshkor qilishi mumkin. Yuklab olishda esa
        // foydalanuvchiga aynan shu nom bilan beriladi.

        [Column("original_filename")]
        public string? OriginalFilename { get; set; }

        /// <summary>
        /// AI xulosasi qaysi tilda yaratilgani (`uz` / `ru` / `en`) — T-059.
        /// Interfeys tili boshqa bo'lsa foydalanuvchiga buni aytish uchun.
        /// </summary>
        [Column("ai_lang")]
        public string? AiLang { get; set; }

    }
}