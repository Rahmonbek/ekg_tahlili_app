using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("video_conference_participants")]
    public class VideoConferenceParticipant
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("video_conference_id")]
        public int VideoConferenceId { get; set; }

        [Column("doctor_id")]
        public int DoctorId { get; set; }

        [Column("invited_at")]
        public DateTime InvitedAt { get; set; } = DateTime.UtcNow;

        [Column("joined_at")]
        public DateTime? JoinedAt { get; set; }

        [Column("left_at")]
        public DateTime? LeftAt { get; set; }

        [Column("status")]
        public string Status { get; set; } = "invited";

        public VideoConference? VideoConference { get; set; }
        public Doctor? Doctor { get; set; }
    }
}
