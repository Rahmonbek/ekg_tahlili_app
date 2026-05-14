---
description: "LiveKit video konferensiya moduli — Admin/Direktor → Shifokor video qo'ng'iroq"
---

# Tasks: Video Konferensiya (LiveKit)

**Maqsad**: Admin va Direktor klinika shifokorlariga platforma ichidan real-time video
qo'ng'iroq qila olsin. Shifokor qo'ng'iroqni qabul qiladi yoki rad etadi. Barcha
signaling SignalR orqali, media oqim LiveKit Cloud orqali ishlaydi.

**LiveKit kredensiallar** (environment variable'lardan o'qilsin):
```
LIVEKIT_URL=wss://nmed-4fies7c3.livekit.cloud
LIVEKIT_API_KEY=APIY9dbzNpSrwhs
LIVEKIT_API_SECRET=VPigf7CfmilrZkR0vXeHhEWHy5FHma4CyCqhaTx9JaBA
```

**Rol qoidalari**:
- **Admin (2) / Direktor (3)**: qo'ng'iroq BOSHLASHI mumkin (istalgan shifokorga)
- **Shifokor (4)**: faqat QABUL QILISHI mumkin (Admin/Direktor dan kelgan)
- **Hamshira (5)**: video qo'ng'iroqdan foydalana olmaydi

**Namuna fayllar** (pattern sifatida):
- `backend/EkgAnalyzerApi/Controllers/LabAnalyseController.cs`
- `backend/EkgAnalyzerApi/Services/TokenService.cs`
- `frontend/src/pages/cabinet/Dashboard.js`
- `frontend/src/components/Header.js`

---

## Phase 1: Backend — NuGet + Config

**Maqsad**: LiveKit .NET SDK va SignalR o'rnatish, environment config qo'shish.

- [ ] V001 `LivekitServerSdk-net` NuGet paketi o'rnat
  ```
  dotnet add package LivekitServerSdk-net
  dotnet add package Microsoft.AspNetCore.SignalR
  ```
  Fayl: `backend/EkgAnalyzerApi/EkgAnalyzerApi.csproj`

- [ ] V002 `appsettings.json` ga LiveKit config bo'limi qo'sh
  ```json
  "LiveKit": {
    "Url": "",
    "ApiKey": "",
    "ApiSecret": ""
  }
  ```
  Production qiymatlar faqat environment variable'lardan (`LIVEKIT__URL`, `LIVEKIT__APIKEY`, `LIVEKIT__APISECRET`)
  Fayl: `backend/EkgAnalyzerApi/appsettings.json`

- [ ] V003 `deploy/backend.env.example` ga LiveKit env var'larini qo'sh
  ```
  LIVEKIT__URL=wss://...
  LIVEKIT__APIKEY=...
  LIVEKIT__APISECRET=...
  ```

---

## Phase 2: Backend — Database Model + Migration

