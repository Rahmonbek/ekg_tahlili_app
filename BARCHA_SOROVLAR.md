# NMED Loyihasi — Claude ga Yozilgan Barcha So'rovlar

> Loyiha: `D:\git\ekg_tahlili_app` | Email: softwaredeveloperrahmon@gmail.com  
> Sana: 2026-05-06 holatida

---

## 🧬 MODUL 1 — Parazitologiya Moduli (yangi modul qo'shish)

### Phase 1: Database — EF Core Migration
- `ParasitologyAnalyses.cs` model yaratish (maydonlar: `Id`, `PatcientId`, `ClinicId`, `CreatedDoctorId`, `FilePath`, `MicroscopyMethod`, `Magnification`, `EggCountPerField`, `AiResponse`, `AnalysisStatus`, `JiddiylikDarajasi`, `Lang`, `CreatedAt`, `UpdatedAt`)
- `ParasitologyAnalysisDoctors.cs` model yaratish (pattern: `ECGAnalyseDoctors.cs`)
- `ParasitologyResults.cs` model yaratish (`HelminthType`, `HelminthNameUz/Ru/En`, `Confidence`, `InfectionLevel`, ...)
- `MedDataDB.cs` ga yangi `DbSet` larni qo'shish
- EF Core migration yaratish va apply qilish (`AddParasitologyTables`)

### Phase 2: Python FastAPI — AI Endpoint
- `python_back/parasitology_api.py` fayl yaratish — GPT-4o vision orqali mikroskop tasvirini tahlil qiluvchi endpoint
- `python_back/main.py` ga routerni ulash

### Phase 3: Backend — DTO, Service, Controller
- `ParasitologyAnalyseDTOs.cs` yaratish
- `ParasitologyAnalyseService.cs` yaratish (`SaveAndAnalyzeAsync`, `GetByPatientIdAsync`, `SendToAiAsync`)
- `ParasitologyAnalyseController.cs` yaratish (`save-and-analyze`, `get-by-patient-id`, `send-to-ai/{id}`)
- `Program.cs` ga DI qo'shish

### Phase 3: Frontend — Forma va Natija
- `parasitologyService.js` yaratish (`analyzeParasitologyFile` funksiyasi)
- `ParasitologyResult.js` yaratish (gijja topilmasa yashil banner, topilsa Ant Design Card + Progress + Tag)
- `ParasitologyAnalyzer.js` yaratish (bemor tanlash, shifokorlar, buyatkovka usuli, kattalashtirish, fayl upload)

### Phase 4–5: Qayta AI yuborish + Bemor tarixi
- Backend `send-to-ai/{id}` endpoint — `analysis_status != "not_analyzed"` bo'lsa `BadRequest`
- Frontend — "Qayta yuborish" tugmasi
- Backend `get-by-patient-id` — pageSize=5, ORDER BY created_at DESC
- Frontend — bemor profil sahifasida parazitologik tahlillar ro'yxati

### Phase 6: SuperAdmin Statistikasi
- `GET /api/parasitology-analyses/statistics` endpoint (faqat `SuperAdmin`)
- Query params: `viloyat`, `tuman`, `yiloyAy`, `helminthType`, `dateFrom`, `dateTo`
- Aggregatsiya: `jami_tahlillar`, `gijja_topilgan`, `topilmagan`, `eng_kop_turlar`, `viloyatlar_boyicha`, `yosh_guruhlari`, `oylik_dinamika`

### Phase 7: Router, Navigation, i18n
- `routes.js` ga `/parasitology-analyzer` yo'li qo'shish
- `Main.js` ga route qo'shish
- Sidebar ga "Parazitologik tahlil" menyu elementi qo'shish
- `Uz.json`, `Ru.json`, `En.json` ga i18n kalitlar qo'shish

### Phase 8–9: C1 Proxy va Upload Papkasi
- `PythonApiProxyService.cs` ni parazitologiya uchun tekshirish
- `uploads/parasitology/` papkasini avtomatik yaratish

---

## 📄 MODUL 2 — PDF Hisobot Tizimi

