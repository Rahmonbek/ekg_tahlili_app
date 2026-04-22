---
description: "Parazitologik tahlil (gijja aniqlash) moduli — barcha vazifalar"
---

# Tasks: Parasitology Analysis Module

**Maqsad**: EKG/Lab/Holter/SMAD kabi, mikroskop ostidagi axlat namunesining rasmi (PNG/JPG)
asosida GPT-4o vision orqali gijja tuxumlarini aniqlash modulini qo'shish.

**Namuna fayllar** (pattern sifatida ishlatiladi):
- `backend/EkgAnalyzerApi/Controllers/LabAnalyseController.cs`
- `backend/EkgAnalyzerApi/Services/LabAnalyseService.cs`
- `backend/EkgAnalyzerApi/Models/LabAnalyses.cs`, `LabAnalyseDoctors.cs`
- `python_back/smad_analyses_api.py` yoki `lab_analyses_api.py`
- `frontend/src/pages/cabinet/lab_analyse/LabAnalyzer.js`

---

## Phase 1: Database — EF Core Migration

**Maqsad**: Uch yangi jadval yaratish. Boshqa hech narsa boshlanmasligi uchun bu
birinchi bajarilishi SHART.

- [ ] T001 `ParasitologyAnalyses.cs` model yarat — `backend/EkgAnalyzerApi/Models/ParasitologyAnalyses.cs`
  Maydonlar: `Id`, `PatcientId` (FK), `ClinicId` (FK), `CreatedDoctorId` (FK),
  `FilePath`, `MicroscopyMethod`, `Magnification`, `EggCountPerField` (int?),
  `AiResponse` (text?), `AnalysisStatus`, `JiddiylikDarajasi` (int?),
  `Lang`, `CreatedAt`, `UpdatedAt` (DateTime?)

- [ ] T002 [P] `ParasitologyAnalysisDoctors.cs` model yarat — `backend/EkgAnalyzerApi/Models/ParasitologyAnalysisDoctors.cs`
  Maydonlar: `Id`, `ParasitologyAnalysisId` (FK), `DoctorId` (FK)
  Pattern: `ECGAnalyseDoctors.cs` bilan bir xil tuzilma

- [ ] T003 [P] `ParasitologyResults.cs` model yarat — `backend/EkgAnalyzerApi/Models/ParasitologyResults.cs`
  Maydonlar: `Id`, `ParasitologyAnalysisId` (FK), `HelminthType`, `HelminthNameUz`,
  `HelminthNameRu`, `HelminthNameEn`, `Confidence` (decimal), `InfectionLevel`,
  `Viloyat` (string?), `Tuman` (string?), `PatientAgeGroup`, `PatientGender` (bool),
  `AnalysisDate` (DateOnly)

- [ ] T004 `MedDataDB.cs` ga uch yangi `DbSet` qo'sh (T001–T003 tugagandan so'ng):
  `DbSet<ParasitologyAnalyses>`, `DbSet<ParasitologyAnalysisDoctors>`, `DbSet<ParasitologyResults>`