**Maqsad**: Video sessiyalarni saqlash uchun bitta jadval. SignalR state in-memory
saqlanadi (ya'ni baza faqat tarix uchun).

- [ ] V004 `VideoCallSession.cs` model yarat
  Fayl: `backend/EkgAnalyzerApi/Models/VideoCallSession.cs`
  ```csharp
  public class VideoCallSession
  {
      public int Id { get; set; }
      public string RoomName { get; set; }       // LiveKit room name (unique)
      public int InitiatorId { get; set; }       // FK → Users.Id (Admin/Direktor)
      public int RecipientId { get; set; }       // FK → Users.Id (Shifokor)
      public int ClinicId { get; set; }          // FK → Clinics.Id
      public DateTime StartedAt { get; set; }
      public DateTime? EndedAt { get; set; }
      public string Status { get; set; }         // "pending"|"active"|"ended"|"rejected"

      public User Initiator { get; set; }
      public User Recipient { get; set; }
  }
  ```

- [ ] V005 `MedDataDB.cs` ga `DbSet<VideoCallSession> VideoCallSessions` qo'sh
  Fayl: `backend/EkgAnalyzerApi/Data/MedDataDB.cs`

- [ ] V006 EF Core migration yarat va apply qil
  ```bash
  dotnet ef migrations add AddVideoCallSessions
  dotnet ef database update
  ```

---

## Phase 3: Backend — SignalR Hub

**Maqsad**: Real-time signaling — qo'ng'iroq boshlash, qabul qilish, rad etish.

- [ ] V007 `VideoCallHub.cs` yarat
  Fayl: `backend/EkgAnalyzerApi/Hubs/VideoCallHub.cs`

  Metodlar:
  ```csharp
  // Admin → hub: shifokorga qo'ng'iroq boshlash (faqat isOnline tekshirilgandan so'ng)
  public async Task InitiateCall(int recipientUserId, string roomName)

  // Shifokor → hub: qo'ng'iroqni qabul qilish
  public async Task AcceptCall(string roomName)

  // Istalgan taraf → hub: qo'ng'iroqni tugatish/rad etish
  public async Task EndCall(string roomName)
  ```

  Lifecycle override'lar:
  ```csharp
  // OnConnectedAsync — JWT dan userId olinadi, ro'yxatga qo'shiladi,
  //                    bir xil klinikadagi adminlarga "DoctorOnline" event yuboriladi
  public override async Task OnConnectedAsync()

  // OnDisconnectedAsync — ro'yxatdan o'chiriladi,
  //                       adminlarga "DoctorOffline" event yuboriladi
  public override async Task OnDisconnectedAsync(Exception? exception)
  ```

  JWT dan user ma'lumotlarini olish: `Context.User.Claims` orqali
  (`ClaimTypes.NameIdentifier` = userId, `"roleId"` claim = rol).

  Client tomoniga yuboriluvchi eventlar:
  - `IncomingCall` → `{ roomName, initiatorName, initiatorId }`
  - `CallAccepted` → `{ roomName, recipientName }`
  - `CallRejected` → `{ roomName }`
  - `CallEnded` → `{ roomName }`
  - `DoctorOnline` → `{ doctorUserId }` — faqat Admin/Direktor connectionlariga
  - `DoctorOffline` → `{ doctorUserId }` — faqat Admin/Direktor connectionlariga

- [ ] V008 `IVideoCallConnectionService.cs` interface + `VideoCallConnectionService.cs` yarat
  Fayl: `backend/EkgAnalyzerApi/Services/VideoCallConnectionService.cs`
  Singleton hayot davri. `ConcurrentDictionary<int, string>` userId → connectionId.
  Metodlar: `Register(userId, connectionId)`, `Remove(connectionId)`, `GetConnectionId(userId)`, `GetUserId(connectionId)`

---

## Phase 4: Backend — LiveKit Token Controller

**Maqsad**: Frontend uchun LiveKit token va SignalR connection uchun yagona API.

- [ ] V009 `VideoCallController.cs` yarat
  Fayl: `backend/EkgAnalyzerApi/Controllers/VideoCallController.cs`

  Endpointlar:
  ```
  POST /api/videocall/token
  ```
  Request DTO:
  ```csharp
  public record VideoTokenRequestDto(string RoomName, string ParticipantName);
  ```
  Response:
  ```json
  { "token": "eyJ...", "liveKitUrl": "wss://..." }
  ```
  - JWT `user_id` dan foydalanuvchini aniqlaydi
  - Rol tekshiradi: faqat Admin(2)/Direktor(3)/Shifokor(4)
  - LiveKit SDK orqali token generatsiya qiladi (room join grant)
  - Sessiyani DB ga yozadi yoki yangilaydi

  ```
  POST /api/videocall/end
  ```
  Request: `{ "roomName": "..." }`
  - Sessiya `Status = "ended"`, `EndedAt = DateTime.UtcNow`

  ```
  GET /api/videocall/doctors
  ```
  - Admin/Direktor uchun: o'z klinikasidagi shifokorlar ro'yxati
  - Response: `[{ id, fullName, position, isOnline }]`
  - `isOnline` — `VideoCallConnectionService` dan tekshiriladi

- [ ] V010 `VideoTokenRequestDto.cs` va `VideoTokenResponseDto.cs` yarat
  Fayl: `backend/EkgAnalyzerApi/DTOs/VideoCallDTO.cs`

---

## Phase 5: Backend — Program.cs Ro'yxatdan O'tkazish

**Maqsad**: SignalR va yangi servislarni DI konteyneriga ulash.

- [ ] V011 `Program.cs` ga quyidagilarni qo'sh
  Fayl: `backend/EkgAnalyzerApi/Program.cs`

  ```csharp
  // Services
  builder.Services.AddSignalR();
  builder.Services.AddSingleton<IVideoCallConnectionService, VideoCallConnectionService>();

  // CORS — SignalR uchun credentials shart
  // Mavjud CORS policyga AllowCredentials() allaqachon bor, tekshir

  // Endpoints (app.Use... dan keyin)
  app.MapHub<VideoCallHub>("/hubs/videocall");
  ```

  Nginx config: `/hubs/` yo'lini WebSocket upgrade bilan proxy qil (deploy/nginx.conf ga ham qo'sh)

