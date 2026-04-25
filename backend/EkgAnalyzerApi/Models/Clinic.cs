using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("clinics")]
public class Clinic
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("clinic_name")]
        public string? ClinicName { get; set; }

        [Column("clinic_logo")]
        public string? ClinicLogo { get; set; }

        /// <summary>
        /// SuperAdmin tomonidan faollashtirilganda true bo'ladi.
        /// false bo'lsa klinika xodimlari tahlil qila olmaydi.
        /// </summary>
        [Column("is_active")]
        public bool IsActive { get; set; } = false;

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;

        public ClinicDetail? ClinicDetail { get; set; } = new();
        public List<User>? Users { get; set; } = new(); // 🔹 Reverse navigation

        
        public List<ClinicPhoneNumber>? ClinicPhoneNumber { get; set; } = new();
    }
}