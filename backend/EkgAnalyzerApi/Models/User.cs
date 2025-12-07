using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("users")]
public class User
{
    [Key]
    [Column("id")]
    public int Id { get; set; }
    [Column("email")]
    public string Email { get; set; } = default!;
    [Column("password_hash")]
    public string PasswordHash { get; set; } = default!;
    [Column("password_plain")]
    public string? PasswordPlain { get; set; }
    [Column("clinic_id")]
    public int? ClinicId { get; set; }
    [Column("status")]
    public bool Status { get; set; } = false;
        [Column("created_at")]
        public DateTime? CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        public List<VerificationCode> Codes { get; set; } = new();
}
}