### PDF Hujjat Raqamlari (document_number)
- Barcha 5 jadvalga (`ecg_analyses`, `smad_analyses`, `holter_analyses`, `lab_analyses`, `parasitology_analyses`) `document_number TEXT UNIQUE NOT NULL` ustuni qo'shish
- Format: `NMED-{PREFIX}-{ID:D8}` (masalan: `NMED-EKG-00000042`)
- EF Core Migration + Model + Service (create paytida generate) + PdfReportService (bazadan olish)

### PDF da Region va District
- Header'ga faqat klinika nomi emas, region va district ham chiqarish
- `ClinicDetail → District → Region` include chain yangilash
- `ComposeHeader()` da region + district ko'rsatish

### PDF Parazitologiya JSON Fallback
- `SUN'IY INTELLEKT TAHLILI XULOSASI` blokida raw JSON ko'rinmasligi
- JSON parse xatosi bo'lsa structured ko'rinishda chiqarish

### PDF Font va Dizayn Polish
- Font weightlarni yengillashtirish (qalin matnlarni ingichka stilga o'tkazish)
- Header (logotiplar) dizaynini yaxshilash
- Klinika telefon raqamlarini aniq chiqarish

---

## 🏥 MODUL 3 — Klinika va Admin Onboarding

### Klinika `is_active` statusi
- `clinics.is_active BOOLEAN DEFAULT FALSE` — migration
- Admin bo'lmagan xodimlar login'da `clinic.is_active=false` bo'lsa bloklash
- `GET /user/get-user-by-token` → `clinic.isActive` qaytarish
- `GET /user/profile-status` — admin profil to'ldirishni tekshirish endpoint

### Frontend Onboarding Oqimi
- `SetupWizard.js` — admin uchun 2 bosqichli onboarding (profil → klinika)
- `Main.js` → wizard check; sahifalar ko'rinadi lekin `is_active=false` overlay
- Non-admin login'da klinika faolmas bo'lsa xabar bilan chiqarish

### SideBar Qulf Belgisi
- `routes.js` ga `requires_active: true/false` maydoni qo'shish
- `SideBar.js` — `clinicIsActive` hisoblanadi; `requires_active=true` route'larda lock icon (`FaLock`) va tooltip
- `App.css` — `.locked_sidebar_item { opacity: 0.55 }` va icon/title greyout

### SuperAdmin Klinika Aktivlashtirish
- `PATCH /api/clinic/{id}/set-active?isActive=true` endpoint (faqat `roleId=1`)
- `ClinicService.SetClinicActiveAsync(int clinicId, bool isActive)` metodi
- Frontend: `set_clinic_active(clinicId, isActive)` request funksiyasi

---

## 🤖 MODUL 4 — Parazitologiya AI Arxitektura O'zgarishlari

### AI `{"raw":""}` muammosi + Prompt kuchaytirish
- `resp.choices[0].message.content` ba'zan `None` qaytarishini fix qilish
- `temperature=0, seed=42` qo'shish (deterministik natija)
- Bo'sh/None content ni oldin tekshirib, early error return
- Prompt kuchaytirish: konkret morfologik belgilar, o'lchov diapazoni, taqqoslash algoritmi

### Phase 15: OpenAI → Anthropic Claude Migration (1-bosqich)
- `parasitology_api.py`: `from openai import OpenAI` → `import anthropic`
- `config.py`: `ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")` qo'shish
- API chaqiruv: `client.messages.create(model="claude-sonnet-4-20250514", ...)`
- JSON parse: `re.search(r'\{[\s\S]*\}', raw)` regex fallback
- `requirements.txt`: `anthropic>=0.40.0` qo'shish

### Phase 16: OpenAI ga qaytarish + 2 bosqichli arxitektura
- `parasitology_api.py` Anthropic → OpenAI ga qaytarish
- `_describe_image()`: 1-bosqich — GPT-4o vision rasm tavsifi
- `_analyze_description()`: 2-bosqich — GPT-4o text morfologik tashxis
- `VISION_SYSTEM_PROMPT`, `ANALYSIS_SYSTEM_PROMPT`, `JSON_SCHEMA` konstantalarini ajratish

### Phase 17: 2-bosqichli OpenAI → Anthropic Claude
- `_describe_image()`: OpenAI → `anthropic.Anthropic`; `claude-sonnet-4-20250514`; Anthropic image source format
- `_analyze_description()`: OpenAI → `anthropic.Anthropic`; `claude-sonnet-4-20250514`
- JSON parse: regex fallback saqlanadi

### Phase 18: Variant C — GPT-4o Vision + Claude Text (Gibrid)
- 1-bosqich: GPT-4o Vision (rasm tavsifi) — `_describe_image(img_b64, mime)`
- 2-bosqich: Claude Text (morfologik tashxis) — `_analyze_description(claude_client, ...)`
- Ikkala API key tekshiruvi: `OPENAI_API_KEY` + `ANTHROPIC_API_KEY`

### Phase 19: To'g'ridan-to'g'ri GPT-4o (Single-stage)
- 2-bosqichli pipeline olib tashlab, bitta GPT-4o call bilan JSON analiz
- `_analyze_image_direct(client, img_b64, mime, ...)` yaratish
- `anthropic` import va `ANTHROPIC_API_KEY` to'liq o'chirish
- System prompt yangilash: majburiy `lotin_nomi`, "aniq emas" man etilgan, `ishonch_darajasi` min 0.40, Echinococcus/Toxocara taqiqi
- `response_format=json_object`, `temperature=0.1`, `max_tokens=2000`
- `rasm_sifati` tekshiruvi: `== "past"` → `in ["past", "yomon"]`

---

## 🎨 MODUL 5 — UI/UX va Responsive Polish

### Phase 11–12: Analizlar Pariteti va EKG UI/PDF
- T042–T051: Analizlar (EKG/Lab/Holter/SMAD) uchun UI paritetini ta'minlash
- T052–T056: EKG UI/PDF paritetini va view polish qilish

### Phase 13: View + PDF Qo'shimcha Polish
- `.NET` backend build xatolarini bartaraf etish
- `/view` sahifalardagi `.analysis-view-actions` dizaynini tizimga moslashtirish
- PDF font weightlarni yengillashtirish
- PDF header dizayni va klinika tel raqamlarini yaxshilash
- Parazitologiya PDF JSON fallback structured ko'rinishda chiqarish

### Phase 14: View Actions + Responsive + Sidebar Memory
- `analysis-view-actions` ichidagi tugma/elementlar joylashuvi (desktop/tablet/mobile)
- EKG PDF: AI ga yuborilgan fayl image bo'lsa rasm preview mustahkamlash
- Global responsive media qoidalarini to'liq yozish (breakpoints)
- Desktop typography audit
- **Sidebar ochiq/yopiq holatini `localStorage` da saqlash** va tiklash
- Assistant uchun project quick-memory fayli yaratish

---

## 🔒 MODUL 6 — Xavfsizlik va Sertifikatsiya

### C1 — Proxy Arxitektura
- Frontend → Python API bevosita murojaatni bloklash (barcha so'rovlar .NET orqali)
- `PythonApiProxyService.cs` tekshirish va yangilash

### C2 — Audit Log
- `AuditMiddleware.cs` mavjudligi va ishlashi

### C3 — Rate Limiting
- 3 pog'onali: `strict` / `ai-analysis` / `general`
- AI tahlil endpointlariga `ai-analysis` policy qo'llash

### C4 — AES-256 Shifrlash
- Passport shifrlash (tayyor)
- Birthdate shifrlash (C4-GAP-1 — ochiq muammo)
- Fayl yo'llari shifrlash (C4-GAP-2 — ochiq muammo)
- Passport qidiruvida in-memory deshifrlash (DB `LIKE` ishlamaydi — tasodifiy IV sababli)

### C5 — JWT va API Kalitlari
- Startup validation (`JWT_SECRET` yo'q bo'lsa `RuntimeError`)

### C6 — HTTPS
- Production'da HTTPS majburlash

---

## 📝 Eslatma

> Bu fayl agent xotirasi (`tasks_active.md`, `project_architecture.md`) va loyiha spec fayllariga
> (`tasks-parasitology.md`, `tasks-uiux.md`) asosida tuzilgan.  
> Barcha so'rovlar **bajarilgan** deb belgilangan (2026-04-25 holatiga ko'ra).
