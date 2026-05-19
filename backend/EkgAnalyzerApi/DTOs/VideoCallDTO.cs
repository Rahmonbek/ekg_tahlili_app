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
}