- [ ] T005 EF Core migration yarat va apply qil (T004 tugagandan so'ng):
  ```
  dotnet ef migrations add AddParasitologyTables
  dotnet ef database update
  ```

**Checkpoint**: `parasitology_analyses`, `parasitology_analysis_doctors`, `parasitology_results`
jadvallari bazada mavjud bo'lishi SHART.

---

## Phase 2: Python FastAPI — AI Endpoint

**Maqsad**: GPT-4o vision orqali mikroskop tasvirini tahlil qiluvchi endpoint.
Phase 1 bilan parallel bajarilishi mumkin.

- [ ] T006 [P] `python_back/parasitology_api.py` fayl yarat
  - `smad_analyses_api.py` yoki `lab_analyses_api.py` strukturasiga amal qil
  - `APIRouter` ishlatib `POST /analyze-parasitology` endpointini yoz
  - Multipart form: `file`, `microscopy_method`, `magnification`, `gender`, `age`,
    `egg_count_per_field` (optional), `complaints` (List[str], optional), `lang`
  - Rasm base64 ga aylantir → GPT-4o vision prompt'ga yuborish
  - System prompt: tajribali parazitolog laboratoriya mutaxassisi roli
  - User prompt lang ga qarab (`uz`/`ru`/`en`) dinamik tuziladi
  - JSON strukturasini tekshir: `gijja_topildimi`, `aniqlangan_turlar[]`,
    `jami_jiddiylik`, `davolash_tavsiyasi`, `shifokorga_tavsiya`,
    `rasm_sifati`, `qoshimcha_izoh`, `yakuniy_xulosa`
  - Xatolik holatlari: `rasm_sifati_past`, `noto'g'ri_rasm`
  - `print()` taqiqlangan — `logging` ishlatilsin

- [ ] T007 `python_back/main.py` ga routerni ulash (T006 tugagandan so'ng):
  `app.include_router(parasitology_router)`

**Checkpoint**: `curl -X POST http://localhost:8000/analyze-parasitology -F "file=@test.jpg" ...`
to'g'ri JSON qaytarishi SHART.

---

## Phase 3 (P1): Bemor tanlash → Rasm yuklash → AI tahlil → Natija ko'rish

**User Story**: Shifokor bemorni tanlab, mikroskop rasmini yuklaydi, AI tahlil
natijasini ko'radi — asosiy ish oqimi.

**Mustaqil Test**: POST `/api/parasitology-analyses/save-and-analyze` →
`analysis_status: "analyzed"`, `ai_response` to'ldirilgan bo'lishi SHART.

### Backend — DTOs, Service, Controller

- [ ] T008 `ParasitologyAnalyseDTOs.cs` yarat — `backend/EkgAnalyzerApi/DTOs/ParasitologyAnalyseDTOs.cs`
  - `ParasitologyAnalyseCreateDto`: `PatcientId`, `ClinicId`, `CreatedDoctorId`,
    `MicroscopyMethod`, `Magnification`, `EggCountPerField` (int?), `DoctorIds[]`, `Lang`
  - `ParasitologyAnalyseDTO`: barcha maydonlar + `Patcient.FullName`, deserialized
    `AiResponse`, `Doctorlar` ro'yxati, `Results` ro'yxati

- [ ] T009 `ParasitologyAnalyseService.cs` yarat — `backend/EkgAnalyzerApi/Services/ParasitologyAnalyseService.cs`
  - `LabAnalyseService.cs` pattern'ga amal qil
  - `SaveAndAnalyzeAsync(file, dto)`: fayl `wwwroot/uploads/parasitology/{yyyyMM}/` ga saqlash,
    DB yozuvi yaratish, Python proxy chaqiruv, AI javobni parse qilib
    `ParasitologyResults` yozuvlarini yaratish, status yangilash
  - `GetByPatientIdAsync(patientId, page)`: pageSize=5, ORDER BY createdAt DESC
  - `SendToAiAsync(id)`: `analysis_status == "not_analyzed"` tekshiruv, qayta AI yuborish
  - Error handling: catch blok bo'sh bo'lmasligi SHART — `ILogger` orqali log

- [ ] T010 `ParasitologyAnalyseController.cs` yarat — `backend/EkgAnalyzerApi/Controllers/ParasitologyAnalyseController.cs`
  - `LabAnalyseController.cs` / `PatcientController.cs` auth pattern'ni AYNAN ko'chir
    (`ClaimTypes.NameIdentifier` orqali `userId` olish)
  - `POST /api/parasitology-analyses/save-and-analyze` — `[Authorize]`
  - `GET /api/parasitology-analyses/get-by-patient-id` — `[Authorize]`
  - `POST /api/parasitology-analyses/send-to-ai/{id}` — `[Authorize]`
  - DI: `IParasitologyAnalyseService` inject

- [ ] T011 `Program.cs` ga `ParasitologyAnalyseService` DI qo'sh (T009 tugagandan so'ng)

### Frontend — Forma va Natija

- [ ] T012 `parasitologyService.js` yarat — `frontend/src/host/parasitologyService.js`
  - `analyzeParasitologyFile(formData)` funksiyasi
  - Endpoint: `POST /api/parasitology-analyses/save-and-analyze`
  - `axiosInstance` (JWT interceptor bilan) ishlatiladi

- [ ] T013 `ParasitologyResult.js` yarat — `frontend/src/pages/cabinet/parasitology/ParasitologyResult.js`
  - Gijja topilmasa: yashil banner (`t("helminth_not_detected")`)
  - Topilsa: har bir tur uchun Ant Design Card:
    - Tur nomi (lang ga qarab uz/ru/en)
    - Ishonch darajasi — `Progress` komponenti (%)
    - Infektsiya darajasi — `Tag`/Badge: `light`=yashil, `moderate`=sariq, `heavy`=qizil
  - Umumiy jiddiylik darajasi bo'limi
  - Davolash tavsiyasi bo'limi (`t("treatment_recommendation")`)
  - Shifokorga tavsiya bo'limi (`t("doctor_recommendation")`)

- [ ] T014 `ParasitologyAnalyzer.js` yarat — `frontend/src/pages/cabinet/parasitology/ParasitologyAnalyzer.js`
  - `LabAnalyzer.js` va `SmadAnalyzer.js` pattern'dan ko'chir
  - Bemor tanlash (mavjud `PatientSelect` komponenti)
  - Shifokorlar tanlash (mavjud `DoctorSelect` komponenti)
  - **Qo'shimcha maydonlar** (`lab_category` o'rniga):
    1. Buyatkovka usuli (`Select`, majburiy): `direct_smear`/`kato_katz`/`flotation`/`fecpakg`
    2. Kattalashtirish (`Select`, majburiy): `100x`/`200x`/`400x`/`1000x`
    3. Ko'rish maydonidagi tuxum soni (`InputNumber`, ixtiyoriy)
  - Fayl upload: `.jpg`, `.png`, `.jpeg` faqat (PDF emas)
  - Yuborish: `analyzeParasitologyFile(formData)` chaqiradi
  - Natija: `<ParasitologyResult result={result} />`

