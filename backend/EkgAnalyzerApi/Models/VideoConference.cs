using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("video_conferences")]
    public class VideoConference
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("room_name")]
        public string RoomName { get; set; } = default!;

        [Column("clinic_id")]
        public int ClinicId { get; set; }

        [Column("patient_id")]
        public int PatientId { get; set; }

        [Column("created_by_admin_id")]
        public int CreatedByAdminId { get; set; }

        [Column("status")]
        public string Status { get; set; } = "scheduled";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("started_at")]
        public DateTime? StartedAt { get; set; }

        [Column("admin_joined_at")]
        public DateTime? AdminJoinedAt { get; set; }

        [Column("admin_left_at")]
        public DateTime? AdminLeftAt { get; set; }

        [Column("ended_at")]
        public DateTime? EndedAt { get; set; }

        public Clinic? Clinic { get; set; }
        public Patcient? Patient { get; set; }
        public User? CreatedByAdmin { get; set; }
        public List<VideoConferenceParticipant> Participants { get; set; } = new();
    }
}