- [ ] V012 `deploy/nginx.conf` ga SignalR WebSocket support qo'sh
  ```nginx
  location /hubs/ {
      proxy_pass http://localhost:5000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
  }
  ```

---

## Phase 6: Frontend — Paketlar va Konfiguratsiya

**Maqsad**: LiveKit React SDK va SignalR client o'rnatish.

- [ ] V013 npm paketlarini o'rnat
  Fayl: `frontend/package.json`
  ```bash
  npm install @livekit/components-react @livekit/components-styles livekit-client
  npm install @microsoft/signalr
  ```

- [ ] V014 `frontend/src/host/requests/VideoCallRequest.js` yarat
  Fayl: `frontend/src/host/requests/VideoCallRequest.js`
  ```javascript
  import { httpPostRequest, httpGetRequest } from "../Host";

  export const getVideoToken = (roomName, participantName) =>
    httpPostRequest("/videocall/token", { roomName, participantName });

  export const endVideoCall = (roomName) =>
    httpPostRequest("/videocall/end", { roomName });

  export const getOnlineDoctors = () =>
    httpGetRequest("/videocall/doctors");
  ```

---

## Phase 7: Frontend — Zustand Store Kengaytirish

**Maqsad**: Video qo'ng'iroq holati uchun global state.

- [ ] V015 `frontend/src/store/Store.js` ga video state qo'sh
  ```javascript
  // Video Call State
  videoCall: {
    isOpen: false,           // VideoConference sahifasi ochiq/yopiq
    incomingCall: null,      // { roomName, initiatorName, initiatorId } | null
    activeRoom: null,        // { roomName, token, liveKitUrl } | null
    isCalling: false,        // Outgoing call progress
  },
  setVideoCall: (patch) => set(s => ({ videoCall: { ...s.videoCall, ...patch } })),
  ```

---

## Phase 8: Frontend — SignalR Hook

**Maqsad**: SignalR connection lifecycle va event handling uchun custom hook.

- [ ] V016 `frontend/src/hooks/useVideoSignalR.js` yarat
  Fayl: `frontend/src/hooks/useVideoSignalR.js`

  ```javascript
  // HubConnectionBuilder orqali /hubs/videocall ga ulanadi
  // JWT token Authorization header orqali yuboriladi (withUrl options)
  // RegisterUser(userId) yuboradi — ulanish o'rnatilganda
  // Eventlar:
  //   IncomingCall → store.setVideoCall({ incomingCall: payload })
  //   CallAccepted → store.setVideoCall({ isCalling: false, activeRoom: payload })
  //   CallRejected → notification + store.setVideoCall({ isCalling: false })
  //   CallEnded    → call ni tozalash
  // Return: { connection, initiateCall, acceptCall, endCall }
  ```

  Hook `App.js` da bir marta mount qilinadi (faqat auth bo'lsa va rol 2/3/4 bo'lsa).

