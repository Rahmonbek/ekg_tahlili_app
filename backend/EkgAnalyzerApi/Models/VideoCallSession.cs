using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("video_call_sessions")]
    public class VideoCallSession
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("room_name")]
        public string RoomName { get; set; } = default!;

        [Column("initiator_id")]
        public int InitiatorId { get; set; }

        [Column("recipient_id")]
        public int RecipientId { get; set; }

        [Column("clinic_id")]
        public int ClinicId { get; set; }

        [Column("started_at")]
        public DateTime StartedAt { get; set; } = DateTime.UtcNow;

        [Column("ended_at")]
        public DateTime? EndedAt { get; set; }

        // "pending" | "active" | "ended" | "rejected"
        [Column("status")]
        public string Status { get; set; } = "pending";

        public User? Initiator { get; set; }
        public User? Recipient { get; set; }
    }
}
