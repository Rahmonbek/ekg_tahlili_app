---
description: "Online Konsultatsiya moduli — to'liq qayta yozilgan spec: taklif tizimi, narx boshqaruvi, video qo'ng'iroq, xulosa"
---

# Tasks: Online Konsultatsiya Moduli (v2 — To'liq Qayta Yozilgan)

**Maqsad**: Admin klinikaga boshqa klinikadagi shifokorni konsultant sifatida taklif qiladi (narx bilan).
Shifokor qabul qilsa birikadi. Admin bemor uchun muayyan sanaga konsultatsiya yaratadi.
Shifokor qabul/rad qiladi, video qo'ng'iroq o'tkaziladi, xulosa yoziladi.

**Eski kod to'liq o'chiriladi**: mavjud Controller, Service, modellar, frontend sahifalar.

---

## PATTERN FAYLLAR

- `backend/EkgAnalyzerApi/Controllers/LabAnalyseController.cs` — auth pattern
- `backend/EkgAnalyzerApi/Services/LabAnalyseService.cs` — service pattern
- `backend/EkgAnalyzerApi/Controllers/VideoCallController.cs` — LiveKit token pattern
- `backend/EkgAnalyzerApi/Hubs/VideoCallHub.cs` — SignalR pattern
- `frontend/src/host/requests/VideoCallRequest.js` — request pattern

---

## Phase 1: Backend — Modellar (TO'LIQ QAYTA YOZ)

### 1a. ConsultantInvitation.cs

