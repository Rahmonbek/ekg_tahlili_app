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
        [Column("password_hash")]
    public string PasswordHash { get; set; } = default!;
    [Column("clinic_id")]
        public int? ClinicId { get; set; }

        [Column("role_id")]
        public int RoleId { get; set; }
        public Role? Role { get; set; }

        [Column("status")]
        public bool Status { get; set; } = false;

        /// <summary>
        /// Administrator yaratgan vaqtinchalik parol hali almashtirilmagan (T-022).
        /// </summary>
        /// <remarks>
        /// Xodim akkauntini admin yaratadi va parolni og'zaki aytadi. Bunday
        /// parol amalda hech qachon almashtirilmaydi — auditda `1` parolli
        /// to'rtta xodim topilgani buning bevosita natijasi. Bayroq
        /// o'rnatilgan bo'lsa, foydalanuvchi kirgach parolni almashtirish
        /// sahifasiga yo'naltiriladi.
        /// </remarks>
        [Column("must_change_password")]
        public bool MustChangePassword { get; set; }
        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;

        public List<VerificationCode>? Codes { get; set; } = new();
        public Clinic? Clinic { get; set; }

        public Doctor? Doctor { get; set; }
    }
}
