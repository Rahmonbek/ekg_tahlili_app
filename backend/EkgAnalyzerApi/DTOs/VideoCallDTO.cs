namespace EkgAnalyzerApi.DTOs
{
    public record VideoTokenRequestDto(string RoomName, string ParticipantName);

    public record VideoTokenResponseDto(string Token, string LiveKitUrl);

    public record EndCallRequestDto(string RoomName);

    public class DoctorOnlineStatusDto
    {
        public int UserId { get; set; }
        public int DoctorId { get; set; }
        public string FullName { get; set; } = "";
        public string Position { get; set; } = "";
        public bool IsOnline { get; set; }
        public bool IsBusy { get; set; }
    }

    public class CreateVideoConferenceDto
    {
        public int PatientId { get; set; }
        public int[] DoctorIds { get; set; } = Array.Empty<int>();
    }

    public class VideoConferenceParticipantDto
    {
        public int Id { get; set; }
        public int DoctorId { get; set; }
        public int? DoctorUserId { get; set; }
        public string FullName { get; set; } = "";
        public string? Position { get; set; }
        public string? Phone { get; set; }
        public string Status { get; set; } = "";
        public DateTime? JoinedAt { get; set; }
        public bool IsOnline { get; set; }
    }

    public class VideoConferencePatientDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = "";
        public string? PassportSeries { get; set; }
        public DateOnly? BirthDate { get; set; }
        public bool? Gender { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
    }

    public class VideoConferenceListItemDto
    {
        public int Id { get; set; }
        public string RoomName { get; set; } = "";
        public string Status { get; set; } = "";
        public DateTime CreatedAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? EndedAt { get; set; }
        public string PatientFullName { get; set; } = "";
        public int ParticipantCount { get; set; }
        public int JoinedCount { get; set; }
        public string? ClinicName { get; set; }
    }

    public class VideoConferenceDetailDto : VideoConferenceListItemDto
    {
        public VideoConferencePatientDto Patient { get; set; } = new();
        public List<VideoConferenceParticipantDto> Participants { get; set; } = new();
        public List<PatientAnalysisItemDto> Analyses { get; set; } = new();
        public bool CanManage { get; set; }
        public bool CanJoin { get; set; }
    }
}
