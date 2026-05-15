---
description: "Online Konsultatsiya moduli — boshqa klinikadagi doktorni konsultant sifatida biriktirish, video qo'ng'iroq va xulosa yozish"
---

# Tasks: Online Konsultatsiya Moduli

**Maqsad**: Admin boshqa klinikadagi doctorni tizimdan topib, unga bemor tahlillari bilan
konsultatsiya so'rovi yuboradi. Doctor qabul qilsa, video qo'ng'iroq o'tkaziladi va
xulosa yoziladi. Biriktirilgan doktorlar keyingi safar to'g'ridan-to'g'ri tanlanadi.

**Pattern fayllar**:
- `backend/EkgAnalyzerApi/Controllers/LabAnalyseController.cs`
- `backend/EkgAnalyzerApi/Services/LabAnalyseService.cs`
- `backend/EkgAnalyzerApi/Controllers/VideoCallController.cs` ← LiveKit token pattern
- `backend/EkgAnalyzerApi/Hubs/VideoCallHub.cs` ← SignalR bildirishnoma pattern
- `frontend/src/host/requests/VideoCallRequest.js`
- `frontend/src/pages/cabinet/video_conference/`

**Rollar**:
- `ClinicAdmin (2) / Direktor (3)`: konsultatsiya yaratadi, bekor qiladi, baho beradi
- `Doctor (4)`: qabul qiladi, rad etadi, vaqt belgilaydi, xulosa yozadi

---

## Phase 1: Database — EF Core Migration

**Maqsad**: 5 ta yangi jadval + Doctor modeliga 3 yangi maydon. Hech narsa boshlanmasin.

### 1a. Doctor modeliga maydonlar qo'shish

- [ ] OC001 `backend/EkgAnalyzerApi/Models/Doctors.cs` ga 3 yangi maydon qo'sh:
  ```csharp
  [Column("average_rating")]
  public decimal AverageRating { get; set; } = 0;

  [Column("total_ratings")]
  public int TotalRatings { get; set; } = 0;

  [Column("experience_years")]
  public int? ExperienceYears { get; set; }
  ```

### 1b. Yangi model fayllari

- [ ] OC002 `ClinicConsultant.cs` model yarat
  Fayl: `backend/EkgAnalyzerApi/Models/ClinicConsultant.cs`
  ```csharp
  [Table("clinic_consultants")]
  public class ClinicConsultant
  {
      [Key][Column("id")] public int Id { get; set; }
      [Column("clinic_id")] public int ClinicId { get; set; }
      public Clinic? Clinic { get; set; }
      [Column("consultant_doctor_id")] public int ConsultantDoctorId { get; set; }
      public Doctor? ConsultantDoctor { get; set; }
      [Column("linked_at")] public DateTime LinkedAt { get; set; }
      [Column("linked_by_consultation_id")] public int LinkedByConsultationId { get; set; }
      [Column("status")] public string Status { get; set; } = "active"; // "active"|"paused"
      [Column("total_consultations")] public int TotalConsultations { get; set; } = 0;
      [Column("last_consultation_at")] public DateTime? LastConsultationAt { get; set; }
  }
  ```

- [ ] OC003 `Consultation.cs` model yarat
  Fayl: `backend/EkgAnalyzerApi/Models/Consultation.cs`
  ```csharp
  [Table("consultations")]
  public class Consultation
  {
      [Key][Column("id")] public int Id { get; set; }
      [Column("clinic_id")] public int ClinicId { get; set; }
      public Clinic? Clinic { get; set; }
      [Column("consultant_doctor_id")] public int ConsultantDoctorId { get; set; }
      public Doctor? ConsultantDoctor { get; set; }
      [Column("clinic_consultant_id")] public int? ClinicConsultantId { get; set; }
      public ClinicConsultant? ClinicConsultant { get; set; }
      [Column("requested_by_admin_id")] public int RequestedByAdminId { get; set; }
      public User? RequestedByAdmin { get; set; }
      [Column("patient_id")] public int PatientId { get; set; }
      public Patient? Patient { get; set; }
      [Column("is_first_request")] public bool IsFirstRequest { get; set; } = false;
      [Column("note")] public string? Note { get; set; }
      [Column("status")] public string Status { get; set; } = "pending";
      // "pending"|"accepted"|"rejected"|"scheduled"|"concluded"|"cancelled"|"expired"
      [Column("rejection_reason")] public string? RejectionReason { get; set; }
      [Column("scheduled_at")] public DateTime? ScheduledAt { get; set; }
      [Column("livekit_room_name")] public string? LiveKitRoomName { get; set; }
      [Column("concluded_at")] public DateTime? ConcludedAt { get; set; }
      [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
      [Column("updated_at")] public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

      public ICollection<ConsultationAnalysis>? Analyses { get; set; }
      public ConsultationConclusion? Conclusion { get; set; }
  }
  ```

- [ ] OC004 `ConsultationAnalysis.cs` model yarat
  Fayl: `backend/EkgAnalyzerApi/Models/ConsultationAnalysis.cs`
  ```csharp
  [Table("consultation_analyses")]
  public class ConsultationAnalysis
  {
      [Key][Column("id")] public int Id { get; set; }
      [Column("consultation_id")] public int ConsultationId { get; set; }
      public Consultation? Consultation { get; set; }
      [Column("analysis_type")] public string AnalysisType { get; set; } = default!;
      // "EKG"|"SMAD"|"Holter"|"Lab"|"Parasit"
      [Column("analysis_id")] public int AnalysisId { get; set; }
      [Column("shared_at")] public DateTime SharedAt { get; set; } = DateTime.UtcNow;
  }
  ```

- [ ] OC005 `ConsultationConclusion.cs` model yarat
  Fayl: `backend/EkgAnalyzerApi/Models/ConsultationConclusion.cs`
  ```csharp
  [Table("consultation_conclusions")]
  public class ConsultationConclusion
  {
      [Key][Column("id")] public int Id { get; set; }
      [Column("consultation_id")] public int ConsultationId { get; set; }
      public Consultation? Consultation { get; set; }
      [Column("diagnosis")] public string Diagnosis { get; set; } = default!;
      [Column("recommendations")] public string Recommendations { get; set; } = default!;
      [Column("medications")] public string? Medications { get; set; }
      [Column("follow_up_required")] public bool FollowUpRequired { get; set; } = false;
      [Column("follow_up_note")] public string? FollowUpNote { get; set; }
      [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
  }
  ```

