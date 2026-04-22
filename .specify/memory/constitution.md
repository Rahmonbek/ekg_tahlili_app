<!--
SYNC IMPACT REPORT
==================
Version change : 2.6.0 → 2.7.0 (MINOR)
Bump rationale : New parasitology analysis module added.
                 - Section I extended with parasitology table names.
                 - Section IV extended with /analyze-parasitology proxy endpoint.
                 - Section VI role matrix updated with /parasitology-analyzer route.
                 - New Section VIII added: Parasitology Analysis Module.
                 - Project Overview updated to include parasitology.

Modified sections:
  • Project Overview — parasitology added to analysis types list
  • I — Shared Database Architecture: parasitology table names added
  • IV — API Contract Rules: POST /analyze-parasitology proxy endpoint added
  • VI — Rol-marshrut Matritsa: /parasitology-analyzer row added

Added sections:
  • VIII — Parasitology Analysis Module (new)

Removed sections  : none

Template alignment:
  ✅ .specify/templates/plan-template.md   — Constitution Check is generic.
  ✅ .specify/templates/spec-template.md   — No constitution references.
  ✅ .specify/templates/tasks-template.md  — No constitution references.

Still open:
  • C4-GAP-1: Patient.birthdate stored as DateOnly — NOT encrypted.
  • C4-GAP-2: analyse_file_link / generated_file_link — NOT encrypted.
-->

# NMED EKG Tahlili App — Constitution

## Project Overview

