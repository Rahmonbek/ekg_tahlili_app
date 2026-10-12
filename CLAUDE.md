# NMED EKG Tahlili App — Claude Code Yo'riqnomasi

## Loyiha Haqida

NMED — tibbiy tahlil platformasi. Uch qatlam:
- **Backend**: `backend/EkgAnalyzerApi/` — .NET 8, EF Core 7, PostgreSQL, port 5000/5001
- **AI**: `python_back/` — FastAPI + Uvicorn, OpenAI GPT-4o, port 8000
- **Frontend**: `frontend/src/` — React 18, Ant Design v5, Zustand, port 3000

**DB**: PostgreSQL `med_helper_data` — bitta baza, ikkala backend ulangan.

Tahlil modullari: **EKG, Laboratoriya, Holter, SMAD, Parazitologiya**

**Kompleks AI xulosasi** (`combined_analyses`) — bemorning 2..10 ta
tahlilini (ecg/holter/smad/lab) BIRGALIKDA tahlil qilib, yagona yakuniy
xulosa beradi.

* **Oqim**: bemor kartasida checkbox **yoki** `/combined-analyzer`
  sahifasi (bemorni passport bo'yicha qidirish → tahlillarni tanlash) →
  `.NET CombinedAnalysisController` (tekshirish + barmoq izi keshi) →
  Python `combined_analyses_api.py` → `ai_config.COMBINED_MODEL`
  (standart `gpt-5.6-sol`).
* **Rejim tanlovi yo'q** — doim `deep`: AI ga tayyor xulosalar bilan
  birga 3 tagacha EKG rasmi ham yuboriladi. `mode` ustunidagi `summary`
  faqat eski yozuvlarda uchraydi.
* **Takror yo'q**: yaratishdan oldin AYNAN SHU TAHLILLAR TO'PLAMI
  (`combined_analysis_items` bo'yicha) uchun xulosa bor-yo'qligi
  tekshiriladi. Kim, qachon va qaysi tilda yuborgani AHAMIYATSIZ —
  mavjudi qaytariladi (`reused: true`) va interfeys ogohlantiradi.
  `source_fingerprint` faqat metama'lumot (manba qayta tahlil
  qilinganini aniqlash uchun), qidiruvda ishlatilmaydi.
* **Javob qamrovi**: promptda "faqat patologiya, normal ko'rsatkichlarni
  sanama" qoidasi bor. `automatic_analysis` ATAYLAB batafsil (har bir
  topilma: nomi + aniq raqamlar + manbasi + klinik ma'nosi, 2-4 gap),
  qolgan maydonlar esa gap soni bilan cheklangan.
  `timeline_summary` (dinamika) maydoni YO'Q — u takrorlanardi.
* **Shifokor xulosalari AI ga yuboriladi**: alohida tahlillarga yozilgan
  `analysis_diagnoses` yozuvlari dossier'ga `doctor_note` sifatida
  qo'shiladi (mavjud bo'lsa). Kompleks xulosaning O'ZIGA yozilgani
  YUBORILMAYDI — u natijadan keyin yoziladi, aylanma bog'liqlik bo'lardi.
  Promptda u "klinik kontekst, tasdiqlangan tashxis emas" deb
  belgilangan — **anchoring** (AI shifokorga qo'shilib ketishi) xavfini
  kamaytirish uchun. Zidlik bo'lsa AI uni `automatic_analysis` da aytadi.
* **Ehtimoliy tashxislar** ikki manbadan izlanadi: (a) bitta tahlildagi
  patologiyadan, (b) TAHLILLAR JAMLANMASIDAN — alohida ma'nosiz
  ko'ringan topilmalar birgalikda bitta sindromga ishora qilishi mumkin.
* **Sahifalar**: `/combined-analyses` (ro'yxat, rol bo'yicha
  cheklangan), `/combined-analyzer` (yangi), `/combined-analyses/view/:id`.
  Bemor kartasida ro'yxat qatorini ochib xulosani O'SHA yerda o'qish
  mumkin (`components/results/CombinedResult.js` ikkala joyda ham,
  ichkarida `embedded` bayrog'i bilan).
* **Dizayn**: `pages/cabinet/combined_analyse/CombinedAnalyse.css`
  (`cai-*` klasslari). Har bir bo'limning o'z vizual roli bor: yakuniy
  xulosa — jiddiylik rangi bilan ajratilgan "hero" blok, topilmalar —
  raqamlangan qatorlar, ehtimoliy tashxislar — kartochkalar (jadval
  emas: "Asos" ustuni tor jadvalda o'qib bo'lmasdi). Sarlavha va meta
  kartochkalar boshqa tahlil ko'rish sahifalari bilan bir xil
  (`analysis-view-*`, `App.css`).
* **AVTOMATIK kompleks tahlil** (`Services/AutoCombinedAnalysisWorker.cs`,
  `combined_analyses.is_auto`): yangi tahlil (EKG/Holter/SMAD/Lab) AI
  natijasi tayyor bo'lgach, tizim bemorning BARCHA yaroqli tahlillaridan
  (eng yangi 10 tasi) kompleks yaratib AI ga yuboradi. Nomzod — `status = 2`,
  jiddiylik 1..3 (AI "tahlil qila olmadi" degani olinmaydi), HECH BIR
  kompleksga kirmagan va oxirgi `LookbackHours` ichida tugagan tahlil.
  `SettleMinutes` kutiladi va bemorning boshqa tahlili ishlanayotgan
  bo'lsa kutiladi — bir vaqtda yuklangan tahlillar BITTA xulosa beradi.
  Python ga ichki token (`TokenService.GenerateServiceToken`, audience
  `…-internal` — .NET uni qabul QILMAYDI) bilan murojaat qiladi; tayyor
  bo'lganda yuklagan xodimga SignalR xabari. Sozlamalar `AutoCombined:*`:
  `Enabled` (true), `IntervalSeconds` (60), `SettleMinutes` (3),
  `LookbackHours` (24 — birinchi ishga tushishda butun tarix uchun AI
  chaqirilmasin), `MaxPerCycle` (5). Muzlagan (0/1) kompleks yozuvni
  `StuckAnalysisWatchdog` xatolikka o'tkazadi — aks holda takror
  tekshiruvi shu to'plamni abadiy bloklardi.
* **PDF**: `GET /api/report/combined-ai/{id}` →
  `PdfReportService.GenerateCombinedAiReport`. Mavjud
  `GenerateCombinedReport(patientId)` bilan ADASHTIRMANG — u bemorning
  barcha tahlillarini yig'adi.
* **Shifokor xulosasi**: alohida jadval emas — mavjud
  `analysis_diagnoses` jadvali `analysis_type = "combined"` bilan
  ishlatiladi. Yozish huquqi: xulosani YARATGAN shifokorda
  (`AnalysisDiagnosisController.IsDoctorAssigned`).

**Laboratoriya — bir nechta fayl** (`lab_analysis_files`, migratsiya
`20260907000000_AddLabAnalysisFiles`): klinikalar bitta topshiriq
natijasini ko'pincha bir necha varaqda beradi, shuning uchun bitta lab
tahliliga 1..10 ta fayl (jami ≤ 50 MB) biriktiriladi va ular BITTA
so'rovda AI ga yuboriladi.

* `lab_analyses.analyse_file_link` / `original_filename` / `file_hash` —
  BIRINCHI fayl (eski kod uchun saqlanadi); to'liq ro'yxat —
  `lab_analysis_files` (`position` tartibida), DTO da `Files`.
* Chegaralar ikki joyda mos bo'lishi SHART: Python
  `lab_analyses_api.MAX_LAB_FILES` va frontend `LabAnalyzer.MAX_LAB_FILES`;
  .NET `LabAnalyseController.LabUploadLimitBytes` (60 MB) jami hajmdan katta.
* Takror tekshiruvi (`duplicate_guard`) HAR BIR faylni tekshiradi;
  `retry` barcha fayllarni qayta yuboradi; `replace-file` yuborilgan
  fayllar bilan BUTUN ro'yxatni almashtiradi.
* "Qaysi tahlillar topshirilgani" (kategoriyalar) yuklash sahifasidan
  olib tashlangan; `lab_category_id` backendda ixtiyoriy bo'lib qoladi.

**Holter/SMAD — patologik epizodlar** (`pathology_episodes`): AI javobida
alohida maydon — `[{time, finding}]`, har bir vaqtli epizod alohida
element (ilgari `automatic_analysis` ichida vergul bilan tizilardi).
`ai_schema.EPISODES_PROPERTY` (faqat holter/smad sxemasida),
`normalize_episodes`, promptlarda "TIZMANG" qoidasi, `ai_translate`
faqat `finding` ni tarjima qiladi, .NET `AIAnswerDataDTO.PathologyEpisodes`
→ PDF da alohida qatorlar. Eski yozuvlarda maydon yo'q — frontend
`components/results/resultText.extractEpisodeGroups` matndan faqat
ishonchli holatda (gapda ≥2 vaqt va har bo'lakda vaqt) ajratadi.

**Natija ko'rinishi** (`components/results/`): `AnalysisResultBody`
(bo'limlar tartibi: yakuniy xulosa → topilmalar → epizodlar →
ko'rsatkichlar → tavsiyalar → fayllar; uslub `AnalysisResult.css`,
`arb-*`) va `ResultCard` (yig'iluvchi kartochka, `rcard-*`).
`Ecg/Holter/Smad/LabOldResult` — `ResultCard` ustidagi yupqa o'ramalar;
"AI orqali tekshirish" har tur uchun O'Z `/retry` endpoint'iga boradi
(ilgari Holter/SMAD/Lab ham EKG `analyze-retry` ni chaqirardi).

**Laboratoriya birliklari** (`python_back/lab_units.py`): AI qiymat va
birlikni FAYLDAGIDEK qaytaradi (promptda aylantirish taqiqlangan), kod
ularni `lab_value_types.measure` birligiga DETERMINISTIK keltiradi
(prefiks + molyar massa; `original` da asl yozuv saqlanadi). Natija
fiziologik mumkinlik (`PLAUSIBLE`) bilan tekshiriladi — faqat birlik nomi
xato yozilgan holat ("4.7 µmol/L mochevina") shunday ajratiladi.
Aylantirib bo'lmasa `unit_mismatch: true` — baholanmaydi va raqamli
ustunga yozilmaydi. Ruscha "мЕ/л" va "МЕ/л" (1000× farq) — katta-kichik
harf bilan, `lower()` dan OLDIN taniladi. Frontend
`AnalysisResultBody.normUnit` — tuzatilmagan yozuvlar uchun himoya.
Eski yozuvlar: `python repair_lab_units.py [--apply]`.

---

## Arxitektura Hujjatlari

- **Constitution** (arxitektura qoidalari, xavfsizlik): [.specify/memory/constitution.md](.specify/memory/constitution.md)
- **Spec** (user stories, API shartnomasi): [.specify/memory/spec.md](.specify/memory/spec.md)
- **Tasks — Parazitologiya**: [.specify/memory/tasks-parasitology.md](.specify/memory/tasks-parasitology.md)
- **Tasks — UI/UX**: [.specify/memory/tasks-uiux.md](.specify/memory/tasks-uiux.md)
- **Tasks — Video Konferensiya**: [.specify/memory/tasks-videocall.md](.specify/memory/tasks-videocall.md)

---

## Qat'iy Taqiqlangan (Hech Qachon Qilma)

1. **Frontend → Python API bevosita murojaat** — barcha so'rovlar `.NET API` proxy orqali o'tishi SHART
2. **Python `print()` production kodda** — faqat `logging.getLogger(__name__)` ishlatilsin
3. **Bo'sh catch bloklar (.NET)** — kamida `ILogger` orqali log qilinsin
4. **Baza sxemasini Python tomonidan o'zgartirish** — faqat EF Core Migrations
5. **Hardcoded API kalitlari** — faqat environment variable'lardan o'qilsin
6. **Silent fallback (JWT)** — `JWT_SECRET` yo'q bo'lsa `RuntimeError`, anonymous user qaytarish emas

---

## Muhim Konventsiyalar

### Naming
- C#: `PascalCase` (class, method), `camelCase` (local vars)
- Python: `snake_case` (func, var), `PascalCase` (class)
- React: `PascalCase` (components), `camelCase` (functions, state)
- DB ustunlari: `snake_case`

### Tahlil Status Kodlari (int, EKG/Lab/Holter/SMAD/Kompleks)
- `0` = yaratildi (kutmoqda)
- `1` = fayl qayta ishlandi (AI kutmoqda)
- `2` = AI natija tayyor
- `-1` = AI xatolik

> **Istisno — Parazitologiya**: string status — `"pending"` / `"analyzed"` / `"not_analyzed"` / `"failed"`

### AI Javob Formati (`AIAnswerData` ustunida JSON text)
```json
{
  "digital_measurements": {},
  "automatic_analysis": "...",
  "automatic_analysis_bool": 1,
  "AI_recommendations": "...",
  "final_summary": "..."
}
```
`automatic_analysis_bool` ba'zan int (1), ba'zan string ("1") — ikkalasi handle qilinishi SHART.

### `automatic_analysis_bool` Filter (DB darajasida emas, `Contains` orqali)
```csharp
e.AIAnswerData.Contains($"\"automatic_analysis_bool\": {val}") ||
e.AIAnswerData.Contains($"\"automatic_analysis_bool\":{val}") ||
e.AIAnswerData.Contains($"\"automatic_analysis_bool\": \"{val}\"") ||
e.AIAnswerData.Contains($"\"automatic_analysis_bool\":\"{val}\"")
```

### Token Muddati va Sessiya

Token **3 soat** amal qiladi. Qiymat IKKI joyda va ular mos bo'lishi SHART:

| Joy | Sozlama |
|-----|---------|
| Backend | `appsettings*.json` → `Jwt:ExpiresHours` (standart `TokenService.DefaultExpiresHours = 3`) |
| Frontend cookie | `Host.js` → `TOKEN_TTL_HOURS = 3` (`setTokenAccess`) |

### Fon rejimidagi tahlil ko'rsatkichi

`AnalysisProgressTracker` SignalR orqali `viewPath` yuboradi — AYNAN
shu tahlilni ochadigan manzil (`/ecg-analyses/view/12`). Ilgari faqat
`listPath` (ro'yxat sahifasi) bor edi va "Ko'rish" tugmasi tahlilni
ochmasdan ro'yxatga olib borardi. `combined` turi ham qo'llab-quvvatlanadi.

Tugagan element ro'yxatdan AVTOMATIK o'chirilmaydi (ilgari 12 soniyadan
keyin yo'qolardi va tugmani bosishga ulgurib bo'lmasdi) — foydalanuvchi
"Ko'rish" yoki "✕" bosgunicha turadi.

Istalgan API **401** qaytarsa `Api.js` interceptori tokenni o'chirib,
`/login?session=expired` ga yo'naltiradi va login sahifasi sababini
ko'rsatadi. Ochiq sahifalarda (login/register/reset) 401 yo'naltirilmaydi
— u yerda 401 "parol noto'g'ri" degani.

### Passport Qidiruvi
AES-256-CBC tasodifiy IV ishlatadi → DB `LIKE` ishlamaydi.
Qidiruv in-memory: barcha passportlar `EncryptionService.Decrypt()` → keyin taqqoslash.

---

## Xavfsizlik Sertifikatsiyasi (O'z DSt 2814:2014 3-daraja)

| Talab | Holat |
|-------|-------|
| C1 — Proxy arxitektura | ✅ |
| C2 — Audit log (`AuditMiddleware.cs`) | ✅ |
| C3 — Rate limiting (strict/ai-analysis/general) | ✅ |
| C4 — AES-256 (passport ❌, birthdate ⚠️, fayl yo'llari ⚠️) | QISMAN |
| C5 — JWT startup validation | ✅ |
| C6 — HTTPS (production) | ✅ |

**Ochiq**: C4-GAP-1 (birthdate), C4-GAP-2 (fayl yo'llari),
**C4-GAP-3 (passport ochiq matnda)** — `EncryptionService.Encrypt`
faqat `OnlineConsultationService` da chaqiriladi; bemorni odatiy
yo'l bilan yaratganda passport shifrlanmaydi (2026-08-30 da bazada
tekshirildi).

**C4-GAP-4 — `/api/files` autentifikatsiyasiz (2026-09-03, loyiha
egasining qarori)**: `FileProxyController` dagi `[Authorize]` va
klinika tekshiruvi olib tashlandi, `Host.js:buildFileUrl` ham havolaga
token qo'shmaydi. Endi tibbiy fayllarni URL ni bilgan har kim ochadi.
Yagona himoya — yo'lning taxmin qilib bo'lmasligi
(`/uploads/{tur}/{yil}/{oy}/{uuid}.{kengaytma}`, T-099 dan keyingi
fayllar). **T-099 gacha yuklangan eski yozuvlar** oddiy nomda
(`ecg_analyse_files/ecg_96.png`) va taxmin qilinadi — ular butunlay
ochiq. Path traversal himoyasi `IFileStorage.ResolveUpload` da qoladi.

---

## Fayl Tuzilishi

```
backend/EkgAnalyzerApi/
  Controllers/     # API endpointlar
  Services/        # Biznes logika
  Models/          # EF Core entity modellari
  DTOs/            # Request/Response DTO'lar
  Data/            # DbContext (MedDataDB)
  Migrations/      # EF Core (baza sxemasi manba haqqoniyati)

python_back/
  main.py              # FastAPI app + router ulash
  *_analyses_api.py    # Router submodulelar (har modul uchun alohida)
  models.py            # SQLAlchemy (faqat mavjud jadvallarni reflect)
  database.py          # DB connection

frontend/src/
  host/                # API konfiguratsiya, axiosInstance
  host/requests/       # Entity-based API request funksiyalari
  store/               # Zustand global store (Store.js)
  pages/cabinet/       # Sahifalar
  components/          # Qayta ishlatiladigan komponentlar
  locale/              # i18n (Uz.json, Ru.json, En.json)
```

---

## Rol Tizimi

| Rol | ID | Tahlil va bemor RO'YXATLARIDA ko'radi |
|-----|----|--------|
| SuperAdmin | 1 | Tizim darajasi, statistika |
| Admin | 2 | Klinikasining barcha tahlillari va ularning bemorlari |
| Direktor | 3 | Admin bilan bir xil |
| Shifokor | 4 | O'zi yuklagan **YOKI** o'ziga biriktirilgan tahlillar + ularning bemorlari, `is_viewed` badge |
| Hamshira | 5 | Faqat o'zi yuklagan tahlillar + ularning bemorlari, badge yo'q |

**Muhim — cheklov faqat RO'YXATLARDA:** bemor kartasi
(`get-patient-card`), tahlil yuklash sahifasidagi "oldingi tahlillar"
bo'limi (`get-*-analyses-by-patcient-id`) va passport bo'yicha qidiruv
(`search-by-passport`) rol/klinika bo'yicha **filtrlanmaydi** — to'rttala
rol ham bazadagi barcha ma'lumotni ko'radi (loyiha egasining qarori).
Ro'yxatdagi cheklov qaysi bemor ko'rinishini belgilaydi, kartaning
ichini emas.

---

## Agent Memory

Qo'shimcha kontekst: [.claude/agent-memory/nmed-system-architect/MEMORY.md](.claude/agent-memory/nmed-system-architect/MEMORY.md)
