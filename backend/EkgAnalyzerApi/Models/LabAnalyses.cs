using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("lab_analyses")]
    public class LabAnalyses : EkgAnalyzerApi.Services.IStuckDetectable
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

        [Column("hb")]
        public decimal? hb { get; set; }   // g/L

        [Column("rbc")]
        public decimal? rbc { get; set; }  // x10^12/L

        [Column("wbc")]
        public decimal? wbc { get; set; }  // x10^9/L

        [Column("plt")]
        public decimal? plt { get; set; }  // x10^9/L

        [Column("hct")]
        public decimal? hct { get; set; }  // %

        [Column("mcv")]
        public decimal? mcv { get; set; }  // fL

        [Column("mch")]
        public decimal? mch { get; set; }  // pg

        [Column("mchc")]
        public decimal? mchc { get; set; } // g/L

        [Column("esr")]
        public decimal? esr { get; set; }  // mm/hour
        [Column("glucose")]
        public decimal? glucose { get; set; } // mmol/L

        [Column("cholesterol")]
        public decimal? cholesterol { get; set; } // mmol/L

        [Column("alt")]
        public decimal? alt { get; set; } // U/L

        [Column("ast")]
        public decimal? ast { get; set; } // U/L

        [Column("bilirubin_total")]
        public decimal? bilirubin_total { get; set; } // µmol/L

        [Column("bilirubin_direct")]
        public decimal? bilirubin_direct { get; set; } // µmol/L

        [Column("creatinine")]
        public decimal? creatinine { get; set; } // µmol/L

        [Column("urea")]
        public decimal? urea { get; set; } // mmol/L

        [Column("total_protein")]
        public decimal? total_protein { get; set; } // g/L

        [Column("albumin")]
        public decimal? albumin { get; set; } // g/L

        [Column("calcium")]
        public decimal? calcium { get; set; } // mmol/L

        [Column("sodium")]
        public decimal? sodium { get; set; } // mmol/L

        [Column("potassium")]
        public decimal? potassium { get; set; } // mmol/L

        [Column("iron")]
        public decimal? iron { get; set; } // µmol/L

        [Column("tsh")]
        public decimal? tsh { get; set; } // µIU/mL

        [Column("free_t4")]
        public decimal? free_t4 { get; set; } // pmol/L

        [Column("insulin")]
        public decimal? insulin { get; set; } // µIU/mL
        [Column("urine_volume")]
        public decimal? urine_volume { get; set; } // mL

        [Column("urine_density")]
        public decimal? urine_density { get; set; } // 1.010–1.025

        [Column("urine_ph")]
        public decimal? urine_ph { get; set; } // 0–14

        [Column("urine_protein")]
        public decimal? urine_protein { get; set; } // g/L

        [Column("urine_glucose")]
        public decimal? urine_glucose { get; set; } // mmol/L

        [Column("urine_ketones")]
        public decimal? urine_ketones { get; set; } // mmol/L

        [Column("urine_bilirubin")]
        public decimal? urine_bilirubin { get; set; } // µmol/L

        [Column("urobilinogen")]
        public decimal? urobilinogen { get; set; } // µmol/L

        [Column("urine_rbc")]
        public decimal? urine_rbc { get; set; } // count per field

        [Column("urine_wbc")]
        public decimal? urine_wbc { get; set; } // count per field

        [Column("daily_protein")]
        public decimal? daily_protein { get; set; } // mg/24h

        [Column("daily_creatinine")]
        public decimal? daily_creatinine { get; set; } // mmol/24h

        [Column("daily_calcium")]
        public decimal? daily_calcium { get; set; } // mmol/24h

        [Column("daily_sodium")]
        public decimal? daily_sodium { get; set; } // mmol/24h

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("analysis_date")]
        public DateTime? AnalysisDate { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
        public List<LabAnalyseCategories>? Categories { get; set; }
        public List<LabAnalyseDoctors>? Doctors { get; set; }

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