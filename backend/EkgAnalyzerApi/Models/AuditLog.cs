using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("audit_logs")]
    public class AuditLog
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("user_id")]
        public int? UserId { get; set; }

        [Column("username")]
        public string? Username { get; set; }

        /// <summary>
        /// Amal turi: CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, LOGIN_FAILED
        /// </summary>
        [Column("action")]
        public string Action { get; set; } = default!;

        /// <summary>
        /// Entity turi: User, Doctor, Patient, ECGAnalyse, LabAnalyse, ...
        /// </summary>
        [Column("entity_type")]
        public string? EntityType { get; set; }

        [Column("entity_id")]
        public string? EntityId { get; set; }

        /// <summary>
        /// O'zgarishdan oldingi qiymatlar (JSON)
        /// </summary>
        [Column("old_values")]
        public string? OldValues { get; set; }

        /// <summary>
        /// O'zgarishdan keyingi qiymatlar (JSON)
        /// </summary>
        [Column("new_values")]
        public string? NewValues { get; set; }

        /// <summary>
        /// So'rov IP manzili
        /// </summary>
        [Column("ip_address")]
        public string? IpAddress { get; set; }

        /// <summary>
        /// Foydalanuvchi agenti (brauzer, OS)
        /// </summary>
        [Column("user_agent")]
        public string? UserAgent { get; set; }

        /// <summary>
        /// HTTP endpoint yo'li
        /// </summary>
        [Column("request_path")]
        public string? RequestPath { get; set; }

        /// <summary>
        /// HTTP metod (GET, POST, PUT, DELETE)
        /// </summary>
        [Column("http_method")]
        public string? HttpMethod { get; set; }

        /// <summary>
        /// Javob status kodi
        /// </summary>
        [Column("response_status")]
        public int? ResponseStatus { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
