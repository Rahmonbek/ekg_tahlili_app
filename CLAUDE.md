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
  `Enabled` (**standart false** — 2026-11-01 dan, eski lab arxivi ommaviy
  yuklanguncha o'chiq; yuklash tugagach barcha bemorlar uchun ishga tushiriladi), `IntervalSeconds` (60), `SettleMinutes` (3),
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
Aylantirib bo'lmasa `unit_mismatch: true` — baholanmaydi, dinamika va
statistikaga kirmaydi. Ruscha "мЕ/л" va "МЕ/л" (1000× farq) — katta-kichik
harf bilan, `lower()` dan OLDIN taniladi. Klinika blankalaridagi
MA'LUM xato birliklar (`_MISLABELED`: insulin/erkin T4 "нг/мл",
FSG/LG "мМЕ/л", D-dimer "нг/мл", AT-TPO "МЕ/л") qiymat oralig'i bo'yicha
tuzatiladi; promptda ham shu ro'yxat bor. **Kortizol < 40 "нмоль/л" va
prolaktin < 40 "мМЕ/л" AYLANTIRILMAYDI** (`_SUSPECT`, 2026-11-02, L-01):
haqiqiy past qiymat bilan blanka xatosini ajratib bo'lmaydi — katakda
`unit_suspect: true`, bazada `unit_mismatch = true`, baholanmaydi,
ekranda "Baholanmagan (birlik tekshirilsin)" guruhida. Birlik katalognikiga
teng bo'lsa ham `PLAUSIBLE` tekshiriladi (Hb 14.5 "g/L" → shubhali).
Jins noma'lum bo'lsa me'yor birlashmasi: bir jinsda chegara yo'q bo'lsa
birlashmada ham yo'q (FSG/LG; Python, frontend, PDF, qoidalar bir xil).
Flag yaxlitlanmagan qiymatda hisoblanadi (troponin 14.4 ng/L > 14). "сек", "фл",
"в п.з.", "109/л" (Excel yuqori indeksni yo'qotadi) taniladi. Frontend
`AnalysisResultBody.normUnit` — tuzatilmagan yozuvlar uchun himoya.
Eski yozuvlar: `python repair_lab_units.py [--apply]` (JSON va
`lab_analysis_values` ni birga tuzatadi).

**Laboratoriya qiymatlari — alohida jadval** (`lab_analysis_values`,
migratsiya `20261101000000_LabAnalysisValues`): har bir aniqlangan
ko'rsatkich — bitta qator (`value`, `unit`, `text`, `original_*`,
`unit_mismatch`, `flag` -1/0/1, statistika uchun nusxa `patient_id` +
`measured_at`). Statistika, kasallik dinamikasi va bashorat shu jadvalga
tayanadi — `unit_mismatch = true` qatorlarni chiqarib tashlang.

* **Katalog — yagona manba**: `lab_value_types` (137 ta; `category`,
  `value_kind` numeric|qualitative|code, `sort_order`, `ai_hint`). Yangi
  ko'rsatkich = shu jadvalga qator: Python `lab_catalog` AI sxemasidagi
  `enum` va prompt ro'yxatini undan quradi — kodni o'zgartirish SHART EMAS.
* Katalog me'yorlari 2026-11-02 da manbalar (ABIM, Mayo, Roche/Abbott
  insertlari, ADA, ESC, WHO, Helix/Gemotest) bilan solishtirilib
  tuzatilgan (`20261102010000_LabNormsReview`: PLT ≥150, sutkalik natriy
  40–220, RF ≤14, troponin I ≤0.04, glyukoza ≤5.5, vitamin D ≥20…). Ular
  ZAXIRA — laboratoriya me'yori bo'lsa ishlatilmaydi. Assayga xos
  ko'rsatkichlarda (troponin, gormonlar) baho uchun laboratoriya me'yori
  asosiy manba.
