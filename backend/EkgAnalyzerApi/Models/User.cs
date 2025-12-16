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
        public string? Email { get; set; } = default!;

        [Column("username")]
        public string Username { get; set; } = default!;
        [Column("password_hash")]
    public string PasswordHash { get; set; } = default!;
    [Column("password_plain")]
    public string? PasswordPlain { get; set; }
    [Column("clinic_id")]
        public int? ClinicId { get; set; }

        [Column("role_id")]
        public int RoleId { get; set; }
        public Role? Role { get; set; }

        [Column("status")]
        public bool Status { get; set; } = false;
        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;

        public List<VerificationCode>? Codes { get; set; } = new();
        public Clinic? Clinic { get; set; }

        public Doctor? Doctor { get; set; }
    }
}