---

## Phase 9: Frontend — Komponentlar

### V017 — `IncomingCallModal.js`
Fayl: `frontend/src/components/video/IncomingCallModal.js`

Ant Design `Modal` komponentidan foydalaniladi.
- `store.videoCall.incomingCall` bo'lsa modal ochiladi
- Ringing animatsiya (CSS pulse)
- "Qabul qilish" (yashil) va "Rad etish" (qizil) tugmalar
- Qabul qilganda: `getVideoToken(roomName, myName)` → token oladi → `store.setVideoCall({ activeRoom: {...} })`
- Rad etganda: `endCall(roomName)` yuboradi

Dizayn:
```
┌─────────────────────────────┐
│  📞  Kiruvchi qo'ng'iroq   │
│                             │
│  [Avatar]  Dr. Aliyev       │
│            Admin            │
│                             │
│  [Rad etish] [Qabul qilish] │
└─────────────────────────────┘
```
Rang sxemasi: `#1a2942` (primary dark), `#52c41a` (accept), `#ff4d4f` (reject)

---

### V018 — `LiveKitRoom.js`
Fayl: `frontend/src/components/video/LiveKitRoom.js`

`@livekit/components-react` dan `LiveKitRoom`, `VideoConference` import qilinadi.
- Props: `{ token, serverUrl, onDisconnect }`
- `@livekit/components-styles/dist/index.css` import qilinadi
- Disconnect bo'lganda `endVideoCall(roomName)` chaqiriladi va store tozalanadi
- Wrapper div full-height/width, dark background `#0d1929`

---

### V019 — `DoctorCallCard.js`
Fayl: `frontend/src/components/video/DoctorCallCard.js`

Admin/Direktor uchun — shifokorlar ro'yxatidagi bitta karta.
- Props: `{ doctor: { id, fullName, position, isOnline } }`
- Online/offline badge (yashil nuqta / kulrang nuqta)
- "Qo'ng'iroq" tugmasi — faqat `isOnline` bo'lsa active
- Tugma bosilganda: roomName yaratadi → `initiateCall(recipientId, roomName)` → `getVideoToken` → `store.setVideoCall({ activeRoom, isCalling: true })`

---

## Phase 10: Frontend — Video Konferensiya Sahifasi

**Maqsad**: Alohida `/cabinet/video-conference` sahifasi, ikki xil view: Admin va Shifokor.

- [ ] V020 `frontend/src/pages/cabinet/video_conference/VideoConference.js` yarat

  **Admin/Direktor view** (roleId === 2 || 3):
  ```
  ┌──────────────────────────────────────────────────┐
  │  Video Konferensiya                              │
  ├──────────────────────────────────────────────────┤
  │  Shifokorlar                                     │
  │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
  │  │ 🟢 Dr.A  │ │ 🔴 Dr.B │ │ 🟢 Dr.C  │        │
  │  │ Kardiolog│ │ Nevrolog │ │ Terapeyt │        │
  │  │[Qo'ng'ir]│ │  Offline │ │[Qo'ng'ir]│        │
  │  └──────────┘ └──────────┘ └──────────┘        │
  │                                                  │
  │  [Faol qo'ng'iroq bo'lsa — LiveKitRoom shu yerda]│
  └──────────────────────────────────────────────────┘
  ```
  - `useEffect` → `getOnlineDoctors()` chaqiriladi, 30 sek interval bilan refresh
  - Ant Design `Row/Col` grid, responsive (xs:24, sm:12, md:8, lg:6)
  - `DoctorCallCard` har bir shifokor uchun

  **Shifokor view** (roleId === 4):
  ```
  ┌──────────────────────────────────────────────────┐
  │  Video Konferensiya                              │
  ├──────────────────────────────────────────────────┤
  │  Siz online — Admin qo'ng'iroq qilishi mumkin   │
  │  [Kutish animatsiyasi]                           │
  │                                                  │
  │  [Faol qo'ng'iroq bo'lsa — LiveKitRoom shu yerda]│
  └──────────────────────────────────────────────────┘
  ```
  - `store.videoCall.activeRoom` bo'lsa `LiveKitRoom` ko'rsatiladi
  - Aks holda "kutish" holati

