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

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        public ClinicDetail ClinicDetail { get; set; } = new();
        public List<User> Users { get; set; } = new(); // 🔹 Reverse navigation

        
        public List<ClinicPhoneNumber> ClinicPhoneNumber { get; set; } = new();
    }
}