using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{

    [Table("varification_codes")]
    public class VerificationCode
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }
        
        [Column("email")]
        public string Email { get; set; } = default!;

        [Column("user_id")]
        public int UserId { get; set; }

        [Column("code")]
        public string Code { get; set; } = default!;
        [Column("expires_at")]
        public DateTime ExpiresAt { get; set; }
        [Column("is_used")]
        public bool IsUsed { get; set; } = false;
        [Column("created_at")]
        public DateTime? CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }
    }
}
