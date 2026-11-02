# NMED — Laboratoriya moduli: audit va tuzatish tasklari

> **Audit sanasi:** 2026-11-02
> **Qamrov:** laboratoriya tahliliga oid barcha qatlamlar —
> Python (`lab_analyses_api`, `lab_analyse`, `lab_units`, `lab_catalog`,
> `lab_dates`, `excel_to_text`, `file_validator`, `duplicate_guard`,
> `repair_lab_*`), .NET (`LabAnalyseController/Service`, `LabValuesController`,
> PDF, migratsiyalar, `LabStatistics`, `LabRules`), frontend (yuklash,
> ro'yxat, ko'rish, natija kartochkalari, dinamika, statistika).
>
> **Usul — ikki bosqich:**
> 1. 5 ta mustaqil tekshiruv (har qatlam alohida) kamchiliklarni topdi.
> 2. 3 ta qarshi tekshiruv har bir topilmani **rad etishga urindi**
>    (boshqa joydagi himoya, chaqiruvchi, prompt, DB cheklovi bormi).
>    Faqat rad etib bo'lmaganlari shu ro'yxatga kirdi.
>
> Birliklar bo'yicha topilmalar `lab_units` funksiyalarini haqiqiy
> kirish qiymatlari bilan **ishga tushirib** tasdiqlangan; jsonb filtri
> EF/Npgsql bilan SQL generatsiya qilib tasdiqlangan.

---

## Statistika

| Daraja | Soni | Ma'nosi |
|---|---|---|
| 🔴 Kritik | 5 | Bemorga noto'g'ri baho beradi, natijani yashiradi yoki boshqa klinikaga yozadi |
| 🟠 Yuqori | 10 | Funksiya ishlamaydi (500), ma'lumot yo'qoladi yoki keng tarqalgan birlik tanilmaydi |
| 🟡 O'rta | 12 | Noto'g'ri, lekin kamroq holatda yoki chalg'ituvchi ko'rinish |
| 🔵 Past | 14 | Kosmetik, kam uchraydigan yoki texnik qarz |
| **Jami** | **41** | |

---

## ✅ BAJARILISH HOLATI (2026-11-02)