- [ ] V021 Sahifani `Main.js` routing ga qo'sh
  Fayl: `frontend/src/pages/cabinet/Main.js`
  ```javascript
  import VideoConference from "./video_conference/VideoConference";
  // ...
  { path: "video-conference", element: <VideoConference /> }
  ```
  Route faqat roleId 2, 3, 4 uchun accessible.

---

## Phase 11: Frontend — Sidebar + Header

**Maqsad**: Navigatsiya menyusiga "Video Konferensiya" bo'limi qo'shish.

- [ ] V022 `SideBar.js` ga Video Konferensiya menyusi qo'sh
  Fayl: `frontend/src/components/SideBar.js`

  ```javascript
  // Role 2, 3, 4 uchun ko'rinadi
  {
    key: "video-conference",
    icon: <VideoCameraOutlined />,
    label: t("video_conference"),
    // Faol qo'ng'iroq bo'lsa — Badge bilan
  }
  ```
  Ant Design `VideoCameraOutlined` icon ishlatiladi.
  Faol qo'ng'iroq davomida `Badge` dot ko'rsatiladi.

- [ ] V023 `Header.js` ga kiruvchi qo'ng'iroq indikatori qo'sh (ixtiyoriy)
  Fayl: `frontend/src/components/Header.js`
  - `store.videoCall.incomingCall` bo'lsa header da jonlanuvchi bell icon

---

## Phase 12: Frontend — i18n Tarjimalar

**Maqsad**: Uch tilda (Uz/Ru/En) tegishli kalitlarni qo'shish.

- [ ] V024 `frontend/src/locale/Uz.json` ga video qo'ng'iroq kalitlarini qo'sh
  ```json
  "video_conference": "Video Konferensiya",
  "incoming_call": "Kiruvchi qo'ng'iroq",
  "accept_call": "Qabul qilish",
  "reject_call": "Rad etish",
  "call_doctor": "Qo'ng'iroq",
  "doctors_online": "Online shifokorlar",
  "call_ended": "Qo'ng'iroq tugadi",
  "call_rejected": "Qo'ng'iroq rad etildi",
  "waiting_for_call": "Admin qo'ng'iroq qilishini kuting...",
  "you_are_online": "Siz online — qo'ng'iroqni qabul qilishingiz mumkin",
  "doctor_offline": "Shifokor offline"
  ```

- [ ] V025 `frontend/src/locale/Ru.json` ga rus tilidagi tarjimalarni qo'sh
  ```json
  "video_conference": "Видеоконференция",
  "incoming_call": "Входящий звонок",
  "accept_call": "Принять",
  "reject_call": "Отклонить",
  "call_doctor": "Позвонить",
  "doctors_online": "Онлайн врачи",
  "call_ended": "Звонок завершён",
  "call_rejected": "Звонок отклонён",
  "waiting_for_call": "Ожидайте звонка от администратора...",
  "you_are_online": "Вы онлайн — можете принимать звонки",
  "doctor_offline": "Врач не в сети"
  ```

- [ ] V026 `frontend/src/locale/En.json` ga inglizcha tarjimalarni qo'sh
  ```json
  "video_conference": "Video Conference",
  "incoming_call": "Incoming Call",
  "accept_call": "Accept",
  "reject_call": "Reject",
  "call_doctor": "Call",
  "doctors_online": "Online Doctors",
  "call_ended": "Call Ended",
  "call_rejected": "Call Rejected",
  "waiting_for_call": "Waiting for admin to call...",
  "you_are_online": "You are online — ready to receive calls",
  "doctor_offline": "Doctor offline"
  ```