* `lab_analyses` dagi eski 87 ta ko'rsatkich ustuni `20261103000000_LabAnalysisDateSource`
  da O'CHIRILGAN (oldin idempotent qayta ko'chirish, birorta qiymat
  ko'chmasa migratsiya xato bilan to'xtaydi). Snapshot ham tozalangan.
* **Tahlil sanasi** — tahlilning O'Z sanasi, yuklangan kun EMAS
  (`analysis_date`; `measured_at` undan): statistika, dinamika, klinik
  qoidalar, ro'yxat, PDF shunga tayanadi. Laboratoriya yuklash formasida
  sana IXTIYORIY va bo'sh (`useAnalyzerPage({ dateFromFile: true })`;
  ilgari bugungi kun avtomatik qo'yilardi). Kiritilmasa: Excel —
  «Дата:» katagi (`excel_to_text.xlsx_read`, natijasi bor listlardagi eng
  ko'p sana, AI siz); PDF/rasm — AI sxemasidagi `analysis_date`
  (`lab_dates.validate`: 2000..bugun+1, tug'ilgan kun emas). Manba
  `analysis_date_source`: `user` (forma — AI o'zgartirmaydi) | `document`
  (har qayta tahlilda yangilanadi) | NULL (noma'lum → `created_at`).
  Eski yozuvlar: `python repair_lab_dates.py [--apply]` (faqat Excel;
  PDF/rasm uchun qayta tahlil). 1000 ta klinika faylida: 88% papka
  sanasi bilan ±3 kun, qolgani asosan papka nomidagi xato.
* Yozuvchi faqat Python `lab_analyse.replace_lab_values` — har tahlil/qayta
  tahlilda tahlilning BARCHA qatorlari almashtiriladi (eski fayl qiymati
  qolmaydi; AI boshlanishida `clear_lab_values`).
* O'quvchilar: .NET `LabAnalyseService` (DTO `Values`), dinamika
  (`LabValuesController.GetPatientDynamics` — bitta so'rov), PDF
  (`AddLabTable` — nom/me'yor katalogdan, tilga mos; chaqiruvchi
  `WithLabValues` bilan yuklaydi). Natija kartochkalari esa hamon
  `ai_answer_data.digital_measurements` JSON dan chiziladi.
* **Laboratoriyaning o'z me'yori** (migratsiya `20261102000000_LabValueReferenceAndKind`):
  AI fayldagi norma ustunini `ref_low`/`ref_high`/`ref_text` ga oladi
  (bemor jinsiga mos qator; Excel'da natijasiz "(Ж)" qatori ham "faqat
  me'yor" bo'lib beriladi). Baho (`flag`) AVVAL shu me'yor bilan, bo'lmasa
  katalog me'yori bilan (`flag_source` = lab | catalog) — me'yor assayga
  xos (masalan erkin T3: klinika 1.2–4.2, katalog 3.1–6.8). Qiymat
  aylantirilsa me'yor ham aylantiriladi; me'yor boshqa "shkalada" bo'lsa
  (kortizol 6.47 | 138–690 nmol/L) — yozilgan birligi bo'yicha
  (`lab_units._harmonize_refs`). Kartochkada "(laboratoriya)" belgisi.
* **Sifat natijalari** (HBsAg, Anti-HCV, RW, OIV, H. pylori): holat
  `result_kind` = NEGATIVE | POSITIVE | EQUIVOCAL | INVALID | UNKNOWN
  ("shubhali" musbat bilan BIRLASHTIRILMAYDI — klinik qoidalar
  spetsifikatsiyasi INF-02); `value` faqat laboratoriya indeksi (COI)
  bo'lsa. Asl yozuv `text` da ("Отрицательный(-)") — ekran va PDF da shu.
  Qon guruhi 1..4, rezus 1/0 (`value_kind = code`, baholanmaydi).

**Laboratoriya — Excel (.xlsx)** (`python_back/excel_to_text.py`): model
xlsx ni o'qiy olmaydi, shuning uchun jadval lokal matnga o'giriladi va AI ga
`input_text` bo'lib boradi (klassifikator ham). Klinika shabloni uchun:
faqat "Результат" ustunida qiymati bor qatorlar; standart yozuvlardan
("abs", "-", "Желтый", "Отрицательный(-)", "Начало:", norma bilan bir xil
natija) iborat list tashlab yuboriladi; F.I.O. va imzo yuborilmaydi.
Faqat "manfiy"lardan iborat serologiya listi boshqa natijalar bilan birga
YUBORILMAYDI (ba'zi shablon versiyalarida oldindan yozilgan — bo'sh
shablondan farq qilmaydi), fayl faqat shundan iborat bo'lsa yuboriladi.
Bo'sh shablon `file_validator._validate_xlsx` da rad etiladi (`xlsx_empty`).
`.xls` (eski format) qabul qilinmaydi. .NET proksi kirillcha nomli faylning
kengaytmasini saqlaydi (`PythonApiProxyService.NormalizeFileName`).

**Laboratoriya statistikasi va xavf signallari** (`/lab-statistics`,
faqat Admin/Direktor — rol 2/3, menyu «Statistika»; API `api/lab-statistics`,
klinika `users.clinic_id` dan, boshqa klinika ko'rinmaydi).

* **Statistika** (`Services/LabStatistics/LabStatisticsService.cs`, xom SQL
  `SqlRows` — EF7 da tipsiz SqlQuery yo'q): filtrlar — davr (tahlil
  sanasi), shifokor, jins, yosh, guruh, ko'rsatkich, faqat me'yordan
  tashqari. Bo'limlar: umumiy (KPI, vaqt grafigi kun/hafta/oy, AI
  jiddiyligi, jins/yosh, fayl turlari, guruhlar, xodimlar), ko'rsatkichlar
  (top chetlanishlar, jadval, drawer: gistogramma p01..p99, oylik mediana,
  jins/yosh, oxirgi natijasi me'yordan tashqari bemorlar). `unit_mismatch`
  qatorlar statistikaga kirmaydi.
* **Xavf signallari** — «NMED laboratoriya klinik qoidalari» v1.0
  spetsifikatsiyasi (kod versiyasi `LabRules.Version` 1.1.0: REN-01
  faqat oxirgi 14 kun ichidagi juftlik uchun CRITERIA_MET, eskisi MONITOR;
  GLU-02 kamida bitta qiymat oxirgi 12 oyda; GLU-01 yarim ochiq oraliq;
  Na < 120 / > 160 CRITICAL): `Services/LabRules/` (24 qoida: REN-01 AKI, REN-02 CKD
  CKD-EPI 2021, ELE-01/02, CAR-01/02, GLU-01/02, HEM-01..05, THY-01/02,
  LIV-01/02 FIB-4, PAN-01, LIP-01, INF-01/02, COA-01, UR-01, ONC-01,
  MET-01). Bemorning SHU klinikadagi tahlillari vaqt bo'yicha solishtiriladi.
  Natija `lab_rule_signals` (klinika+bemor+qoida bo'yicha bitta, dalil/
  vaqt/yetishmayotgan ma'lumot jsonb). Foizli ehtimol YO'Q — holat
  (CRITICAL/CRITERIA_MET/SUSPECTED/MONITOR/INSUFFICIENT_DATA) + dalil +
  keyingi qadam. Signal tashxis emas: shifokor tasdiqlaydi/rad etadi
  (`reviewer_status`; dalil o'zgarsa — `evidence_hash` farq qilsa —
  `pending` ga qaytadi, izoh tozalanadi).
* **Kim baholaydi**: admin/direktor (`/lab-statistics` → «Xavf signallari»)
  VA shifokor — bemor kartasidagi «Laboratoriya xavf signallari» blokida,
  faqat o'ziga ko'rinadigan bemorlar (`PatientVisibility`). API:
  `GET api/lab-signals/patient/{id}`, `POST api/lab-signals/{id}/review`.
* `LabRuleWorker` (`LabRules:Enabled/IntervalSeconds/BatchSize`) faqat
  o'zgargan bemorlarni qayta baholaydi (`lab_rule_patient_state`:
  last_value_id, values_count, rules_version, error_count). Qoida o'zgarsa
  `LabRules.Version` ni oshiring — hammasi qayta hisoblanadi. Faqat
  `measured_at` o'zgartirilsa worker sezmaydi — state qatorini o'chiring
  (bemor jinsi/tug'ilgan sanasi o'zgarsa `save-patient-data` buni o'zi
  qiladi). Lab tahlili 0/1 holatidagi bemor O'TKAZIB yuboriladi — retry
  paytida signallar va baholar o'chmasin. Bitta qoida xatosi qolganlarini
  to'xtatmaydi; xato bergan qoidaning eski signali saqlanadi.
* Frontend — UCH ko'rinish yonma-yon, dizayn tanlovi uchun
  (`pages/cabinet/statistics/`); faqat `/lab-statistics` menyuda, qolgan
  ikkitasi manzil bilan ochiladi; tanlov hal bo'lgach qolganlari o'chiriladi:
  - `/lab-statistics` — eski: `LabStatistics.js`, `Stats*.js`, `lst-*`
    (yuqorida tablar, filtr paneli + «Qo'llash», doira diagrammalar, jadvallar).
  - `/lab-statistics-new` — ixcham: `LabStatsPage.js` + `OverviewTab` /
    `IndicatorsTab` + `IndicatorDrawer` / `SignalsTab`; bloklar `statsUi.js`
    (`Kpi`, `Panel`, `BarList`, `StackBar`), uslub `LabStats.css` (`lsx-*`).
    Filtrlar bitta qatorda, darhol qo'llanadi; chiziqli ro'yxatlar; signallar
    kartochka.
  - `/lab-statistics-new-1` — `v3/`: `LabStatsV3.js` (chapda bo'limlar +
    BARCHA filtrlar bir xil kenglikda, yorliqli; signallar bo'limida signal
    filtrlariga almashadi) + `V3Overview` (hero qator; BITTA ustunli grafik
    — tahlillar, ichida chetlanishlisi qizil — va ostida davr jadvali;
    guruhlar, bemorlar/tahlillar tarkibi, xodimlar — JADVALLAR, ulush
    `PctBar` bilan) / `V3Indicators` (statistika jadvali: har ustun bitta
    statistika — natijalar, bemorlar, me'yorda, ↑, ↓, ulush, o'rtacha,
    mediana, min, max, P10–P90, baholanmagan; qator → v2 `IndicatorDrawer`) /
    `V3Signals` (BEMOR bo'yicha guruhlangan); `v3Ui.js`, `LabStatsV3.css`
    (`ls3-*`). Foydalanuvchi 2026-11-02 da SHU ko'rinishni tanladi.
    `GetSummaryAsync.categories` shu uchun `high/low/normal/patients` qaytaradi.
  Umumiy: `statsCommon.js` (konstantalar, `num`/`pct`), `signalParts.js`
  (signal tafsiloti, qaror oynasi — bemor kartasi `PatientSignals.js` bilan
  ham; uning `lst-*` uslublari `LabStatistics.css` da — yangi ko'rinishlar
  uni shu sababli import qiladi).

**Vipiska** (`discharge_summaries`) — statsionardan chiqarish epikrizi
(«Выписка из истории болезни»).

* **Kim**: faqat shifokor (rol 4) va faqat O'ZIGA yo'naltirilgan bemorga
  (`PatientVisibility` qoidasi). Tahrirlash/o'chirish — yaratgan shifokor;
  admin/direktor o'z klinikasinikini faqat ko'radi va PDF yuklaydi.
* **Oqim**: bemor kartasi → «Vipiska chiqarish» → oynada ИБ raqami,
  vipiska sanasi, yotqizilish/chiqarilish sanalari (shifokor KIRITADI) →
  `/patcients/:id/discharge/new`. Tahrirlash: `/discharges/:id/edit`.
* **Tahlillar**: shifokorga yo'naltirilgan (yoki u yuklagan) tahlillar
  sanasidan qat'i nazar + yotish davrida olingan BOSHQA tahlillar; faqat
  tayyorlari. Backend (`DischargeSummaryService.GetCandidatesAsync`) shu
  to'plamdan tashqaridagi tahlilni rad etadi.
* **Diagnoz** 3 qism (asosiy/yo'ldosh/asorat) — tanlangan tahlillardagi
  `analysis_diagnoses` xulosalaridan NUSXA qo'shiladi yoki qo'lda yoziladi.
  Konsultatsiya xulosalari — yotish davridagilardan tanlanadi.
* **Shikoyatlar**: `complaints` spravochnigi (`category` ustuni, 12
  yo'nalish). EKG yuklash sahifasida faqat `cardio` ko'rsatiladi.
* **Imzo YO'Q** — haqiqiylikni QR tasdiqlaydi: token turi `discharge`,
  `/verify/{token}` login talab qilmaydi. Tekshiruv sahifasida «Oxirgi
  tahrir» vaqti PDF dagi «Tasdiqlangan» vaqti bilan bir xil bo'lishi kerak
  — shuning uchun har saqlashda `updated_at` majburan yangilanadi.
* **PDF**: `GET /api/report/discharge/{id}` →
  `PdfReportService.Discharge.cs` (shapkada faqat klinika, hujjat raqami
  = ИБ raqami, ixtiyoriy «bemor uchun tavsiyalar» sahifasi).

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

### `automatic_analysis_bool` Filter — `AiSeverityRaw` orqali
`ai_answer_data` ustuni `jsonb` (T-036): unda `string.Contains` Npgsql da
`strpos(jsonb, jsonb)` bo'lib 500 beradi (L-08, 2026-11-02 da Lab/Holter/SMAD
klinika ro'yxatlarida tuzatildi). Generatsiya qilingan matn ustuni ishlatiladi
(int va string ikkalasini qamraydi):
```csharp
query = query.Where(e => e.AiSeverityRaw == val);
```

### Tahlil yuklash: klinika va xodim tokendan
`clinic_id` va `created_doctor_id` formadan EMAS — .NET proksi
(`PythonApiProxyService.ProxyMultipartAsync` `overrides`,
`AnalysisUploadGuard`) ularni `ICurrentUser` dan qo'yadi (barcha analyze/save
endpointlari). Aniqlanmasa 403. 60 MB dan katta so'rov — 413
"Fayllar jami hajmi juda katta" (ilgari 502 edi).

### EF migratsiyalari QO'LDA yoziladi
`EkgDataDBModelSnapshot.cs` 2026-09 dan beri eskirgan (lab fayllari/qiymatlari,
kompleks, vipiska jadvallari unda yo'q). `dotnet ef migrations add` mavjud
jadvallarni qayta yaratishga urinadi — ISHLATMANG; yangi migratsiyani
mavjudlari (`20261104*`) uslubida qo'lda yozing.

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

### PDF hujjatlar uslubi (`PdfReportService*.cs`)

Barcha hujjatlar umumiy yordamchilardan chiziladi — yangi hujjat ham
shulardan foydalansin, o'z "dizayn"ini yaratmasin:
`OpenPdf` (hujjatni ochadi) → `ComposeDocTitle` (nom + raqam/sana paneli)
→ `ComposeSectionHeader` (rangli belgi + to'q ko'k qalin matn + chiziq;
`CL_Green` faqat AI bo'limi uchun) → `Card(InfoGrid(...))` (yorliq tepada,
qiymat pastda, qatorda 3 ta) / `TableHead`+`TblCell` / `AddLabeledText` /
`AddAiTextBlock`.

* **Shapka HAR sahifada** (`PageChromeEvent`): chapda NMED (logotip,
  platforma, nmed.uz), o'ngda hujjatni CHIQARAYOTGAN foydalanuvchining
  klinikasi (`ResolveIssuerClinic`: logotip yoki bosh harflar belgisi,
  nom, telefon). 1-sahifada to'liq, keyingilarida ixcham. Shapka
  hujjat ichida chizilmaydi — faqat sahifa hodisasida.
* Bitta `Image` obyektini ikki joyda ishlatmang: `ScaleToFit` umumiy —
  ixcham shapka katta logotipni ham kichraytirib qo'yardi.

* Shrift: oddiy + HAQIQIY Bold fayl (`arialbd.ttf` / Liberation/DejaVu
  Bold). Eng kichik o'lcham **12 pt** (`MinFontSize`, foydalanuvchi
  talabi), footer 10 pt.
* To'liq bo'yalgan rangli polosa ishlatilmaydi. Rang faqat ma'noga ega
  joyda: normadan og'gan qiymat (qizil/sariq qalin), normal — oddiy qora.
* `✓ ⚠ ✗` belgilari Arial da YO'Q (bo'sh joy chiqadi) — faqat `↑ ↓`.
* Bo'lim sarlavhasi sahifa tagida yolg'iz qolmaydi (`KeepRoomOrBreak`,
  `_writer` orqali qolgan joy tekshiriladi).

### Passport Qidiruvi
AES-256-CBC tasodifiy IV ishlatadi → DB `LIKE` ishlamaydi.
Qidiruv in-memory: barcha passportlar `EncryptionService.Decrypt()` → keyin taqqoslash.

### Tahlil yuklashda bemor tanlash (ism bo'yicha)

EKG/Holter/SMAD/Lab/Parazitologiya/Kompleks AI yuklash sahifalarida bemor
passport + tug'ilgan sana bo'yicha EMAS, bitta maydonda ism/familiya/
otasining ismi bo'yicha qidiriladi: `GET api/patcient/search-by-name?q=`
(butun baza, klinika filtri yo'q — loyiha egasining qarori; 30 ta natija).
Ro'yxatdan tanlanadi yoki «Yangi bemor qo'shish».

* Frontend: `hooks/usePatientNameSearch.js` + `components/shared/PatientNameSearch.js`
  (`pns-*`), forma `PatientInfoForm` (`showIdentity`). Eski passport oqimi
  (`usePatientSearch`) faqat konsultatsiya/xulosalar sahifalarida qoldi.
* **Faqat familiya va ism majburiy.** `patients.birthdate` va `gender`
  NULL bo'lishi mumkin (migratsiya `20261031000000_PatientOptionalBirthDateGender`).
  Noma'lum yosh/jins AI ga YUBORILMAYDI (`appendPatientMeta`; Python
  `age`/`gender` = `Optional`), ko'rsatishda `genderLabel` → `null`, PDF da «—».
  Hech qachon `gender ? 'erkak' : 'ayol'` yozmang — NULL «ayol» bo'lib qoladi.
* **Faqat lotin harflari**: `Helpers/PatientInput.cs` va `tools/latinInput.js`
  (mos bo'lishi SHART). Tutuqlar (`‘ ’ ʻ ʼ \``) ismda `'` ga keltiriladi;
  qidiruvda tutuqlar ikkala tomonda olib tashlanadi («gofurova» = «G'OFUROVA»).
* `save-patient-data`: `id` berilsa — shu bemor tahrirlanadi; aks holda
  passport+sana mos kelsa mavjud bemor yangilanadi; bo'lmasa yangi bemor.

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