> **Natija:** 41 taskdan **37 tasi to'liq bajarildi va tekshirildi**, **4 tasi
> asosiy qismi bajarildi** (⚠️ — qolgan qismi pastda, sababi bilan).
> Tekshiruv paytida yana **3 ta kamchilik** topildi va tuzatildi (X-1…X-3).
>
> **Qanday tekshirildi.** Lokal muhitda uchala server ishga tushirildi,
> migratsiyalar lokal bazaga qo'llandi (oldin zaxira nusxa olindi).
> Brauzerda admin (rol 2) va shifokor (rol 4) sifatida ishlandi — kirish
> uchun lokal `Jwt:Key` bilan test tokeni yaratildi (mavjud hisoblarning
> paroli o'zgartirilmadi). Haqiqiy AI tahlil uchun maxsus test bemorlar
> (`LABAUDIT TESTSERO` #20, `LABAUDIT TESTUNIT` #21) va Excel fayllar
> yaratildi: lab #58 (faqat serologiya), #59 (kortizol 25 нмоль/л,
> prolaktin 30 мМЕ/л, RBC "млн/мкл", ALT "ед/л", troponin 14.4 нг/л < 14,
> FSG 70 — jinsi noma'lum), #60 (eskiroq ALT 120).
>
> **Avtomatik tekshiruvlar:** `python -m pytest tests` — **172 passed**;
> `dotnet build` — 0 xato, yangi ogohlantirish yo'q; frontend — "Compiled
> successfully"; qoidalar uchun konsol tekshiruvi — 20/20.

| Task | Holat | Qanday tasdiqlandi |
|---|---|---|
| L-01 | ✅ | **Brauzer**: #59 da kortizol 25 нмоль/л va prolaktin 30 мМЕ/л — "Baholanmadi · Birlik shubhali", alohida "Baholanmagan (birlik tekshirilsin)" guruhida. **Baza**: `unit_mismatch=true`, `flag=NULL`, qiymat aylantirilmagan. **PDF**: "Baholanmadi". Testlar. |
| L-02 | ⚠️ | **Brauzer**: troponin I 0.0144 ng/mL "↑ Normadan yuqori", norma ≤ 0.014. **Baza**: `flag=1`. **PDF**: "↑ Yuqori". Qolgani: eski yozuvlardagi troponin qayta hisoblanmadi (asl fayl me'yori eski kataklarda saqlanmagan). |
| L-03 | ✅ | **API**: `clinic_id=999`, `created_doctor_id=41` yuborildi → yozuv `clinic_id=41`, `created_doctor_id=39` (o'zining) bilan yaratildi. EKG/Holter/SMAD/MedDiagnose/Parazitologiya ham. |
| L-04 | ✅ | **Brauzer**: #58 (faqat HBsAg + Anti-HCV) — "Raqamli o'lchovlar" ochiq, "HBsAg — Musbat" qizil kartochka. |
| L-05 | ✅ | Test: kesilgan/`incomplete`/JSON bo'lmagan javob → status −1, "token chegarasi" xabari. Lab uchun `LAB_MAX_OUTPUT_TOKENS=16000`. |
| L-06 | ✅ | L-01 bilan bir xil (prolaktin), brauzerda ko'rildi. |
| L-07 | ✅ | **Baza/brauzer**: RBC 4.5 "млн/мкл" → ×10¹²/L, ALT 30 "ед/л" → U/L, ikkalasi "Yaxshi". Testlarda barcha jadval birliklari (`ме/л` — ataylab mismatch). |
| L-08 | ✅ | **Brauzer**: admin ro'yxatida "AI xulosasi: O'rtacha" → 200, 5 ta faqat o'rtacha natija (ilgari 500). SQL: `ai_severity = @val`. |
| L-09 | ✅ | **Brauzer + API**: 03.09–03.09 → faqat 03.09 sanalilar (9 ta, bazadagi bilan teng); 02.09 → 3 ta (o'chirilmaganlari). |
| L-10 | ⚠️ | **Baza**: tasdiqlangan HEM-01 signali manba tahlili (#55) qayta tahlil qilinayotganda (status 0, qiymatlar 0 ta) `confirmed` holatida qoldi — worker bemorni o'tkazib yubordi. Qolgani: yumshoq o'chirish (2-variant) qilinmadi — retry xato bilan tugasa signal baribir o'chadi. |
| L-11 | ✅ | Konsol testi: ataylab xato beruvchi qoida → qolganlari signal beradi, xato bergan qoidaning eski signali saqlanadi; to'liq xatoda hech narsa o'chirilmaydi; 3 urinishdan keyin "park". |
| L-12 | ⚠️ | Konsol testi: eski AKI epizodi → MONITOR; 14 kun ichidagi → CRITERIA_MET; eski GLU-02 → MONITOR + GLU-01. Qolgani: nahorligi noma'lum glyukoza uchun ≥ 11.1 chegarasi — klinik maslahatchi qarori kerak. 12 oy bemorning OXIRGI tahlilidan hisoblanadi (bugundan emas — worker faqat ma'lumot o'zgarganda ishlaydi). |
| L-13 | ✅ | **Brauzer**: ru interfeysda #59 tarjima qilindi (kesh yozildi). Retry `lang=ru` → **baza**: `ai_translations=NULL`, `ai_lang='ru'`. EKG/Holter/SMAD/kompleks ham. |
| L-14 | ✅ | Lab, EKG, Holter, SMAD, kompleks va **lab klassifikatori** (`document_classifier.py`) — `finally` da `files.delete`. Testlar. Parazitologiya (modul o'chirilgan) tegilmadi. |
| L-15 | ✅ | **Brauzer** (shifokor): o'zi yuklagan #29–#37 da o'chirish tugmasi bor, admin yuklagan #55 da yo'q. 5 ta ro'yxatda. |
| L-16 | ✅ | **API**: AI ishlayotganda retry → **409** "Tahlil hali davom etmoqda…". Watchdog `UpdatedAt ?? CreatedAt`. |
| L-17 | ✅ | **Brauzer**: jinsi noma'lum bemorning FSG 70 si "yuqori" deb chiqmaydi. **Baza**: `flag=NULL`. **PDF**: norma "—". Migratsiya `20261104002000`. |
| L-18 | ✅ | **Brauzer** (ru): "Это заключение создано на узбекском языке" + "Перевести заключение"; "Статус диагноза" belgisi. Holter/SMAD/EKG DTO ham. |
| L-19 | ✅ | **Baza**: #55 qayta tahlilida AI fayldan boshqa sanani o'qidi (12.10 → 14.09) → `evidence_hash` o'zgardi → `pending` (to'g'ri). Bemor jinsi/tug'ilgan sanasi o'zgarsa state o'chiriladi. |
| L-20 | ✅ | **Brauzer + API**: ALT oynasida "oxirgi natijasi me'yordan tashqari" — faqat ALT 125 li bemor; oxirgi ALT 30 ga tushgan #21 yo'q (filtr yoqilgan va o'chirilgan holda). |
| L-21 | ✅ | **Brauzer**: 3 × 22 MB tanlanganda faqat 2 tasi qoldi, yo'riqnomada "всего до 50 МБ". **API**: 66 MB → **413** "Fayllar jami hajmi juda katta". |
| L-22 | ✅ | Testlar: buzilgan xlsx → `broken_xlsx` (400); `<dimension ref="A1"/>` li fayl to'liq o'qiladi. |
| L-23 | ✅ | **Brauzer**: bemor kartasi dinamikasida Hb nuqtalari baho bo'yicha bo'yalgan (99 — sariq, 152 — yashil). **API**: `refLow/refHigh/flag/flagSource`, faqat sonli ko'rsatkichlar. |
| L-24 | ✅ | Testlar: `plan_fixes` faqat o'zgargan kataklarni yozadi; sifat natijasi `classify_qualitative` bilan tasniflanadi. |
| L-25 | ✅ | **Brauzer**: ro'yxat tahlil sanasi bo'yicha (14.09, 03.09, …). |
| L-26 | ✅ | **Brauzer** (shifokor): bemor kartasida "Лабораторные сигналы риска" bloki; HEM-01 izoh bilan tasdiqlandi → "Подтверждён · ISMOILOV RAHMONJON, 02.11.2026". **Baza**: `reviewed_by_user_id=61`. |
| L-27 | ✅ | Konsol testi: glyukoza 6.95 / HbA1c 6.45 → GLU-01; Na 118 va 162 → CRITICAL. |
| L-28 | ✅ | Testlar: Hb 14.5 "g/L" → shubhali; kalsiy (1.0, 5.0); glyukoza ≤ 120. |
| L-29 | ✅ | Test: DB xatosidan keyin `rollback`, status −1, `logger.exception`. |
| L-30 | ✅ | **API**: "2026-13-45" va "2030-01-01" → **400**, diskdagi fayllar soni o'zgarmadi (2 → 2). |
| L-31 | ✅ | **PDF** (#59): qatorlar `SortOrder` bo'yicha (RBC, ALT, troponin, prolaktin, FSG, kortizol). |
| L-32 | ✅ | Kod + build: catch'larda log, javoblardan `ex.Message` olib tashlandi. |
| L-33 | ✅ | Kod + build: lab ro'yxatlarida shifrlangan passport ham qidiriladi. (EKG/Holter/SMAD ro'yxatlari — keyinroq.) |
| L-34 | ✅ | **Brauzer**: HBsAg oynasida gistogramma o'rniga "Распределение результатов: Положительный"; jadvalda mediana "—". |
| L-35 | ✅ | **Brauzer**: chekka ustunlar "< 37.31" va "≥ 120.39". |
| L-36 | ⚠️ | **Brauzer** (ru): "Новый", "Лабораторный анализ: готово!", "Анализы", "Просмотр", qoida nomlari ("Анемия"…) tarjima qilingan. Qolgani: signal matnlari (`title_uz/message_uz`) va `useAnalysisSignalR.js` dagi bitta xato matni hali faqat o'zbekcha. |
| L-37 | ✅ | Kod: so'rov tartib raqami (`requestSeq`) — faqat oxirgi javob qabul qilinadi (4 ta ro'yxat). |
| L-38 | ✅ | Testlar (Python) + kod (frontend): teskari me'yor e'tiborsiz qoldiriladi. |
| L-39 | ✅ | Test: `pg_advisory_xact_lock` → tekshiruv → insert → bitta commit. |
| L-40 | ✅ | CLAUDE.md ga "migratsiyalar qo'lda yoziladi, `migrations add` ishlatmang" bo'limi qo'shildi. |
| L-41 | ✅ | `models.py` izohi tuzatildi. |

### Tekshiruv paytida topilgan va tuzatilgan qo'shimcha kamchiliklar

| # | Kamchilik | Tuzatish |
|---|---|---|
| X-1 | L-17 faqat Python va bazada tuzatilgan edi — **frontend kartochkasi, dinamika grafigi va PDF** me'yorni o'zi hisoblab, jinsi noma'lum bemorning FSG sini hamon "yuqori" deb ko'rsatardi (brauzerda ko'rildi). | `AnalysisResultBody.evaluate`, `LabDynamicsChart`, `PdfReportService.LabNormBounds` — bir xil qoida. Brauzer va PDF da tasdiqlandi. |
| X-2 | Baholanmagan (birligi shubhali/mos kelmagan) ko'rsatkichlar **"Me'yordagi ko'rsatkichlar"** guruhiga tushardi — shifokor ularni normal deb o'ylashi mumkin edi. | Alohida "Baholanmagan (birlik tekshirilsin)" guruhi (3 tilda). Brauzerda tasdiqlandi. |
| X-3 | `20261102000000_LabValueReferenceAndKind` migratsiyasi "Non-reactive" (chiziqcha bilan) sifat natijasini **MUSBAT** deb tasniflardi. Statistikada troponin medianasi "0.01" bo'lib ko'rinardi. | Tuzatuvchi migratsiya `20261104003000_LabFixNonReactiveKind`; statistika raqam formati kamida 3 muhim raqam ("0.0144"). |

### Ishga tushirishda e'tibor bering

* Yangi migratsiyalar: `20261104001000_LabRuleEvidenceHash`,
  `20261104002000_LabFlagsUnknownSexNorms`, `20261104003000_LabFixNonReactiveKind`
  — backend ishga tushganda avtomatik qo'llanadi; yangi kod ularsiz ishlamaydi.
* `repair_lab_units.py --apply` endi xavfsiz (kortizol/prolaktinning eski
  aylantirilgan yozuvlarini "shubhali" holatga qaytaradi) — avval quruq rejimda
  ishga tushiring.
* Lokal bazada test ma'lumotlari qoldi: bemorlar #20, #21 va lab #58–#60;
  bazaning tuzatishdan oldingi zaxira nusxasi olingan.

---

### Qayta tekshiruvda RAD ETILGAN (tuzatish kerak EMAS)

| Da'vo | Nega noto'g'ri |
|---|---|
| PDF da `unit_mismatch` qatoriga ↑/↓ qo'yiladi | Faqat laboratoriyaning o'z me'yori bo'lsa baholanadi va u qiymat bilan bir xil (aylantirilmagan) birlikda — `lab_catalog.flag_for` da shu ataylab yozilgan. |
| `automatic_analysis_bool = null` 0 bo'lib saqlanadi | 0 va null ekranda bir xil ("Baholanmadi"), statistika faqat 1/2/3 ni sanaydi, `ai_result_guard.sanitize` kerak bo'lsa `None` qiladi — amaliy ta'sir yo'q. |

---

## Bajarish tartibi (to'lqinlar)

| To'lqin | Tasklar | Nega shu tartib |
|---|---|---|
| 1 — Tibbiy to'g'rilik | L-01, L-02, L-04, L-05, L-06, L-07 | Bemorga noto'g'ri baho / yashirin musbat natija |
| 2 — Xavfsizlik | L-03, L-14 | Klinikalararo yozish, OpenAI da PHI to'planishi |
| 3 — Buzilgan funksiyalar | L-08, L-09, L-15, L-18, L-13 | 500 xato, noto'g'ri filtr, ko'rinmaydigan tugmalar |
| 4 — Xavf signallari | L-11, L-10, L-12, L-19, L-20, L-27, L-26 (qaror) | Signal va shifokor baholari yo'qolishi |
| 5 — Barqarorlik | L-16, L-21, L-22, L-24, L-17, L-23, L-25 | Poyga, noto'g'ri xabarlar, ko'rinish |
| 6 — Past | L-28 … L-41 | |

> **Har bir taskdan keyin:** `cd python_back && python -m pytest` (agar
> testlar bo'lsa), `dotnet build`, frontendda tegishli sahifa brauzerda.
> Birlik tasklari uchun pastdagi "Sinov" bo'limidagi qiymatlarni
> `lab_units.harmonize` / `lab_catalog.flag_for` ga berib natijani solishtiring.

---

# 🔴 KRITIK

### ✅ L-01 — Kortizol 40 nmol/L dan past bo'lsa ×27.59 qilinadi (past kortizol "normal"/"yuqori" bo'lib qoladi)

**Qayerda:** `python_back/lab_units.py:197` — `_MISLABELED[("cortisol","nmol/l")] = (lambda v: v < 40, "µg/dl")`;
prompt: `python_back/lab_analyses_api.py:184` ("kortizol 3–30 нмоль/л — aslida µg/dL").

**Muammo.** Qoida bitta klinika blankasidagi xato (qiymat µg/dL da, birlik
"нмоль/л" deb yozilgan: `6.47 | 138–690`) uchun yozilgan. Lekin u **har
qanday** 40 dan kichik nmol/L qiymatga qo'llanadi. Haqiqiy past kortizol
(buyrak usti bezi yetishmovchiligi, deksametazon supressiya testi — me'yor
< 50 nmol/L, kechki kortizol) 27.59 ga ko'paytirilib "normal" yoki "yuqori"
bo'lib chiqadi. PLAUSIBLE (5–3000) buni ushlamaydi; prompt ham AI matnini
shu tomonga yo'naltiradi.

**Sinov (tasdiqlangan):**
```
harmonize("cortisol", 25, "nmol/L", "nmol/L")  → 690.0 nmol/L   (kutilgan 25)
harmonize("cortisol", 30, "нмоль/л", "nmol/L") → 828.0 nmol/L   (kutilgan 30)
lab ref 138–690 bilan flag → 0 (normal)                          (kutilgan -1)
```

**Nega oddiy yechim ishlamaydi.** Me'yor shkalasi bo'yicha ajratib
bo'lmaydi: xato blankada ham, haqiqiy past qiymatda ham me'yor 138–690
nmol/L. Qiymat oralig'i ham kesishadi (xato blankada 3–30, haqiqiy past
qiymat ham 3–40).

**Yechim (loyiha egasi bilan tasdiqlansin):**
1. `v < 40` holatida **avtomatik aylantirmaslik**. Uning o'rniga qiymatni
   o'zgartirmay saqlash va `unit_suspect: true` belgisi qo'yish:
   `flag = None`, ekranda "birlik shubhali — laboratoriya blankasini
   tekshiring" yozuvi. Noto'g'ri "normal" dan ko'ra "baholanmadi" xavfsizroq.
2. Agar aniq klinika blankasini taniy olish kerak bo'lsa — qoidani
   faqat **asl yozuv aynan "нмоль/л" + qiymatda o'nli kasr + 3 ≤ v ≤ 30**
   bo'lganda ishlatish va baribir `unit_suspect` belgisini qo'yish.
3. `lab_analyses_api.py:184` dagi prompt satrini yumshatish: "agar kortizol
   nmol/L da 40 dan past bo'lsa, matnda birlik shubhali ekanini ayt",
   "aslida µg/dL" deb qat'iy aytmaslik.
4. `unit_suspect` — `lab_analysis_values` ga ustun kerak bo'lsa, EF
   migratsiya orqali (Python sxemani o'zgartirmaydi). Yoki mavjud
   `unit_mismatch = true` ishlatilsin (statistika va qoidalardan chiqadi).
5. **`repair_lab_units.py --apply` ni bu tuzatishdan OLDIN ishlatmang** —
   eski yozuvlarni ham buzadi.
6. CLAUDE.md "Laboratoriya birliklari" bo'limidagi `_MISLABELED` ro'yxatini
   yangilang.

**Qabul mezoni:** `harmonize("cortisol", 25, "nmol/L", …)` qiymatni 25
qoldiradi va flag `None` yoki `-1`; `6.47 нмоль/л | 138–690` holati
"shubhali" deb belgilanadi, normal deb emas.

---

### ⚠️ L-02 — Troponin yaxlitlashda me'yordan oshgani yo'qoladi

**Qayerda:** `python_back/lab_units.py:247-251` (`_round`), `harmonize`
(~299) va `_harmonize_refs` (~351) — me'yor koeffitsienti **yaxlitlangan**
qiymatdan hisoblanadi.

**Muammo.** Katalogda faqat `troponin_i` bor (ng/mL, ≤ 0.04). hs-troponin
ng/L yoki pg/mL da keladi va ng/mL ga o'tkazilganda `_round` 1 dan kichik
sonni 3 xonagacha yaxlitlaydi. Qiymat ham, me'yor ham bir xil songa
aylanib, `flag_for` `0.014 > 0.014` → normal qaytaradi. Bu miokard
infarkti belgisi.

**Sinov (tasdiqlangan):**
```
troponin_i 14.4 ng/L,  lab ref ≤14   → value 0.014, ref_high 0.014, flag 0  (kutilgan 1)
troponin_i 26.4 pg/mL, lab ref ≤26.2 → 0.026 / 0.026, flag 0                (kutilgan 1)
troponin_i 40.4 ng/L,  katalog ≤0.04 → 0.04 / 0.04, flag 0                  (kutilgan 1)
```

**Yechim:**
1. `_round` ni **muhim raqamlar** bo'yicha yaxlitlashga o'tkazing
   (masalan, 1 dan kichik sonlar uchun 3 ta muhim raqam:
   `round(v, 3 - int(floor(log10(abs(v)))) - 1)`; 0 ni alohida). 0.0144
   saqlanadi.
2. `_harmonize_refs` da koeffitsientni **yaxlitlanmagan** qiymatdan
   hisoblang (`factor = raw_after / raw_before`).
3. `flag_for` ga yaxlitlanmagan qiymat va me'yor berilsin; yaxlitlash
   faqat saqlash/ko'rsatish uchun.
4. Mavjud yozuvlar uchun: troponin qatorlarini qayta hisoblash
   (`repair_lab_units.py` yoki alohida skript — L-25 tuzatilgandan keyin).

**Qabul mezoni:** yuqoridagi uchala misolda `flag = 1`.

---

### ✅ L-03 — Tahlil boshqa klinika nomidan yaratilishi mumkin (barcha turlarda)

**Qayerda:**
- .NET: `Controllers/LabAnalyseController.cs:59` → `Services/PythonApiProxyService.cs:42-47` (forma maydonlari o'zgarishsiz ko'chiriladi)
- Python: `python_back/lab_analyses_api.py:610-611` — `created_doctor_id`, `clinic_id` formadan; `verify_token` dan kelgan `user` ishlatilmaydi
- `python_back/reference_validator.py:68-90` — faqat "shifokor **berilgan** klinikaga tegishlimi" tekshiriladi
- Xuddi shu naqsh: EKG (`main.py:1487-1488`, 1598, 1939), Holter (`holter_analyses_api.py:278-280`), SMAD (`smad_analyses_api.py:281-283`)

**Muammo.** Frontend `user.clinic.id` va `user.doctor.id` ni o'zi yuboradi
(`useAnalyzerPage.js:195-196`). Har qanday tizimga kirgan foydalanuvchi
so'rovda boshqa klinika va uning shifokorini ko'rsatib, tahlilni o'sha
klinikaga yoza oladi. Tahlil o'sha klinikaning ro'yxatlari, statistikasi va
AI xarajatida chiqadi.

**Yechim:**
1. `PythonApiProxyService.ProxyMultipartAsync` ga ixtiyoriy
   `IDictionary<string,string> overrides` parametri qo'shing: shu
   kalitlar formadan **olib tashlanadi** va qiymati override'dan qo'yiladi.
2. Barcha analyze/save endpointlarida (Lab, EKG, Holter, SMAD, kerak bo'lsa
   Kompleks) override'ni `ICurrentUser` dan to'ldiring:
   `clinic_id = await _currentUser.GetClinicIdAsync()`,
   `created_doctor_id = await _currentUser.GetDoctorIdAsync()`.
   Ikkalasidan biri `null` bo'lsa — 403.
3. Ikkinchi himoya qatlami (ixtiyoriy): Python `verify_token` qaytaradigan
   `user` da klinika bo'lsa, formadagi qiymat bilan solishtirish.
4. Frontend o'zgarishi shart emas (maydonlar e'tiborsiz qoladi).

**Qabul mezoni:** A klinika foydalanuvchisi `clinic_id=B` yuborsa, tahlil A
klinika va o'zining shifokor ID si bilan yaratiladi (bazada tekshiring).
To'rtala tur uchun.

---

### ✅ L-04 — Faqat sifat natijalari bo'lgan tahlilda kartochkalar umuman chiqmaydi

**Qayerda:** `frontend/src/components/results/AnalysisResultBody.js:362-368`
(`hasMeasurements`), bo'lim sharti — shu fayl ~531-qator.

**Muammo.** `hasMeasurements` obyekt katakni faqat `v.value != null` bo'lsa
sanaydi. Python sifat natijasini `{value: null, text, result_kind}`
ko'rinishida saqlaydi (prompt: COI indeksi bo'lmasa `value = null`).
Natijada faqat serologiya (HBsAg, Anti-HCV, RW, OIV, H. pylori)
yuklanganda butun "Raqamli o'lchovlar" bo'limi yashiriladi — **musbat**
natija ham ekranda ko'rinmaydi. Aralash tahlilda muammo yo'q (bitta son
bo'lsa bo'lim ochiladi).

**Yechim:**
```js
if (typeof v === 'object') {
    return v.value != null
        || (typeof v.text === 'string' && v.text.trim() !== '')
        || !!v.result_kind;
}
```

**Qabul mezoni:** faqat HBsAg POSITIVE dan iborat tahlil ochilganda qizil
"Musbat" kartochka ko'rinadi.

---

### ✅ L-05 — AI javobi kesilsa yoki JSON bo'lmasa, bo'sh natija "tayyor" bo'lib saqlanadi

**Qayerda:** `python_back/lab_analyses_api.py:287-290` (`_sync_lab_openai`),
448-499 (natijani yig'ish), ~405 (qiymatlar AI dan OLDIN o'chiriladi).
Taqqoslash uchun to'g'ri yo'l: EKG `main.py:1322-1335`.

**Muammo.** `json.loads` xato bersa `{"raw": text}` qaytadi; keyingi kod
barcha maydonlarni bo'sh oladi va **status 2** qo'yadi. `resp.status ==
"incomplete"` tekshirilmaydi. `max_output_tokens = 8000` ichiga reasoning
ham kiradi — 10 faylli yoki ko'p listli Excel bilan chegaraga yetish real.
Foydalanuvchi xato ham, "qayta urinish" ham ko'rmaydi; kulrang
"Baholanmadi" bo'sh kartochka chiqadi; eski qiymatlar allaqachon o'chirilgan.

**Yechim:**
1. EKG dagi kabi: `resp.status == "incomplete"` yoki `output_text` bo'sh
   bo'lsa — `RuntimeError("AI javobi to'liq emas (token chegarasi)")`.
2. `json.loads` xatosida ham istisno ko'taring (`{"raw": …}` qaytarmang).
   Istisno `_lab_ai_background` dagi `except` ga tushib status `-1` va
   tarjima qilingan xabar beradi (retry tugmasi chiqadi).
3. Laboratoriya uchun `max_output_tokens` ni oshirish yoki reasoning ni
   `medium` ga tushirishni ko'rib chiqing (`ai_config.py:51,55`).
4. `ai_errors.classify` ga "token chegarasi" turini qo'shing (foydalanuvchi
   xabari: "Fayl juda katta — kamroq varaq bilan qayta yuboring").

**Qabul mezoni:** `output_text = '{"digital_measurements": [{"col'`
(kesilgan) holatida yozuv `status = -1` va tushunarli xabar bilan qoladi.

---

# 🟠 YUQORI

### ✅ L-06 — Prolaktin "мМЕ/л" da 40 dan past bo'lsa ng/mL deb olinadi

**Qayerda:** `python_back/lab_units.py:196`; prompt `lab_analyses_api.py:186`.

**Muammo.** L-01 bilan bir xil: qoida xato blanka uchun, lekin haqiqiy past
prolaktinga ham qo'llanadi (kabergolin olayotgan, gipopituitarizm — 10–40
mIU/L real).
```
harmonize("prolactin", 30, "мМЕ/л", "ng/mL") → 30 ng/mL (erkak me'yori 4–15.2 → "yuqori")
haqiqatda 30 mIU/L ≈ 1.4 ng/mL → "past"
```

**Yechim:** L-01 dagi yondashuv (avtomatik aylantirmaslik → `unit_suspect`,
flag `None`) — ikkalasini bitta umumiy mexanizm bilan qiling. Prompt
satrini ham yumshating.

**Qabul mezoni:** 30 мМЕ/л "yuqori" deb baholanmaydi.

---

### ✅ L-07 — Rus blankalaridagi keng tarqalgan birliklar tanilmaydi → `unit_mismatch`

**Qayerda:** `python_back/lab_units.py:48-60` (`_REPLACEMENTS`), 79-80
(`_COUNT_9`, `_COUNT_12`), 212 (`_IU_EQUIVALENT_COLUMNS`).

**Muammo.** Tanilmagan qiymat baholanmaydi (agar laboratoriya me'yori bo'lmasa),
statistika, dinamika va xavf qoidalariga kirmaydi.

| Yozuv | Ko'rsatkich | `norm_unit` natijasi | Sabab |
|---|---|---|---|
| `млн/мкл` | RBC | `mlн/µl` | "мл" "млн" dan oldin almashtiriladi; `_COUNT_12` dagi `млн/µl` hech qachon mos kelmaydi |
| `ед/л` | ALT, AST, GGT, ALP… | `ед/l` | "ед" → "u" almashtirishi yo'q |
| `МКМЕ/МЛ` (katta harf) | TSH | `мкiu/ml` | "МКМЕ" katta harfda tanilmaydi |
| `mU/mL` | FSH, LH, hCG | `mu/ml` | mIU/mL ga tenglashtirilmagan |
| `kU/L` | IgE | `ku/l` | kU/L = IU/mL ekvivalenti yo'q |
| `x10E9/L` | WBC, PLT | `x10e9/l` | regex `^x?10\^?` ga mos emas |

`ме/л` (kichik harf) — mE yoki ME aniqlab bo'lmaydi, `unit_mismatch`
**to'g'ri**, o'zgartirmang.

**Yechim:**
1. `("млн", "mln")` ni `("мл", "ml")` dan OLDIN qo'ying; `_COUNT_12` ga
   `"mln/µl"` qo'shing (eski `"млн/µl"` ni qoldiring).
2. `("ед", "u")` qo'shing (`u/l` keyin mavjud yo'l bilan ishlaydi).
3. Katta harfli `МКМЕ`, `МКЕД` ni `lower()` dan OLDIN taniydigan qoidaga
   qo'shing (xuddi `мЕ/л` vs `МЕ/л` kabi).
4. `mu/ml` → `miu/ml` faqat FSH/LH/hCG ustunlari uchun (TSH uchun emas).
5. `ku/l` → `iu/ml` (`ige_total` uchun, `_IU_EQUIVALENT_COLUMNS` ga mos).
6. `_COUNT_9` / `_COUNT_12` ni `x10e9/l`, `x10e12/l`, `×10^9/l` ni ham
   qamrab oladigan regex bilan almashtiring.
7. Har bir yozuv uchun birlik testi (`python_back/tests/test_lab_units.py`
   bo'lmasa — yarating).

**Qabul mezoni:** jadvaldagi har bir misol (`ме/л` dan tashqari) `unit_mismatch`
siz katalog birligiga keltiriladi.

---

### ✅ L-08 — Admin/Direktor lab ro'yxatida "AI holati" filtri 500 qaytaradi

**Qayerda:** `backend/EkgAnalyzerApi/Services/LabAnalyseService.cs:207-215`;
xuddi shu: `HolterAnalyseService.cs:195-198`, `SmadAnalyseService.cs:193-196`.

**Muammo.** `ai_answer_data` ustuni `jsonb` (`Models/LabAnalyses.cs:37`).
Npgsql 7 `string.Contains` ni `strpos(ai_answer_data, @p)` ga o'giradi va
parametrni `jsonb` deb yuboradi — PostgreSQL da `strpos(jsonb, jsonb)` yo'q,
`"automatic_analysis_bool": 1` esa yaroqli JSON emas. (SQL EF 7.0.20 /
Npgsql 7.0.18 bilan `ToQueryString()` orqali generatsiya qilib tasdiqlandi;
yakuniy isbot jonli bazada.) Shifokor/hamshira ro'yxatlari allaqachon
`AiSeverityRaw` ishlatadi (339, 495-qatorlar).

**Yechim:**
```csharp
if (automaticAnalysisBool.HasValue)
{
    var val = automaticAnalysisBool.Value.ToString();
    query = query.Where(e => e.AiSeverityRaw == val);
}
```
Uchala servisda (Lab, Holter, SMAD klinika ro'yxati). **CLAUDE.md** dagi
"`automatic_analysis_bool` Filter (`Contains` orqali)" bo'limini ham
yangilang — u endi jsonb ustunlarga to'g'ri kelmaydi.

**Qabul mezoni:** admin sifatida `GET api/lab-analyses/get-by-clinic?automaticAnalysisBool=1`
200 qaytaradi va faqat 1-darajalilarni beradi.

---

### ✅ L-09 — Ro'yxatdagi sana filtri bir kunga siljigan (UTC+5)

**Qayerda:** `backend/EkgAnalyzerApi/Services/LabAnalyseService.cs:169-179`,
320-330, 476-486 (klinika, shifokor, hamshira ro'yxatlari).

**Muammo.** Frontend `YYYY-MM-DD` yuboradi (`LabAnalysesList.js:83-84`),
backend uni UTC yarim tun deb oladi (`SpecifyKind(..., Utc)`). Lekin
`analysis_date` Toshkent yarim tuni = **oldingi kun 19:00Z** bo'lib saqlanadi
(`lab_dates.to_storage`, `useAnalyzerPage.js:178`). 02.11–02.11 filtri
02.11 sanali tahlilni ko'rsatmaydi, 03.11 ni ko'rsatadi. Bundan tashqari
`<= next-day 00:00` chegarasi `<` bo'lishi kerak.

**Yechim:** statistikadagi kabi (`LabStatisticsService.cs:347,352`):
```csharp
if (dateFrom.HasValue)
{
    var from = AppTime.ToUtcFromLocalDate(dateFrom.Value, _config);
    query = query.Where(e => (e.AnalysisDate ?? e.CreatedAt) >= from);
}
if (dateTo.HasValue)
{
    var to = AppTime.ToUtcFromLocalDate(dateTo.Value, _config).AddDays(1);
    query = query.Where(e => (e.AnalysisDate ?? e.CreatedAt) < to);
}
```
Uchala metodda. EKG/Holter/SMAD ro'yxatlarida ham xuddi shu naqsh bormi —
tekshiring va bir xil qiling.

**Qabul mezoni:** 02.11 sanali tahlil 02.11–02.11 filtrida chiqadi,
03.11 sanalisi chiqmaydi.

---

### ⚠️ L-10 — Qayta tahlil paytida xavf signallari o'chadi, shifokor baholari yo'qoladi

**Qayerda:** `python_back/lab_analyses_api.py:405-406` (`clear_lab_values` +
commit AI dan OLDIN), `Services/LabRules/LabRuleWorker.cs:26` (har 60 s),
`LabRuleEngine.cs:191-193` (DELETE), migratsiya `20261102020000_LabRuleSignals.cs:50`
(yangi qator `reviewer_status = 'pending'`).

**Muammo.** Retry yoki fayl almashtirishda qiymatlar o'chiriladi, AI 30–120 s
ishlaydi. Shu oraliqda worker `values_count` o'zgarganini ko'radi, bemorni
shu tahlil qiymatlarisiz baholaydi va undan kelib chiqqan signallarni
o'chiradi. AI tugagach signal qaytadi, lekin `pending` — shifokorning
"tasdiqladim/rad etdim" qarori va izohi yo'qoladi. Retry xato bilan tugasa,
signal butunlay yo'qoladi.

**Yechim:**
1. Worker `FindDirtyAsync` da **statusi 0 yoki 1 bo'lgan lab tahlili bor
   bemorlarni o'tkazib yuborsin** (keyingi siklda qaraladi).
2. Signal o'chirilganda bahoni yo'qotmaslik uchun: DELETE o'rniga
   `is_active = false` (yumshoq o'chirish) va qayta paydo bo'lganda,
   dalil o'zgarmagan bo'lsa (L-19 dagi hash), eski `reviewer_status`
   tiklansin. (Migratsiya kerak — EF orqali.)
3. Minimal variant: faqat 1-band — u asosiy holatni yopadi.

**Qabul mezoni:** tasdiqlangan signalli bemorning tahlilini retry qiling;
AI ishlayotganda va tugagach signal `confirmed` holatida qoladi (dalil
o'zgarmagan bo'lsa).

---

### ✅ L-11 — Bitta qoidada xato bo'lsa, bemorning BARCHA signallari o'chadi

**Qayerda:** `Services/LabRules/LabRuleEngine.cs:126-135` (catch →
`signals = new()`), 191-207 (DELETE + state yozish);
`LabRules.cs:36-40` (`Evaluate` da har qoida uchun try/catch yo'q).

**Muammo.** Istisno bo'lsa bo'sh ro'yxat bilan davom etiladi:
`DELETE … NOT (rule_id = ANY('{}'))` bemorning barcha signallarini
(baholanganlari bilan) o'chiradi, keyin `lab_rule_patient_state` yoziladi —
bemor ma'lumoti o'zgarmaguncha qayta tekshirilmaydi. Bitta qoidaning xatosi
qolgan 23 tasini ham to'xtatadi.

**Yechim:**
1. `LabRules.Evaluate` da har qoidani alohida `try/catch` ga oling, xatoni
   `ILogger` ga yozing (qoida ID va bemor bilan), qolganlari davom etsin.
2. `LabRuleEngine` dagi catch: `return 0;` — **hech narsani o'chirmang va
   state yozmang** (keyingi siklda qayta urinadi).
3. Xato takrorlanaversa siklni bloklamasligi uchun `FindDirtyAsync` ga
   `ORDER BY` qo'shing va xatolik hisoblagichi (masalan, state da
   `error_count`, 3 dan keyin o'tkazib yuborish).

**Qabul mezoni:** bitta qoidaga ataylab istisno qo'shilganda (test) boshqa
qoidalarning signallari saqlanadi va log yoziladi.

---

### ⚠️ L-12 — REN-01 (AKI) va GLU-02 (diabet) butun tarixni ko'radi

**Qayerda:** `Services/LabRules/LabRules.cs:56-86` (Ren01), 180-190 (GLU-02),
155-156 (GLU-01).

**Muammo.**
- **REN-01** barcha tarixiy juftlarni tekshiradi: 2022 da kreatinin 80 → 200,
  keyin hammasi normal — bugun ham `CRITERIA_MET`, severity 3, ro'yxat
  tepasida. AKI — o'tkir holat, eski epizod "shoshilinch" emas.
- **GLU-02** butun tarixdagi istalgan ikkita ≥ 7.0 glyukozani "tasdiqlangan
  diabet" deb oladi; `glucose` ustuniga nahorligi noma'lum (tasodifiy)
  glyukoza ham tushadi (tasodifiy uchun mezon ≥ 11.1). Diabet surunkali,
  shuning uchun to'liq tarix o'zi himoyalanadi — bu **qisman** muammo.

**Yechim:**
1. REN-01: faqat `cur` = oxirgi kreatinin (yoki oxirgi 14 kun ichidagi
   qiymatlar) bo'lgan juftlar `CRITERIA_MET`. Eskiroq epizod — `MONITOR`
   holati, severity 1, matnda "tarixda AKI epizodi (sana)".
2. GLU-02: kamida bitta qiymat oxirgi 12 oy ichida bo'lishi; aks holda
   `MONITOR`. Nahorligi noma'lum bitta qiymat uchun ≥ 11.1 chegarasi
   (klinik maslahatchi bilan kelishilsin).
3. `LabRules.Version` ni oshiring (hammasi qayta hisoblanadi).

**Qabul mezoni:** 2022 dagi AKI + keyin normal qiymatlar → `CRITERIA_MET`
emas.

---

### ✅ L-13 — Qayta tahlildan keyin ESKI natijaning tarjimasi ko'rsatiladi

**Qayerda:** `python_back/lab_analyse.py:91-92` (`clear_ai_answer` faqat
`ai_answer_data` ni tozalaydi), `lab_analyses_api.py:679` (`ai_lang` faqat
`/analyze` da), retry ~815-820, replace-file ~751-757;
`python_back/main.py:2143-2150` (tarjima endpointi keshni qaytaradi).

**Muammo.** Tahlil `uz` da yaratildi, shifokor `ru` da ochdi — ruscha
tarjima keshlandi. Keyin fayl almashtirildi / retry qilindi. Tarjima
endpointi **eski fayl natijasining** ruscha tarjimasini qaytaraveradi.
Retry UI tilida yuboriladi (`ResultCard.js:111`), lekin `ai_lang`
yangilanmaydi — `ru` da kelgan yangi natija `uz` deb hisoblanib, `uz`
so'roviga ruscha matn "asl til" sifatida qaytadi.

**Yechim:**
1. `update_lab_analyse(..., clear_ai_answer=True)` da
   `lab.ai_translations = None` ham qiling.
2. Retry va replace-file da `lab.ai_lang = (lang or 'uz')[:5]`.
3. EKG/Holter/SMAD retry yo'llarini ham tekshiring — xuddi shu muammo
   bo'lishi mumkin.

**Qabul mezoni:** retry dan keyin tarjima so'rovi yangi natijani tarjima
qiladi (`cached: false`).

---

### ✅ L-14 — OpenAI ga yuklangan bemor fayllari hech qachon o'chirilmaydi

**Qayerda:** `python_back/lab_analyses_api.py:267` — `client.files.create(purpose="user_data")`;
`python_back` da `files.delete` ham, `expires_after` ham yo'q.

**Muammo.** Har analyze/retry/replace-file da 10 tagacha tibbiy fayl
(F.I.O., tug'ilgan sana bor) OpenAI saqlash joyida muddatsiz qoladi. O'z DSt
2814:2014 (C4) va shaxsiy ma'lumotlar talablari uchun xavf, qo'shimcha
saqlash kvotasi.

**Yechim:**
1. Yuklangan fayl ID larini yig'ib, javob olingandan keyin `finally` da
   `client.files.delete(file_id)` (xatosi logga, asosiy oqimni buzmasin).
2. Yoki fayllarni yuklamasdan `input_file` ga `file_data` (base64) bilan
   bevosita yuborish — saqlash umuman bo'lmaydi.
3. Boshqa modullarda (EKG PDF, Holter, SMAD, kompleks) ham `files.create`
   bormi — tekshirib, bir xil qiling.
4. Bir martalik tozalash skripti: `client.files.list()` → `purpose=user_data`
   bo'lganlarini o'chirish (loyiha egasi tasdiqlagandan keyin).

**Qabul mezoni:** tahlildan keyin `client.files.list()` da yangi fayl qolmaydi.

---

### ✅ L-15 — Shifokor va hamshira o'zi yuklagan tahlilni o'chira olmaydi (barcha ro'yxatlarda)

**Qayerda:** `frontend/src/pages/cabinet/lab_analyse/LabAnalysesList.js:49-50`;
xuddi shu: `EcgAnalysesList.js:52`, `HolterAnalysesList.js:49`,
`SmadAnalysesList.js:49`, `DiagnosesList.js:32`.

**Muammo.** `canDeleteRow` `row.createdDoctorId` ni tekshiradi, lekin list
DTO larda (`DTOs/AnalysisListDTOs.cs:61-88` va boshqalar) bu maydon yo'q —
faqat `CreatedDoctor { Id, … }`. Shart doim `false`, tugma ko'rinmaydi.
Backend esa ruxsat beradi (`AnalysisDeletionController.cs:69-85`).

**Yechim:** beshala faylda:
```js
|| ((isDoctor || isNurse) && row?.createdDoctor?.id === user?.doctor?.id);
```

**Qabul mezoni:** shifokor sifatida o'zi yuklagan tahlil qatorida o'chirish
tugmasi bor, boshqanikida yo'q.

---

# 🟡 O'RTA

### ✅ L-16 — Retry/replace-file parallel himoyasiz; watchdog qayta tahlilni "muzlagan" deydi

**Qayerda:** `python_back/lab_analyses_api.py` retry (~795), replace-file
(~734); `Controllers/LabAnalyseController.cs:238, 283`;
`Services/StuckAnalysisWatchdog.cs:127` (`CreatedAt < cutoff`).

**Muammo.**
- Status 0/1 bo'lganda ham retry ishga tushadi. Ikki tab yoki ikki
  foydalanuvchi — ikkita pullik AI chaqiruv, keyingisi g'olib;
  `ux_lab_analysis_values_analysis_type` sababli biri IntegrityError → `-1`.
- Watchdog `CreatedAt` ga qaraydi (kompleks uchun `UpdatedAt ?? CreatedAt`,
  101-qator). 30 daqiqadan eski tahlil retry qilinsa, 5 daqiqa ichida `-1`
  "muzlab qoldi" bo'ladi, AI hali ishlayapti. Foydalanuvchi yana retry
  bosadi. EKG/Holter/SMAD ham ta'sirlangan.

**Yechim:**
1. Python retry va replace-file boshida: `status in (0, 1)` va
   `updated_at` 30 daqiqadan yangi bo'lsa → `409 "Tahlil hali davom etmoqda"`.
2. Watchdog `MarkStuckAsync`: `(x.UpdatedAt ?? x.CreatedAt) < cutoff`
   (`IStuckDetectable` ga `UpdatedAt` qo'shing).
3. Frontend 409 xabarini ko'rsatsin.

**Qabul mezoni:** kechagi tahlil retry qilinsa, AI tugaguncha status `-1`
ga o'tmaydi; ikkinchi retry 409 oladi.

---

### ✅ L-17 — Jinsi noma'lum bemorga FSG/LG ning erkak me'yori qo'llanadi

**Qayerda:** `python_back/lab_catalog.py:115-117`; xuddi shu mantiq SQL da:
`Migrations/20261101000000_LabAnalysisValues.cs:410-415`,
`20261102010000_LabNormsReview.cs:92-97`.

**Muammo.** Jins `NULL` da me'yor ikki jins birlashmasi olinadi. FSG/LG da
ayol me'yori ataylab `NULL` (siklga bog'liq) — birlashma erkak 1.4–14 bo'lib
qoladi. Menopauzadagi ayolning FSG 60 si (jinsi kiritilmagan) "yuqori".

**Yechim:** birlashmada biror jinsning shu tomondagi chegarasi `NULL`
bo'lsa — natija ham `NULL`:
```python
lo = None if (m_lo is None or f_lo is None) else min(m_lo, f_lo)
hi = None if (m_hi is None or f_hi is None) else max(m_hi, f_hi)
```
Yangi EF migratsiya: jinsi NULL bemorlarning `flag_source='catalog'`
qatorlarini qayta hisoblash.

**Qabul mezoni:** `flag_for("fsh", 70, None, …)` → `(None, None)`.

---

### ✅ L-18 — Laboratoriya tahlili sahifasida tarjima taklifi va tashxis belgisi chiqmaydi

**Qayerda:** `frontend/src/pages/cabinet/lab_analyse/LabAnalyseView.js:97, 132`;
`DTOs/LabAnalyseDTO.cs`; `Services/LabAnalyseService.cs:614…` (`GetLabAnalyseByIdAsync`).

**Muammo.** Sahifa `data.aiLang` va `data.hasDiagnosis` ni ishlatadi, DTO da
ular yo'q (ustun `ai_lang` modelda bor). `AiLanguageNotice` `null`
qaytaradi — ruscha natijani o'zbek interfeysli shifokor ochsa, tarjima
taklifi yo'q. Tashxis belgisi ham chiqmaydi.

**Yechim:** `LabAnalyseDTO` ga `public string? AiLang` va `public bool HasDiagnosis`;
`GetLabAnalyseByIdAsync` da:
```csharp
AiLang = e.AiLang,
HasDiagnosis = _context.AnalysisDiagnoses.Any(d => d.AnalysisType == "lab" && d.AnalysisId == e.Id),
```
Holter/SMAD by-id DTO larini ham tekshiring (`AiLang` yo'q bo'lishi mumkin).

**Qabul mezoni:** `ai_lang = ru` tahlilni uz interfeysda ochganda tarjima
taklifi chiqadi.

---

### ✅ L-19 — Signallar: bemor ma'lumoti o'zgarsa qayta hisoblanmaydi; dalil o'zgarsa baho qaytarilmaydi

**Qayerda:** `Services/LabRules/LabRuleEngine.cs:44-47` (o'zgarish aniqlash),
160-176 (`reviewer_status` qaytarish sharti).

**Muammo.**
- Faqat `last_value_id`, `values_count`, `rules_version` solishtiriladi.
  Bemor kartasida jins `NULL → ayol` yoki tug'ilgan sana tuzatilsa —
  HEM-01, REN-02 (eGFR), FIB-4 eskicha qoladi.
- Baho faqat `latest_analysis_id` yoki `status` o'zgarsa `pending` ga
  qaytadi. K 5.6 → 6.3 (holat bir xil SUSPECTED, severity 2 → 3, xuddi shu
  tahlil) — "tasdiqlangan" qoladi. CLAUDE.md: "dalil o'zgarsa pending".
  `review_note` ham tozalanmaydi.

**Yechim:**
1. Bemor saqlanganda (`save-patient-data`, `PatcientService`) — shu bemorning
   `lab_rule_patient_state` qatorlarini o'chirish (eng oddiy yo'l).
2. `lab_rule_signals` ga `evidence_hash` (severity + evidence JSON dan
   SHA-256) ustuni (EF migratsiya); ON CONFLICT da `evidence_hash`
   farq qilsa → `pending`, `review_note = NULL`.

**Qabul mezoni:** jins kiritilgandan keyin keyingi siklda HEM-01 qayta
baholanadi; severity o'zgarsa baho `pending`.

---

### ✅ L-20 — Statistika: "oxirgi natijasi me'yordan tashqari" ro'yxati "faqat chetlanganlar" filtri bilan noto'g'ri

**Qayerda:** `Services/LabStatistics/LabStatisticsService.cs:239-250`, 317
(`ValueWhere` `v.flag IN (-1,1)` qo'shadi).

**Muammo.** Flag sharti `DISTINCT ON` dan OLDIN qo'llanadi — oxirgi
**chetlangan** qiymat olinadi, oxirgi qiymat emas. ALT mart: 90, oktabr: 30
→ bemor "hozir me'yordan tashqari" deb chiqadi.

**Yechim:** shu so'rov uchun `vWhere` ni flag shartisiz quring, flag
faqat tashqi `WHERE last.flag IN (-1, 1)` da qolsin (u allaqachon bor).

**Qabul mezoni:** yuqoridagi misolda bemor ro'yxatda yo'q.

---

### ✅ L-21 — Brauzerda jami hajm tekshirilmaydi; 60 MB dan oshsa "AI xizmati bilan bog'lanib bo'lmadi" (502)

**Qayerda:** `frontend/src/components/analyzer/useAnalyzerPage.js:132-151`,
`fileQualityValidator.js:15` (faqat fayl boshiga 25 MB);
`frontend/src/components/shared/FileMismatchBanner.js:44-55` (hech qanday
tekshiruv yo'q); `Controllers/LabAnalyseController.cs:63-74`
(`ReadFormAsync` try ichida).

**Muammo.** 10 × 25 MB = 250 MB brauzerdan o'tadi. 50–60 MB: butun fayl
yuklanadi, keyin Python 400. 60 MB dan ortiq: Kestrel
`BadHttpRequestException` → umumiy `catch` → **502 "AI tahlil xizmati
bilan bog'lanib bo'lmadi"** — chalg'ituvchi. Fayl almashtirishda soni,
hajmi, kengaytmasi umuman tekshirilmaydi (server baribir rad etadi —
faqat UX muammosi).

**Yechim:**
1. Lab uchun `ADD_FILE`/`handleUploadFile` da jami hajm ≤ 50 MB va soni
   ≤ `MAX_LAB_FILES` tekshiruvi, tushunarli xabar (3 tilda).
2. `FileMismatchBanner` da ham xuddi shu tekshiruv + kengaytma.
3. .NET: `catch (BadHttpRequestException ex) when (ex.StatusCode == 413)`
   → `413 { message = "Fayllar jami hajmi juda katta" }`; umumiy catch'dan
   OLDIN. Barcha analyze/replace-file endpointlarida.

**Qabul mezoni:** 3 × 22 MB tanlanganda brauzer darhol "jami 50 MB dan
oshmasin" deydi; API ga 70 MB yuborilsa 413.

---

### ✅ L-22 — Excel: buzilgan xlsx 500 beradi; noto'g'ri `<dimension>` faqat A ustunni o'qiydi

**Qayerda:** `python_back/excel_to_text.py:290-294` (try faqat
`load_workbook` atrofida), `file_validator.py:450-452`,
`lab_analyses_api.py:577-582` (faqat `FileValidationError` ushlanadi).

**Muammo.**
- `read_only=True` da listlar dangasa o'qiladi; buzilgan `sheet1.xml`
  `xml.etree.ElementTree.ParseError` ni try dan TASHQARIDA ko'taradi →
  foydalanuvchiga 500 (tasdiqlangan).
- `ws.reset_dimensions()` chaqirilmaydi. Ba'zi LIS eksportlari
  `<dimension ref="A1"/>` yozadi — faqat A ustun o'qiladi
  ("### Биохимия\nНаименование"), bo'sh deb rad ETILMAYDI, AI ga
  qiymatsiz matn ketadi (tasdiqlangan).

**Yechim:**
1. Listlarni iteratsiya qilishni ham `try/except Exception` ga oling →
   `ExcelReadError("broken")` → `FileValidationError("broken_xlsx")`.
2. Har list uchun `ws.reset_dimensions()` (read-only rejimda haqiqiy
   o'lchamni o'qiydi).
3. Natijada "Результат" ustuni topilmasa — `xlsx_empty` bilan rad etish.

**Qabul mezoni:** buzilgan xlsx → 400 `broken_xlsx`; `<dimension ref="A1"/>`
li to'la fayl to'liq o'qiladi.

---

### ✅ L-23 — Kasallik dinamikasi grafigi laboratoriya me'yorini ishlatmaydi, kodli qiymatlarni chizadi

**Qayerda:** `Controllers/LabValuesController.cs:88-139` (`GetPatientDynamics`),
`frontend/src/components/results/LabDynamicsChart.js`.

**Muammo.** Faqat katalog `NormalMin/Max*` qaytariladi, nuqtalarda
`ref_low/ref_high/flag` yo'q. Assayga xos ko'rsatkichlarda (erkin T3:
klinika 1.2–4.2, katalog 3.1–6.8) grafikdagi me'yor polosasi kartochkaga
zid. `value_kind` filtrlanmaydi — qon guruhi (1..4), rezus (1/0) chiziq
bo'lib chiziladi. Tartib `t.Id` bo'yicha (`SortOrder` emas).

**Yechim:**
1. So'rovga `t.ValueKind == "numeric"` sharti.
2. Har nuqtaga `RefLow`, `RefHigh`, `Flag`, `FlagSource` qo'shing;
   frontend nuqtani flag bo'yicha bo'yasin, polosani laboratoriya me'yori
   bo'lsa undan chizsin.
3. `OrderBy(t => t.SortOrder)`.

**Qabul mezoni:** qon guruhi grafikda yo'q; erkin T3 nuqtasi kartochkadagi
bilan bir xil rangda.

---

### ✅ L-24 — `repair_lab_units.py --apply` sifat natijalarini `UNKNOWN` ga qaytaradi

**Qayerda:** `python_back/repair_lab_units.py:93` →
`lab_analyse.replace_lab_values` (200-202);
`Migrations/20261102000000_LabValueReferenceAndKind.cs:47-59`.

**Muammo.** Birlik izohi chiqqan tahlil uchun BARCHA qatorlar eski JSON dan
qayta yoziladi. Eski JSON dagi sifat kataklarida `result_kind` yo'q →
`UNKNOWN`, flag `NULL`. Migratsiya matndan qo'ygan NEGATIVE/POSITIVE
yo'qoladi (musbat HBsAg statistikadan va INF qoidalaridan tushadi). Dry-run
buni ko'rsatmaydi.

**Yechim:**
1. `replace_lab_values` ga `result_kind` bo'lmasa — migratsiyadagi bilan
   bir xil matn tasnifini qo'llaydigan zaxira funksiya
   (`lab_catalog.classify_qualitative(text, value)`).
2. Yoki repair skripti faqat birligi o'zgargan qatorlarni yangilasin
   (`UPDATE … WHERE id = …`), qolganlariga tegmasin — xavfsizroq.
3. Dry-run hisobotiga "qayta yoziladigan sifat qatorlari soni" qo'shing.

**Qabul mezoni:** `--apply` dan keyin `result_kind` taqsimoti o'zgarmaydi
(oldin/keyin `SELECT result_kind, count(*)`).

---

### ✅ L-25 — Ro'yxatlar tahlil sanasi bo'yicha emas, yuklangan vaqt / ID bo'yicha tartiblanadi

**Qayerda:** `Services/LabAnalyseService.cs:43, 232` (`CreatedAt`), 372, 528
(`Id`); `PdfReportService.cs:488` (umumiy PDF dagi lab ro'yxati).

**Muammo.** CLAUDE.md: ro'yxat `analysis_date` ga tayanadi. Eski arxiv
ommaviy yuklanganda (rejada bor) 2024 yilgi natijalar ro'yxat tepasida
chiqadi; rollar o'rtasida tartib har xil.

**Yechim:** to'rtala joyda
`.OrderByDescending(e => e.AnalysisDate ?? e.CreatedAt).ThenByDescending(e => e.Id)`.

**Qabul mezoni:** yangi yuklangan, lekin 2024 sanali tahlil ro'yxat oxiriga
yaqin.

---

### ✅ L-26 — Signallarni shifokor baholay olmaydi (CLAUDE.md ga zid)

**Qayerda:** `Controllers/LabStatisticsController.cs:115` (rol 2/3 dan
boshqasi 403), `LabSignalsService.cs:83` (`reviewer_name` faqat
`doctors.user_id` orqali — admin baholasa ism bo'sh).

**Muammo.** CLAUDE.md: "shifokor tasdiqlaydi/rad etadi". Kodda faqat
admin/direktor. Bu — **mahsulot qarori kerak**.

**Yechim (variantlar):**
- A) Shifokorga (rol 4) o'ziga yo'naltirilgan bemorlar signallarini ko'rish
  va baholash huquqi (`PatientVisibility` qoidasi bilan); bemor kartasida
  signal bloki.
- B) Hozirgi holat to'g'ri — CLAUDE.md ni "admin/direktor tasdiqlaydi"
  deb tuzatish.
- Har ikkala holatda: `reviewer_name` ni `users` jadvalidan oling (admin
  ismi ham chiqsin).

---

### ✅ L-27 — Qoida bo'shliqlari: glyukoza 6.91–6.99, HbA1c 6.41–6.49, Na < 120

**Qayerda:** `Services/LabRules/LabRules.cs:155-156` (GLU-01), 690-697 (ELE-02).

**Muammo.**
- GLU-01: glyukoza 5.6–6.9, HbA1c 5.7–6.4; GLU-02: ≥ 7.0 / ≥ 6.5.
  Oraliqdagi qiymatlar (6.95; 6.45) hech qaysi qoidaga tushmaydi.
- ELE-02 doim `SUSPECTED`; Na < 120 uchun `CRITICAL` yo'q (ELE-01 da
  K ≥ 6.5 uchun bor). Na ≤ 125 severity 3 (Yevropa yo'riqnomasi < 125).

**Yechim:** GLU-01 sharti `< 7.0` va `< 6.5` (yarim ochiq oraliq); ELE-02 ga
Na < 120 yoki > 160 → `CRITICAL`. `LabRules.Version` ni oshiring. Klinik
maslahatchi bilan tasdiqlansin.

---

# 🔵 PAST

### ✅ L-28 — Birlik mos bo'lsa fiziologik mumkinlik tekshirilmaydi; ba'zi PLAUSIBLE chegaralar noto'g'ri

**Qayerda:** `python_back/lab_units.py:288` (`src == dst` → darhol qaytadi),
221 (PLAUSIBLE).

- Hb 14.5 "g/L" (aslida g/dL) — tekshiruvsiz qabul, "og'ir anemiya" (baland
  ovozli, ko'zga tashlanadi).
- Kalsiy pastki chegarasi 0.5 mmol/L juda keng: 2.3 "mg/dL" (aslida mmol/L)
  → 0.574 mmol/L qabul qilinadi ("kritik gipokalsiyemiya"). Real minimum
  ≈ 1.0.
- Glyukoza yuqori chegarasi 60 mmol/L: 1100 mg/dL (61 mmol/L, HHS) →
  `unit_mismatch`.

**Yechim:** `src == dst` da ham PLAUSIBLE tekshiruvi (tashqarida bo'lsa
`unit_suspect`); kalsiy (1.0, 5.0), glyukoza (0.5, 120).

---

### ✅ L-29 — Python xato ishlovchisida `rollback` yo'q

**Qayerda:** `python_back/lab_analyses_api.py:502-515`.

DB xatosidan (IntegrityError, uzilish) keyin sessiya pending-rollback
holatida; `update_lab_analyse` ham xato beradi va `except Exception: pass`
yutadi — haqiqiy xato logga tushmaydi, yozuv watchdog gacha (≤ 30 daqiqa)
status 0 da. **Yechim:** `db.rollback()` ni catch boshida chaqiring;
ichki `except` da `logger.exception(...)`.

---

### ✅ L-30 — Formadagi tahlil sanasi tekshirilmaydi

**Qayerda:** `python_back/lab_analyses_api.py:674`.

UI dan noto'g'ri format kelmaydi, lekin to'g'ridan-to'g'ri API so'rovida
`fromisoformat` xatosi fayllar diskka yozilgandan KEYIN 500 beradi (yetim
fayllar). Sana `lab_dates.validate` dan o'tmaydi — 1926 kabi xato yil
qabul qilinadi va manba `user` bo'lgani uchun AI hech qachon tuzatmaydi.
**Yechim:** sanani fayllarni saqlashdan OLDIN parse + `lab_dates.validate`;
xato bo'lsa 400.

---

### ✅ L-31 — PDF: qatorlar tartibi va bo'sh sana

**Qayerda:** `Services/PdfReportService.cs:1509` (`ValueType.Id` bo'yicha;
ekranda `SortOrder`), 211-212 → `ComposeAnalysisBlock:1130` (`AnalysisDate`
bo'sh bo'lsa "sana ko'rsatilmagan"; kompleks PDF 568-qatorda `created_at`
ga tushadi).
**Yechim:** `OrderBy(v => v.ValueType.SortOrder)`; `row.AnalysisDate ?? row.CreatedAt`.

---

### ✅ L-32 — Log yozmaydigan catch bloklari va mijozga `ex.Message`

**Qayerda:** `Controllers/LabAnalyseController.cs:102-105` (`ExtractInt`),
`Services/PythonApiProxyService.cs:203-206` — qiymat qaytaradi, lekin log
yo'q (CLAUDE.md: "kamida ILogger"). 502 javoblarida `error = ex.Message`
(73, 268, 308) — ichki host/ulanish matni mijozga chiqadi (18 controllerda
umumiy naqsh).
**Yechim:** `_logger.LogWarning(ex, …)`; javobdan `error` maydonini olib
tashlang (faqat logda).

---

### ✅ L-33 — Ro'yxatda passport bo'yicha qidiruv shifrlangan passportni topmaydi

**Qayerda:** `Services/LabAnalyseService.cs:188-202` (va 365, 521).
Faqat onlayn konsultatsiya orqali yaratilgan bemorlar (shifrlangan)
topilmaydi. `PatcientService.cs:170` dagi kabi `TryDecrypt` ishlating.

---

### ✅ L-34 — Statistikada kodli qiymatlarning o'rtachasi hisoblanadi

**Qayerda:** `Services/LabStatistics/LabStatisticsService.cs:298`
(`Comparable` da `value_kind` sharti yo'q), frontend `StatsIndicators.js:99-100, 219-220`.
Qon guruhi va rezus uchun mediana, P10–P90, gistogramma ma'nosiz.
**Yechim:** `AND t.value_kind = 'numeric'`; sifat/kod ko'rsatkichlari uchun
taqsimot (NEGATIVE/POSITIVE soni) ko'rsatilsin.

---

### ✅ L-35 — Gistogramma chekka ustunlari noto'g'ri nomlangan

**Qayerda:** `LabStatisticsService.cs:196`. p01 dan past va p99 dan baland
qiymatlar 1- va 20-ustunga qo'shiladi, lekin yorlig'i p01/p99 oralig'i.
**Yechim:** chekka ustun yorlig'i "< p01" / "> p99".

---

### ⚠️ L-36 — Ru/En interfeysida o'zbekcha matnlar

**Qayerda:** `LabAnalysesList.js:221` ("Yangi"), `LabAnalyzer.js:64`
(`'Laboratoriya tahlil'` — `AnalysisProgressFloat.js:56/74/113` da "tayyor!",
"xatolik bilan tugadi" bilan), `statistics/statsCommon.js:73-99`
(`RULE_LABELS`), signal matnlari faqat `title_uz/message_uz/recommendation_uz`.
**Yechim:** `t()` kalitlari (Uz/Ru/En); `RULE_LABELS` ni `SEVERITY_META` kabi
3 tilli qiling. Signal matnlari uchun — alohida qaror (backendda 3 til yoki
frontendda qoida ID bo'yicha shablon).

---

### ✅ L-37 — Ro'yxat polling'ida eski javob yangisini bosib ketadi

**Qayerda:** `LabAnalysesList.js:76-99, 150`. Har 10 s so'rov, bekor
qilish yo'q; filtr o'zgarganda kech kelgan eski javob `setData` qiladi.
`mark_lab_viewed` har sahifa almashganda qayta chaqiriladi.
**Yechim:** `AbortController` yoki so'rov tartib raqami (`reqId` ref) —
faqat oxirgisini qabul qilish.

---

### ✅ L-38 — Teskari laboratoriya me'yori (min > max) ekranda ishlatiladi, bazada esa yo'q

**Qayerda:** frontend `AnalysisResultBody.js:280-289`, 138-139; Python
`lab_analyse.py:209-210` (bazaga yozishda tashlab yuboriladi), JSON da qoladi.
Ekranda "Past · norma 40–20 (laboratoriya)", PDF/statistika katalog bo'yicha.
**Yechim:** Python `_measurements_to_dict` da ham teskari me'yorni olib
tashlang; frontendda `min > max` bo'lsa `labRef` ni e'tiborsiz qoldiring.

---

### ✅ L-39 — Bir vaqtda yuborilgan ikkita bir xil yuklash takror tekshiruvidan o'tadi

**Qayerda:** `lab_analyses_api.py:652-667` (`check_many` → insert, qulf yo'q;
`ix_*_patcient_file_hash` unique emas). Oyna millisekundlar — ehtimoli juda past.
**Yechim:** `pg_advisory_xact_lock(hashtext('lab:' || patcient_id))` tekshiruv
va insert atrofida.

---

### ✅ L-40 — EF ModelSnapshot eskirgan (ma'lum holat)

**Qayerda:** `Migrations/EkgDataDBModelSnapshot.cs` — `LabAnalysisFile`,
`LabAnalysisValue`, `lab_value_types` ning yangi ustunlari (shuningdek
`CombinedAnalyses`, `DischargeSummaries`) yo'q. Migratsiyalar ataylab qo'lda
yozilmoqda (`20260907000000:16`). Xavf: kimdir `dotnet ef migrations add`
qilsa — mavjud jadvallarni qayta yaratishga urinadi.
**Yechim:** snapshot'ni bir marta yangilash (bo'sh migratsiya generatsiya
qilib, `Up/Down` ni tozalab, faqat snapshot'ni saqlash) yoki CLAUDE.md ga
"`migrations add` ishlatmang, qo'lda yozing" ogohlantirishi.

---

### ✅ L-41 — `models.py` da eskirgan izoh

**Qayerda:** `python_back/models.py:77-80` — "87 ustun bazada zaxira
sifatida turibdi". Ular `20261103000000_LabAnalysisDateSource` da o'chirilgan.
Kod ularni o'qimaydi/yozmaydi — faqat izohni tuzating.

---

## Qo'shimcha kuzatuv (task emas, e'tibor uchun)

- `harmonize("glucose", 8, "mg/dL")` → 8 mmol/L ("birlik nomi xato" zaxirasi,
  `lab_units.py:300`). Natija to'g'ri, faqat 8 mg/dL fiziologik mumkin
  bo'lmagani uchun. 20–60 mg/dL (gipoglikemiya) to'g'ri aylantiriladi.
- Agar AI AQSh blankasidagi **BUN** (mg/dL) ni `urea` ga yozsa, natija ≈ 2.14×
  past chiqadi (urea molyar massasi 60.06, BUN uchun 28.01). Promptda
  "BUN ≠ mochevina" eslatmasi foydali bo'lishi mumkin (tasdiqlanmagan).

## Tekshirildi — to'g'ri ishlaydi

- `MAX_LAB_FILES = 10` Python va frontendda bir xil; `.xls` rad etiladi, `.xlsx` qabul.
- Frontend Python ga bevosita murojaat qilmaydi.
- Forma sanasi (`user`) AI tomonidan almashtirilmaydi.
- Statistika: SQL injection yo'q, klinika izolyatsiyasi, rol 2/3, `unit_mismatch` chiqariladi, sana filtri Toshkent vaqti bilan to'g'ri.
- CKD-EPI 2021, FIB-4, KDIGO, kaliy, anemiya (WHO 2024), B12, NT-proBNP, triglitserid chegaralari to'g'ri.
- INF-02: EQUIVOCAL POSITIVE bilan birlashtirilmaydi.
- Jins `NULL` "ayol" deb ko'rsatilmaydi (`=== true/false`).
- Molyar massalar (glyukoza, xolesterin, kreatinin, mochevina, bilirubin, Ca, vitamin D…) to'g'ri; "мЕ/л" vs "МЕ/л" `lower()` dan oldin farqlanadi.
- Barcha lab controllerlarda `[Authorize]`; GetById, retry, replace-file, PDF klinika bo'yicha cheklangan.
- `lab_analysis_files` va `lab_analysis_values` da `ON DELETE CASCADE` va soft-delete filtri bor.
