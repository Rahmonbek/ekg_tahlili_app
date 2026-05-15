namespace EkgAnalyzerApi.DTOs
{
    // ─── REQUEST DTOs ──────────────────────────────────────────────────────────

    public record CreateConsultationDto(
        int ConsultantDoctorId,
        int PatientId,
        string? Note,
        List<ConsultationAnalysisItemDto> Analyses
    );

    public record ConsultationAnalysisItemDto(string AnalysisType, int AnalysisId);

    public record ScheduleConsultationDto(DateTime ScheduledAt);

    public record ConcludeConsultationDto(
        string Diagnosis,
        string Recommendations,
        string? Medications,
        bool FollowUpRequired,
        string? FollowUpNote
    );

    public record RateConsultationDto(int Score, string? Comment);

    public record RejectConsultationDto(string RejectionReason);

    // ─── RESPONSE DTOs ─────────────────────────────────────────────────────────

    /// <summary>Doktorlar katalogi — GET /doctors-catalog</summary>
    public class DoctorCatalogItemDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string FullName { get; set; } = default!;
        public string? Specialization { get; set; }
        public int? ExperienceYears { get; set; }
        public string ClinicName { get; set; } = default!;
        public decimal AverageRating { get; set; }
        public bool IsLinked { get; set; }
        public int TotalConsultations { get; set; }
    }

    /// <summary>Mening konsultantlarim — GET /my-consultants</summary>
    public class MyConsultantDto
    {
        public int ClinicConsultantId { get; set; }
        public int DoctorId { get; set; }
        public string FullName { get; set; } = default!;
        public string? Specialization { get; set; }
        public string ClinicName { get; set; } = default!;
        public decimal AverageRating { get; set; }
        public int TotalConsultations { get; set; }
        public DateTime? LastConsultationAt { get; set; }
        public string Status { get; set; } = default!;
    }

    /// <summary>Konsultatsiya tarixi — GET /my-consultants/{id}/history</summary>
    public class ConsultantHistoryItemDto
    {
        public int ConsultationId { get; set; }
        public string PatientName { get; set; } = default!;
        public string Status { get; set; } = default!;
        public DateTime CreatedAt { get; set; }
        public bool HasConclusion { get; set; }
    }

    /// <summary>Konsultatsiyalar ro'yxati — GET /list</summary>
    public class ConsultationListItemDto
    {
        public int Id { get; set; }
        public string PatientName { get; set; } = default!;
        public string ConsultantName { get; set; } = default!;
        public string Status { get; set; } = default!;
        public DateTime CreatedAt { get; set; }
        public DateTime? ScheduledAt { get; set; }
        public bool HasConclusion { get; set; }
    }

    /// <summary>Ulashilgan tahlil</summary>
    public class SharedAnalysisDto
    {
        public int Id { get; set; }
        public string AnalysisType { get; set; } = default!;
        public int AnalysisId { get; set; }
        public DateTime SharedAt { get; set; }
    }

    /// <summary>Xulosa</summary>
    public class ConsultationConclusionDto
    {
        public string Diagnosis { get; set; } = default!;
        public string Recommendations { get; set; } = default!;
        public string? Medications { get; set; }
        public bool FollowUpRequired { get; set; }
        public string? FollowUpNote { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>Konsultatsiya to'liq ma'lumoti — GET /{id}</summary>
    public class ConsultationDetailDto
    {
        public int Id { get; set; }
        public string Status { get; set; } = default!;
        public bool IsFirstRequest { get; set; }
        public string? Note { get; set; }
        public string? RejectionReason { get; set; }
        public DateTime? ScheduledAt { get; set; }
        public string? LiveKitRoomName { get; set; }
        public DateTime? ConcludedAt { get; set; }
        public DateTime CreatedAt { get; set; }

        // Bemor
        public int PatientId { get; set; }
        public string PatientName { get; set; } = default!;
        public int? PatientAge { get; set; }
        public bool? PatientGender { get; set; }

        // Konsultant
        public int ConsultantDoctorId { get; set; }
        public string ConsultantName { get; set; } = default!;
        public string? ConsultantSpecialization { get; set; }
        public string ConsultantClinicName { get; set; } = default!;
        public decimal ConsultantRating { get; set; }

        // Tahlillar
        public List<SharedAnalysisDto> Analyses { get; set; } = new();

        // Xulosa
        public ConsultationConclusionDto? Conclusion { get; set; }

        // Baho berilganmi (72 soat ichida baho berish imkoniyati)
        public bool HasRating { get; set; }
    }

    /// <summary>Doctor uchun kiruvchi so'rov turi/soni</summary>
    public class SharedAnalysisTypeCountDto
    {
        public string AnalysisType { get; set; } = default!;
        public int Count { get; set; }
    }

    /// <summary>Doctor: kiruvchi so'rov — GET /incoming</summary>
    public class IncomingConsultationDto
    {
        public int Id { get; set; }
        public string ClinicName { get; set; } = default!;
        public string PatientName { get; set; } = default!;
        public int? PatientAge { get; set; }
        public bool? PatientGender { get; set; }
        public string? Note { get; set; }
        public bool IsFirstRequest { get; set; }
        public string Status { get; set; } = default!;
        public DateTime CreatedAt { get; set; }
        public DateTime? ScheduledAt { get; set; }
        public List<SharedAnalysisTypeCountDto> AnalysisSummary { get; set; } = new();
    }

    /// <summary>Doctor: to'liq tahlil — GET /{id}/analyses</summary>
    public class FullAnalysisItemDto
    {
        public string AnalysisType { get; set; } = default!;
        public int AnalysisId { get; set; }
        public DateTime? CreatedAt { get; set; }
        public string? AiSummary { get; set; }
    }

    /// <summary>Video token javobi — GET /{id}/livekit-token</summary>
    public class ConsultationTokenResponseDto
    {
        public string Token { get; set; } = default!;
        public string LiveKitUrl { get; set; } = default!;
        public string RoomName { get; set; } = default!;
    }

    /// <summary>Biriktirilgan klinika — GET /my-linked-clinics</summary>
    public class LinkedClinicDto
    {
        public int ClinicConsultantId { get; set; }
        public int ClinicId { get; set; }
        public string ClinicName { get; set; } = default!;
        public int TotalConsultations { get; set; }
        public DateTime? LastConsultationAt { get; set; }
        public string Status { get; set; } = default!;
    }
}