**NMED** — tibbiy tahlil platformasi (EKG, Laboratoriya, Holter, SMAD, Parazitologiya). Loyiha uch qatlamdan iborat:
- **Backend (.NET 8 / C#)** — CRUD, autentifikatsiya, avtorizatsiya, ma'lumotlar bazasi
- **Frontend (React 18)** — foydalanuvchi interfeysi, shifokor kabineti
- **AI/Scripting (Python FastAPI)** — EKG signal tahlili, AI diagnostika (OpenAI GPT)

---

## Core Principles

### I. Shared Database Architecture (MUHIM)
Backend (.NET) va Python (FastAPI) **bitta PostgreSQL bazaga** (`med_helper_data`) ulanadi.
- **Baza sxemasi** `.NET Entity Framework Migrations` tomonidan boshqariladi. Python tomoni `SQLAlchemy` orqali faqat yozish/o'qish qiladi.
- **Jadval nomlari** snake_case: `ecg_analyses`, `lab_analyses`, `holter_analyses`, `smad_analyses`,
  `parasitology_analyses`, `parasitology_analysis_doctors`, `parasitology_results`,
  `medical_diagnoses`, `ecg_analyse_doctors`, `ecg_analyse_complaints` va h.k.
- **Yangi jadval qo'shish** faqat .NET Migrations orqali amalga oshiriladi. Python `models.py` faqat mavjud jadvallarni reflect qiladi.
- **Ustun nomlari** snake_case va ikkala tomonda identik bo'lishi shart: `patcient_id`, `created_doctor_id`, `clinic_id`, `status`, `ai_answer_data`, `analyse_file_link`, `generated_file_link`, va hokazo.

### II. Dual-Backend Architecture
Ikki alohida backend mavjud, har biri o'z vazifasini bajaradi:

| Qatlam | Texnologiya | Port | Vazifa |
|--------|-------------|------|--------|
| **.NET API** | ASP.NET Core 8 | `5000` (HTTP), `5001` (HTTPS) | CRUD, Auth (JWT), foydalanuvchi/klinika/shifokor/bemor boshqaruvi |
| **Python API** | FastAPI + Uvicorn | `8000` | EKG signal parsing, AI tahlil (OpenAI), Lab/Holter/SMAD/Parazitologiya tahlil |

- Frontend `.NET API` ga autentifikatsiya va CRUD so'rovlarini yuboradi.
- Frontend Python API ga **bevosita murojaat qilmaydi** — barcha tahlil so'rovlari `.NET API` orqali proxy qilinadi (C1 talabi).
- Ikkala backend bir-biri bilan bevosita so'zlashmaydi — faqat baza orqali. Python natijalarni bazaga yozadi, .NET ularni o'qib frontendga qaytaradi.

### III. Frontend Architecture
- **Framework**: React 18, Create React App (react-scripts)
- **State Management**: Zustand (yagona `Store.js`)
- **HTTP Client**: Axios — ikki alohida baseURL:
  - `.NET API` → `axiosInstance` interceptor bilan (JWT token boshqaruvi)
  - `Python API` → `.NET API` proxy orqali (bevosita murojaat taqiqlangan)
- **UI Library**: Ant Design (antd) v5
- **Routing**: react-router-dom v7
- **i18n**: react-i18next (uz, ru, en tillari)
- **Auth**: `js-cookie` orqali `NMED_token` saqlanadi
- **Sahifalar** (asosiy marshrутlar):
  - `/ecg-analyses` → `EcgAnalysesList` — klinikaga tegishli EKG tahlillari ro'yxati
    (pagination, bemor ismi/familiyasi/sharifi yoki passport seriyasi bo'yicha qidiruv,
    status filtri, sana oralig'i filtri — dan/gacha)
  - `/analyse-ecg` → `EcgAnalyzer` — yangi EKG qo'shish/tahlil qilish sahifasi
  - `/parasitology-analyzer` → `ParasitologyAnalyzer` — parazitologik tahlil sahifasi
  - Non-admin foydalanuvchilar uchun default landing: `EcgAnalysesList`
  - Admin/SuperAdmin uchun default landing: `Doctors`
- **UI dizayn konventsiyalari**:
  - Input maydonlar: `className="login_input"` (Ant Design `Input`)
  - Tugmalar: `className="btn_form"`
  - Sana inputlar: `className="input_date"` (native `<input type="date">`) yoki `DatePicker.RangePicker`
  - Barcha ro'yxat sahifalarida filtr toolbar: `div.main_card_btn` ichida flex layout

### IV. API Contract Rules
Python endpointlari (faqat .NET proxy orqali chaqiriladi):
- `POST /api/analyze` — EKG fayl tahlili (XML/CSV/PNG → AI natija)
- `POST /api/analyze-save` — EKG faylni faqat saqlash (AI tahlilsiz)
- `POST /api/analyze-retry` — Mavjud tahlilni qayta yuborish
- `POST /api/med-diagnoses-save` — Tibbiy tashxis faylini saqlash
- `POST /lab/analyze` — Laboratoriya tahlili
- `POST /lab/analyze-save` — Lab faylini saqlash
- `POST /holter/analyze` — Holter tahlili
- `POST /smad/analyze` — SMAD tahlili
- `POST /analyze-parasitology` — Parazitologik mikroskop tasvir tahlili (GPT-4o vision)

.NET endpointlari:
- `api/auth/*` — register, login, verify, change-password
- `GET api/ecg-analyses/get-by-clinic` — klinikaga tegishli ECG tahlillar ro'yxati
  (params: `page`, `pageSize`, `search` — bemor ismi/familiyasi/sharifi YOKI passport seriyasi,
  `status`, `dateFrom` — ISO sana, `dateTo` — ISO sana; ORDER BY id DESC)
  - Passport qidiruvi: agar `search` `[A-Za-z]{2}\d+` formatiga mos kelsa,
    klinika bemor passportlari in-memory AES deshifrlash orqali taqqoslanadi.
  Response DTO `PatcientForECG` maydoni: `id`, `birthDate`, `gender`,
  `firstName`, `lastName`, `sureName`, `passport` (deshifrlangan)
- `GET api/ecg-analyses/get-ecg-analyses-by-patcient-id` — bemorga tegishli ECG tahlillari
  (params: `id` — patient ID, `page`; pageSize = 5, ORDER BY createdAt DESC)
  Response DTO: `PagedResult<ECGAnalyseDTO>` (maydonlar: `id`, `status`, `analyseFileLink`,
  `generatedFileLink`, `generatedShortFileLink`, `aiAnswerData`, `patcient`, `createdDoctor`,
  `clinic`, `doctors`, `complaints`, `createdAt`, `updatedAt`)
- `api/ecg-analyses/*` — ECG CRUD + proxy (`/analyze`, `/analyze-save`, `/send-to-ai`)
- `api/lab-analyses/*` — Lab CRUD + proxy (`/analyze`)
- `api/holter-analyses/*`, `api/smad-analyses/*` — CRUD + proxy
- `api/parasitology-analyses/*` — Parazitologiya CRUD + proxy (`/save-and-analyze`, `/send-to-ai/{id}`, `/statistics`)
- `api/doctors/*`, `api/patcients/*`, `api/clinics/*`, `api/regions/*`

### V. AI Integration Protocol
- **Provider**: OpenAI — model `gpt-4o` by default
  (`OPENAI_MODEL` environment variable orqali sozlanadi; `.env` da o'zgartirish mumkin)
- **Flow**: Frontend → .NET API (JWT) → Python API → OpenAI Files API → OpenAI Responses API → JSON javob → bazaga saqlash
- **Prompt tili**: O'zbek tilida professional kardiologiya/parazitologiya terminlari
- **Javob formati**: Qat'iy JSON schema (`digital_measurements`, `automatic_analysis`, `automatic_analysis_bool`, `AI_recommendations`, `final_summary` — EKG uchun; `gijja_topildimi`, `aniqlangan_turlar`, `jami_jiddiylik`, `davolash_tavsiyasi`, `shifokorga_tavsiya`, `rasm_sifati`, `yakuniy_xulosa` — Parazitologiya uchun)
- **API kalitlari** environment variable yoki konfiguratsiya fayllaridan o'qiladi (hardcoded taqiqlangan)

---

## Technology Stack Constraints

### Backend (.NET)
- **.NET 8**, EF Core 7 + Npgsql
- JWT autentifikatsiya (`Microsoft.AspNetCore.Authentication.JwtBearer`)
- BCrypt parol hashlash
- MailKit email jonatish
- iTextSharp PDF generatsiya
- Rate Limiting (1 daqiqada 5 marta — `strict` policy)
- CORS: `http://localhost:3000`, `https://nmed.uz`
- Swagger UI (faqat Development muhitda)

### Python
- FastAPI + Uvicorn
- SQLAlchemy + psycopg2 (PostgreSQL)
- NeuroKit2 — EKG signal processing
- NumPy, SciPy, Pandas — raqamli tahlil
- Matplotlib — EKG grafik rendering
- Pillow — rasm boshqaruvi
- OpenAI Python SDK
- fuzzywuzzy — lead nomi mos kelishi

### Frontend
- React 18, react-scripts (CRA)
- Zustand, Axios, Ant Design v5
- react-router-dom v7, react-i18next
- chart.js + react-chartjs-2
- js-cookie, react-input-mask, cleave.js
- dayjs (antd v5 peer dependency — DatePicker uchun)

---

## Development Workflow

### File Organization Rules
```
backend/EkgAnalyzerApi/
  ├── Controllers/     # API endpointlar (Controller per entity)
  ├── Services/        # Biznes logika
  ├── Models/          # EF Core entity modellari (snake_case table mapping)
  ├── DTOs/            # Request/Response DTO'lar
  ├── Data/            # DbContext (MedDataDB)
  ├── Migrations/      # EF Core migratsiyalar (baza sxemasi manba haqqoniyati)
  └── Program.cs       # DI, middleware, konfiguratsiya

python_back/
  ├── main.py          # Asosiy FastAPI app + EKG endpointlar
  ├── models.py        # SQLAlchemy modellari (bazadagi jadvallar reflect)
  ├── database.py      # DB connection
  ├── *_analyse.py     # CRUD helper'lar (create/update)
  ├── *_analyses_api.py # FastAPI Router submodulelar
  └── requirements.txt # Python dependencies

frontend/src/
  ├── host/            # API konfiguratsiya (Host.js, Api.js, *Service.js)
  ├── host/requests/   # Entity-based API request funksiyalari
  ├── store/           # Zustand global store
  ├── pages/           # Sahifalar (auth/, cabinet/)
  ├── components/      # Qayta ishlatiladigan komponentlar
  ├── locale/          # i18n tarjimalar
  └── App.js           # Root komponent
```

### Code Conventions
1. **Naming**:
   - C#: PascalCase (class, method), camelCase (local vars)
   - Python: snake_case (func, var), PascalCase (class)
   - React: PascalCase (components), camelCase (functions, state vars)
   - DB columns: snake_case
2. **Error Handling**:
   - .NET: try-catch + `BadRequest`/`Unauthorized` response. Catch blok **hech qachon bo'sh bo'lmasligi SHART** — kamida `ILogger` orqali log qilinsin.
   - Python: try-except + `HTTPException` yoki `JSONResponse(content={error})`
   - Frontend: try-catch + `handleApiError(error)` — Ant Design `message` API orqali foydalanuvchiga ko'rsatiladi (`frontend/src/tools/notify.js`)
3. **Status Codes** (ECG/Lab/Holter/SMAD tahlillari):
   - `0` — yaratildi (kutmoqda)
   - `1` — fayl qayta ishlandi (AI kutmoqda)
   - `2` — AI natija tayyor
   - `-1` — AI xatolik
4. **Logging (Python)**:
   - `print()` chaqiruvlari production kodida **taqiqlangan**. Buning o'rniga `import logging` va `logger = logging.getLogger(__name__)` ishlatilishi SHART.
   - Sezgir ma'lumotlar (patient ID, passport, file paths) log satrlarda ochiq ko'rinmasligi SHART.
5. **Startup validation**:
   - Har qanday majburiy konfiguratsiya (`JWT_SECRET`, `OPENAI_API_KEY`, `AES_KEY` va h.k.) ilova ishga tushayotganda tekshirilishi SHART.
   - Qiymat topilmasa — `RuntimeError` yoki `InvalidOperationException` chiqarib, ilova to'xtatilishi SHART. Silent fallback (masalan, anonymous user qaytarish) taqiqlangan.

---

## Security Requirements

> ✅ **BAJARILGAN** (2026-04-05):
> - API kalitlari `.env` / `appsettings.Development.json` ga ko'chirildi
> - Python API JWT autentifikatsiya qo'shildi (`verify_token`)
> - CORS cheklandi (aniq domenlar)
> - reCAPTCHA secret key config dan o'qiladi
> - Database credentials `.env` dan o'qiladi
> - `PasswordPlain` koddan olib tashlandi

> ✅ **BAJARILGAN** — Kiber xavfsizlik sertifikatsiyasi talablari (C1–C4):
> 1. **C1 — Proxy arxitektura**: `PythonApiProxyService.cs` + barcha Controller'lar (ECG, Lab, Holter, SMAD, MedDiagnose) `.NET API` orqali Python API ga proxy qiladi. Frontend to'g'ridan-to'g'ri Python API ga murojaat qilmaydi.
> 2. **C2 — Audit log**: `AuditMiddleware.cs` (avtomatik POST/PUT/PATCH/DELETE loglash) + `AuditLog.cs` model + `AuditLogService.cs` + `AuditLogController.cs` (Admin/SuperAdmin uchun). Filtrlar: action, userId, entityType, date range.
> 3. **C3 — Rate limiting**: `Program.cs` da uch pog'onali: `strict` (5/daqiqa — login/register), `ai-analysis` (10/daqiqa — AI tahlil), `general` (100/daqiqa — umumiy). 429 status kod qaytariladi.
> 4. **C4 — AES-256 shifrlash**: `EncryptionService.cs` (AES-256-CBC, tasodifiy IV, PKCS7). Bemor `passport` maydoni shifrlangan saqlanadi ✅. `birthdate` va fayl yo'llari hali shifrlanmagan ⚠️ — qarang: C4-GAP-1, C4-GAP-2.

> ✅ **TUZATILGAN** (2026-04-06):
> - **C5**: `config.py` — `JWT_SECRET` yo'q bo'lsa `RuntimeError` chiqaradi; `auth_middleware.py` anonymous bypass o'rniga HTTP 500 qaytaradi.
> - **C6**: `Program.cs` — `RequireHttpsMetadata = !IsDevelopment()`. Production da HTTPS majburiy.
> - **T5**: `main.py` — barcha 15 ta debug `print()` o'chirildi.
> - **T6**: `Program.cs` — migration catch bloki `ILogger<Program>` orqali loglaydi.

---

## Cybersecurity Certification Requirements (O'z DSt 2814:2014 3-daraja)

### C1. Proxy Arxitektura (POST endpointlar)
Frontend **hech qachon** to'g'ridan-to'g'ri Python API ga murojaat qilmasligi SHART. Barcha so'rovlar `.NET API` orqali proxy qilinadi:
```
Frontend → .NET API (JWT tekshiruv) → Python API (tahlil) → bazaga yozish
```
Kerakli endpointlar:
- `POST api/ecg-analyses/analyze` → proxy → Python `/api/analyze`
- `POST api/ecg-analyses/analyze-save` → proxy → Python `/api/analyze-save`
- `POST api/ecg-analyses/send-to-ai` → proxy → Python `/api/analyze-retry`
- `POST api/lab-analyses/analyze` → proxy → Python `/lab/analyze`
- `POST api/holter-analyses/analyze` → proxy → Python `/holter/analyze`
- `POST api/smad-analyses/analyze` → proxy → Python `/smad/analyze`
- `POST api/med-diagnose/save` → proxy → Python `/api/med-diagnoses-save`
- `POST api/parasitology-analyses/save-and-analyze` → proxy → Python `/analyze-parasitology`
- `POST api/parasitology-analyses/send-to-ai/{id}` → proxy → Python `/analyze-parasitology` (retry)

### C2. Audit Log (TT 4.1.6)
Barcha foydalanuvchi amallari o'zgartirib bo'lmaydigan logga yozilishi SHART:
- `audit_logs` jadvali: `user_id`, `action`, `entity_type`, `entity_id`, `old_values`, `new_values`, `ip_address`, `timestamp`
- Middleware darajasida avtomatik loglash
- Admin uchun loglarni ko'rish interfeysi

### C3. Rate Limiting (TT 4.1.6.3)
IP asosida differensiallashtirilgan cheklovlar:
| Endpoint turi | Limit |
|---------------|-------|
| Login/Register | 5 / daqiqa |
| API umumiy | 100 / daqiqa |
| AI tahlil | 10 / daqiqa |

### C4. AES-256 Shifrlash (TT 4.4.2)
Quyidagi ma'lumotlar bazada **shifrlangan** saqlanishi SHART:
- Bemor `passport` raqami
- Bemor `birthdate` (tug'ilgan sana)
- Tibbiy tashxis fayllarining yo'li
- Shifrlash kaliti environment variable'da saqlanadi

**Muhim**: AES-256-CBC tasodifiy IV ishlatadi — bir xil matnni ikki marta shifrlash har xil natija beradi.
Shuning uchun passport bo'yicha DB darajasida qidiruv **mumkin emas**. Passport qidiruvi
in-memory amalga oshirilishi SHART: bemor passportlari `EncryptionService.Decrypt()` orqali
deshifrlangach, qiymat taqqoslanadi.

### C5. JWT va API Kalitlari Konfiguratsiya Xavfsizligi
- `JWT_SECRET` (Python) va `Jwt:Key` (.NET) environment variable'lardan o'qilishi SHART.
- `OPENAI_API_KEY` (Python) environment variable'dan o'qilishi SHART.
- `JWT_SECRET` **yo'q** yoki bo'sh holatda Python API `RuntimeError` chiqarib ishga tushmasligi SHART.
- `OPENAI_API_KEY` **yo'q** yoki bo'sh holatda Python API `RuntimeError` chiqarib ishga tushmasligi SHART.
  - Sabab: kalitlar bo'lmasa servis ishlamaydi — erta to'xtatish xafsizroq.
- Silent fallback (`return {"user_id": None, "role": "anonymous"}`) **taqiqlangan**.

### C6. HTTPS Majburlash
- `.NET API` da `RequireHttpsMetadata` faqat `Development` muhitida `false` bo'lishi mumkin.
- `Production` va `Staging` muhitlarida `RequireHttpsMetadata = true` bo'lishi SHART.
  - Sabab: `false` holatda JWT Bearer tokenlar HTTP orqali ham qabul qilinadi — MITM hujumida token o'g'irlanishi mumkin.
- Sozlama `IHostEnvironment.IsDevelopment()` shartiga bog'langan bo'lishi SHART.

---

## Integration Points (Aloqa Nuqtalari)

```mermaid
graph LR
    FE[React Frontend :3000] -->|JWT Auth, CRUD, Proxy| NET[.NET API :5000]
    NET -->|HttpClient proxy| PY[Python API :8000]
    NET -->|EF Core| DB[(PostgreSQL med_helper_data)]
    PY -->|SQLAlchemy| DB
    PY -->|Files + Responses API| OAI[OpenAI GPT]
```

### Critical Sync Points
1. **`ecg_analyses` jadvali** — Python yozadi (status, ai_answer_data, file_links), .NET o'qiydi (paginatsiya, DTO mapping)
2. **`lab_analyses` jadvali** — Python yozadi (lab qiymatlari + AI natija), .NET o'qiydi
3. **`parasitology_analyses` jadvali** — .NET yozadi (fayl saqlash, AI proxy, status boshqaruvi), `parasitology_results` .NET tomonidan AI javobdan parse qilinib to'ldiriladi
4. **Shared entitiy IDs** — `patcient_id`, `doctor_id`, `clinic_id` bir xil FK schema
5. **File paths** — Python `uploads/` papkasiga yozadi; .NET StaticFiles orqali serve qilishi kerak. Parazitologiya uchun: `wwwroot/uploads/parasitology/{yyyyMM}/`
6. **Audit logs** — faqat .NET API tomonidan yoziladi

---

## VI. User Roles & Access Control

### Tizim Rollari (Role Table)

| ID | Konstanta | Nomi (uz) | Tavsif |
|----|-----------|-----------|--------|
| 1 | `SuperAdmin` | SuperAdmin | Tizim darajasidagi administrator. Barcha klinikalar va loglarni ko'ra oladi. |
| 2 | `Admin` | Admin | Shifoxona admini. Faqat o'z klinikasi xodimlarini boshqaradi. |
| 3 | `Director` | Bosh shifokor | Shifoxona direktori. Admin bilan bir xil kabinet vakolatlariga ega. |
| 4 | `Doctor` | Shifokor | Klinika shifokori. Tahlillar olib boradi. |
| 5 | `Nurse` | Hamshira | Hamshira. Tahlillar olib boradi. |

### Kabinet Kirish Qoidalari

1. **Admin (2) va Direktor (3) kabinetlari bir xil**: Ikkala rol ham `/doctor`
   (xodimlar), `/doctor/create`, `/doctor/create/:id` va `/settings` sahifalariga
   kirish huquqiga ega. Default landing — `Doctors` sahifasi.

2. **Shifokor (4) va Hamshira (5)**: `/ecg-analyses` — default landing.
   - Barcha tahlil sahifalariga (`/ecg-analyses`, `/holter-analyses`, `/smad-analyses`,
     `/lab-analyses`, `/patient-diagnoses`, `/parasitology-analyzer`) ruxsat bor.
   - `/doctor` (xodimlar) va `/settings` (tashkilot haqida) — TAQIQLANGAN.
     Sidebar menusida ham ko'rinmasligi SHART.
   - Tahlil ro'yxati sahifalarida **faqat shu shifokor davolovchi sifatida belgilangan**
     (junction table orqali assigned) ma'lumotlar ko'rinishi SHART.
     Butun klinika ma'lumotlari emas — qarang: VII bob.

3. **SuperAdmin (1)**: Tizim darajasi. Klinika kabineti oqimiga kirmaydi — alohida
   boshqaruv interfeysi orqali ishlaydi. Parazitologiya statistika endpointi
   (`GET /api/parasitology-analyses/statistics`) **faqat SuperAdmin** uchun.

### Xodimlar Sahifasi (Doctors) — O'z-o'zini ko'rsatmaslik Qoidasi

- `/doctor` sahifasi `GET api/doctor/get-doctors-of-clinic` endpointidan ma'lumot oladi.
- Backend (`DoctorService.GetDoctorsAsync`) **joriy foydalanuvchini** (`u.Id != user_id`)
  so'rov natijasidan **chiqarib tashlashi SHART**.
- Sabab: Admin yoki Direktor o'z profilini "xodim" sifatida ko'rishi va tahrirlashi
  chalkashlik tug'diradi.
- Bundan tashqari, Admin roli (`RoleId == 2`) va SuperAdmin roli (`RoleId == 1`) ham
  ro'yxatdan chiqarib tashlanadi (mavjud filtr).

### Rol-marshrut Matritsa (Frontend)

| Marshrut | Admin (2) | Direktor (3) | Shifokor (4) | Hamshira (5) |
|----------|-----------|--------------|--------------|--------------|
| `/` (default) | Doctors | Doctors | EcgAnalysesList | EcgAnalysesList |
| `/doctor` | ✅ | ✅ | ❌ | ❌ |
| `/settings` | ✅ | ✅ | ❌ | ❌ |
| `/ecg-analyses` | ✅ | ✅ | ✅ | ✅ |
| `/holter-analyses` | ✅ | ✅ | ✅ | ✅ |
| `/smad-analyses` | ✅ | ✅ | ✅ | ✅ |
| `/lab-analyses` | ✅ | ✅ | ✅ | ✅ |
| `/patient-diagnoses` | ✅ | ✅ | ✅ | ✅ |
| `/parasitology-analyzer` | ✅ | ✅ | ✅ | ✅ |

---

## VII. Doctor View & Notification System

### 7.1 Shifokor Ko'rinishi — Ma'lumotlar Filtri

Shifokor (4) tizimga kirganda tahlil sahifalari butun klinika ma'lumotlarini emas,
**faqat o'sha shifokor davolovchi (treating physician) sifatida belgilangan** tahlillarni
ko'rsatishi SHART.

Davolovchi sifatida belgilanish junction tablalari orqali aniqlanadi:

| Tahlil turi | Junction jadval | Doctor FK ustuni |
|-------------|-----------------|------------------|
| ECG | `ecg_analyse_doctors` | `doctor_id` |
| Holter | `holter_analyse_doctors` | `doctor_id` |
| SMAD | `smad_analyse_doctors` | `doctor_id` |
| Laboratoriya | `lab_analyse_doctors` | `doctor_id` |
| Parazitologiya | `parasitology_analysis_doctors` | `doctor_id` |
| Shifokor xulosasi | `medical_diagnoses.main_doctor_id` (to'g'ridan-to'g'ri) | `doctor_id` |

Backend har bir tahlil turi uchun alohida endpoint SHART:
```
GET api/ecg-analyses/get-by-doctor       (query: page, pageSize, search, status, dateFrom, dateTo)
GET api/holter-analyses/get-by-doctor    (query: page, pageSize, search, status, dateFrom, dateTo)
GET api/smad-analyses/get-by-doctor      (query: page, pageSize, search, status, dateFrom, dateTo)
GET api/lab-analyses/get-by-doctor       (query: page, pageSize, search, status, dateFrom, dateTo)
GET api/med-diagnose/get-by-doctor       (query: page, pageSize, search, dateFrom, dateTo)
```

Frontend sahifalar `user.roleId === 4` shartiga qarab `get-by-doctor` endpointini
chaqiradi. Hamshira (5) uchun alohida endpoint ishlatiladi — qarang: 7.5.

### 7.2 Ko'rilgan/Ko'rilmagan Status (`is_viewed`) — faqat Shifokor (4)

Bu mexanizm **faqat Shifokor (rol 4) uchun** amal qiladi. Hamshira (5) uchun `is_viewed`
talab qilinmaydi — chunki hamshira faqat o'zi qo'shgan tahlillarni ko'radi (7.5-bo'lim).

Har bir junction table qatorida **`is_viewed`** (boolean, default `false`) ustuni bo'lishi
SHART. Bu ustun shifokor o'sha tahlilni birinchi marta ochganda `true` ga o'tkaziladi.

**DB migratsiya (EF Core):**
- `ecg_analyse_doctors.is_viewed` — bool, default `false`
- `holter_analyse_doctors.is_viewed` — bool, default `false`
- `smad_analyse_doctors.is_viewed` — bool, default `false`
- `lab_analyse_doctors.is_viewed` — bool, default `false`

Shifokor xulosasi (`medical_diagnoses`) uchun alohida junction yo'q — shu jadvalda
`is_viewed` maydonini to'g'ridan-to'g'ri qo'shish SHART.

**Modellarni yangilash:**
- `ECGAnalyseDoctors.cs` — `IsViewed` property (Column: `is_viewed`)
- `HolterAnalyseDoctors.cs` — `IsViewed` property
- `SmadAnalyseDoctors.cs` — `IsViewed` property
- `LabAnalyseDoctors.cs` — `IsViewed` property
- `MedicalDiagnoses.cs` — `IsViewed` property

**Mark-as-viewed endpointlari (batch — sahifaga kirish bilan):**
```
PUT api/ecg-analyses/mark-viewed-by-doctor     (body: { doctor_id })
PUT api/holter-analyses/mark-viewed-by-doctor  (body: { doctor_id })
PUT api/smad-analyses/mark-viewed-by-doctor    (body: { doctor_id })
PUT api/lab-analyses/mark-viewed-by-doctor     (body: { doctor_id })
PUT api/med-diagnose/mark-viewed-by-doctor     (body: { doctor_id })
```

Yoki alternativ: `put-by-id` — faqat bitta tahlil ochilganda belgilash.
Har ikkala usul ham response ichida yangi `unviewed_count` qaytarishi SHART.

**Frontend — ko'rilgan status ko'rsatish:**
Tahlil ro'yxati jadvalida har bir qatorda `is_viewed` ga qarab vizual indikator:
- Ko'rilmagan: `Badge` (rang: sariq yoki ko'k) — ustun: "Ko'rildi" → Yo'q
- Ko'rilgan: yashil belgisi yoki "Ko'rildi" matni

### 7.3 Menu Notification Badge (Ko'rilmagan Tahlillar Soni) — faqat Shifokor (4)

Bu mexanizm **faqat Shifokor (rol 4) uchun** amal qiladi. Hamshira (5) uchun
unviewed badge ko'rsatilmaydi.

Sidebar menudagi har bir tahlil tipiga tegishli itemda shifokor hali ko'rmagan
tahlillar soni **badge (notification count)** sifatida ko'rinishi SHART.

**Backend — unviewed count endpointlari:**
```
GET api/ecg-analyses/unviewed-count      → { count: N }
GET api/holter-analyses/unviewed-count   → { count: N }
GET api/smad-analyses/unviewed-count     → { count: N }
GET api/lab-analyses/unviewed-count      → { count: N }
GET api/med-diagnose/unviewed-count      → { count: N }
```

Har bir endpoint JWT token ichidagi `doctor_id` ni olib, o'sha doktor uchun
`is_viewed = false` qatorlar sonini qaytaradi. Rol 4/5 bo'lmagan foydalanuvchilar
uchun `0` qaytariladi (yoki 403).

**Frontend — Zustand Store:**
```js
ecg_unread: 0,       setecg_unread: (n) => set({ ecg_unread: n }),
holter_unread: 0,    setholter_unread: (n) => set({ holter_unread: n }),
smad_unread: 0,      setsmad_unread: (n) => set({ smad_unread: n }),
lab_unread: 0,       setlab_unread: (n) => set({ lab_unread: n }),
diagnoses_unread: 0, setdiagnoses_unread: (n) => set({ diagnoses_unread: n }),
```

Ilovaga kirish vaqtida (App.js — user ma'lumotlari yuklangandan so'ng) va har
mark-viewed operatsiyasidan so'ng bu qiymatlar yangilanadi.

**Frontend — SideBar badge render qoidasi:**
- `count > 0` → `<Badge count={count}>` — `antd` `Badge` komponenti ishlatiladi
- `count === 0` → badge **UMUMAN ko'rinmasligi SHART** (`showZero={false}` yoki
  shartli render). 0 raqami hech qachon menuda ko'rsatilmasligi shart.

**Frontend — Sahifaga kirish (`useEffect` on mount):**
Shifokor (rol 4/5) tegishli sahifaga kirganda darhol `mark-viewed-by-doctor` API
chaqiriladi va tegishli Zustand unread count nolga tushiriladi:
```js
useEffect(() => {
  if (user.roleId === 4 || user.roleId === 5) {
    markViewedByDoctor()          // API call
    setecg_unread(0)              // clear badge immediately (optimistic)
  }
}, [])
```

### 7.4 Qoidalar Xulosasi

| Qoida | Rol | Shart darajasi |
|-------|-----|---------------|
| Tahlil sahifalarida faqat o'ziga assigned (junction) tahlillarni ko'radi | 4 (Doctor) | SHART |
| Tahlil sahifalarida faqat o'zi yaratgan (created_doctor_id) tahlillarni ko'radi | 5 (Nurse) | SHART |
| `is_viewed` ustuni barcha junction tablalarda mavjud bo'lishi | 4 | SHART |
| `is_viewed` ustuni Hamshira uchun talab qilinmasligi | 5 | SHART |
| Ko'rilmagan tahlillar menuda badge sifatida ko'rinishi | 4 | SHART |
| Badge count 0 bo'lsa ko'rinmasligi | 4 | SHART |
| Shifokor sahifaga kirishi bilan badge 0 ga tushishi | 4 | SHART |
| Hamshira uchun unread badge ko'rsatilmasligi | 5 | SHART |
| Admin/Direktor uchun bu mantiq ishlamasligi (klinika ko'rinishi qolishi) | 2, 3 | SHART |

### 7.5 Hamshira (Nurse, rol 5) Ko'rinishi

Hamshira (5) tizimga kirganda tahlil sahifalari **faqat o'sha hamshira tomonidan
yuklangan (yaratilgan)** tahlillarni ko'rsatishi SHART.

**Filtr mexanizmi**: `created_doctor_id == nurse's doctor_id`

Hamshira ham `doctors` jadvalida yozuv sifatida mavjud (users.role_id = 5).
Backend `_context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId)` orqali
`doctor_id` ni oladi va `created_doctor_id` ustuni orqali filtrlaydi.

**Backend — alohida endpointlar:**
```
GET api/ecg-analyses/get-by-nurse     (query: page, pageSize, search, status, dateFrom, dateTo)
GET api/holter-analyses/get-by-nurse  (query: page, pageSize, search, status, dateFrom, dateTo)
GET api/smad-analyses/get-by-nurse    (query: page, pageSize, search, status, dateFrom, dateTo)
GET api/lab-analyses/get-by-nurse     (query: page, pageSize, search, status, dateFrom, dateTo)
GET api/med-diagnose/get-by-nurse     (query: page, pageSize, search, dateFrom, dateTo)
```

**is_viewed** — talab qilinmaydi. Hamshira faqat o'zi yaratgan tahlillarni ko'radi,
shuning uchun "ko'rilmagan/yangi" tushunchasi mavjud emas.

**Unread badge** — ko'rsatilmaydi. Zustand unread count hamshira uchun hisoblanmaydi.

**Frontend sahifalar** rol tekshiruvi:
```js
const isDoctor = user && user.roleId === 4;
const isNurse  = user && user.roleId === 5;

// fetch
if (isDoctor) await get_xxx_by_doctor(params);
else if (isNurse) await get_xxx_by_nurse(params);
else await get_xxx_by_clinic(params);
```

Tahlil ro'yxati jadvalidagi `isViewed` ustun hamshira uchun ko'rsatilmaydi
(faqat `isDoctor === true` bo'lganda render qilinadi).

---

## VIII. Parasitology Analysis Module

### 8.1 Modul Haqida

Parazitologik tahlil moduli mikroskop ostida olingan axlat namunesining rasmi (PNG/JPG/JPEG)
asosida gijja tuxumlarini AI yordamida aniqlash imkonini beradi. Bu modul EKG, Lab,
Holter, SMAD modullari bilan bir xil arxitektura qoidalariga amal qiladi.

**Fayl formati**: Faqat `.jpg`, `.png`, `.jpeg` (PDF emas — rasm tahlil qilinadi).
**AI provider**: OpenAI GPT-4o vision.
**Saqlash yo'li**: `wwwroot/uploads/parasitology/{yyyyMM}/` — LabAnalyse/ECGAnalyse kabi.

### 8.2 Database Sxemasi

**`parasitology_analyses`** jadvali (EF Core Migration orqali yaratiladi):

| Ustun | Tip | Izoh |
|-------|-----|------|
| `id` | int, PK, autoincrement | |
| `patcient_id` | int, FK → `patcients` | |
| `clinic_id` | int, FK → `clinics` | |
| `created_doctor_id` | int, FK → `doctors` | |
| `file_path` | string | Yuklangan rasm manzili |
| `microscopy_method` | string | `direct_smear` \| `kato_katz` \| `flotation` \| `fecpakg` |
| `magnification` | string | `100x` \| `200x` \| `400x` \| `1000x` |
| `egg_count_per_field` | int, nullable | Laborant hisoblagan tuxum soni |
| `ai_response` | text, nullable | JSON format (AI natijasi) |
| `analysis_status` | string | `pending` \| `analyzed` \| `not_analyzed` \| `failed` |
| `jiddiylik_darajasi` | int, nullable | 1 / 2 / 3 |
| `lang` | string | `uz` / `ru` / `en` |
| `created_at` | datetime | |
| `updated_at` | datetime, nullable | |

**`parasitology_analysis_doctors`** jadvali (ko'p-ko'p, ECGAnalyseDoctors.cs pattern):

| Ustun | Tip |
|-------|-----|
| `id` | int, PK |
| `parasitology_analysis_id` | int, FK → `parasitology_analyses` |
| `doctor_id` | int, FK → `doctors` |

**`parasitology_results`** jadvali (har bir aniqlangan gijja turi uchun alohida qator):

| Ustun | Tip | Izoh |
|-------|-----|------|
| `id` | int, PK |
| `parasitology_analysis_id` | int, FK → `parasitology_analyses` |
| `helminth_type` | string | `"Ascaris lumbricoides"` va h.k. (lotin nomi) |
| `helminth_name_uz` | string | |
| `helminth_name_ru` | string | |
| `helminth_name_en` | string | |
| `confidence` | decimal | 0.0 – 1.0 |
| `infection_level` | string | `light` \| `moderate` \| `heavy` |
| `viloyat` | string, nullable | Statistika uchun |
| `tuman` | string, nullable | |
| `patient_age_group` | string | `0-5` \| `6-14` \| `15-60` \| `60+` |
| `patient_gender` | bool | |
| `analysis_date` | date | Statistika filtrlash uchun |

### 8.3 Python FastAPI Endpoint

**Fayl**: `python_back/parasitology_api.py` (mavjud `ecg_api.py` / `smad_api.py` strukturasiga amal qiladi)

**Endpoint**: `POST /analyze-parasitology` (multipart/form-data)

**So'rov maydonlari**:

| Maydon | Tip | Majburiy |
|--------|-----|---------|
| `file` | UploadFile (PNG/JPG/JPEG) | ✅ |
| `microscopy_method` | str | ✅ |
| `magnification` | str | ✅ |
| `gender` | str (`erkak`/`ayol`) | ✅ |
| `age` | int | ✅ |
| `egg_count_per_field` | int | ixtiyoriy (0 = aniqlanmagan) |
| `complaints` | List[str] | ixtiyoriy |
| `lang` | str (`uz`/`ru`/`en`) | ✅ |

**AI Javob JSON strukturasi**:
```json
{
  "gijja_topildimi": true,
  "aniqlangan_turlar": [
    {
      "lotin_nomi": "Ascaris lumbricoides",
      "uz_nomi": "Oddiy gijja",
      "ru_nomi": "Аскарида",
      "en_nomi": "Common roundworm",
      "ishonch_darajasi": 0.92,
      "infektsiya_darajasi": "light",
      "infektsiya_uz": "Yengil"
    }
  ],
  "jami_jiddiylik": 1,
  "davolash_tavsiyasi": "Albendazol 400 mg...",
  "shifokorga_tavsiya": "Nazorat tekshiruvi 3 haftadan so'ng...",
  "rasm_sifati": "yaxshi",
  "qoshimcha_izoh": "...",
  "yakuniy_xulosa": "..."
}
```

**Xatolik holatlari**:
- Rasm sifati past → `{"xato": "rasm_sifati_past", "xabar": "Rasmni qayta yuklang"}`
- Parazitologik rasm emas → `{"xato": "noto'g'ri_rasm", "xabar": "..."}`
- Gijja topilmadi → `gijja_topildimi: false, aniqlangan_turlar: []`

### 8.4 .NET Backend Endpointlari

**Controller**: `ParasitologyAnalyseController.cs`
**Service**: `ParasitologyAnalyseService.cs`
**DTOs**: `ParasitologyAnalyseDTOs.cs`

**Endpointlar**:

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| POST | `/api/parasitology-analyses/save-and-analyze` | Rasm saqlash + AI tahlil + natijani bazaga yozish |
| GET | `/api/parasitology-analyses/get-by-patient-id?id={}&page={}` | Bemorning parazitologik tarixi (pageSize=5) |
| POST | `/api/parasitology-analyses/send-to-ai/{id}` | Saqlangan faylni qayta AI ga yuborish (`not_analyzed` holat uchun) |
| GET | `/api/parasitology-analyses/statistics` | SuperAdmin statistikasi — `[Authorize(Roles = "SuperAdmin")]` |

**`save-and-analyze` oqimi**:
1. Faylni `wwwroot/uploads/parasitology/{yyyyMM}/` ga saqlaydi
2. `ParasitologyAnalyses` yozuvi yaratadi (`analysis_status = "pending"`)
3. `ParasitologyAnalysisDoctors` ko'p-ko'p qatorlari yaratadi
4. Python `/analyze-parasitology` ga multipart proxy so'rov yuboradi
5. AI javobini parse qiladi → `ParasitologyResults` jadvaliga har bir tur uchun alohida qator
6. `analysis_status = "analyzed"` yoki `"failed"` qilib yangilaydi
7. To'liq DTO qaytaradi

**Statistika endpoint response**:
```json
{
  "jami_tahlillar": 1250,
  "gijja_topilgan": 847,
  "topilmagan": 403,
  "eng_kop_turlar": [
    {"tur": "Ascaris lumbricoides", "uz_nomi": "Oddiy gijja", "soni": 423, "foizi": 49.9}
  ],
  "viloyatlar_boyicha": [
    {"viloyat": "Farg'ona", "soni": 234, "ogir_soni": 45}
  ],
  "yosh_guruhlari": [
    {"guruh": "6-14", "soni": 378, "foizi": 44.6}
  ],
  "oylik_dinamika": [
    {"oy": "2026-01", "soni": 89, "topilgan": 61}
  ]
}
```

**Statistika query params**: `viloyat?`, `tuman?`, `yiloyAy?`, `helminthType?`, `dateFrom?`, `dateTo?`

### 8.5 Frontend Komponentlar

**Yangi fayllar**:

| Fayl | Maqsad |
|------|--------|
| `frontend/src/pages/cabinet/parasitology/ParasitologyAnalyzer.js` | Asosiy forma (LabAnalyzer.js pattern) |
| `frontend/src/pages/cabinet/parasitology/ParasitologyResult.js` | Natija ko'rsatish komponenti |
| `frontend/src/host/parasitologyService.js` | API so'rov funksiyasi |

**Formadagi qo'shimcha maydonlar** (LabAnalyzer.js dagi `lab_category` o'rniga):
1. Buyatkovka usuli (`Select`, majburiy): `direct_smear` / `kato_katz` / `flotation` / `fecpakg`
2. Kattalashtirish (`Select`, majburiy): `100x` / `200x` / `400x` / `1000x`
3. Ko'rish maydonidagi tuxum soni (`InputNumber`, ixtiyoriy)

**Natija ko'rsatish qoidalari**:
- Gijja topilmasa: yashil banner — `t("helminth_not_detected")`
- Topilsa: har bir tur uchun card (tur nomi, ishonch % progress bar, infektsiya badge:
  yengil=yashil, o'rtacha=sariq, og'ir=qizil)
- Umumiy jiddiylik darajasi, davolash tavsiyasi, shifokorga tavsiya bo'limlari

**Mavjud fayllarga minimum o'zgarish**:
- `routes.js` — `/parasitology-analyzer` yo'li qo'shiladi
- `Main.js` — `<Route>` qo'shiladi
- Sidebar/navigation — "Parazitologik tahlil" menyu elementi

### 8.6 i18n Kalitlari

Uch til faylida (`Uz.json`, `Ru.json`, `En.json`) quyidagi kalitlar qo'shiladi:

```
parasitology_analyse, microscopy_method, magnification, egg_count_per_field,
direct_smear, kato_katz, flotation, helminth_detected, helminth_not_detected,
confidence, infection_level, light, moderate, heavy,
treatment_recommendation, doctor_recommendation,
image_quality_poor, parasitology_saved
```

### 8.7 Parazitologiya Uchun Maxsus Qoidalar

- Fayl qabul: `.jpg`, `.png`, `.jpeg` faqat. PDF **qabul qilinmaydi** (rasm tahlil qilinadi).
- `analysis_status` string tizimi (`"pending"` / `"analyzed"` / `"not_analyzed"` / `"failed"`)
  mavjud int-based status kodidan farq qiladi — bu modul uchun string enum ishlatiladi.
- `send-to-ai/{id}` endpoint faqat `analysis_status == "not_analyzed"` bo'lgan tahlillar uchun ishlaydi.
- Statistika endpoint `ParasitologyResults` jadvalidan aggregatsiya qiladi (bemor `viloyat`/`tuman`
  ma'lumotlari `PatcientId` orqali join qilinishi SHART).
- Python tomoni faqat AI tahlil qiladi; `ParasitologyResults` ni **faqat .NET** to'ldiradi
  (AI JSON response parse qilinib C# tomonida yoziladi).

---

## Governance

- Ushbu konstitutisya loyihaning barcha qismlariga tegishli va barcha o'zgarishlardan oldin tekshirilishi SHART.
- Baza sxemasiga o'zgarish kiritish faqat .NET Migrations orqali amalga oshirilishi SHART.
- Yangi endpoint qo'shishda ikkala backend va frontendni sinxronlashtirish SHART.
- **Kiber xavfsizlik sertifikatsiyasi** talablari (C1–C6) birinchi ustuvor vazifa.
- Frontend → Python API bevosita aloqasi qat'iyan taqiqlangan (proxy orqali SHART).
- Shaxsiy ma'lumotlar faqat shifrlangan ko'rinishda saqlanishi SHART.
- **Versioning**: MAJOR — printsiplarni olib tashlash/qayta aniqlash; MINOR — yangi bo'lim/printsip qo'shish; PATCH — aniqlashtirish, imlo.
- **Amend procedure**: Konstitutisya faqat komanda yig'ilishida muhokama qilingandan so'ng o'zgartirilishi mumkin. Har qanday o'zgartirish `Last Amended` sanasini yangilaydi.

**Version**: 2.7.0 | **Ratified**: 2026-04-03 | **Last Amended**: 2026-04-22