- [ ] OC006 `ConsultantRating.cs` model yarat
  Fayl: `backend/EkgAnalyzerApi/Models/ConsultantRating.cs`
  ```csharp
  [Table("consultant_ratings")]
  public class ConsultantRating
  {
      [Key][Column("id")] public int Id { get; set; }
      [Column("consultant_doctor_id")] public int ConsultantDoctorId { get; set; }
      public Doctor? ConsultantDoctor { get; set; }
      [Column("consultation_id")] public int ConsultationId { get; set; }
      public Consultation? Consultation { get; set; }
      [Column("clinic_id")] public int ClinicId { get; set; }
      public Clinic? Clinic { get; set; }
      [Column("score")] public int Score { get; set; } // 1–5
      [Column("comment")] public string? Comment { get; set; }
      [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
  }
  ```

### 1c. DbContext + Migration

- [ ] OC007 `MedDataDB.cs` ga yangi DbSet'larni qo'sh (OC002–OC006 tugagandan so'ng):
  ```csharp
  public DbSet<ClinicConsultant> ClinicConsultants { get; set; }
  public DbSet<Consultation> Consultations { get; set; }
  public DbSet<ConsultationAnalysis> ConsultationAnalyses { get; set; }
  public DbSet<ConsultationConclusion> ConsultationConclusions { get; set; }
  public DbSet<ConsultantRating> ConsultantRatings { get; set; }
  ```
  Fayl: `backend/EkgAnalyzerApi/Data/MedDataDB.cs`

- [ ] OC008 EF Core migration yarat va apply qil (OC007 tugagandan so'ng):
  ```bash
  dotnet ef migrations add AddOnlineConsultationTables
  dotnet ef database update
  ```
  Migration UNIQUE constraint qo'shishi shart:
  `clinic_consultants(clinic_id, consultant_doctor_id)` — takroriy biriktirish yo'q
  `consultation_conclusions(consultation_id)` — bitta xulosa
  `consultant_ratings(consultation_id)` — bir konsultatsiyaga bir baho

**Checkpoint**: 5 yangi jadval + doctors jadvalida 3 yangi ustun bazada mavjud bo'lishi SHART.

---

## Phase 2: Backend — SignalR Hub (Bildirishnomalar)

**Maqsad**: Doctor konsultatsiya so'rovi kelganini real-time ko'rsin; Admin doctor javobi kelganini darhol bilsin.
`VideoCallHub.cs` pattern aynan ko'chiriladi.

- [ ] OC009 `ConsultationHub.cs` yarat
  Fayl: `backend/EkgAnalyzerApi/Hubs/ConsultationHub.cs`
  ```csharp
  // VideoCallHub.cs pattern
  [Authorize]
  public class ConsultationHub : Hub
  {
      // OnConnectedAsync — userId ni ro'yxatga oladi (IConsultationConnectionService)
      // OnDisconnectedAsync — ro'yxatdan chiqaradi

      // Client tomoniga yuboriluvchi eventlar:
      // "NewConsultationRequest"  → Doctor ga: { consultationId, clinicName, patientName, note }
      // "ConsultationAccepted"    → Admin ga: { consultationId, doctorName }
      // "ConsultationRejected"    → Admin ga: { consultationId, reason }
      // "ConsultationScheduled"   → Admin ga: { consultationId, scheduledAt }
      // "ConsultationConcluded"   → Admin ga: { consultationId }
      // "ConsultationCancelled"   → Doctor ga: { consultationId }
      // "ConsultationExpired"     → Admin ga: { consultationId }
  }
  ```

- [ ] OC010 `IConsultationConnectionService.cs` + `ConsultationConnectionService.cs` yarat
  Fayl: `backend/EkgAnalyzerApi/Services/ConsultationConnectionService.cs`
  `VideoCallConnectionService.cs` pattern — Singleton, ConcurrentDictionary<int, string>
  Metodlar: `Register(userId, connectionId)`, `Remove(connectionId)`,
  `GetConnectionId(userId)`, `IsOnline(userId)`

---

## Phase 3: Backend — DTOs

- [ ] OC011 `ConsultationDTOs.cs` yarat
  Fayl: `backend/EkgAnalyzerApi/DTOs/ConsultationDTOs.cs`

  **Request DTOs**:
  ```csharp
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
  ```

  **Response DTOs**:
  ```csharp
  public class DoctorCatalogItemDto  // GET /doctors-catalog
  {
      public int Id { get; set; }             // Doctor.Id
      public int UserId { get; set; }
      public string FullName { get; set; }    // FirstName + LastName
      public string? Specialization { get; set; } // DoctorPositions → Positions
      public int? ExperienceYears { get; set; }
      public string ClinicName { get; set; } = default!;
      public decimal AverageRating { get; set; }
      public bool IsLinked { get; set; }
      public int TotalConsultations { get; set; }
  }

  public class MyConsultantDto  // GET /my-consultants
  {
      public int ClinicConsultantId { get; set; }
      public int DoctorId { get; set; }
      public string FullName { get; set; } = default!;
      public string? Specialization { get; set; }
      public string ClinicName { get; set; } = default!;
      public decimal AverageRating { get; set; }
      public int TotalConsultations { get; set; }
      public DateTime? LastConsultationAt { get; set; }
      public string Status { get; set; } = default!; // "active"|"paused"
  }

  public class ConsultationListItemDto  // GET /list
  {
      public int Id { get; set; }
      public string PatientName { get; set; } = default!;
      public string ConsultantName { get; set; } = default!;
      public string Status { get; set; } = default!;
      public DateTime CreatedAt { get; set; }
      public DateTime? ScheduledAt { get; set; }
      public bool HasConclusion { get; set; }
  }

  public class ConsultationDetailDto  // GET /{id}
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

      // Patient
      public int PatientId { get; set; }
      public string PatientName { get; set; } = default!;
      public int? PatientAge { get; set; }
      public bool? PatientGender { get; set; }

      // Consultant Doctor
      public int ConsultantDoctorId { get; set; }
      public string ConsultantName { get; set; } = default!;
      public string? ConsultantSpecialization { get; set; }
      public string ConsultantClinicName { get; set; } = default!;
      public decimal ConsultantRating { get; set; }

      // Analyses
      public List<SharedAnalysisDto> Analyses { get; set; } = new();

      // Conclusion (null agar yo'q bo'lsa)
      public ConsultationConclusionDto? Conclusion { get; set; }
  }

  public class SharedAnalysisDto
  {
      public int Id { get; set; }
      public string AnalysisType { get; set; } = default!;
      public int AnalysisId { get; set; }
      public DateTime SharedAt { get; set; }
  }

  public class ConsultationConclusionDto
  {
      public string Diagnosis { get; set; } = default!;
      public string Recommendations { get; set; } = default!;
      public string? Medications { get; set; }
      public bool FollowUpRequired { get; set; }
      public string? FollowUpNote { get; set; }
      public DateTime CreatedAt { get; set; }
  }

  public class IncomingConsultationDto  // Doctor: GET /incoming
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
      public List<SharedAnalysisTypeCountDto> AnalysisSummary { get; set; } = new();
      // [{AnalysisType: "EKG", Count: 1}, {AnalysisType: "Lab", Count: 2}]
  }

  public class SharedAnalysisTypeCountDto
  {
      public string AnalysisType { get; set; } = default!;
      public int Count { get; set; }
  }

  public class FullAnalysisItemDto  // Doctor: GET /{id}/analyses
  {
      public string AnalysisType { get; set; } = default!;
      public int AnalysisId { get; set; }
      public DateTime CreatedAt { get; set; }
      public string? AiSummary { get; set; } // AI xulosa qisqacha
  }

  public class LiveKitTokenResponseDto
  {
      public string Token { get; set; } = default!;
      public string LiveKitUrl { get; set; } = default!;
      public string RoomName { get; set; } = default!;
  }

  public class ConsultantHistoryItemDto  // GET /my-consultants/{id}/history
  {
      public int ConsultationId { get; set; }
      public string PatientName { get; set; } = default!;
      public string Status { get; set; } = default!;
      public DateTime CreatedAt { get; set; }
      public bool HasConclusion { get; set; }
  }
  ```

---

## Phase 4: Backend — Service

- [ ] OC012 `IOnlineConsultationService.cs` interface yarat
  Fayl: `backend/EkgAnalyzerApi/Services/OnlineConsultationService.cs` (interface shu faylda yoki alohida)

- [ ] OC013 `OnlineConsultationService.cs` yarat
  Fayl: `backend/EkgAnalyzerApi/Services/OnlineConsultationService.cs`
  `LabAnalyseService.cs` pattern — DI: `MedDataDB`, `IHubContext<ConsultationHub>`,
  `IConsultationConnectionService`, `IConfiguration`, `ILogger`

  Metodlar:

  ```
  GetDoctorsCatalogAsync(adminClinicId, specialization?, search?)
    → boshqa klinikalardan (yoki adminning o'z klinikasidan ham) doktorlarni listlaydi
    → Doctor.User.ClinicId join → Clinics
    → DoctorPositions → Positions (specialization uchun)
    → ClinicConsultants da (ClinicId=adminClinicId, ConsultantDoctorId=doctor.Id) tekshiradi
    → IsLinked va TotalConsultations ni populate qiladi
    → MUHIM: admin o'ziga-o'zi so'rov yuborishini oldini olish uchun
      Doctor.UserId == requestingUserId bo'lsa IsLinked=false, lekin filter QILINMAYDI
      (faqat Create endpointda tekshiruv bo'ladi)

  GetMyConsultantsAsync(clinicId)
    → ClinicConsultants WHERE ClinicId = clinicId AND Status = "active"
    → Doctor + User.Clinic join

  GetConsultantHistoryAsync(clinicConsultantId, clinicId)
    → Consultations WHERE ClinicConsultantId = clinicConsultantId AND ClinicId = clinicId
    → ORDER BY CreatedAt DESC

  CreateConsultationAsync(dto, adminUserId, clinicId)
    → Servis logikasi (spec bo'yicha):
      1. ConsultantDoctor.UserId == adminUserId bo'lsa 400: "O'z so'rovingizga konsultant bo'lib bo'lmaydi"
      2. ClinicConsultants da (ClinicId, ConsultantDoctorId) qidir
      3. Topilsa → IsFirstRequest=false, ClinicConsultantId=topilgan.Id
      4. Topilmasa → IsFirstRequest=true, ClinicConsultantId=null
      5. Consultation yarat, Status="pending"
      6. ConsultationAnalyses yaz
      7. SignalR: ConsultationHub "NewConsultationRequest" → Doctor.UserId ga yuborish

  GetConsultationListAsync(clinicId, status?, consultantDoctorId?, patientId?)
    → Consultations WHERE ClinicId = clinicId
    → filter params qo'llash
    → ORDER BY CreatedAt DESC

  GetConsultationByIdAsync(id, userId, roleId)
    → ClinicAdmin bo'lsa: ClinicId tekshirish
    → Doctor bo'lsa: ConsultantDoctorId.UserId tekshirish
    → To'liq detail

  CancelConsultationAsync(id, clinicId)
    → Status "pending" yoki "accepted" bo'lmasa 400
    → Status = "cancelled"
    → SignalR: "ConsultationCancelled" → Doctor.UserId ga

  RateConsultationAsync(id, dto, clinicId)
    → Status != "concluded" bo'lsa 400
    → ConcludedAt + 72 soat tekshirish
    → ConsultantRatings ga saqlash
    → Doctor.AverageRating va TotalRatings qayta hisoblash:
      avg = ConsultantRatings WHERE ConsultantDoctorId = X → AVG(Score)
      total = COUNT(*)

  GetIncomingConsultationsAsync(doctorId, status?)
    → Consultations WHERE ConsultantDoctorId = doctorId
    → AnalysisSummary: ConsultationAnalyses GROUP BY AnalysisType

  GetMyLinkedClinicsAsync(doctorId)
    → ClinicConsultants WHERE ConsultantDoctorId = doctorId AND Status="active"
    → Clinics join

  AcceptConsultationAsync(id, doctorId, doctorUserId)
    → ConsultantDoctorId == doctorId tekshirish, aks holda 403
    → Status != "pending" bo'lsa 400
    → IsFirstRequest=true bo'lsa:
        yangi ClinicConsultant yaratish:
          LinkedByConsultationId = id
          Status = "active"
          TotalConsultations = 1
        Consultation.ClinicConsultantId = yangi.Id
    → IsFirstRequest=false bo'lsa:
        ClinicConsultant.TotalConsultations += 1
        ClinicConsultant.LastConsultationAt = UtcNow
    → Consultation.Status = "accepted", UpdatedAt = UtcNow
    → SignalR: "ConsultationAccepted" → Admin.UserId ga

  RejectConsultationAsync(id, dto, doctorId, doctorUserId)
    → Tekshirish + Status = "rejected" + RejectionReason saqlash
    → IsFirstRequest=true bo'lsa ClinicConsultants ga HECH NARSA YOZILMAYDI
    → SignalR: "ConsultationRejected" → Admin ga

  ScheduleConsultationAsync(id, dto, doctorId)
    → Status "accepted" bo'lmasa 400
    → RoomName = "consultation-{id}" saqlash
    → Status = "scheduled"
    → SignalR: "ConsultationScheduled" → Admin ga { scheduledAt }

  ConcludeConsultationAsync(id, dto, doctorId)
    → Status "accepted" yoki "scheduled" bo'lmasa 400
    → ConsultationConclusions ga saqlash
    → Status = "concluded", ConcludedAt = UtcNow
    → SignalR: "ConsultationConcluded" → Admin ga

  GetConsultationAnalysesAsync(id, doctorId)
    → Consultation.ConsultantDoctorId == doctorId tekshirish
    → ConsultationAnalyses WHERE ConsultationId = id
    → Har biri uchun kerakli jadvaldan (ECGAnalyses, SmadAnalyses, HolterAnalyses,
      LabAnalyses, ParasitologyAnalyses) CreatedAt va AI xulosa qisqacha olish
    → FAQAT shu konsultatsiyaga ulashilgan tahlillar (boshqa tahlillar emas)

  GetLiveKitTokenAsync(id, userId, roleId)
    → Consultation.LiveKitRoomName mavjudligini tekshirish
    → ClinicAdmin bo'lsa: ClinicId tekshirish, participant = "admin-{userId}"
    → Doctor bo'lsa: ConsultantDoctorId.UserId tekshirish, participant = "doctor-{userId}"
    → VideoCallController.GenerateLiveKitToken() pattern — shu statik logikani xizmatda qayta yozish
    → Token + LiveKitUrl + RoomName qaytarish
  ```

  **Muhim**: catch blok bo'sh bo'lmasin — `_logger.LogError(ex, ...)` majburiy.

---

## Phase 5: Backend — Controller

- [ ] OC014 `OnlineConsultationController.cs` yarat
  Fayl: `backend/EkgAnalyzerApi/Controllers/OnlineConsultationController.cs`
  `LabAnalyseController.cs` auth pattern — `ClaimTypes.NameIdentifier` + `"roleId"` claim.

  ```
  [ApiController]
  [Route("api/online-consultation")]
  [Authorize]

  // ADMIN endpointlari
  GET    /doctors-catalog              [Authorize] roleId==2||3 tekshirish servisda
  GET    /my-consultants               [Authorize] roleId==2||3
  GET    /my-consultants/{id}/history  [Authorize] roleId==2||3
  POST   /create                       [Authorize] roleId==2||3
  GET    /list                         [Authorize] roleId==2||3
  GET    /{id}                         [Authorize] (ikkala rol ham)
  PUT    /{id}/cancel                  [Authorize] roleId==2||3
  POST   /{id}/rate                    [Authorize] roleId==2||3

  // DOCTOR endpointlari
  GET    /incoming                     [Authorize] roleId==4
  GET    /my-linked-clinics            [Authorize] roleId==4
  PUT    /{id}/accept                  [Authorize] roleId==4
  PUT    /{id}/reject                  [Authorize] roleId==4
  PUT    /{id}/schedule                [Authorize] roleId==4
  POST   /{id}/conclude                [Authorize] roleId==4
  GET    /{id}/analyses                [Authorize] roleId==4

  // VIDEO
  GET    /{id}/livekit-token           [Authorize] (ikkala rol ham)
  ```

  Har bir endpoint:
  - `GetUserId()` va `GetRoleId()` private metodlar (VideoCallController.cs pattern)
  - Rol noto'g'ri bo'lsa `Forbid()` qaytaradi
  - Service xatolikda `Problem(...)` yoki `BadRequest(...)` qaytaradi

- [ ] OC015 `Program.cs` ga yangi servislarni DI ro'yxatiga qo'sh (OC013 tugagandan so'ng):
  Fayl: `backend/EkgAnalyzerApi/Program.cs`
  ```csharp
  builder.Services.AddScoped<IOnlineConsultationService, OnlineConsultationService>();
  builder.Services.AddSingleton<IConsultationConnectionService, ConsultationConnectionService>();
  // Hub endpoint
  app.MapHub<ConsultationHub>("/hubs/consultation");
  ```

---

## Phase 6: Backend — Background Job (Expiry)

**Maqsad**: 48 soat javob yo'q konsultatsiyalarni "expired" ga o'tkazish.

- [ ] OC016 `ConsultationExpiryService.cs` yarat
  Fayl: `backend/EkgAnalyzerApi/Services/ConsultationExpiryService.cs`
  `IHostedService` yoki `BackgroundService`:
  ```csharp
  public class ConsultationExpiryService : BackgroundService
  {
      // Har soatda ishlaydi (TimeSpan.FromHours(1))
      // Status="pending" AND CreatedAt < UtcNow - 48h → Status="expired"
      // SignalR: "ConsultationExpired" → Admin.UserId ga yuborish
      // ILogger orqali log qilinsin
  }
  ```

- [ ] OC017 `Program.cs` ga background service qo'sh:
  ```csharp
  builder.Services.AddHostedService<ConsultationExpiryService>();
  ```

---

## Phase 7: Frontend — consultationService.js

- [ ] OC018 `consultationService.js` yarat
  Fayl: `frontend/src/host/requests/ConsultationRequest.js`
  `VideoCallRequest.js` va `LabAnalyseRequest.js` strukturasiga mos.

  ```javascript
  import { httpGetRequest, httpPostRequest, httpPutRequest } from "../Host";

  // Admin
  export const getDoctorsCatalog = (params) =>
    httpGetRequest("/online-consultation/doctors-catalog", { params });
  export const getMyConsultants = () =>
    httpGetRequest("/online-consultation/my-consultants");
  export const getConsultantHistory = (clinicConsultantId) =>
    httpGetRequest(`/online-consultation/my-consultants/${clinicConsultantId}/history`);
  export const createConsultation = (data) =>
    httpPostRequest("/online-consultation/create", data);
  export const getConsultationList = (params) =>
    httpGetRequest("/online-consultation/list", { params });
  export const getConsultationById = (id) =>
    httpGetRequest(`/online-consultation/${id}`);
  export const cancelConsultation = (id) =>
    httpPutRequest(`/online-consultation/${id}/cancel`);
  export const rateConsultation = (id, data) =>
    httpPostRequest(`/online-consultation/${id}/rate`, data);

  // Doctor
  export const getIncomingConsultations = (params) =>
    httpGetRequest("/online-consultation/incoming", { params });
  export const getMyLinkedClinics = () =>
    httpGetRequest("/online-consultation/my-linked-clinics");
  export const acceptConsultation = (id) =>
    httpPutRequest(`/online-consultation/${id}/accept`);
  export const rejectConsultation = (id, data) =>
    httpPutRequest(`/online-consultation/${id}/reject`, data);
  export const scheduleConsultation = (id, data) =>
    httpPutRequest(`/online-consultation/${id}/schedule`, data);
  export const concludeConsultation = (id, data) =>
    httpPostRequest(`/online-consultation/${id}/conclude`, data);
  export const getConsultationAnalyses = (id) =>
    httpGetRequest(`/online-consultation/${id}/analyses`);

  // Video
  export const getConsultationLiveKitToken = (id) =>
    httpGetRequest(`/online-consultation/${id}/livekit-token`);
  ```

---

## Phase 8: Frontend — Admin Sahifalari

### 8a. Konsultantlar sahifasi (2 tab)

- [ ] OC019 `MyConsultantsPage.js` yarat
  Fayl: `frontend/src/pages/cabinet/consultation/MyConsultantsPage.js`

  **Tab 1 — "Mening konsultantlarim"** (`getMyConsultants()`):
  - Ant Design `Card` grid (xs:24, sm:12, md:8, lg:6)
  - Har bir karta:
    - Avatar: initials fallback (FirstName[0] + LastName[0])
    - Ismi, mutaxassisligi, klinikasi
    - Jami konsultatsiyalar, oxirgi sana
    - Status badge: `active`=yashil, `paused`=sariq
    - [Yangi so'rov] tugmasi → `CreateConsultationModal` ni ochadi (doctor allaqachon tanlangan)
    - [Tarix] tugmasi → `/consultations?consultantDoctorId={id}` yoki drawer ochadi

  **Tab 2 — "Yangi konsultant qo'shish"** (`getDoctorsCatalog()`):
  - Search input (ismi bo'yicha, debounced 400ms)
  - Specialization filter `Select`
  - Har bir karta: ismi, mutaxassisligi, klinikasi, reyting yulduzlar
  - Allaqachon birikkanlar: `Tag` "Biriktirilgan ✓" + [So'rov yuborish] tugmasi
  - Yangilar: [So'rov yuborish] tugmasi → `CreateConsultationModal` ni ochadi

### 8b. Konsultatsiya yaratish modal

- [ ] OC020 `CreateConsultationModal.js` yarat
  Fayl: `frontend/src/pages/cabinet/consultation/CreateConsultationModal.js`

  Ant Design `Modal` + `Steps` (3 qadam):

  **Qadam 1 — Bemor tanlash**:
  - `GET /api/patients` dan klinika bemorlarini yuklash
  - `Select` + search (debounced)
  - Tanlanganda: ismi, yoshi, jinsi ko'rsatish

  **Qadam 2 — Tahlillarni tanlash**:
  - Tanlangan bemor tahlillari (ECG, SMAD, Holter, Lab, Parasit)
  - Har bir modul uchun mavjud so'rovlar ishlatiladi:
    `getEcgAnalyses`, `getSmadAnalyses`, `getHolterAnalyses`, `getLabAnalyses`, `getParasitologyAnalyses`
  - `Collapse` panel har modul uchun
  - `Checkbox.Group` — tanlash
  - Har biri: turi, sanasi, AI xulosa qisqacha

  **Qadam 3 — Izoh va yuborish**:
  - Doctor nomi ko'rsatiladi (o'zgarmaydi)
  - `TextArea` Note (ixtiyoriy)
  - [Yuborish] → `createConsultation(data)` → success/error `notification`
  - `loading` state, xatolik: `message.error(...)`

### 8c. Konsultatsiyalar ro'yxati

- [ ] OC021 `ConsultationListPage.js` yarat
  Fayl: `frontend/src/pages/cabinet/consultation/ConsultationListPage.js`

  `getConsultationList(params)` — Ant Design `Table`:
  Ustunlar: Bemor ismi | Konsultant | Sana | Holat | Amallar

  Status badge ranglari:
  ```
  pending   → #faad14 (sariq)
  accepted  → #1677ff (ko'k)
  scheduled → #722ed1 (binafsha)
  concluded → #52c41a (yashil)
  rejected  → #ff4d4f (qizil)
  expired   → #8c8c8c (kulrang)
  cancelled → #8c8c8c (kulrang)
  ```

  Filter panel (Ant Design `Form.Item` + `Select` + `RangePicker`):
  - Status `Select`
  - Sana oralig'i `DatePicker.RangePicker`
  - Konsultant ismi `Select` (my-consultants dan to'ldiriladi)

  Amallar ustuni: [Batafsil] → `/consultations/{id}`

### 8d. Konsultatsiya detail sahifasi

- [ ] OC022 `ConsultationDetailPage.js` yarat
  Fayl: `frontend/src/pages/cabinet/consultation/ConsultationDetailPage.js`

  `getConsultationById(id)` + Ant Design `Descriptions`, `Card`:

  Bloklar:
  1. **Bemor bloki**: ismi, yoshi, jinsi (`Descriptions`)
  2. **Konsultant bloki**: ismi, klinikasi, mutaxassisligi, reyting (`Rate` readonly)
  3. **Holat va tarix bloki**: status `Tag`, yaratilgan, belgilangan vaqt
  4. **Ulashilgan tahlillar**: `List` — tur + sana
  5. **Admin izohi**: `Text` italic (agar mavjud)
  6. **Video bo'lim** (status="scheduled" yoki "accepted" bo'lganda):
     ```
     ┌────────────────────────────────────┐
     │  📅 Video vaqt: 15-May 14:00      │
     │  [Video qo'ng'iroqni boshlash]     │
     └────────────────────────────────────┘
     ```
     Tugma → `getConsultationLiveKitToken(id)` → token → `VideoCallRoom` komponentini ochadi
     MUHIM: mavjud `VideoCallRoom.js` komponentini O'ZGARTIRMA,
     faqat `roomName` va `token` props boshqacha uzatiladi
  7. **Xulosa bloki** (status="concluded" bo'lganda):
     Tashxis, tavsiyalar, dorilar, nazorat ko'rigi
     [PDF yuklab olish] → mavjud `ReportRequest.js` logikasiga ulash
  8. **Baho berish** (concluded + 72 soat ichida, hali baho berilmagan):
     Ant Design `Rate` (1-5) + `TextArea` comment
     [Baho berish] tugmasi → `rateConsultation(id, data)`
  9. **[Bekor qilish]** tugmasi (faqat pending/accepted va admin rolida):
     `Popconfirm` bilan tasdiq → `cancelConsultation(id)`

---

## Phase 9: Frontend — Doctor Sahifalari

### 9a. Kiruvchi so'rovlar sahifasi

- [ ] OC023 `IncomingConsultationsPage.js` yarat
  Fayl: `frontend/src/pages/cabinet/consultation/IncomingConsultationsPage.js`

  `getIncomingConsultations({status})` — Status filter (`Select`):

  Har bir so'rov uchun Ant Design `Card`:
  ```
  ┌──────────────────────────────────────────────────┐
  │  "Yangi klinika — birinchi so'rov" Badge (agar)  │
  │  Klinika: Toshkent Markaziy Shifoxonasi          │
  │  Bemor: Aliyev Jasur, 34 yosh, Erkak            │
  │  Tahlillar: EKG x1, Lab x2                      │
  │  Admin izohi: "Yurak aritmiyasi tekshiruvi"      │
  │                                                  │
  │  [Tahlillarni ko'rish] [Qabul qilish] [Rad etish]│
  └──────────────────────────────────────────────────┘
  ```
  - IsFirstRequest=true → `Tag` "Yangi klinika — birinchi so'rov" (to'q ko'k)
  - [Tahlillarni ko'rish] → `Drawer` ochadi, `getConsultationAnalyses(id)` ma'lumotlarini ko'rsatadi
  - [Qabul qilish] → `Popconfirm` → `acceptConsultation(id)` → sahifani refresh
  - [Rad etish] → `Modal` ochadi, `TextArea` rejection reason → `rejectConsultation(id, {reason})`

### 9b. Jadvalim sahifasi

- [ ] OC024 `MySchedulePage.js` yarat
  Fayl: `frontend/src/pages/cabinet/consultation/MySchedulePage.js`

  `getIncomingConsultations({status: "accepted,scheduled"})` — ikkala status:

  **Accepted (vaqt belgilanmagan) bo'limlar**:
  - Har biri uchun: bemor ismi, klinika, tahlillar
  - [Vaqt belgilash] tugmasi → `DatePicker.DateTimePicker` modal → `scheduleConsultation(id, {scheduledAt})`

  **Scheduled (vaqt belgilangan) bo'lim**:
  - Belgilangan vaqt, qolgan vaqt (`countdown`)
  - [Video boshlash] tugmasi → `getConsultationLiveKitToken(id)` → mavjud `VideoCallRoom`
  - [Ish oynasini ochish] → `/consultations/{id}/work`

### 9c. Konsultatsiya ish sahifasi

- [ ] OC025 `ConsultationWorkPage.js` yarat
  Fayl: `frontend/src/pages/cabinet/consultation/ConsultationWorkPage.js`

  Faqat Doctor + Status=accepted/scheduled bo'lganda kirish mumkin.

  **Ant Design `Layout`** (`Sider` + `Content`):

  **CHAP panel (Sider, kengaytirilishi mumkin)** — Tahlillar:
  `getConsultationAnalyses(id)` → Ant Design `Tabs` (AnalysisType bo'yicha tab):
  - EKG tab: AI xulosa matni + agar rasm bor bo'lsa `<img>`
  - Lab tab: parametrlar jadvali (norma bilan)
  - SMAD tab: AI xulosa matni
  - Holter tab: AI xulosa matni
  - Parasit tab: AI xulosa + aniqlangan turlar

  **O'NG panel (Content)** — Video va Xulosa:
  ```
  ┌──────────────────────────────┐
  │ [Video qo'ng'iroqni boshlash]│
  │                              │
  │ XULOSA FORMASI               │
  │ Tashxis: [textarea *]        │
  │ Tavsiyalar: [textarea *]     │
  │ Dorilar: [textarea]          │
  │ [x] Nazorat ko'rigi kerak   │
  │ Nazorat izoh: [textarea]     │
  │                              │
  │ [Xulosani saqlash]           │
  └──────────────────────────────┘
  ```
  - [Video qo'ng'iroqni boshlash] → `getConsultationLiveKitToken(id)` → mavjud `VideoCallRoom`
    MUHIM: mavjud `VideoCallRoom.js` O'ZGARTIRILMASIN
  - [Xulosani saqlash] → `concludeConsultation(id, formData)` → success → `/incoming-consultations`

---

## Phase 10: Frontend — SignalR Hook (Konsultatsiya)

- [ ] OC026 `useConsultationSignalR.js` yarat
  Fayl: `frontend/src/hooks/useConsultationSignalR.js`
  `useVideoSignalR.js` pattern:

  ```javascript
  // /hubs/consultation ga ulanadi
  // JWT Bearer token Authorization header orqali
  // Eventlar:
  //   "NewConsultationRequest"  → Doctor: notification + incoming list badge yangilash
  //   "ConsultationAccepted"    → Admin: notification "Doctor qabul qildi"
  //   "ConsultationRejected"    → Admin: notification "Doctor rad etdi: {reason}"
  //   "ConsultationScheduled"   → Admin: notification "Vaqt belgilandi: {date}"
  //   "ConsultationConcluded"   → Admin: notification "Xulosa tayyor"
  //   "ConsultationCancelled"   → Doctor: notification "So'rov bekor qilindi"
  //   "ConsultationExpired"     → Admin: notification "48 soat javob yo'q"
  // Store: pendingCount state yangilash (badge uchun)
  ```
  Hook `App.js` da bir marta mount (auth bo'lsa va rol 2/3/4 bo'lsa).

- [ ] OC027 `frontend/src/store/Store.js` ga konsultatsiya state qo'sh:
  ```javascript
  consultationBadge: {
    adminPendingCount: 0,   // Admin sidebar badge
    doctorPendingCount: 0,  // Doctor sidebar badge
  },
  setConsultationBadge: (patch) => set(s => ({
    consultationBadge: { ...s.consultationBadge, ...patch }
  })),
  ```

- [ ] OC028 `App.js` ga `useConsultationSignalR` hook ulash:
  ```javascript
  import useConsultationSignalR from "./hooks/useConsultationSignalR";
  const shouldConnect = user_id && [2, 3, 4].includes(user?.roleId);
  useConsultationSignalR(shouldConnect);
  ```

---

## Phase 11: Routing va Sidebar

- [ ] OC029 `Main.js` ga yangi routelarni qo'sh:
  Fayl: `frontend/src/pages/cabinet/Main.js`
  ```javascript
  // ClinicAdmin (2,3) uchun
  { path: "consultants", element: <MyConsultantsPage /> }
  { path: "consultations", element: <ConsultationListPage /> }
  { path: "consultations/:id", element: <ConsultationDetailPage /> }

  // Doctor (4) uchun
  { path: "incoming-consultations", element: <IncomingConsultationsPage /> }
  { path: "my-schedule", element: <MySchedulePage /> }
  { path: "consultations/:id/work", element: <ConsultationWorkPage /> }
  ```

- [ ] OC030 `SideBar.js` ga Admin menyusini qo'sh:
  Fayl: `frontend/src/components/SideBar.js`
  `VideoCallController.cs`-dagi mavjud menyu elementlaridan keyin:
  ```javascript
  // roleId === 2 || roleId === 3 bo'lganda ko'rinadi
  {
    key: "consultants",
    icon: <TeamOutlined />,
    label: t("consultants"),
  },
  {
    key: "consultations",
    icon: <MedicineBoxOutlined />,
    label: (
      <Badge count={store.consultationBadge.adminPendingCount} offset={[10, 0]}>
        {t("consultation")}
      </Badge>
    ),
  }
  ```

- [ ] OC031 `SideBar.js` ga Doctor menyusini qo'sh:
  ```javascript
  // roleId === 4 bo'lganda ko'rinadi
  {
    key: "incoming-consultations",
    icon: <InboxOutlined />,
    label: (
      <Badge count={store.consultationBadge.doctorPendingCount} offset={[10, 0]}>
        {t("incoming_consultations")}
      </Badge>
    ),
  },
  {
    key: "my-schedule",
    icon: <CalendarOutlined />,
    label: t("my_schedule"),
  }
  ```

---

## Phase 12: i18n

- [ ] OC032 `frontend/src/locale/Uz.json` ga konsultatsiya kalitlarini qo'sh:
  ```json
  "consultation": "Konsultatsiya",
  "consultants": "Konsultantlar",
  "my_consultants": "Mening konsultantlarim",
  "add_consultant": "Konsultant qo'shish",
  "incoming_consultations": "Kiruvchi so'rovlar",
  "my_schedule": "Jadvalim",
  "send_request": "So'rov yuborish",
  "new_request": "Yangi so'rov",
  "accept": "Qabul qilish",
  "reject": "Rad etish",
  "rejection_reason": "Rad etish sababi",
  "schedule_video": "Video vaqtini belgilash",
  "start_video_call": "Video qo'ng'iroqni boshlash",
  "write_conclusion": "Xulosa yozish",
  "save_conclusion": "Xulosani saqlash",
  "diagnosis": "Tashxis",
  "recommendations": "Tavsiyalar",
  "medications": "Dori-darmonlar",
  "follow_up_required": "Nazorat ko'rigi kerak",
  "follow_up_note": "Nazorat izoh",
  "first_request_badge": "Yangi klinika — birinchi so'rov",
  "linked_badge": "Biriktirilgan",
  "status_pending": "Kutilmoqda",
  "status_accepted": "Qabul qilindi",
  "status_rejected": "Rad etildi",
  "status_scheduled": "Vaqt belgilandi",
  "status_concluded": "Yakunlandi",
  "status_cancelled": "Bekor qilindi",
  "status_expired": "Muddati o'tdi",
  "consultation_note": "Admin izohi",
  "select_patient": "Bemorni tanlang",
  "select_analyses": "Tahlillarni tanlang",
  "no_own_clinic_doctor": "O'z so'rovingizga konsultant bo'lib bo'lmaydi",
  "view_analyses": "Tahlillarni ko'rish",
  "consultant_doctor": "Konsultant shifokor",
  "consultant_clinic": "Konsultant klinikasi",
  "consultation_history": "Konsultatsiya tarixi",
  "linked_clinics": "Biriktirilgan klinikalar",
  "experience_years": "Tajriba (yil)",
  "total_consultations": "Jami konsultatsiyalar",
  "last_consultation": "Oxirgi konsultatsiya",
  "rate_consultant": "Bahо berish",
  "consultation_concluded": "Xulosa tayyor",
  "open_work_page": "Ish oynasini ochish"
  ```

- [ ] OC033 `frontend/src/locale/Ru.json` ga rus tilidagi ekvivalentlarni qo'sh:
  ```json
  "consultation": "Консультация",
  "consultants": "Консультанты",
  "my_consultants": "Мои консультанты",
  "add_consultant": "Добавить консультанта",
  "incoming_consultations": "Входящие запросы",
  "my_schedule": "Мой график",
  "send_request": "Отправить запрос",
  "new_request": "Новый запрос",
  "accept": "Принять",
  "reject": "Отклонить",
  "rejection_reason": "Причина отказа",
  "schedule_video": "Назначить время видео",
  "start_video_call": "Начать видеозвонок",
  "write_conclusion": "Написать заключение",
  "save_conclusion": "Сохранить заключение",
  "diagnosis": "Диагноз",
  "recommendations": "Рекомендации",
  "medications": "Медикаменты",
  "follow_up_required": "Требуется контрольный осмотр",
  "follow_up_note": "Примечание по осмотру",
  "first_request_badge": "Новая клиника — первый запрос",
  "linked_badge": "Подключён",
  "status_pending": "Ожидает",
  "status_accepted": "Принято",
  "status_rejected": "Отклонено",
  "status_scheduled": "Назначено время",
  "status_concluded": "Завершено",
  "status_cancelled": "Отменено",
  "status_expired": "Просрочено",
  "consultation_note": "Примечание администратора",
  "select_patient": "Выберите пациента",
  "select_analyses": "Выберите анализы",
  "no_own_clinic_doctor": "Вы не можете быть консультантом своего запроса",
  "view_analyses": "Просмотр анализов",
  "consultant_doctor": "Врач-консультант",
  "consultant_clinic": "Клиника консультанта",
  "consultation_history": "История консультаций",
  "linked_clinics": "Подключённые клиники",
  "experience_years": "Опыт (лет)",
  "total_consultations": "Всего консультаций",
  "last_consultation": "Последняя консультация",
  "rate_consultant": "Оценить",
  "consultation_concluded": "Заключение готово",
  "open_work_page": "Открыть рабочую страницу"
  ```

- [ ] OC034 `frontend/src/locale/En.json` ga inglizcha ekvivalentlarni qo'sh:
  ```json
  "consultation": "Consultation",
  "consultants": "Consultants",
  "my_consultants": "My Consultants",
  "add_consultant": "Add Consultant",
  "incoming_consultations": "Incoming Requests",
  "my_schedule": "My Schedule",
  "send_request": "Send Request",
  "new_request": "New Request",
  "accept": "Accept",
  "reject": "Reject",
  "rejection_reason": "Rejection Reason",
  "schedule_video": "Schedule Video",
  "start_video_call": "Start Video Call",
  "write_conclusion": "Write Conclusion",
  "save_conclusion": "Save Conclusion",
  "diagnosis": "Diagnosis",
  "recommendations": "Recommendations",
  "medications": "Medications",
  "follow_up_required": "Follow-up Required",
  "follow_up_note": "Follow-up Note",
  "first_request_badge": "New Clinic — First Request",
  "linked_badge": "Linked",
  "status_pending": "Pending",
  "status_accepted": "Accepted",
  "status_rejected": "Rejected",
  "status_scheduled": "Scheduled",
  "status_concluded": "Concluded",
  "status_cancelled": "Cancelled",
  "status_expired": "Expired",
  "consultation_note": "Admin Note",
  "select_patient": "Select Patient",
  "select_analyses": "Select Analyses",
  "no_own_clinic_doctor": "You cannot be a consultant for your own request",
  "view_analyses": "View Analyses",
  "consultant_doctor": "Consultant Doctor",
  "consultant_clinic": "Consultant Clinic",
  "consultation_history": "Consultation History",
  "linked_clinics": "Linked Clinics",
  "experience_years": "Experience (years)",
  "total_consultations": "Total Consultations",
  "last_consultation": "Last Consultation",
  "rate_consultant": "Rate",
  "consultation_concluded": "Conclusion Ready",
  "open_work_page": "Open Work Page"
  ```

---

## Phase 13: Nginx Config

- [ ] OC035 `deploy/nginx.conf` ga ConsultationHub WebSocket yo'lini qo'sh:
  ```nginx
  location /hubs/consultation {
      proxy_pass http://localhost:5000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
  }
  ```

---

## Dependencies & Execution Order

### Majburiy ketma-ketlik

```
Phase 1 (OC001–OC008)         ← DATABASE: hamma narsadan oldin
OC009–OC010                   ← SignalR Hub (Phase 1 dan keyin)
OC011                         ← DTOs (Phase 1 dan keyin, Phase 4 dan oldin)
OC012–OC013                   ← Service (OC011 + OC009 dan keyin)
OC014                         ← Controller (OC013 dan keyin)
OC015                         ← Program.cs DI (OC014 dan keyin)
OC016–OC017                   ← Background Job (OC013 dan keyin)
─────────────────────────────
OC018                         ← Frontend requests (Phase 5 tayyor bo'lgandan keyin)
OC026–OC028                   ← SignalR hook + Store (OC018 dan keyin)
OC019–OC025                   ← Sahifalar (OC018 + OC026 dan keyin)
OC029–OC031                   ← Routing + Sidebar (OC019–OC025 dan keyin)
OC032–OC034                   ← i18n (sahifalar bilan parallel)
OC035                         ← Nginx (deploy vaqtida)
```

### Parallel bajarilishi mumkin

- OC002–OC006 — 5 model fayli bir vaqtda
- OC009–OC010 — Hub va ConnectionService parallel
- OC011 — DTOs, modellar tayyorlangandan so'ng mustaqil
- OC032–OC034 — uch til parallel
- OC019–OC025 — sahifalar bir-biridan mustaqil

---

## Muhim Eslatmalar (Xatolardan Saqlanish)

1. **LiveKit token** — `VideoCallController.cs` dagi `GenerateLiveKitToken` statik metod logikasi
   `OnlineConsultationService.cs` ga ko'chiriladi (yoki `private static` metod sifatida), tokenni
   `_config["LiveKit:ApiKey"]`, `_config["LiveKit:ApiSecret"]`, `_config["LiveKit:Url"]` dan oladi.

2. **VideoCallRoom.js O'ZGARTIRILMAYDI** — faqat yangi props `roomName` va `token` uzatiladi.

3. **Doctor.FullName** yo'q — `$"{FirstName} {LastName}".Trim()` ishlatiladi (VideoCallController.cs pattern).

4. **Doctor.Specialization** yo'q — `DoctorPositions` → `Positions.NameUz/NameRu` join qilinadi.

5. **IsFirstRequest=true + reject** → ClinicConsultants ga hech narsa yozilmaydi (spec talabi).

6. **Klinika izolyatsiyasi** — `/analyses` endpointi PatientId bo'yicha barcha jadvallardan (ECGAnalyses,
   SmadAnalyses, HolterAnalyses, LabAnalyses, ParasitologyAnalyses) tahlillarni qaytaradi,
   lekin faqat `ConsultantDoctorId == mening DoctorId` tekshiruvi bilan.

7. **Cheklov** — admin o'zining UserId si bilan mos keladigan doctorga so'rov yuborolmaydi
   (ya'ni `ConsultantDoctor.UserId == adminUserId` tekshirish).

8. **catch bloklar** — hech qachon bo'sh qolmasin, `_logger.LogError(ex, "...")` majburiy.

9. **Rate limiting** — `/create` va token endpointlariga `RequireRateLimiting("general")` attribute.

---

## Testlash Cheklisti

- [ ] Admin katalogda boshqa klinika doktorini topadi
- [ ] Admin birinchi marta so'rov yuboradi (IsFirstRequest=true)
- [ ] Doctor so'rovni ko'radi (SignalR notification)
- [ ] Doctor qabul qiladi → ClinicConsultants yoziladi
- [ ] Doctor rad etadi (IsFirstRequest=true) → ClinicConsultants yozilmaydi
- [ ] Admin "Konsultantlarim" da birikkan doctorni ko'radi
- [ ] Ikkinchi so'rov → IsFirstRequest=false, TotalConsultations += 1
- [ ] Doctor vaqt belgilaydi → LiveKitRoomName saqlanadi
- [ ] Admin + Doctor video qo'ng'iroq ochadi (mavjud VideoCallRoom)
- [ ] Doctor xulosa yozadi → Status="concluded"
- [ ] Admin xulosa ko'radi va baho beradi
- [ ] 48 soat o'tsa → Status="expired" (Background Job)
- [ ] Uch tildagi tarjimalar ishlaydi
- [ ] SignalR notification har bir holat o'zgarishida ishlaydi