- [x] NC001 `backend/EkgAnalyzerApi/Models/ConsultantInvitation.cs` qayta yoz:
  - `ClinicId`, `DoctorId` (DoctorId — FK to Doctors, eski ConsultantDoctorId o'rniga)
  - `PricePerSession decimal(18,2)` — YANGI
  - `Status`: "pending" | "accepted" | "rejected"
  - `InvitedAt datetime` — YANGI (eski CreatedAt o'rniga)
  - `RespondedAt datetime?`
  - `Note string?`
  - UNIQUE constraint: (ClinicId, DoctorId)
  - Eski: `InvitedByAdminId`, `UpdatedAt` — olib tashlanadi

### 1b. ClinicConsultant.cs

- [x] NC002 `backend/EkgAnalyzerApi/Models/ClinicConsultant.cs` qayta yoz:
  - `ClinicId`, `DoctorId` (eski ConsultantDoctorId o'rniga)
  - `InvitationId int FK → ConsultantInvitations` (eski LinkedByInvitationId o'rniga)
  - `CurrentPrice decimal(18,2)` — YANGI
  - `LinkedAt datetime`, `Status "active"|"paused"`, `TotalConsultations int`
  - UNIQUE constraint: (ClinicId, DoctorId)

### 1c. ConsultantPriceHistory.cs — YANGI

- [x] NC003 `backend/EkgAnalyzerApi/Models/ConsultantPriceHistory.cs` yarat:
  - `ClinicConsultantId int FK → ClinicConsultants`
  - `OldPrice decimal(18,2)`, `NewPrice decimal(18,2)`
  - `EffectiveFrom DateOnly` — shu sanadan yangi narx
  - `ChangedAt datetime`
  - `ChangedByUserId int FK → Users`

### 1d. Consultation.cs

- [x] NC004 `backend/EkgAnalyzerApi/Models/Consultation.cs` qayta yoz:
  - `ClinicId`, `ClinicConsultantId`, `DoctorId` (eski ConsultantDoctorId), `PatientId`
  - `CreatedByAdminId int FK → Users` (eski RequestedByAdminId)
  - `ConsultationDate DateOnly` — YANGI
  - `PriceAtCreation decimal(18,2)` — YANGI
  - Status: "created" | "reviewing" | "rejected" | "completed" (eski "pending"/"accepted"/"scheduled"/"concluded" o'rniga)
  - `RejectionReason string?`, `LiveKitRoomName string?`
  - `CreatedAt datetime`, `UpdatedAt datetime`
  - Olib tashlangan: `IsLinkRequest`, `IsFirstRequest`, `Note`, `ScheduledAt`, `ConcludedAt`
  - Navigation: `ConsultationConclusion? Conclusion`, `ICollection<ConsultationAnalysis>? Analyses`

### 1e. ConsultationConclusion.cs

- [x] NC005 `backend/EkgAnalyzerApi/Models/ConsultationConclusion.cs` qayta yoz:
  - `ConsultationId int UNIQUE FK`
  - `PatientCondition string` — "good" | "moderate" | "bad" — YANGI
  - `Diagnosis text`, `Treatment text` — YANGI (eski Recommendations o'rniga)
  - `CreatedAt datetime`, `UpdatedAt datetime` — YANGI
  - Olib tashlangan: `Recommendations`, `Medications`, `FollowUpRequired`, `FollowUpNote`

### 1f. MedDataDB.cs yangilash

- [x] NC006 `backend/EkgAnalyzerApi/Data/MedDataDB.cs`:
  - `ConsultantPriceHistory` DbSet qo'sh
  - `ConsultationAnalysis` DbSet qo'sh (`consultation_analyses`)
  - `ConsultantRatings` DbSet OLIB TASHLA (yangi spec da yo'q)
  - OnModelCreating: UNIQUE constraint'larni qo'sh

### 1g. EF Core Migration

- [x] NC007 Yangi migration yarat: `AddConsultationV2`
  - Barcha o'zgarishlarni o'z ichiga oladi
  - `dotnet ef migrations add AddConsultationV2`
  - `dotnet ef database update`

---

## Phase 2: Backend — DTOs

- [x] NC008 `backend/EkgAnalyzerApi/DTOs/ConsultationDTOs.cs` TO'LIQ QAYTA YOZ:

  **Request DTOs:**
  ```csharp
  SearchDoctorsQuery(string? PassportSeries, string? Phone, int? RegionId, int? DistrictId, int? ClinicId)
  InviteDoctorDto(int DoctorId, decimal PricePerSession)
  UpdatePriceDto(decimal NewPrice, DateOnly EffectiveFrom)
  CreateConsultationDto(int? PatientId, NewPatientDto? NewPatient, int[] DoctorIds, DateOnly ConsultationDate)
  NewPatientDto(string PassportSeries, string FullName, DateOnly BirthDate, bool Gender, string? Phone, string? Address)
  ConcludeConsultationDto(string PatientCondition, string Diagnosis, string Treatment)
  RejectConsultationDto(string RejectionReason)
  ```

  **Response DTOs:**
  ```csharp
  // Admin: GET /search-doctors
  DoctorSearchResultDto { DoctorId, FullName, Position, Phone, ClinicName, RegionName, DistrictName }
  
  // Admin: GET /my-consultants
  MyConsultantDto { ClinicConsultantId, DoctorId, FullName, Position, Phone, CurrentPrice, TotalConsultations, LinkedAt }
  
  // Admin: GET /consultants/{id}/history
  ConsultantHistoryDto { Consultations: List<ConsultantHistoryItem>, TotalAmount: decimal }
  ConsultantHistoryItem { Id, PatientFullName, ConsultationDate, PriceAtCreation, Status, HasConclusion }
  
  // Admin: GET /list
  ConsultationListItemDto { Id, PatientFullName, DoctorFullName, PriceAtCreation, ConsultationDate, CreatedAt, Status, HasConclusion }
  
  // Admin: GET /{id}/detail
  ConsultationDetailAdminDto {
    // Konsultatsiya
    Id, ConsultationDate, PriceAtCreation, Status, CreatedAt, RejectionReason, LiveKitRoomName
    // Bemor
    PatientId, PatientFullName, BirthDate, Gender, Phone, Address, PassportSeries
    // Konsultant
    DoctorId, DoctorFullName, DoctorPosition, DoctorPhone, DoctorClinicName
    // Xulosa (null agar yo'q)
    Conclusion: ConsultationConclusionDto?
    // Tahlillar ro'yxati
    Analyses: List<PatientAnalysisItemDto>
  }
  ConsultationConclusionDto { PatientCondition, Diagnosis, Treatment, CreatedAt, UpdatedAt }
  PatientAnalysisItemDto { Type, Id, Date, HasAiResult }
  
  // Doctor: GET /invitations
  InvitationDto { Id, ClinicName, PricePerSession, InvitedAt, Status }
  
  // Doctor: GET /my-clinics
  MyClinicDto { ClinicConsultantId, ClinicName, LinkedAt, TotalConsultations, CurrentPrice }
  
  // Doctor: GET /my-consultations
  DoctorConsultationItemDto { Id, PatientFullName, ClinicName, PriceAtCreation, ConsultationDate, CreatedAt, Status, HasConclusion }
  
  // Doctor: GET /{id}/doctor-detail
  ConsultationDetailDoctorDto {
    // Konsultatsiya
    Id, ConsultationDate, PriceAtCreation, Status, RejectionReason
    // Bemor (passport yo'q)
    PatientFullName, BirthDate, Gender, Phone, Address
    // Admin
    AdminFullName, AdminPhone, ClinicName
    // Xulosa
    Conclusion: ConsultationConclusionDto?
    // Tahlillar
    Analyses: List<PatientAnalysisItemDto>
  }
  
  // Video token
  ConsultationTokenDto { Token, LiveKitUrl, RoomName }
  ```

---

## Phase 3: Backend — Service

- [x] NC009 `backend/EkgAnalyzerApi/Services/OnlineConsultationService.cs` TO'LIQ QAYTA YOZ:

  Interface:
  ```
  SearchDoctorsAsync(SearchDoctorsQuery q, int adminClinicId) → List<DoctorSearchResultDto>
  InviteDoctorAsync(InviteDoctorDto dto, int adminUserId, int clinicId) → (bool, string?)
  GetMyConsultantsAsync(int clinicId) → List<MyConsultantDto>
  GetMySentInvitationsAsync(int clinicId) → List<SentInvitationDto>
  GetBadgeCountsAsync(int roleId, int clinicId, int doctorId) → ConsultationBadgeCountsDto
  UpdateConsultantPriceAsync(int ccId, UpdatePriceDto dto, int adminUserId, int clinicId) → (bool, string?)
  GetConsultantHistoryAsync(int ccId, int clinicId, string? patientName, DateOnly? from, DateOnly? to) → ConsultantHistoryDto
  CreateConsultationsAsync(CreateConsultationDto dto, int adminUserId, int clinicId) → (bool, string?, int count)
  GetConsultationListAsync(int clinicId, ...) → List<ConsultationListItemDto>
  GetConsultationDetailAdminAsync(int id, int clinicId) → ConsultationDetailAdminDto?
  GetAdminLiveKitTokenAsync(int id, int userId, int clinicId) → (bool, string?, ConsultationTokenDto?)
  
  GetMyInvitationsAsync(int doctorId) → List<InvitationDto>
  AcceptInvitationAsync(int id, int doctorId) → (bool, string?)
  RejectInvitationAsync(int id, int doctorId) → (bool, string?)
  GetMyClinicsAsync(int doctorId) → List<MyClinicDto>
  GetDoctorClinicHistoryAsync(int ccId, int doctorId, ...) → ConsultantHistoryDto
  GetMyConsultationsAsync(int doctorId, string? status) → List<DoctorConsultationItemDto>
  AcceptConsultationAsync(int id, int doctorId) → (bool, string?)
  RejectConsultationAsync(int id, string reason, int doctorId) → (bool, string?)
  GetConsultationDetailDoctorAsync(int id, int doctorId) → ConsultationDetailDoctorDto?
  ConcludeConsultationAsync(int id, ConcludeConsultationDto dto, int doctorId) → (bool, string?)
  GetDoctorLiveKitTokenAsync(int id, int userId, int doctorId) → (bool, string?, ConsultationTokenDto?)
  ```

  **Narx logikasi** `CreateConsultationsAsync` da:
  ```
  Har bir DoctorId uchun:
  1. ClinicConsultants dan (ClinicId, DoctorId) topib olish
  2. ConsultantPriceHistory WHERE ClinicConsultantId=X
     AND EffectiveFrom <= ConsultationDate
     ORDER BY EffectiveFrom DESC → birinchisining NewPrice
  3. Agar PriceHistory yo'q → ClinicConsultants.CurrentPrice
  ```

  **Shifokorga bildirishnoma** (SignalR, ConsultationHub orqali):
  - Taklif yuborilganda: `NewInvitation`
  - Konsultatsiya yaratilganda: `NewConsultation`
  - Konsultatsiya qabul qilinganda adminga: `ConsultationReviewing`
  - Rad etilganda adminga: `ConsultationRejected`
  - Xulosa yozilganda adminga: `ConsultationCompleted`

---

## Phase 4: Backend — Controller

- [x] NC010 `backend/EkgAnalyzerApi/Controllers/OnlineConsultationController.cs` TO'LIQ QAYTA YOZ:
  - Route: `/api/consultation` (eski `/api/online-consultation` o'rniga)

  **Admin endpointlari:**
  ```
  GET    /search-doctors           ?passportSeries&phone&regionId&districtId&clinicId
  POST   /invite                   body: InviteDoctorDto
  GET    /my-consultants
  GET    /my-sent-invitations
  PUT    /consultants/{id}/update-price
  GET    /consultants/{id}/history ?patientName&dateFrom&dateTo
  POST   /create
  GET    /list                     ?status&doctorId&patientName&dateFrom&dateTo
  GET    /{id}/detail
  GET    /{id}/livekit-token
  GET    /badge-counts
  ```

  **Shifokor endpointlari:**
  ```
  GET    /invitations
  PUT    /invitations/{id}/accept
  PUT    /invitations/{id}/reject
  GET    /my-clinics
  GET    /my-clinics/{id}/history  ?patientName&dateFrom&dateTo
  GET    /my-consultations         ?status
  PUT    /{id}/accept
  PUT    /{id}/reject              body: RejectConsultationDto
  GET    /{id}/doctor-detail
  POST   /{id}/conclude
  GET    /{id}/livekit-token-doctor
  GET    /badge-counts
  ```

  **Online status** (mavjud ConsultationConnectionService orqali):
  - Admin/Shifokor uchun: `GET /api/user/{userId}/online-status`
  - Yoki ConsultationHub `IsOnline(userId)` metodidan foydalanish

---

## Phase 5: Frontend — ConsultationRequest.js

- [x] NC011 `frontend/src/host/requests/ConsultationRequest.js` TO'LIQ QAYTA YOZ:

  ```javascript
  // Admin
  searchDoctors(params)              → GET /consultation/search-doctors
  inviteDoctor(data)                 → POST /consultation/invite
  getMyConsultants()                 → GET /consultation/my-consultants
  getSentInvitations()               → GET /consultation/my-sent-invitations
  getConsultationBadgeCounts()       → GET /consultation/badge-counts
  updateConsultantPrice(id, data)    → PUT /consultation/consultants/{id}/update-price
  getConsultantHistory(id, params)   → GET /consultation/consultants/{id}/history
  createConsultation(data)           → POST /consultation/create
  getConsultationList(params)        → GET /consultation/list
  getConsultationDetail(id)          → GET /consultation/{id}/detail
  getAdminLivekitToken(id)           → GET /consultation/{id}/livekit-token
  
  // Shifokor
  getMyInvitations()                 → GET /consultation/invitations
  acceptInvitation(id)               → PUT /consultation/invitations/{id}/accept
  rejectInvitation(id)               → PUT /consultation/invitations/{id}/reject
  getMyClinics()                     → GET /consultation/my-clinics
  getDoctorClinicHistory(id, params) → GET /consultation/my-clinics/{id}/history
  getMyConsultations(params)         → GET /consultation/my-consultations
  acceptConsultation(id)             → PUT /consultation/{id}/accept
  rejectConsultation(id, data)       → PUT /consultation/{id}/reject
  getDoctorConsultationDetail(id)    → GET /consultation/{id}/doctor-detail
  concludeConsultation(id, data)     → POST /consultation/{id}/conclude
  getDoctorLivekitToken(id)          → GET /consultation/{id}/livekit-token-doctor
  ```

---

## Phase 6: Frontend — Admin Sahifalar

### 6a. ConsultantsPage.js

- [x] NC012 `frontend/src/pages/cabinet/consultation/ConsultantsPage.js` YANGI:
  Route: `/consultants`

  **1-jadval**: Biriktirilgan konsultantlar (`getMyConsultants()`)
  Ustunlar: F.I.SH | Lavozim | Telefon | Konsultatsiyalar | Narxi | Amallar
  Amallar:
  - [Narx o'zgartirish] → Modal (InputNumber + DatePicker, min=bugun)
    `updateConsultantPrice(id, {newPrice, effectiveFrom})`
  - [Tarix] → `/consultants/{id}/history`

  **2-jadval**: Yuborilgan takliflar (`getSentInvitations()`)
  Ustunlar: F.I.SH | Klinikasi | Lavozim | Narxi | Yuborilgan | Holat | Javob vaqti
  Badge: pending=sariq, accepted=yashil, rejected=qizil

### 6b. AddConsultantPage.js

- [x] NC013 `frontend/src/pages/cabinet/consultation/AddConsultantPage.js` YANGI:
  Route: `/consultants/add`

  Filter: [Passport] [Telefon] [Viloyat▼] [Tuman▼] [Klinika▼] [Qidirish]
  Kamida 1 filter bo'lishi shart (frontend validation)

  Natija jadvali: F.I.SH | Lavozim | Telefon | Klinikasi | Amal
  Amal: [Taklif yuborish] → Modal
    - "Konsultatsiya narxi (so'm)" InputNumber, min=0
    - [Yuborish] → `inviteDoctor({doctorId, pricePerSession})`
    - Success: tugma disabled + "Taklif yuborildi ✓"

### 6c. ConsultantHistoryPage.js

- [x] NC014 `frontend/src/pages/cabinet/consultation/ConsultantHistoryPage.js` YANGI:
  Route: `/consultants/:clinicConsultantId/history`

  Yuqori: shifokor ismi + klinikasi
  Filter: [Bemor ismi] [Sana dan] [Sana gacha] [Qidirish]
  Jadval: Bemor | Konsultatsiya sanasi | Narxi | Holat
  Pastda (bold): "Jami: N ta — X so'm"

### 6d. ConsultationsPage.js

- [x] NC015 `frontend/src/pages/cabinet/consultation/ConsultationsPage.js` YANGI:
  Route: `/consultations`

  Filter: [Holat▼] [Shifokor▼] [Sana dan] [Sana gacha] [Qidirish]
  Jadval: Bemor | Konsultant | Narxi | Konsultatsiya sanasi | Yaratildi | Holat | Amal
  Status badge: created=kulrang, reviewing=ko'k, completed=yashil, rejected=qizil
  Amal: [👁] → `/consultations/{id}`

### 6e. CreateConsultationPage.js

- [x] NC016 `frontend/src/pages/cabinet/consultation/CreateConsultationPage.js` YANGI:
  Route: `/consultations/create`

  Blok 1 — Bemor tanlash (EKG sahifasidagi bemor qidirish patternidan):
    Passport + Tug'ilgan sana → [Qidirish]
    Topilsa: readonly inputlar (F.I.SH, Sana, Jinsi, Tel, Manzil)
    Topilmasa: bo'sh inputlar (yangi bemor)

  Blok 2 — Konsultant tanlash (EKG sahifasidagi shifokor checkbox patternidan):
    `getMyConsultants()` dan checkbox ro'yxat
    Har birida: F.I.SH, lavozim, narxi
    Kamida 1 ta majburiy

  Blok 3 — Konsultatsiya sanasi:
    DatePicker, min=bugun, max=bugundan 30 kun keyin, majburiy

  [Saqlash] → `createConsultation(data)` → success toast → `/consultations`
  Success: "X ta konsultatsiya yaratildi"

### 6f. ConsultationDetailAdminPage.js

- [x] NC017 `frontend/src/pages/cabinet/consultation/ConsultationDetailAdminPage.js` YANGI:
  Route: `/consultations/:id`

  YUQORI QISM (faqat video tugmasi bosilganda paydo bo'ladi):
  `VideoCallRoom.js` — to'liq kenglik, token: `getAdminLivekitToken(id)`
  Boshqaruv: faqat ikonlar (Mik, Kamera, Ekran, Kamera almashtirish, 📞-qizil)

  2 USTUNLI LAYOUT:

  CHAP (40%):
  - Konsultatsiya card: sana, narxi, holati, yaratildi
  - Bemor card: F.I.SH, tug'ilgan sana, jinsi, tel, manzil, passport
  - Konsultant card: F.I.SH, lavozim, tel, klinikasi
    🟢Online/⚪Offline + [📹 Video qo'ng'iroq] tugmasi
  - Xulosa card (agar mavjud):
    Badge: Yaxshi/O'rtacha/Yomon (yashil/sariq/qizil)
    Tashxis, Davolash

  O'NG (60%):
  "Bemorning tahlillari" — Tabs: EKG|SMAD|Holter|Lab|Parazit
  Har tabda shu turdagi tahlillar kartochkalari
  [Ko'rish] → mavjud tahlil ko'rish komponenti

---

## Phase 7: Frontend — Shifokor Sahifalar

### 7a. DoctorClinicsPage.js

- [x] NC018 `frontend/src/pages/cabinet/consultation/DoctorClinicsPage.js` YANGI:
  Route: `/doctor/clinics`

  1-jadval: Kelgan takliflar (`getMyInvitations()`, pending bo'lsa ko'rinadi)
  Ustunlar: Klinika | Narxi | Yuborilgan sana | Amal
  Amal: [✓ Qabul] (yashil) + [✗ Rad] (qizil)

  2-jadval: Biriktirilgan klinikalar (`getMyClinics()`)
  Ustunlar: Klinika | Birikkan sana | Konsultatsiyalar | Joriy narx | Amal
  Amal: [Tarix] → `/doctor/clinics/{id}/history`

### 7b. DoctorClinicHistoryPage.js

- [x] NC019 `frontend/src/pages/cabinet/consultation/DoctorClinicHistoryPage.js` YANGI:
  Route: `/doctor/clinics/:clinicConsultantId/history`

  Yuqori: klinika nomi
  Filter: [Bemor] [Sana dan] [Sana gacha]
  Jadval: Bemor | Konsultatsiya sanasi | Narxi | Holat

### 7c. DoctorConsultationsPage.js

- [x] NC020 `frontend/src/pages/cabinet/consultation/DoctorConsultationsPage.js` YANGI:
  Route: `/doctor/consultations`

  Filter: [Holat▼] [Sana dan] [Sana gacha]
  Tartiblash: "created" birinchi, keyin created_at desc

  Jadval: Bemor | Klinika | Narxi | Konsultatsiya sanasi | Holat | Amal
  Status:
  - "created" → sariq badge + [Qabul] [Rad] tugmalari
  - "reviewing" → ko'k
  - "completed" → yashil
  - "rejected" → qizil

  [Qabul] → confirm modal → `acceptConsultation(id)`
  [Rad] → sabab kiritish modal → `rejectConsultation(id, {rejectionReason})`
  Amal: [👁] → `/doctor/consultations/{id}`

### 7d. ConsultationDetailDoctorPage.js

- [x] NC021 `frontend/src/pages/cabinet/consultation/ConsultationDetailDoctorPage.js` YANGI:
  Route: `/doctor/consultations/:id`

  YUQORI QISM: Video blok (admin sahifasi bilan bir xil)
  Token: `getDoctorLivekitToken(id)`

  2 USTUNLI LAYOUT:

  CHAP (40%):
  - Konsultatsiya card: sana, narxi, holati
  - Bemor card: F.I.SH, tug'ilgan sana, jinsi, tel, manzil (PASSPORT YO'Q)
  - Admin card: admin F.I.SH, tel, klinika nomi
    🟢Online/⚪Offline + [📹 Video qo'ng'iroq]
  - Xulosa card:
    Subtext: "Yozilgan: {sana}" (agar mavjud bo'lsa)
    "Bemor holati" radio: 🟢Yaxshi / 🟡O'rtacha / 🔴Yomon
    "Tashxis" TextArea (4 qator)
    "Davolash yo'riqnomasi" TextArea (4 qator)
    [Saqlash] → `concludeConsultation(id, data)`
      Birinchi: POST; keyingi marta ham POST (server UPDATE qiladi)

  O'NG (60%): Admin sahifasi bilan bir xil tahlillar bloki

---

## Phase 8: Frontend — Routing, SideBar, i18n

### 8a. Main.js routing

- [x] NC022 `frontend/src/pages/cabinet/Main.js` ga routelar:
  ```
  // Admin (roleId 2,3)
  /consultants                           → ConsultantsPage
  /consultants/add                       → AddConsultantPage
  /consultants/:clinicConsultantId/history → ConsultantHistoryPage
  /consultations                         → ConsultationsPage
  /consultations/create                  → CreateConsultationPage
  /consultations/:id                     → ConsultationDetailAdminPage
  
  // Doctor (roleId 4)
  /doctor/clinics                        → DoctorClinicsPage
  /doctor/clinics/:clinicConsultantId/history → DoctorClinicHistoryPage
  /doctor/consultations                  → DoctorConsultationsPage
  /doctor/consultations/:id              → ConsultationDetailDoctorPage
  ```

### 8b. routes.js / SideBar.js

- [x] NC023 Admin sidebar:
  - "Konsultantlar" UserSwitchOutlined → /consultants
  - "Konsultatsiyalar" MedicineBoxOutlined → /consultations (badge: pending soni)

- [x] NC024 Doctor sidebar:
  - "Shifoxonalar" BankOutlined → /doctor/clinics (badge: pending invitation soni)
  - "Konsultatsiyalar" MedicineBoxOutlined → /doctor/consultations (badge: "created" soni)

### 8c. i18n

- [x] NC025 `Uz.json`, `Ru.json`, `En.json` ga yangi kalitlar:
  ```
  consultant_invite, consultant_add, consultant_history
  consultation_create, consultation_list, consultation_detail
  consultation_status_created, consultation_status_reviewing
  consultation_status_completed, consultation_status_rejected
  price_per_session, consultation_date, price_at_creation
  patient_condition, condition_good, condition_moderate, condition_bad
  diagnosis, treatment, conclusion, video_call
  invite_sent, invitation_accepted, invitation_rejected
  clinics (shifokor uchun), pending_invitations
  total_amount, effective_from, rejection_reason, linked_at
  save, search, filter, no_data, confirm_accept, confirm_reject
  ```

---

## Phase 9: Qo'shimcha Kritik Tuzatishlar

- [x] NC026 `backend/EkgAnalyzerApi/Hubs/ConsultationHub.cs` yaratish:
  - SignalR hub `/hubs/consultation` da map qilinadi
  - `IConsultationConnectionService` orqali user connection'lari ro'yxatga olinadi
  - Eventlar: `NewInvitation`, `NewConsultation`, `ConsultationReviewing`, `ConsultationRejected`, `ConsultationCompleted`

- [x] NC027 `GET /api/consultation/my-sent-invitations`:
  - Admin/Direktor uchun
  - ClinicId bo'yicha yuborilgan takliflar: pending/accepted/rejected statuslari
  - Frontend `ConsultantsPage` 2-jadvali aynan shu endpointdan foydalanadi

- [x] NC028 `GET /api/user/{userId}/online-status`:
  - Admin/Direktor/Shifokor rollari uchun
  - `ConsultationConnectionService.IsOnline(userId)` natijasini qaytaradi

- [x] NC029 `GET /api/consultation/badge-counts`:
  - Admin: `adminPendingCount` = created konsultatsiyalar soni
  - Shifokor: `doctorPendingInvitationsCount` = pending takliflar soni
  - Shifokor: `doctorCreatedCount` = created konsultatsiyalar soni

- [x] NC030 `ConsultationAnalysis.cs` qarori:
  - Model va DbSet saqlanadi (`consultation_analyses`)
  - Hozirgi UI bemorning barcha tahlillarini ko'rsatadi; model keyingi bosqichda aniq ulashilgan tahlillar uchun tayyor turadi

- [x] NC031 `ConsultantRatings.cs` olib tashlash:
  - `ConsultantRatings` DbSet olib tashlangan
  - `ConsultantRating.cs` model fayli o'chiriladi
  - `AddConsultationV2` migration `consultant_ratings` jadvalini DROP qiladi

- [x] NC032 `NC022` routelarini tekshirish:
  - `/doctor/clinics/:clinicConsultantId/history` -> `DoctorClinicHistoryPage`

- [x] NC033 `NC011` request funksiyasini qo'shish:
  - `getSentInvitations()` -> `GET /consultation/my-sent-invitations`
  - `getConsultationBadgeCounts()` -> `GET /consultation/badge-counts`

---

## Dependencies & Order

```
NC001–NC005  → modellar (parallel)
NC006        → MedDataDB (NC001–NC005 dan keyin)
NC007        → Migration (NC006 dan keyin)
NC008        → DTOs (NC007 dan keyin)
NC009        → Service (NC008 dan keyin)
NC010        → Controller (NC009 dan keyin)
NC011        → ConsultationRequest.js (NC010 dan keyin)
NC012–NC021  → Sahifalar (NC011 dan keyin, parallel)
NC022–NC025  → Routing + i18n (NC012–NC021 dan keyin, parallel)
```

---

## Muhim Eslatmalar

1. **VideoCallRoom.js O'ZGARTIRILMAYDI** — `roomName` va `token` props uzatiladi
2. **Passport shifokorga ko'rsatilmaydi** — doctor-detail endpointda PassportSeries yo'q
3. **Narx logikasi**: ConsultationDate >= EffectiveFrom bo'lgan eng so'nggi PriceHistory yozuvi
4. **`/api/consultation` route** (eski `/api/online-consultation` emas)
5. **Status**: created→reviewing→completed | rejected (eski pending→accepted→scheduled→concluded emas)
6. **Xulosa**: POST conclude har doim ishlaydi (server upsert qiladi — update yoki insert)
7. **Online holat**: ConsultationConnectionService.IsOnline(userId) yoki `/api/user/{id}/online-status`
8. **catch bloklar bo'sh bo'lmasin** — `_logger.LogError` majburiy
