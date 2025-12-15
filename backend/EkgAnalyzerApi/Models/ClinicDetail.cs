using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("clinic_details")]
public class ClinicDetail
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("clinic_id")]
        public int ClinicId{ get; set; }

        [Column("bank_accaunt")]
        public string? BankAccaunt { get; set; }

        [Column("mfo")]
        public string? MFO { get; set; }

        [Column("bank_name")]
        public string? BankName { get; set; }

        [Column("inn")]
        public string? INN { get; set; }

        [Column("license")]
        public string? License { get; set; }

        [Column("address")]
        public string? Address { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;

    }
}