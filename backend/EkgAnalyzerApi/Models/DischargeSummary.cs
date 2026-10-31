using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EkgAnalyzerApi.Data;

namespace EkgAnalyzerApi.Models
{
    /// <summary>
    /// Statsionardan chiqarish epikrizi — «Выписка из истории болезни».
    ///
    /// Vipiskani faqat shifokor yaratadi (bemor unga yo'naltirilgan bo'lishi
    /// kerak). Hujjatga hech kim qo'l qo'ymaydi: haqiqiyligini PDF dagi QR kod
    /// tasdiqlaydi (`/verify/{token}`, autentifikatsiyasiz).
    ///
    /// ИБ raqami, vipiska sanasi, yotqizilish va chiqarilish sanalarini
    /// shifokor O'ZI kiritadi — tizim ularni hisoblamaydi.
    ///
    /// Diagnoz va boshqa matnlar shifokor tanlagan xulosalardan NUSXA
    /// sifatida saqlanadi: manba xulosa keyin o'zgarsa ham chop etilgan
    /// hujjat bilan bazadagi yozuv bir xil qolishi kerak.
    /// </summary>
    [Table("discharge_summaries")]
    public class DischargeSummary : ITimestamped
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("patient_id")]
        public int PatientId { get; set; }

        [ForeignKey(nameof(PatientId))]
        public Patcient? Patient { get; set; }

        /// <summary>Vipiskani chiqargan klinika — PDF shapkasi shu klinikadan.</summary>
        [Column("clinic_id")]
        public int ClinicId { get; set; }

        [ForeignKey(nameof(ClinicId))]
        public Clinic? Clinic { get; set; }

        /// <summary>Vipiskani yaratgan (davolovchi) shifokor. Tahrirlash huquqi faqat unda.</summary>
        [Column("doctor_id")]
        public int DoctorId { get; set; }

        [ForeignKey(nameof(DoctorId))]
        public Doctor? Doctor { get; set; }

        /// <summary>Kasallik tarixi (ИБ) raqami — vipiska raqami ham shu.</summary>
        [Required]
        [Column("history_number")]
        [MaxLength(50)]
        public string HistoryNumber { get; set; } = null!;

        /// <summary>Vipiska sanasi (shifokor kiritadi).</summary>
        [Column("document_date")]
        public DateOnly DocumentDate { get; set; }

        [Column("admission_date")]
        public DateOnly AdmissionDate { get; set; }

        [Column("discharge_date")]
        public DateOnly DischargeDate { get; set; }

        // ── Diagnoz (uch qism) ───────────────────────────────────────────
        [Column("diagnosis_main", TypeName = "text")]
        public string? DiagnosisMain { get; set; }

        [Column("diagnosis_concomitant", TypeName = "text")]
        public string? DiagnosisConcomitant { get; set; }

        [Column("diagnosis_complications", TypeName = "text")]
        public string? DiagnosisComplications { get; set; }

        // ── Klinik qism ─────────────────────────────────────────────────
        /// <summary>Spravochnikda yo'q shikoyatlar (erkin matn).</summary>
        [Column("complaints_text", TypeName = "text")]
        public string? ComplaintsText { get; set; }

        [Column("anamnesis", TypeName = "text")]
        public string? Anamnesis { get; set; }

        [Column("objective_status", TypeName = "text")]
        public string? ObjectiveStatus { get; set; }

        /// <summary>Statsionarda o'tkazilgan davolash.</summary>
        [Column("treatment", TypeName = "text")]
        public string? Treatment { get; set; }

        /// <summary>Chiqishdagi holat (AD, ЧСС, dinamika).</summary>
        [Column("discharge_condition", TypeName = "text")]
        public string? DischargeCondition { get; set; }

        /// <summary>Jadvaldan tashqari umumiy tavsiyalar (rejim, parhez, nazorat).</summary>
        [Column("recommendations_text", TypeName = "text")]
        public string? RecommendationsText { get; set; }

        /// <summary>PDF ga bemorga beriladigan tavsiyalar nusxasi (alohida sahifa) qo'shilsinmi.</summary>
        [Column("include_patient_copy")]
        public bool IncludePatientCopy { get; set; } = true;

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        public List<DischargeSummaryItem> Items { get; set; } = new();
        public List<DischargeSummaryComplaint> Complaints { get; set; } = new();
        public List<DischargeSummaryConsultation> Consultations { get; set; } = new();
        public List<DischargeSummaryPrescription> Prescriptions { get; set; } = new();
    }

    /// <summary>
    /// Vipiskaga kiritilgan tahlil. `analysis_type` + `analysis_id` —
    /// `combined_analysis_items` dagi kabi polimorf havola (chet el kaliti yo'q).
    /// </summary>
    [Table("discharge_summary_items")]
    public class DischargeSummaryItem
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("discharge_summary_id")]
        public int DischargeSummaryId { get; set; }

        [ForeignKey(nameof(DischargeSummaryId))]
        public DischargeSummary? DischargeSummary { get; set; }

        /// <summary>"ecg" | "holter" | "smad" | "lab" | "para"</summary>
        [Required]
        [Column("analysis_type")]
        [MaxLength(20)]
        public string AnalysisType { get; set; } = null!;

        [Column("analysis_id")]
        public int AnalysisId { get; set; }

        /// <summary>Tahlil sanasi — manba o'chirilsa ham ro'yxat o'qilishi uchun.</summary>
        [Column("snapshot_date")]
        public DateTime? SnapshotDate { get; set; }
    }

    [Table("discharge_summary_complaints")]
    public class DischargeSummaryComplaint
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("discharge_summary_id")]
        public int DischargeSummaryId { get; set; }

        [ForeignKey(nameof(DischargeSummaryId))]
        public DischargeSummary? DischargeSummary { get; set; }

        [Column("complaint_id")]
        public int ComplaintId { get; set; }

        [ForeignKey(nameof(ComplaintId))]
        public Complaints? Complaint { get; set; }
    }

    /// <summary>Vipiskaga kiritilgan onlayn konsultatsiya xulosasi.</summary>
    [Table("discharge_summary_consultations")]
    public class DischargeSummaryConsultation
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("discharge_summary_id")]
        public int DischargeSummaryId { get; set; }

        [ForeignKey(nameof(DischargeSummaryId))]
        public DischargeSummary? DischargeSummary { get; set; }

        [Column("consultation_id")]
        public int ConsultationId { get; set; }

        [ForeignKey(nameof(ConsultationId))]
        public Consultation? Consultation { get; set; }
    }

    /// <summary>Tavsiyalar jadvalining bitta qatori — shifokor qo'lda yozadi.</summary>
    [Table("discharge_summary_prescriptions")]
    public class DischargeSummaryPrescription
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("discharge_summary_id")]
        public int DischargeSummaryId { get; set; }

        [ForeignKey(nameof(DischargeSummaryId))]
        public DischargeSummary? DischargeSummary { get; set; }

        [Column("sort_order")]
        public int SortOrder { get; set; }

        [Required]
        [Column("drug_name")]
        [MaxLength(300)]
        public string DrugName { get; set; } = null!;

        [Column("dose")]
        [MaxLength(200)]
        public string? Dose { get; set; }

        /// <summary>Qabul tartibi: "1 mahal, ovqatdan keyin".</summary>
        [Column("frequency")]
        [MaxLength(200)]
        public string? Frequency { get; set; }

        /// <summary>Qabul vaqti: "08:00", "20:00".</summary>
        [Column("intake_time")]
        [MaxLength(100)]
        public string? IntakeTime { get; set; }

        /// <summary>Muddati yoki izoh: "doimiy, AD nazoratida".</summary>
        [Column("duration")]
        [MaxLength(300)]
        public string? Duration { get; set; }
    }
}