**Checkpoint**: Bemor tanlash → rasm yuklash → "Tahlil qilish" → natija ko'rish to'liq ishlashi SHART.

---

## Phase 4 (P2): Saqlangan tahlilni keyinroq AI ga yuborish

**User Story**: `analysis_status == "not_analyzed"` bo'lgan tahlillarni qayta AI ga yuborish
(ECG modulidagi `send-to-ai` analogi).

- [ ] T015 Backend `send-to-ai/{id}` endpoint — T010 da allaqachon yozilgan,
  ammo `analysis_status` tekshiruvini alohida sinovdan o'tkazing:
  - `analysis_status != "not_analyzed"` bo'lsa `BadRequest` qaytarishi SHART
  - Muvaffaqiyatli bo'lsa `analysis_status = "analyzed"` qilinishi SHART

- [ ] T016 Frontend — mavjud tahlil ro'yxatida (keyinroq qo'shilsa) "Qayta yuborish" tugmasi
  - `POST /api/parasitology-analyses/send-to-ai/{id}` chaqiradi
  - Loading state, xatolik xabari

**Checkpoint**: `analysis_status: "not_analyzed"` yozuvni topib, qayta AI ga yuborib
`"analyzed"` ga o'tkazish ishlashi SHART.

---

## Phase 5 (P2): Bemorning parazitologik tarixi

**User Story**: Bemor kartasida barcha o'tgan parazitologik tahlillar ro'yxati (sahifalangan).

- [ ] T017 Backend `get-by-patient-id` endpoint — T009/T010 da allaqachon yozilgan;
  `ECGAnalyseService.GetEcgAnalysesByPatcientIdAsync` pattern ga amal qilinganini tekshiring:
  - `pageSize = 5`, `ORDER BY created_at DESC`
  - Response: `PagedResult<ParasitologyAnalyseDTO>`

- [ ] T018 Frontend — bemor profil sahifasiga "Parazitologik tahlillar" bo'limi qo'sh
  (yoki `ParasitologyAnalyzer.js` ichida pastdagi tarixi paneli)
  - `GET /api/parasitology-analyses/get-by-patient-id?id={}&page={}` chaqiradi
  - Sahifalash, har bir tahlilning natijasi va sanasi ko'rinadi

**Checkpoint**: Bemorni tanlash → uning barcha parazitologik tarixi ro'yxati ko'rinishi SHART.

---

## Phase 6 (P3): SuperAdmin Statistikasi

**User Story**: SuperAdmin barcha klinikalar bo'yicha gijja tarqalishi statistikasini ko'radi.

- [ ] T019 Backend `statistics` endpoint — `ParasitologyAnalyseController.cs` da
  `GET /api/parasitology-analyses/statistics`
  - `[Authorize(Roles = "SuperAdmin")]` — boshqa rollar uchun 403
  - Query params: `viloyat?`, `tuman?`, `yiloyAy?`, `helminthType?`, `dateFrom?`, `dateTo?`
  - `ParasitologyResults` jadvalidan aggregatsiya:
    `jami_tahlillar`, `gijja_topilgan`, `topilmagan`,
    `eng_kop_turlar[]`, `viloyatlar_boyicha[]`, `yosh_guruhlari[]`, `oylik_dinamika[]`
  - Response strukturasi constitution VIII.4 da belgilangan

**Checkpoint**: `Authorization: Bearer <superadmin_token>` bilan
`GET /api/parasitology-analyses/statistics` to'g'ri JSON qaytarishi SHART.

---

## Phase 7: Router, Navigation, i18n

**Maqsad**: Modulni ilovaga ulash. Phase 3–5 paralelda bajarilishi mumkin.

- [ ] T020 [P] `routes.js` ga `/parasitology-analyzer` yo'li qo'sh
  - `frontend/src/pages/cabinet/routes.js` yoki `App.js` — mavjud routing strukturasiga qarab

- [ ] T021 [P] `Main.js` ga `<Route path="/parasitology-analyzer" element={<ParasitologyAnalyzer />} />` qo'sh