---

## Phase 13: Frontend — App.js ga Hook Ulash

**Maqsad**: SignalR connection butun app hayot davri davomida ishlashi.

- [ ] V027 `App.js` ga `useVideoSignalR` hook ulash
  Fayl: `frontend/src/App.js`
  ```javascript
  import useVideoSignalR from "./hooks/useVideoSignalR";
  // ...
  // Faqat auth va rol 2/3/4 bo'lsa
  const shouldConnect = user_id && [2, 3, 4].includes(user?.roleId);
  useVideoSignalR(shouldConnect);
  ```
  `IncomingCallModal` ham shu yerda global render qilinadi (bir marta).

---

## Phase 14: Dizayn Spesifikatsiyalari

**Rang sxemasi** (mavjud platforma dizayniga mos):
```
Primary dark:     #1a2942
Primary blue:     #1677ff (Ant Design default)
Online green:     #52c41a
Offline gray:     #8c8c8c
Accept green:     #52c41a
Reject red:       #ff4d4f
Card background:  #ffffff (light) / #141414 (dark mode)
Video background: #0d1929
```

**DoctorCallCard dizayni**:
```
┌─────────────────────────────┐
│  ●  Dr. Aliyev Jasur        │  ← Online badge (yashil/kulrang nuqta)
│     Kardiolog               │
│                             │
│     [📞 Qo'ng'iroq]        │  ← disabled if offline
└─────────────────────────────┘
```
- Ant Design `Card` + `Avatar` + `Badge`
- Hover: `box-shadow: 0 4px 12px rgba(0,0,0,0.15)`
- Border-radius: 12px

**LiveKit video oyna** — `@livekit/components-react` default `VideoConference`
komponentidan foydalaniladi, faqat wrapper da dark background va full-screen toggle.

---

## Bajarilish Tartibi (Prioritet)

```
V001 → V002 → V003          # Config
V004 → V005 → V006          # DB (migration)
V007 → V008                 # SignalR Hub
V009 → V010                 # Controller
V011 → V012                 # Program.cs + Nginx
────────────────────────────
V013 → V014                 # npm + API requests
V015                        # Zustand store
V016                        # SignalR hook
V017 → V018 → V019          # Komponentlar
V020 → V021                 # Sahifa + Routing
V022 → V023                 # Sidebar + Header
V024 → V025 → V026          # i18n
V027                        # App.js hook ulash
```

**Backend to'liq tayyorlanmay turib Frontend boshlanmasin** (V011 tugaguncha).

---

## Xavfsizlik Qoidalari

1. LiveKit API Key/Secret faqat **backend** da ishlatiladi — frontendga hech qachon yuborilmasin
2. Token endpoint JWT auth talab qiladi — anonim token generation yo'q
3. Faqat bir xil `clinicId` dagi foydalanuvchilar bir-birini ko'radi
4. SignalR Hub ham `[Authorize]` attributi bilan himoyalanadi
5. Video sessiyalar `AuditLog` ga yoziladi (mavjud `AuditMiddleware` orqali)

---

## Testlash Cheklisti

- [ ] Admin → Shifokor qo'ng'iroq boshlashi
- [ ] Shifokor qo'ng'iroqni qabul qilishi — video ochilishi
- [ ] Shifokor qo'ng'iroqni rad etishi — Admin tomonida notification
- [ ] Admin yoki Shifokor qo'ng'iroqni tugatishi
- [ ] Shifokor offline bo'lganda tugma disabled
- [ ] Ikki Admin bir vaqtda bir Shifokorga qo'ng'iroq qila olmaydi
- [ ] Sahifa reload bo'lganda SignalR qayta ulanishi
- [ ] Uch tildagi tarjimalar to'g'ri ishlashi
