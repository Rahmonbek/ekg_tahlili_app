using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("clinic_phone_numbers")]
public class ClinicPhoneNumber
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("phone_number")]
        public int PhoneNumber{ get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

}
}