- [ ] T022 [P] Sidebar/navigation ga "Parazitologik tahlil" menyu elementi qo'sh
  - LabAnalyzer menyu elementi yoniga joylashtir
  - `t("parasitology_analyse")` tarjima kaliti ishlatilsin

- [ ] T023 [P] `frontend/src/locale/Uz.json` ga i18n kalitlar qo'sh:
  ```json
  "parasitology_analyse": "Parazitologik tahlil",
  "microscopy_method": "Buyatkovka usuli",
  "magnification": "Kattalashtirish",
  "egg_count_per_field": "Ko'rish maydonidagi tuxum soni",
  "direct_smear": "To'g'ridan-to'g'ri surtma",
  "kato_katz": "Kato-Katz usuli",
  "flotation": "Flotatsiya usuli",
  "helminth_detected": "Gijja tuxumlari aniqlandi",
  "helminth_not_detected": "Gijja tuxumlari aniqlanmadi",
  "confidence": "Ishonch darajasi",
  "infection_level": "Infektsiya darajasi",
  "light": "Yengil",
  "moderate": "O'rtacha",
  "heavy": "Og'ir",
  "treatment_recommendation": "Davolash tavsiyasi",
  "doctor_recommendation": "Shifokorga tavsiya",
  "image_quality_poor": "Rasm sifati past — qayta yuklang",
  "parasitology_saved": "Parazitologik tahlil saqlandi"
  ```

- [ ] T024 [P] `frontend/src/locale/Ru.json` ga ekvivalent kalitlar (rus tilida) qo'sh

- [ ] T025 [P] `frontend/src/locale/En.json` ga ekvivalent kalitlar (ingliz tilida) qo'sh

**Checkpoint**: `/parasitology-analyzer` sahifasi brauzerda ochilishi, uch tilda
interfeys ishlashi SHART.

---

## Phase 8: C1 Proxy Compliance

**Maqsad**: Kiber xavfsizlik sertifikatsiya talabi — frontend Python ga to'g'ridan-to'g'ri
murojaat qilmasligi, hammasi .NET orqali o'tishi.

- [ ] T026 `PythonApiProxyService.cs` ni tekshir — mavjud proxy service
  parasitology endpointni ham qo'llab-quvvatlashini tekshir
  - `save-and-analyze` uchun multipart forward to'g'ri ishlayotganligini tekshir
  - Agar yangi proxy metod kerak bo'lsa, `ProxyMultipartAsync` yoki o'xshash metod qo'sh

- [ ] T027 `parasitologyService.js` ichida faqat `.NET API` endpointlari ishlatilganligini tekshir
  (`axiosInstance` → `.NET`, to'g'ridan-to'g'ri Python URL yo'q)

**Checkpoint**: Network tab da frontend so'rovi `localhost:5000` ga ketishi, `localhost:8000`
ga emas.

---

## Phase 9: Upload Papkasi Yaratish

- [ ] T028 `.NET` `Program.cs` yoki `ParasitologyAnalyseService.cs` da `uploads/parasitology/`
  papkasi mavjud bo'lmasa avtomatik yaratilishini ta'minla
  (`Directory.CreateDirectory(path)`) — LabAnalyse qanday qilsa o'sha

---

## Dependencies & Execution Order

### Majburiy ketma-ketlik

```
Phase 1 (T001–T005) → barcha backend ish (T008–T011, T015, T017, T019)
T006–T007 (Python) → T010 (proxy test mumkin)
T008 (DTO) → T009 (Service) → T010 (Controller) → T011 (DI)
T012 (Service) → T013 (Result) + T014 (Analyzer) → T020–T022 (Router/Nav)
T023–T025 (i18n) → T014 (Analyzer i18n ishlatadi)
```

### Parallel bajarilishi mumkin bo'lganlar

- T001, T002, T003 — bir vaqtda (turli fayllar)
- T006 (Python) — Phase 1 bilan parallel (turli texnologiya)
- T020, T021, T022, T023, T024, T025 — barchasi parallel
- T013, T012 — parallel
- T019 (statistika) — T009/T010 tugagandan so'ng boshqalardan mustaqil

---

## Qo'shimcha Vazifalar (Agar Kerak)

- [ ] TX01 `python_back/models.py` ga `parasitology_analyses` SQLAlchemy model qo'sh
  (Python tomoni faqat read/write qilishi kerak bo'lsa — masalan retry endpoint uchun)

- [ ] TX02 Swagger annotation — `ParasitologyAnalyseController.cs` endpointlariga
  `[ProducesResponseType]` qo'shish (ixtiyoriy, lekin development da foydali)

- [ ] TX03 Rate limiting — AI tahlil endpointiga `ai-analysis` policy qo'llanilganini tekshir
  (`Program.cs` da `RequireRateLimiting("ai-analysis")` attribute)
