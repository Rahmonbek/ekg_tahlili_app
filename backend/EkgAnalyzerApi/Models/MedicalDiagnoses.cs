using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("medical_diagnoses")]
    public class MedicalDiagnoses
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

        [Column("main_doctor_id")]
        public int MainDoctorId { get; set; }
        [ForeignKey(nameof(MainDoctorId))]
        public Doctor MainDoctor { get; set; } = null!;

        [Column("patient_id")]
        public int PatcientId { get; set; }
        [ForeignKey(nameof(PatcientId))]
        public Patcient Patcient { get; set; } = null!;

        [Column("diagnose_file_link")]
        public string? DiagnoseFileLink { get; set; }

        [Column("is_viewed")]
        public bool IsViewed { get; set; } = false;

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;

        

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


        // Yuklangan faylning ASL nomi (T-101). Diskdagi nom UUID — asl nom
        // yo'lga tushmaydi, chunki u bemor familiyasini yoki qanday tahlil
        // topshirilganini oshkor qilishi mumkin. Yuklab olishda esa
        // foydalanuvchiga aynan shu nom bilan beriladi.

        [Column("original_filename")]
        public string? OriginalFilename { get; set; }

    }
}