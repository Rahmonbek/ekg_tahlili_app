namespace EkgAnalyzerApi.DTOs
{
    // ─── REQUEST DTOs ──────────────────────────────────────────────────────────

    public class SearchDoctorsQuery
    {
        public string? PassportSeries { get; set; }
        public string? Phone { get; set; }
        public int? RegionId { get; set; }
        public int? DistrictId { get; set; }
        public int? ClinicId { get; set; }
    }

    public record InviteDoctorDto(int DoctorId, decimal PricePerSession);

    public record UpdatePriceDto(decimal NewPrice, DateOnly EffectiveFrom);

    public class CreateConsultationDto
    {
        public int? PatientId { get; set; }
        public NewPatientDto? NewPatient { get; set; }
        public int[] DoctorIds { get; set; } = Array.Empty<int>();
        public DateOnly ConsultationDate { get; set; }
    }

    public record NewPatientDto(
        string PassportSeries,
        string FullName,
        DateOnly BirthDate,
        bool Gender,
        string? Phone,
        string? Address
    );

    public record ConcludeConsultationDto(
        string PatientCondition,
        string Diagnosis,
        string Treatment
    );

    public record RejectConsultationDto(string RejectionReason);

    // ─── RESPONSE DTOs ─────────────────────────────────────────────────────────

    /// <summary>Admin: GET /search-doctors</summary>
    public class DoctorSearchResultDto
    {
        public int DoctorId { get; set; }
        public string FullName { get; set; } = default!;
        public string? Position { get; set; }
        public string? Phone { get; set; }
        public string ClinicName { get; set; } = default!;
        public string? RegionName { get; set; }
        public string? DistrictName { get; set; }
    }

    /// <summary>Admin: GET /my-consultants</summary>
    public class MyConsultantDto
    {
        public int ClinicConsultantId { get; set; }
        public int DoctorId { get; set; }
        public string FullName { get; set; } = default!;
        public string? Position { get; set; }
        public string? Phone { get; set; }
        public decimal CurrentPrice { get; set; }
        public int TotalConsultations { get; set; }
        public DateTime LinkedAt { get; set; }
    }

    /// <summary>Admin: GET /consultants/{id}/price-history</summary>
    public class ConsultantPriceHistoryDto
    {
        public int Id { get; set; }
        public decimal OldPrice { get; set; }
        public decimal NewPrice { get; set; }
        public DateOnly EffectiveFrom { get; set; }
        public DateTime ChangedAt { get; set; }
        public string? ChangedByFullName { get; set; }
        public bool IsActiveToday { get; set; }
    }

    /// <summary>Admin: GET /my-sent-invitations</summary>
    public class SentInvitationDto
    {
        public int Id { get; set; }
        public int DoctorId { get; set; }
        public string DoctorFullName { get; set; } = default!;
        public string? DoctorPosition { get; set; }
        public string? DoctorPhone { get; set; }
        public string DoctorClinicName { get; set; } = default!;
        public decimal PricePerSession { get; set; }
        public DateTime InvitedAt { get; set; }
        public DateTime? RespondedAt { get; set; }
        public string Status { get; set; } = default!;
    }

    /// <summary>Sidebar badge counts for online consultation</summary>
    public class ConsultationBadgeCountsDto
    {
        public int AdminPendingCount { get; set; }
        public int DoctorPendingInvitationsCount { get; set; }
        public int DoctorCreatedCount { get; set; }
        public int DoctorPendingCount { get; set; }
    }

    /// <summary>Admin: passport + tug'ilgan sana bo'yicha bemor qidirish</summary>
    public class ConsultationPatientLookupDto
    {
        public bool Found { get; set; }
        public int? PatientId { get; set; }
        public string? PassportSeries { get; set; }
        public string? FullName { get; set; }
        public DateOnly? BirthDate { get; set; }
        public bool? Gender { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
    }

    /// <summary>Admin: GET /consultants/{id}/history row</summary>
    public class ConsultantHistoryItemDto
    {
        public int Id { get; set; }
        public string PatientFullName { get; set; } = default!;
        public DateOnly ConsultationDate { get; set; }
        public decimal PriceAtCreation { get; set; }
        public string Status { get; set; } = default!;
        public bool HasConclusion { get; set; }
    }

    /// <summary>Admin: GET /consultants/{id}/history</summary>
    public class ConsultantHistoryDto
    {
        public List<ConsultantHistoryItemDto> Consultations { get; set; } = new();
        public decimal TotalAmount { get; set; }
    }

    /// <summary>Admin: GET /list</summary>
    public class ConsultationListItemDto
    {
        public int Id { get; set; }
        public string PatientFullName { get; set; } = default!;
        public string DoctorFullName { get; set; } = default!;
        public decimal PriceAtCreation { get; set; }
        public DateOnly ConsultationDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; } = default!;
        public bool HasConclusion { get; set; }
    }

    /// <summary>Xulosa</summary>
    public class ConsultationConclusionDto
    {
        public string PatientCondition { get; set; } = default!;
        public string Diagnosis { get; set; } = default!;
        public string Treatment { get; set; } = default!;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>Bemorning tahlil (faqat ro'yxat uchun)</summary>
    public class PatientAnalysisItemDto
    {
        public string Type { get; set; } = default!;
        public int Id { get; set; }
        public DateTime? Date { get; set; }
        public bool HasAiResult { get; set; }
        public string? ClinicName { get; set; }
        public string? CreatedByFullName { get; set; }
    }

    /// <summary>Admin: GET /{id}/detail</summary>
    public class ConsultationDetailAdminDto
    {
        // Konsultatsiya
        public int Id { get; set; }
        public DateOnly ConsultationDate { get; set; }
        public decimal PriceAtCreation { get; set; }
        public string Status { get; set; } = default!;
        public DateTime CreatedAt { get; set; }
        public string? RejectionReason { get; set; }
        public string? LiveKitRoomName { get; set; }

        // Bemor
        public int PatientId { get; set; }
        public string PatientFullName { get; set; } = default!;
        public DateOnly? BirthDate { get; set; }
        public bool? Gender { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? PassportSeries { get; set; }

        // Konsultant
        public int DoctorId { get; set; }
        public int? DoctorUserId { get; set; }
        public bool DoctorIsOnline { get; set; }
        public string DoctorFullName { get; set; } = default!;
        public string? DoctorPosition { get; set; }
        public string? DoctorPhone { get; set; }
        public string DoctorClinicName { get; set; } = default!;

        // Xulosa
        public ConsultationConclusionDto? Conclusion { get; set; }

        // Tahlillar ro'yxati
        public List<PatientAnalysisItemDto> Analyses { get; set; } = new();
    }

    /// <summary>Shifokor: GET /invitations</summary>
    public class InvitationDto
    {
        public int Id { get; set; }
        public string ClinicName { get; set; } = default!;
        public decimal PricePerSession { get; set; }
        public DateTime InvitedAt { get; set; }
        public string Status { get; set; } = default!;
    }

    /// <summary>Shifokor: GET /my-clinics</summary>
    public class MyClinicDto
    {
        public int ClinicConsultantId { get; set; }
        public string ClinicName { get; set; } = default!;
        public DateTime LinkedAt { get; set; }
        public int TotalConsultations { get; set; }
        public decimal CurrentPrice { get; set; }
    }

    /// <summary>Shifokor: GET /my-consultations row</summary>
    public class DoctorConsultationItemDto
    {
        public int Id { get; set; }
        public string PatientFullName { get; set; } = default!;
        public string ClinicName { get; set; } = default!;
        public decimal PriceAtCreation { get; set; }
        public DateOnly ConsultationDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; } = default!;
        public bool HasConclusion { get; set; }
    }

    /// <summary>Shifokor: GET /{id}/doctor-detail</summary>
    public class ConsultationDetailDoctorDto
    {
        // Konsultatsiya
        public int Id { get; set; }
        public DateOnly ConsultationDate { get; set; }
        public decimal PriceAtCreation { get; set; }
        public string Status { get; set; } = default!;
        public string? RejectionReason { get; set; }
        public string? LiveKitRoomName { get; set; }

        // Bemor (passport yo'q)
        public string PatientFullName { get; set; } = default!;
        public DateOnly? BirthDate { get; set; }
        public bool? Gender { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }

        // Admin
        public string AdminFullName { get; set; } = default!;
        public int? AdminUserId { get; set; }
        public bool AdminIsOnline { get; set; }
        public string? AdminPhone { get; set; }
        public string ClinicName { get; set; } = default!;

        // Xulosa
        public ConsultationConclusionDto? Conclusion { get; set; }

        // Tahlillar ro'yxati
        public List<PatientAnalysisItemDto> Analyses { get; set; } = new();
    }

    /// <summary>Video token javobi</summary>
    public class ConsultationTokenDto
    {
        public string Token { get; set; } = default!;
        public string LiveKitUrl { get; set; } = default!;
        public string RoomName { get; set; } = default!;
    }
}
