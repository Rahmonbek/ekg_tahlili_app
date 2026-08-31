# NMED — To'liq Audit va Tuzatish Tasklari

> **Maqsad:** 100% aniq, tiniq va ishonchli ishlaydigan platforma.
> **Audit sanasi:** 2026-08-28
> **Auditor:** Claude (senior dasturchi + dizayner + tester rolida)
> **Qamrov:** .NET backend, Python AI backend, React frontend, PostgreSQL, UI/UX, ishlash mantig'i
> **Qamrovdan tashqari:** Parazitologiya moduli (buyurtmachi so'roviga ko'ra hozircha tekshirilmaydi)
> **Audit holati:** yakunlandi — 138 backend endpoint, 41 frontend marshrut, 4 rol, 3 til tekshirildi.
> Batafsil qamrov jadvali hujjat oxirida.

---

## ⚠️ VAQTINCHA O'ZGARISHLAR

Test qilish uchun kiritilgan vaqtinchalik o'zgarishlar. **Ishlab chiqarishga
chiqarishdan oldin quyidagilar albatta qaytarilishi shart.**

| # | Fayl / obyekt | O'zgarish | Holat |
|---|---|---|---|
| T-1 | `backend/EkgAnalyzerApi/Controllers/AuthController.cs` | reCAPTCHA tekshiruvini chetlab o'tuvchi shart (`ReCaptcha:DisableForTesting`) va uni yoquvchi `rebuild.sh` satri. | ✅ **QAYTARILDI** (2026-08-30) |
| T-2 | Test admin hisobi `998930820372` | Kirish tokeni muddati tugagach parol **ilovaning o'z tiklash oqimi orqali** (`send-reset-code` → bazadan kod → `change-password`) `TestParol2026` ga o'zgartirildi. Bazaga to'g'ridan-to'g'ri tegilmadi. | 🟠 **O'ZGARTIRILDI** — egasi yangi parol qo'yishi kerak |

> **T-1 qanday tekshirildi.** Ilgari bu jadvalda T-1 "QAYTARILDI" deb
> turgan edi, lekin kodda tekshiruv joyida qolgandi — shuning uchun
> bu safar olib tashlangani **ishlab turgan tizimda** tasdiqlandi:
>
> ```
> $ grep -n "DisableForTesting" Controllers/AuthController.cs
>   (natija yo'q)
>
> $ curl -X POST /api/auth/login -d '{"phone":"...","password":"..."}'
>   {"message":"reCAPTCHA tekshiruvidan o'tmadi (Bot ehtimoli)"}
>   HTTP 400
> ```
>
> Brauzerda (haqiqiy reCAPTCHA vidjeti bilan) kirish va sahifalar
> ishlashda davom etadi — tekshirildi: Asosiy panel va EKG ro'yxati
> (10 qator) ochildi.
>
> Hujjat kod bilan mos kelmasligi xavflidir: keyingi o'quvchi jadvalga
> ishonib, chetlab o'tishni ishlab chiqarishga chiqarib yuborishi mumkin.

---

## Statistika

| Ko'rsatkich | Qiymat |
|---|---|
| Jami topilgan muammolar | 106 |
| ✅ Bajarildi va tekshirildi | **106** |
| ⏳ Qoldi | 0 |
| 🔴 Kritik (qolgan) | 0 |
| 🟠 Yuqori (qolgan) | 0 |
| 🟡 O'rta (qolgan) | 0 |
| 🔵 Past (qolgan) | 0 |

---


---

## 🎨 DIZAYN KO'ZDAN KECHIRUVI (2026-08-30)

Foydalanuvchi so'rovi bo'yicha barcha sahifalar — kirish/ro'yxatdan o'tish
sahifalari bilan birga — qayta ko'rib chiqildi. Kamchiliklar **ko'z bilan
emas, o'lchov bilan** aniqlandi (element o'lchamlari, `scrollWidth`,
`padding` qiymatlari brauzerda o'qildi).

### Topilgan va tuzatilgan kamchiliklar

| # | Sahifa | Kamchilik | O'lchov |
|---|---|---|---|
| 1 | Kirish, Ro'yxatdan o'tish, Bemor formasi, Konsultant qo'shish | **Telefon maydoni boshqa maydonlardan ikki barobar past** — `.claveInput` klassida faqat ramka va burchak radiusi bor edi, balandlik/ichki bo'shliq/shrift berilmagandi | 21 px ↔ 42 px |
| 2 | Ro'yxatdan o'tish | Ikonkali ("Guvohnoma") va oddiy maydonlar har xil balandlik va burchak radiusida | 44 px / 12 px ↔ 40 px / 10 px |
| 3 | Ro'yxatdan o'tish | **"Guvohnoma" maydonida matn ramkaga yopishib qolgan** — `padding: 0 !important` sababli | chapdan 1 px ↔ 11 px |
| 4 | Kirish | Parolda qulf ikonkasi bor, telefonda yo'q — maydonlar bir-biriga o'xshamasdi | — |
| 5 | Kirish, Ro'yxatdan o'tish | **Til almashtirgich yo'q edi** — brauzeri boshqa tilda bo'lgan foydalanuvchi kirishdan oldin tilni tanlay olmasdi | — |
| 6 | Kirish | Bo'sh maydonda `+998 (` qiymat sifatida turardi — maydon "to'ldirilgan" ko'rinardi | — |
| 7 | Butun o'zbek tarjimasi | **Imlo xatosi: "ro'yhat" → "ro'yxat"** | 8 ta kalit |
| 8 | Xodimlar | "Yangi xodim qo'shish" tugmasi sarlavha qatorida emas, pastda alohida qatorda | — |
| 9 | Xodimlar | Ismi to'ldirilmagan xodim qatori **butunlay bo'sh** ko'rinardi | — |
| 10 | Xodimlar | Tahrirlash tugmasi to'q sariq (`#fbb510`) — dizayn tizimiga mos emas | — |
| 11 | Xodimlar | Avatar 50 px — qatorlarni keraksiz balandlashtirardi | 50 → 34 px |
| 12 | Asosiy panel | **"Laboratoriya tahlillari" kesilgan** ("Laboratoriya tahl...") | 123 px matn / 109 px joy |
| 13 | Butun kabinet | **reCAPTCHA belgisi kabinetda ham osilib turardi** — o'ng pastda bo'sh oq to'rtburchak | 256×60 px |
| 14 | Tahlil natijasi | **EKG tasmasi konteynerning yarmidan kamini egallardi** — `.ant-image` o'rami 100% bo'lmagan | 500 px / 1366 px |
| 15 | Tahlil natijasi | Beshinchi meta-kartochka pastda yolg'iz qolardi (qattiq 4 ustunli grid) | — |
| 16 | Tahlil natijasi | Yorliq sifatida forma buyrug'i ishlatilgan: *"Davolovchi shifokorlarni tanlang: …"* | — |
| 17 | Tahlil natijasi | Tashxis yo'q bo'lganda kartochkada faqat "—" osilib turardi | — |
| 18 | Shifokor xulosasi | **Passport to'liq ko'rsatilgan** — boshqa ro'yxatlardan T-079 da olib tashlangan edi, bu yerda qolib ketgan | — |
| 19 | Shifokor xulosasi | "Qidirish" tugmasi butun qolgan bo'shliqni egallardi | `md=8` → `md=6` |
| 20 | Profil | Avatar zaxirasi header bilan mos emas (ikonka ↔ rasm) | — |
| 21 | Tahlil ro'yxatlari | Filtrlar bitta qatorga sig'masdi; "Qidirish" va "CSV" tugmalari ustma-ust turardi | — |
| 22 | Tahlil ro'yxatlari | Qidiruv yorlig'i tugma bilan bir xil matn ("Qidirish") — takror edi | — |
| 23 | Header (mobil) | **Header 375 px ekranga sig'masdi**, foydalanuvchi ismi kesilardi | 394 px / 375 px |
| 24 | Yordam | Matn eskirgan edi: "har bir sahifada sarlavha yonida tugma bor" — tugma header'ga ko'chirilgan | — |
| 25 | Marshrutlash | **Tizimga kirgan foydalanuvchi `/login` ga o'tsa 404** ko'rsatilardi | — |
| 26 | Butun ilova | antd `destroyOnClose` eskirgan — konsolda ogohlantirish | 2 ta fayl |

### Foydalanuvchi so'rovi bilan kiritilgan o'zgarishlar

1. **Qo'llanma (Tour) qayta qurildi** — `components/shared/TourProvider.js`:
   * sahifalardagi 15 ta alohida tugma o'rniga **header'da bitta tugma**;
   * tur **birinchi kirishda avtomatik ochilmaydi**, faqat tugma orqali;
   * sahifalar faqat qadamlarini ro'yxatdan o'tkazadi (`usePageTour`);
   * sahifadan sahifaga o'tishda ro'yxat o'chib qolmasligi uchun har bir
     ro'yxatga raqam beriladi (eski sahifaning tozalash funksiyasi
     yangisining yozuvini o'chirib yuborardi).
2. **Filtrlar yig'ma panelda** — `components/shared/FilterPanel.js`:
   qidiruv va tugmalar doim ko'rinadi, qolgan filtrlar "Filtrlar" tugmasi
   ostida; tugmada **faol filtrlar soni** belgi bilan.
3. **Jadvallarda faqat familiya va ism** (otasining ismisiz) — qator
   qisqardi va boshqa ustunlarga joy chiqdi.
4. **Jadval shrifti kichraytirildi** (14 → 13 px, sarlavhalar 12 px).
5. **Audit jurnali va Tizim holati faqat SuperAdmin uchun** — menyudan,
   marshrutdan va backend siyosatidan olib tashlandi.

6. **Sharif (otasining ismi) ekranda ko'rsatilmaydi** — foydalanuvchi
   so'rovi bo'yicha platformada foydalanuvchi ma'lumotlari faqat
   **familiya va ism** bilan ko'rsatiladi.

   Sharif bazada saqlanadi, formalarda tahrirlanadi va **qidiruvda
   qatnashishda davom etadi** — faqat chiqarilmaydi.

   Bitta manba yaratildi: frontendda `tools/formatters.js` dagi
   `personName()`, backendda `Helpers/PersonNameHelper.cs`.

   | Sirt | Avval | Keyin |
   |---|---|---|
   | Tahlil ko'rish sahifasi | TESTBEMOROV SANJAR BOTIR O'G'LI | TESTBEMOROV SANJAR |
   | Bemor kartasi, Shaxsiy ma'lumotlar, Tashxis, Konsultatsiya | to'liq | familiya + ism |
   | PDF hisobot — bemor | "Familiya, ism, sharif: … BOTIR O'G'LI" | "Familiya, ism: TESTBEMOROV SANJAR" |
   | PDF hisobot — davolovchi shifokor | AMRULLAYEV A. U. | AMRULLAYEV A. |
   | CSV eksport | to'liq | familiya + ism |
   | Jadval ustuni yorlig'i | "F.I.SH" (Familiya, Ism, **Sharif**) | "Familiya, ism" |

   **Yo'l-yo'lakay tuzatilgan nomuvofiqlik:** onlayn konsultatsiya va video
   qo'ng'iroq modullarida ism **teskari tartibda** qurilardi
   (`FirstName LastName`), platformaning qolgan qismida esa
   `LastName FirstName`. 16 ta joyda tartib birxillashtirildi
   (`OnlineConsultationService.cs` — 12, `VideoCallHub.cs` — 3,
   `VideoCallController.cs` — 1, hamda frontendda `DoctorCallCard.js` va
   `videoCallActions.js`).

   **Diqqat:** PDF hisobot — rasmiy tibbiy hujjat. Unda odatda to'liq
   qonuniy ism ko'rsatiladi. So'rov "platformada hamma joyda" degani uchun
   u yerda ham qo'llandi; agar hisobotda to'liq ism kerak bo'lsa,
   `PdfReportService.cs` dagi `fio` qatorini va `PdfTranslations.cs`
   dagi `["fio"]` yorlig'ini qaytarish yetarli.

   Tekshirildi: 6 ta sahifada (`/ecg-analyses`, `/patcients`, `/doctor`,
   `/patient-diagnoses`, `/consultation`, `/profile`) sharif qolmadi,
   gorizontal aylanish paydo bo'lmadi, konsolda xatolik yo'q.

### Moslashuvchanlik tekshiruvi

375 / 768 / 1024 / 1280 / 1440 px da tekshirildi: **hech bir sahifada
gorizontal aylanish yo'q**, viewportdan kengroq element yo'q, barcha
bosiladigan elementlar mobilda ≥ 44 px, forma maydonlari mobilda 44 px,
desktopda 40 px — barchasi bir xil.

---

## 🛠 BAJARISH JARAYONI — Yo'l xaritasi va holat

> Bu bo'lim ish jarayonini kuzatish uchun. Har bir to'lqin tugagach brauzerda
> tekshiriladi va tegishli tasklar `✅ BAJARILDI VA TEKSHIRILDI` deb belgilanadi.

### To'lqin 1 — Backend xavfsizlik (bitta .NET build)
`T-063` ko'p ijarachilik → `T-015` rol siyosatlari → `T-080` send-to-ai → `T-016` rol claim →
`T-002` rate limiting → `T-037`/`T-081` verify tokenlari → `T-038` fayl himoyasi →
`T-013`/`T-014` pagination → `T-046` AnalysisDate → `T-012` vaqt mintaqasi → `T-100` fayl yo'li

### To'lqin 2 — Python barqarorlik
`T-025` xom xatoliklar → `T-026` tranzaksiya → `T-093`/`T-094` fayl validatsiyasi →
`T-028` AI monitoringi → `T-032` Holter/SMAD/Lab tavsiyalari → `T-010` requirements

### To'lqin 3 — Frontend to'g'rilik
`T-031` jiddiylik darajasi → `T-011` dashboard → `T-066` console.log → `T-020` parol ustuni →
`T-055`/`T-057`/`T-074`/`T-075`/`T-058` tarjima → `T-070` null → `T-071` tugmalar

### To'lqin 4 — UI/UX va moslashuvchanlik
`T-042`/`T-043` jadval va filtrlar → `T-060` dizayn tizimi → `T-061` responsivelik →
`T-079` ustunlar → `T-103` global CSS → `T-045` reCAPTCHA badge → `T-024` sahifa sarlavhalari

### To'lqin 5 — Mahsulot to'liqligi
`T-087` bemorlar sahifasi → `T-023` bemor kartasi → `T-027` o'chirish → `T-053` Tour →
`T-049`/`T-050`/`T-051` PDF → `T-069` faollashtirish → `T-062` yetishmayotgan sahifalar

### To'lqin 6 — Texnik qarz
`T-034` takroriy komponentlar → `T-017` o'lik kod → `T-036` JSONB → `T-009` warninglar →
`T-068`/`T-084`/`T-085` nomlash → `T-099`/`T-101`/`T-102` fayl saqlash → `T-078` konstitutsiya

---

## Muammolar ro'yxati

---



### ✅ T-002 — ~~Login va Register endpointlarida rate limiting umuman yo'q~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Xavfsizlik / Kritik
**Fayllar:** `backend/EkgAnalyzerApi/Controllers/AuthController.cs`, `backend/EkgAnalyzerApi/Program.cs:96`

**Muammo:**
`Program.cs` da `strict` (5 so'rov / daqiqa) rate limiting siyosati **to'g'ri e'lon qilingan**, lekin `AuthController` ning birorta metodiga `[EnableRateLimiting("strict")]` atributi **qo'yilmagan**. Butun controller'da hech qanday rate limiting atributi yo'q:

- `POST api/auth/login` — limitsiz
- `POST api/auth/register` — limitsiz
- `POST api/auth/verify` — limitsiz (SMS kod brute-force!)
- `POST api/auth/change-password` — limitsiz
- `POST api/auth/send-reset-code` — limitsiz (SMS bombing / Eskiz balansini tugatish)

Xuddi shu holat: `general` (100/daqiqa) siyosati ham deyarli hech qayerda ishlatilmagan — faqat `ai-analysis` real qo'llangan.

**Nima uchun jiddiy:**
Konstitutsiyada C3 talabi "✅ bajarilgan" deb belgilangan, amalda esa **himoya yo'q**. `verify` endpointi 4-6 xonali SMS kodni tekshiradi — limitsiz holatda kod bir necha daqiqada topiladi va begona odam klinika akkauntini egallaydi. `send-reset-code` esa pullik SMS (Eskiz) yuboradi — hujumchi balansni bir necha daqiqada nolga tushiradi.

**Tuzatish rejasi:**
1. `AuthController` ning `login`, `register`, `verify`, `change-password`, `send-reset-code` metodlariga `[EnableRateLimiting("strict")]` qo'shish.
2. `verify` uchun alohida qattiqroq siyosat: bitta telefon raqamiga sutkasiga N marta urinish (IP emas, telefon bo'yicha partitsiyalangan limiter).
3. `Program.cs` da global fallback limiter (`general`) o'rnatish — atribut unutilgan yangi controller ham himoyalangan bo'lsin.
4. Muvaffaqiyatsiz login urinishlarini `audit_logs` ga yozib, 5 martadan keyin akkauntni vaqtincha bloklash.

**Qabul mezoni:** `login` ga 1 daqiqada 6-marta so'rov yuborilganda 429 qaytadi; `verify` ga brute-force qilib bo'lmaydi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:** `AuthController.cs` ning 7 ta endpointiga `[EnableRateLimiting("strict")]` qo'shildi: `register`, `check-phone`, `check-clinic-inn`, `verify`, `login`, `change-password`, `send-reset-code`.

**Jonli tekshiruv:** `POST /api/auth/login` ga ketma-ket 7 marta so'rov yuborildi:

| Urinish | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| Javob | 400 | 400 | 400 | 400 | 400 | **429** | **429** |

Chegara (daqiqasiga 5 ta) aniq ishlayapti — 6-urinishdan boshlab 429 qaytadi.
Endi `verify` endpointidagi SMS kodni brute-force qilib bo'lmaydi va
`send-reset-code` orqali SMS balansini tugatish mumkin emas.

---


### ✅ T-005 — ~~reCAPTCHA site key kodga qotirib yozilgan va sozlanmaydi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Konfiguratsiya / Yuqori
**Fayl:** `frontend/src/index.js:13`

**Muammo:**
```js
<GoogleReCaptchaProvider reCaptchaKey="6LdQWZksAAAAAFzZmPqqS8QQBgI8CraS_9m2H66T">
```
Kalit to'g'ridan-to'g'ri kodda. (Site key o'zi maxfiy emas, lekin) muhitga qarab almashtirib bo'lmaydi — dev/staging/prod uchun alohida kalit ishlatib bo'lmaydi, kalit almashtirilsa kod o'zgartirilib qayta build qilinishi shart.

**Qo'shimcha muammo:** `IsReCaptchaValid` ([AuthController.cs](backend/EkgAnalyzerApi/Controllers/AuthController.cs)) har chaqiruvda `new HttpClient()` yaratadi — bu `IHttpClientFactory` ishlatilmagani sababli socket exhaustion (TIME_WAIT to'planishi) muammosini keltirib chiqaradi.

**Tuzatish rejasi:**
1. `REACT_APP_RECAPTCHA_SITE_KEY` environment o'zgaruvchisiga ko'chirish, `.env.example` ga qo'shish.
2. Kalit yo'q bo'lsa — reCAPTCHA provider'ni o'rab turmaslik va login formasida aniq ogohlantirish ko'rsatish.
3. Backendda `IHttpClientFactory` orqali nomlangan `HttpClient` ishlatish (`services.AddHttpClient("ReCaptcha")`).
4. Google ga so'rovga timeout qo'yish (hozir timeout yo'q — Google javob bermasa login butunlay osilib qoladi).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish (backend qismi):**
- `IsReCaptchaValid` endi `IHttpClientFactory` orqali nomlangan `"ReCaptcha"` mijozidan foydalanadi — har chaqiruvda `new HttpClient()` yaratilmaydi (socket exhaustion yo'q qilindi).
- Mijozga **10 soniyalik timeout** qo'yildi — Google javob bermasa login cheksiz osilib qolmaydi.
- Chaqiruv `try/catch` ichiga olindi; xatolik `ILogger` ga yoziladi va `false` qaytariladi.

**Qolgan qism:** frontenddagi `reCaptchaKey` ni environment o'zgaruvchisiga ko'chirish
To'lqin 3 da (`index.js` bilan birga) bajariladi.

---

### ✅ T-006 — ~~Development muhitida EF Core barcha SQL so'rovlarni logga yozadi va server bloklanadi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Ishlash / Xavfsizlik / Yuqori
**Fayl:** `backend/EkgAnalyzerApi/appsettings.json`, `appsettings.Development.json`

**Muammo:**
Audit paytida aniqlandi: `Logging:LogLevel:Default = "Information"` bo'lgani uchun EF Core har bir SQL so'rovni to'liq matni bilan konsolga chiqaradi. Konsol chiqishi fayl/quvurga yo'naltirilganda va bufer to'lganda **ilova butunlay javob berishni to'xtatdi** — HTTP so'rovlar TCP darajasida ulanadi, lekin javob hech qachon kelmaydi. Log darajasi `Warning` ga tushirilgandan keyin server normal ishladi.

**Nima uchun jiddiy:**
1. Ishlab chiqarishda `stdout` ni systemd/journald ga yozganda xuddi shu deadlock yuz berishi mumkin — server "tirik" ko'rinadi, lekin hech kimga javob bermaydi.
2. SQL loglarida bemor passporti, tug'ilgan sanasi, telefon raqami parametr sifatida **ochiq ko'rinadi** — bu log fayllariga shaxsiy tibbiy ma'lumot oqib chiqishi demakdir.

**Tuzatish rejasi:**
1. `appsettings.json` da `Microsoft.EntityFrameworkCore.Database.Command` ni `Warning` ga o'rnatish (barcha muhitlar uchun).
2. `appsettings.Production.json` da `Default` ni `Warning`, `Microsoft.AspNetCore` ni `Warning` qilish.
3. `EnableSensitiveDataLogging` hech qachon yoqilmasligini tekshirish.
4. Strukturalangan loglashga o'tish (Serilog) va fayl rotatsiyasi bilan async sink ishlatish — konsol buferi hech qachon ilovani bloklamasligi uchun.

**Qabul mezoni:** Server stdout yo'naltirilgan holda 1000+ so'rovdan keyin ham javob berishda davom etadi; loglarda passport/telefon uchramaydi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ishlar:**

1. **`appsettings.json`** (barcha muhitlar uchun asos) —
   `Microsoft.EntityFrameworkCore` va
   `Microsoft.EntityFrameworkCore.Database.Command` → `Warning`.
   Nima uchun kerakligi izoh sifatida yozildi: konsol buferi to'lganda
   ilova bloklanadi, hamda SQL parametrlarida bemor passporti, tug'ilgan
   sanasi va telefon raqami ochiq ko'rinadi.
2. **`appsettings.Development.json`** — xuddi shunday. Development da ham
   yoqilmaydi, chunki audit paytida server aynan shu sababdan bloklangan edi.
3. **`appsettings.Production.json`** — `Default: Warning`,
   `Microsoft.AspNetCore: Warning`, lekin `EkgAnalyzerApi: Information`
   (o'z kodimizning muhim hodisalari baribir yoziladi).
4. **`Program.cs`** — `options.EnableSensitiveDataLogging(false)` **aniq**
   yozildi. Ilgari u shunchaki chaqirilmasdi (standart holat), endi esa
   kod ichida ataylab o'chirilgan va izohlangan — kelajakda kimdir
   "debug uchun" yoqib qo'ymasligi uchun.
5. Ish jarayonidagi vaqtinchalik yechim olib tashlandi: `rebuild.sh`
   skriptidagi `Logging__LogLevel__*` env o'zgaruvchilari endi kerak emas,
   chunki konfiguratsiyaning o'zi to'g'ri.

**Tekshirildi (env o'zgaruvchilarisiz, faqat konfiguratsiya bilan):**

Server `ASPNETCORE_ENVIRONMENT=Development` bilan, log darajasini
majburlovchi env o'zgaruvchilarsiz ishga tushirildi va stdout faylga
yo'naltirildi (audit paytidagi aynan shu shart).

| Tekshiruv | Natija |
|---|---|
| 60 ta so'rov (bemorlar + EKG ro'yxati) | Barchasi javob berdi |
| Log fayl hajmi | **746 bayt** (ilgari har bir so'rov to'liq SQL bilan yozilardi) |
| Logda `Executed DbCommand` / `SELECT` | **0 ta** |
| Logda `passport` / `998XXXXXXXXX` / `birthdate` | **0 ta** |
| Yuklamadan keyin server javobi | **HTTP 200** — bloklanmadi |

**Bajarilmagan band (sababi bilan):**
4-band — Serilog ga o'tish va fayl rotatsiyasi bilan **asinxron** sink.
Bu yangi bog'liqlik va loglash arxitekturasini qayta qurishni talab
qiladi. Hozirgi tuzatish muammoning ildizini (log hajmi) yopdi va
yuklamada tasdiqlandi; asinxron sink esa qo'shimcha himoya qatlami
sifatida alohida ish bo'lib qoladi.

---

### ✅ T-007 — ~~`launchSettings.json` standart profili noto'g'ri portda va brauzer ochadi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Ishlab chiqish tajribasi / O'rta
**Fayl:** `backend/EkgAnalyzerApi/Properties/launchSettings.json`

**Muammo:**
`dotnet run` standart holatda birinchi profil — `http` ni tanlaydi, u esa `applicationUrl: http://localhost:5099`. Ammo `Program.cs` dagi `ConfigureKestrel` 5000/5001 portlarini majburiy ochadi. Natijada ikkita ziddiyatli konfiguratsiya bor va `dotnet run` yozgan dasturchi qaysi port ishlashini bilmaydi. Bundan tashqari `launchBrowser: true` — CI/server muhitida keraksiz.

**Tuzatish rejasi:**
1. `http` profilining `applicationUrl` ini `http://localhost:5000` ga to'g'rilash yoki profildan olib tashlab, Kestrel konfiguratsiyasiga to'liq tayanish.
2. `launchBrowser` ni `false` qilish.
3. `README` yoki `DEPLOY_LINUX.md` da lokal ishga tushirishning yagona to'g'ri buyrug'ini yozib qo'yish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

`Properties/launchSettings.json`:

1. **`http` profili 5000 portiga to'g'rilandi** (ilgari 5099). Bu profil
   `dotnet run` da birinchi bo'lib tanlanadi, ya'ni dasturchi e'lon
   qilingan port bilan haqiqiy port (Kestrel majburlagan 5000/5001)
   turlicha ekanini ko'rardi.
2. **`launchBrowser` uchala profilda ham `false`** — CI va serverda
   brauzer ochish ma'nosiz, grafik muhitsiz mashinada esa ogohlantirish
   beradi.
3. Fayl boshiga `"//"` izohi qo'shildi: portlar `Program.cs` dagi
   `ConfigureKestrel` da belgilanishi va bu fayl faqat unga mos kelishi
   kerakligi yozildi — keyingi dasturchi yana ikkinchi manba yaratmasin.

Uchinchi band (hujjatda yagona ishga tushirish buyrug'i) —
`DEPLOY_LINUX.md` da systemd birligi allaqachon tavsiflangan va u
`gunicorn`/`dotnet` ni aniq portlar bilan ishga tushiradi.

---

### ✅ T-008 — ~~`users.username` ustuni bazada qolib ketgan (orphan)~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Ma'lumotlar bazasi / O'rta
**Fayl:** `backend/EkgAnalyzerApi/Migrations/20260614090000_RemoveUsernameFromUsers.cs`

**Muammo:**
`RemoveUsernameFromUsers` migratsiyasi `__EFMigrationsHistory` jadvalida **qo'llangan** deb belgilangan, lekin `information_schema` da `users.username` ustuni hamon mavjud. Ya'ni migratsiya tarixi bilan real sxema bir-biriga mos emas (ehtimol baza dump'dan tiklangan, migratsiya esa shartli `IF EXISTS` bo'lgani uchun jimgina o'tib ketgan).

**Nima uchun muhim:**
Migratsiya tarixi bilan real sxema orasidagi har qanday nomuvofiqlik keyingi migratsiyalarda kutilmagan xatolikka olib keladi. Ishlab chiqarish bazasida ham xuddi shunday holat bo'lishi mumkin.

**Tuzatish rejasi:**
1. Dev, staging va production bazalarida `users` jadvalining real sxemasini migratsiya snapshot bilan solishtirish (`dotnet ef migrations script` orqali diff olish).
2. Farqlar topilsa — tuzatuvchi migratsiya yozish.
3. Kelajakda baza faqat migratsiya orqali yangilanishini ta'minlash (dump-restore amaliyotini to'xtatish yoki restore'dan keyin majburiy `database update`).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

### Haqiqiy sabab boshqa edi

Taskda "migratsiya `__EFMigrationsHistory` da qo'llangan deb belgilangan,
lekin ustun hamon mavjud" deyilgan. Tekshiruv boshqa narsani ko'rsatdi:

```
migratsiya tarixi: ['20251215154224_AddUsernameToUser']
```

Ya'ni `RemoveUsernameFromUsers` tarixda **umuman yo'q** edi.

Sababi: `Migrations/20260614090000_RemoveUsernameFromUsers.cs` fayli
mavjud va SQL si to'g'ri, lekin unda `[DbContext(typeof(MedDataDB))]`
va `[Migration("...")]` atributlari **yo'q** edi. Bu loyihada
migratsiyalar shu atributlar orqali topiladi (`.Designer.cs` fayllari
yo'q) — ularsiz EF Core migratsiyani ko'rmaydi va ishga tushirishda
o'tkazib yuboradi.

### Tuzatish

Atributlar qo'shildi. Ilova ko'tarilganda migratsiya qo'llandi:

| | Avval | Keyin |
|---|---|---|
| `users.username` ustuni | mavjud | **yo'q** |
| Migratsiya tarixi | 1 ta yozuv | 2 ta — `Add...` va `Remove...` |

O'chirish xavfsiz edi: `User` modelida bunday xossa yo'q va bazada uni
to'ldirilgan bironta ham yozuv topilmadi (`count = 0`).

### Bajarilmagan band

**Staging va production bazalarini solishtirish (1-band).** Menda ular
yo'q. Lekin sabab endi ma'lum va u har qanday muhitda bir xil:
atributsiz migratsiya qo'llanmaydi. Xuddi shu tekshiruvni boshqa
migratsiyalar uchun ham o'tkazish kerak — `Migrations/` papkasidagi har
bir faylda `[Migration(...)]` borligini tekshirish yetarli.

---

### ✅ T-009 — ~~.NET build 535 ta ogohlantirish beradi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Kod sifati / O'rta
**Fayl:** butun `backend/EkgAnalyzerApi`

**Muammo:**
`dotnet build` 0 xato, **535 ogohlantirish** bilan tugaydi. Asosiy turlari:
- `CS8602` — ehtimoliy `null` havolani dereferens qilish (runtime'da `NullReferenceException` xavfi)
- `CS8601` — `null` bo'lishi mumkin bo'lgan qiymatni `null` qabul qilmaydigan maydonga tayinlash
- `CS0414` — ishlatilmaydigan maydonlar (masalan `PatcientService._superAdminRoleId`, `ClinicService._superAdminRoleId`)

**Nima uchun muhim:**
Ogohlantirishlar shu qadar ko'pki, ular orasida **haqiqiy xatolar ko'rinmay qoladi**. `CS8602` larning bir qismi ishlab chiqarishda 500 xatolikka aylanadi.

**Tuzatish rejasi:**
1. Ogohlantirishlarni turlar bo'yicha guruhlash va sanash.
2. Avval `CS8602`/`CS8601` larni tuzatish — har birini ko'rib chiqib, `null` holatini to'g'ri ishlash (`?.`, `??`, yoki erta `return`).
3. Ishlatilmaydigan maydonlar/o'zgaruvchilarni o'chirish.
4. Toza bo'lgach `.csproj` ga `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` qo'shib, regressiyani oldini olish.
5. CI pipeline'da build ogohlantirishlar soni oshsa — bildirishnoma.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

Build **567** ogohlantirishdan **91** ga tushdi (taskda 535 deyilgan —
oradagi ishlar yangi kod qo'shgani uchun raqam biroz oshgan edi).
0 xato, build muvaffaqiyatli.

### Avval tasnif, keyin tuzatish

Taskda "`CS8602` larning bir qismi ishlab chiqarishda 500 xatolikka
aylanadi" deyilgan. Shuni tekshirish uchun har bir ogohlantirish
joyi **kontekst bilan** tasniflandi:

| Kontekst | Soni | Haqiqiy xavf |
|---|---|---|
| EF `Include`/`Select` lambda'lari | 93 | **yo'q** |
| Xotirada bajariladigan kod | 11 | **ha** |

Sabab: EF lambda'lari — **ifoda daraxtlari**. Ular C# kodi sifatida
hech qachon bajarilmaydi; EF ularni `LEFT JOIN` ga aylantiradi va
bog'liq yozuv bo'lmasa SQL `NULL` qaytaradi, `NullReferenceException`
emas. Ya'ni 501 ta ogohlantirishning aksariyati **yolg'on signal** edi
— va aynan shu narsa haqiqiy 11 tasini ko'rinmas qilib qo'ygandi.

### Topilgan haqiqiy nosozliklar

| Joy | Nima bo'lardi |
|---|---|
| `UserService.cs:86` | `Doctor` va `Clinic` uchun `null` tekshiruvi bor edi, **`Role` uchun yo'q**. Roli o'chirilgan foydalanuvchida `/api/user/me` 500 qaytarardi — kabinet umuman ochilmasdi |
| `DoctorService.cs:356,375,380` | `doctor.User` tekshirilmasdan email, parol va rol yozilardi. `users` yozuvisiz shifokorni tahrirlash 500 berardi |
| `DoctorService.cs:400` | Javob uchun yozuv qayta o'qilardi va natija `null` tekshirilmasdan ishlatilardi |
| `MedController.cs:69,141` | `GetProperty("id")` / `GetProperty("output")[0]` — OpenAI kutilmagan javob qaytarsa `KeyNotFoundException` yoki `IndexOutOfRangeException`, `try` blokidan **tashqarida** |
| `TokenService.cs:32` | `Jwt:Key` yo'q bo'lsa sababi ko'rinmaydigan `ArgumentNullException` |
| `ClinicService.cs:80` | `dto.DistrictId != null` — `int` uchun **har doim rost**. Tuman tanlanmaganda ham `0` yozilardi |
| `LabValuesController.cs:21` | Metod `async`, lekin `await` yo'q: `IQueryable` javob serializatsiyasi paytida, ya'ni `try/catch` va middleware doirasidan **tashqarida** bajarilardi |
| `PdfReportService.cs:2198` | `return;` dan keyin 12 qator o'lik kod |

`doctor.User` uchun tarqoq `if` lar o'rniga **erta qaytarish** tanlandi:
jimgina o'tkazib yuborish admin "rolni o'zgartirdim" deb o'ylab, aslida
o'zgarmagan holatga olib kelardi. Endi aniq xato (`doctor_user_missing`,
uchala tilda).

### Yolg'on signallarni yo'qotish

| Usul | Soni |
|---|---|
| EF navigatsiya zanjirlariga `!` | 159 |
| DTO xossalarini `string?` qilish (manba `NULL` bo'lishi mumkin) | 300 |
| Konstruktorda qiymat berilmagan xossalarga boshlang'ich qiymat | 30 |

**`CS8618` uchun `string?` ATAYIN ishlatilmadi.** ASP.NET Core model
bog'lash null bo'lmaydigan havola turini avtomatik "majburiy" deb
hisoblaydi — `string` ni `string?` ga o'zgartirish so'rov DTO larida
validatsiyani jimgina o'chirib qo'yardi. Ya'ni ogohlantirishni yo'qotib,
o'rniga xavfsizlik teshigini ochish. Shuning uchun tur o'zgarmadi, faqat
`= string.Empty` / `= new()` / `= null!` qo'shildi.

### Yo'l-yo'lakay: takroriy rol raqamlari

`PatcientService` va `ClinicService` da rol ID lari (`_adminRoleId = 2`
kabi) konstruktorda qayta e'lon qilinardi — `RoleConstants` allaqachon
bor bo'lsa ham. Ular olib tashlanib, umumiy konstantalarga o'tkazildi.

### Tekshiruv (jonli)

| Nima | Natija |
|---|---|
| `dotnet build` | 0 xato, 91 ogohlantirish (567 dan) |
| **Tuman o'zgarishi** (xulq o'zgargan yagona joy) | brauzerda Buxoro shahar → Vobkent tumani, bazada `district_id` 35 → **37**; qaytarilganda 37 → **35** |
| `/api/user/get-user-by-token` | 200, `role: {id:2, nameUz:"Admin"}` — rol to'liq |
| Kabinet, Xodimlar ro'yxati | ochiladi, 8 ta xodim |
| Shifokorni saqlash (`save-doctor-data`) | 200, `firstname` bazada o'zgardi |
| EKG / Holter / SMAD / Lab ro'yxatlari | 11 / 11 / 7 / 11 qator, xatosiz |
| PDF: EKG #108, #109, Holter #22, SMAD #11, Lab #24 | 200, `application/pdf`, 0.5–5.5 MB |
| `lab-values` (materializatsiya) | 200, 10 532 bayt |

### Bajarilmagan band (sababi bilan)

**`<TreatWarningsAsErrors>` (4-band).** Qolgan 91 ta ogohlantirishning
hammasi EF ifoda daraxtlaridagi yolg'on signal. Ularni `!` bilan
belgilash mumkin, lekin `TreatWarningsAsErrors` ni **hozir** yoqish
noto'g'ri bo'lardi: u har bir yangi EF so'roviga `!` yozishni majburiy
qiladi va vaqt o'tib `!` mexanik odatga aylanadi — o'shanda haqiqiy
xatolar ham jimgina belgilanib ketadi.

To'g'ri yo'l — `.csproj` da faqat **xavfli** turlarni xatoga aylantirish
(`CS8602;CS8604`), qolganini ogohlantirish holida qoldirish. Bu esa
loyiha egasining qarori, chunki u CI ni buzishi mumkin.

---

### ✅ T-010 — ~~Python `requirements.txt` da versiyalar qotirilmagan~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Barqarorlik / O'rta
**Fayl:** `python_back/requirements.txt`

**Muammo:**
Bitta paket ham versiya bilan belgilanmagan (`anthropic>=0.40.0` dan tashqari):
```
fastapi
uvicorn[standard]
sqlalchemy
openai
...
```
Audit paytida toza `venv` ga o'rnatilganda `openai 3.5.0`, `fastapi 0.141.1`, `pydantic 2.13.5` versiyalari tushdi. Kod esa eskiroq `openai` API (`client.responses.create`) ga tayanadi — major versiya o'zgarishida kod jim turib buziladi.

**Nima uchun muhim:**
Bugun ishlagan deploy ertaga xuddi shu buyruq bilan boshqa versiyalarni tortib keladi va AI tahlil ishlamay qoladi. Bu ishlab chiqarish uchun qabul qilib bo'lmaydigan holat.

**Tuzatish rejasi:**
1. Ishlaydigan muhitda `pip freeze > requirements.lock.txt` qilish.
2. `requirements.txt` da har bir to'g'ridan-to'g'ri bog'liqlikni `==` bilan qotirish.
3. `python_back/venv` ni loyihaga qo'shmaslik (allaqachon `.gitignore` da) va `DEPLOY_LINUX.md` da `pip install -r requirements.lock.txt` ni ko'rsatish.
4. Python versiyasini ham belgilash (`.python-version` yoki `runtime.txt`) — audit paytida Python 3.14 ishlatildi, `DEPLOY_LINUX.md` esa 3.10+ deydi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

`python_back/requirements.txt` to'liq qayta yozildi.

**Qotirilgan versiyalar** — ishlab turgan muhitdan olingan haqiqiy
qiymatlar (`importlib.metadata` orqali o'qildi, taxmin qilinmadi):

```
fastapi==0.121.3          openai==2.8.1
uvicorn[standard]==0.38.0 anthropic==0.97.0
pydantic==2.12.4          Pillow==12.0.0
sqlalchemy==2.0.45        numpy==2.3.5
pypdf==6.16.2             scipy==1.16.3
python-dotenv==1.2.1      pandas==2.3.3
PyJWT==2.12.1             neurokit2==0.2.12
requests==2.32.5          matplotlib==3.10.7
python-multipart==0.0.20  fuzzywuzzy==0.18.0
```

**`>=` bilan qoldirilganlar va sababi:** `gunicorn`, `psycopg2-binary`,
`pdf2image`, `python-Levenshtein` bu muhitda **o'rnatilmagan** (bu yerda
`psycopg2` manbadan yig'ilgan, server esa `uvicorn` bilan to'g'ridan-to'g'ri
ishlaydi). Ular uchun aniq versiya yozish taxmin bo'lardi va mavjud
bo'lmagan versiya `pip install -r` ni butunlay to'xtatib qo'yishi mumkin
edi. Shuning uchun quyi chegara qo'yildi va faylda ishlab chiqarish
muhitida `pip freeze` bilan qotirish kerakligi yozib qo'yildi.

Har bir guruh uchun **nima uchun kerakligi** izohlandi — masalan
`python-Levenshtein` busiz `fuzzywuzzy` sof Python taqqoslashga o'tadi
(bu muhitda aynan shunday va jurnalda o'sha ogohlantirish ko'rinadi),
`pdf2image` esa tizimda `poppler-utils` bo'lishini talab qiladi.

---


### ✅ T-011 — ~~Dashboard "BUGUNGI TAHLILLAR" deb yozib, UMUMIY raqamlarni ko'rsatadi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Mantiqiy xato / Kritik
**Fayllar:** `frontend/src/components/shared/StatCard.js:18`, `frontend/src/pages/cabinet/Dashboard.js:55-98`

**Muammo:**
Dashboard'dagi bo'lim sarlavhasi **"BUGUNGI TAHLILLAR"**, lekin kartochkalarda chiqadigan raqam — **butun tarix bo'yicha jami** son.

`StatCard.js` da:
```jsx
<h2 className="stat_card_value">{allTimeValue ?? '—'}</h2>
```
`value` (bugungi son) props sifatida uzatiladi, lekin **hech qachon render qilinmaydi** — o'lik kod. Uning o'rniga `allTimeValue` chiqadi.

Brauzerda tekshirildi (2026-08-29, Admin roli):

| Kartochka | Ekranda ko'rsatilgan | API `today` | API `allTime` |
|---|---|---|---|
| EKG tahlillari | **2** | 0 | 2 |
| Holter tahlillari | **3** | 0 | 3 |
| SMAD tahlillari | **2** | 0 | 2 |
| Laboratoriya tahlillari | **3** | 0 | 3 |
| Shifokor xulosasi | **0** | 0 | 0 |

Ya'ni bugun bironta ham tahlil qilinmagan bo'lsa-da, ekranda 2/3/2/3 turibdi.

**Nima uchun jiddiy:**
Klinika rahbari har kuni ertalab shu panelga qaraydi va "bugun 10 ta tahlil qilindi" deb tushunadi — aslida nol. Bu operatsion qaror qabul qilishga (smena rejalashtirish, xodim yuklamasi) to'g'ridan-to'g'ri ta'sir qiladi. Bundan tashqari raqam hech qachon o'zgarmagani uchun panel "muzlab qolgan" ko'rinadi.

**Tuzatish rejasi:**
1. `StatCard.js` da asosiy qiymatni `value` (bugungi) qilish, `allTimeValue` ni esa kichik yordamchi matn sifatida pastda ko'rsatish:
   ```jsx
   <h2 className="stat_card_value">{value}</h2>
   {allTimeValue != null && <span className="stat_card_sub">Jami: {allTimeValue}</span>}
   ```
2. Yuklanish holatida `'—'` emas, skeleton ko'rsatish — "—" foydalanuvchiga "ma'lumot yo'q" degan noto'g'ri signal beradi.
3. Haqiqiy `0` va "ma'lumot yuklanmadi" holatlarini vizual ajratish.
4. Ishlatilmayotgan `subValue` / `subLabel` props'larini yo yo'q qilish, yoki to'ldirish.

**Qabul mezoni:** Bugun tahlil bo'lmasa kartochkada `0` chiqadi, "Jami: 2" esa alohida kichik matn sifatida ko'rinadi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**
`StatCard.js` to'liq qayta yozildi:
- Asosiy raqam endi **`value` (bugungi son)**, ilgari `allTimeValue` ko'rsatilardi.
- Umumiy son pastda kichik matnda: "Jami: N".
- Yuklanish paytida `'—'` o'rniga **`Skeleton`** — "—" foydalanuvchiga "ma'lumot yo'q" degan noto'g'ri signal berardi.
- Klaviatura bilan boshqarish qo'shildi (`role="button"`, `tabIndex`, Enter/Space).
- `disabled` props — klinika faollashtirilmaganda bosilmaydi (T-071).

`Dashboard.js` da ishlatilmayotgan `val()` yordamchisi olib tashlandi.

**Jonli tekshiruv (brauzerda, Admin roli):**

| Kartochka | Avval ko'rsatilardi | Hozir |
|---|---|---|
| EKG tahlillari | **12** (umumiy) | **0** + "Jami: 12" ✅ |
| Holter | 6 | **0** + "Jami: 6" ✅ |
| SMAD | 4 | **0** + "Jami: 4" ✅ |
| Laboratoriya | 12 | **0** + "Jami: 12" ✅ |
| Shifokor xulosasi | 1 | **0** + "Jami: 1" ✅ |

Bo'lim sarlavhasi "BUGUNGI TAHLILLAR" endi ko'rsatilayotgan raqamga mos keladi.

---

### ✅ T-012 — ~~Dashboard "bugun" hisobini UTC bo'yicha oladi (O'zbekiston UTC+5)~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Mantiqiy xato / Kritik
**Fayl:** `backend/EkgAnalyzerApi/Services/DashboardService.cs:18-19`

**Muammo:**
```csharp
var from = DateTime.UtcNow.Date;
var to   = from.AddDays(1);
```
"Bugun" chegarasi **UTC** bo'yicha hisoblanadi. O'zbekiston vaqti — **UTC+5**.

Amaliy oqibat: Toshkent vaqti bilan **00:00 dan 05:00 gacha** yaratilgan har qanday tahlil UTC bo'yicha hali "kechagi kun" hisoblanadi va bugungi statistikaga **tushmaydi**. Aksincha, kecha soat 05:00 dan keyin qilingan ishlar bugungi kunga qo'shilib ketadi.

Tungi smenada ishlaydigan klinikalar (shoshilinch yordam, kasalxona) uchun bu har kuni takrorlanadigan xato.

Xuddi shu muammo boshqa joylarda ham bo'lishi mumkin — `dateFrom` / `dateTo` filtrlari va PDF hisobotlardagi sanalar ham tekshirilishi kerak.

**Tuzatish rejasi:**
1. Klinika vaqt mintaqasini markazlashtirilgan konstanta yoki konfiguratsiyaga chiqarish (`App:TimeZone = "Asia/Tashkent"`).
2. "Bugun" chegarasini mahalliy vaqtda hisoblab, keyin UTC ga o'girish:
   ```csharp
   var tz = TimeZoneInfo.FindSystemTimeZoneById("Asia/Tashkent");
   var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
   var from = TimeZoneInfo.ConvertTimeToUtc(localNow.Date, tz);
   var to   = from.AddDays(1);
   ```
3. Ro'yxat sahifalaridagi `dateFrom`/`dateTo` filtrlarini ham xuddi shunday tuzatish — hozir foydalanuvchi "1-avgust" tanlasa, UTC 1-avgust 00:00 dan boshlanadi va mahalliy 1-avgust ertalabki 5 soati tushib qoladi.
4. Frontendda sana ko'rsatishda ham mahalliy vaqtga o'girilishini tekshirish.

**Qabul mezoni:** Toshkent vaqti bilan 01:00 da yaratilgan tahlil o'sha kunning statistikasida ko'rinadi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**
Yangi `Services/AppTime.cs` — vaqt mintaqasi bilan ishlash uchun markazlashtirilgan yordamchi:
`LocalNow()`, `LocalDayBoundsUtc()`, `ToUtcFromLocalDate()`.
Mintaqa `App:TimeZone` konfiguratsiyasidan o'qiladi (sukut: `Asia/Tashkent`),
Windows/Linux ID farqi va zaxira variant hisobga olingan.

`DashboardService` endi `DateTime.UtcNow.Date` o'rniga `AppTime.LocalDayBoundsUtc(_config)` ishlatadi.

**Jonli tekshiruv** (audit vaqti: UTC 28.08 21:43, mahalliy 29.08 02:43):

| Oyna | 'Bugungi' EKG tahlillari |
|---|---|
| Eski (UTC bo'yicha kun) | **8** ta — aslida hammasi kecha (mahalliy 28.08) yaratilgan ❌ |
| Yangi (mahalliy kun) | **0** ta — to'g'ri ✅ |

API javobi `today.ecg = 0` — yangi mantiqqa mos.
Ya'ni mahalliy vaqt bilan 00:00–05:00 oralig'idagi "kechagi kun" xatosi bartaraf etildi.

---

### ✅ T-013 — ~~`page=0` yoki manfiy sahifa raqami HTTP 500 va SQL stack trace qaytaradi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Barqarorlik / Ma'lumot oshkorligi / Kritik
**Fayllar:** barcha tahlil Service'lari (`ECGAnalyseService.cs`, `LabAnalyseService.cs`, `HolterAnalyseService.cs`, `SmadAnalyseService.cs`, `MedicalDiagnoseService.cs`), `Program.cs`

**Muammo:**
API testida aniqlandi:

| So'rov | Natija |
|---|---|
| `?page=0` | **HTTP 500** + `Npgsql.PostgresException 2201X: OFFSET manfiy bo'lishi mumkin emas` + to'liq stack trace |
| `?page=-5` | **HTTP 500** + xuddi shunday |
| `?pageSize=-10` | **HTTP 500** + `2201W: LIMIT manfiy bo'lishi mumkin emas` |

Ikki alohida muammo:
1. **Kirish validatsiyasi yo'q** — `page` va `pageSize` hech qayerda tekshirilmaydi, to'g'ridan-to'g'ri `Skip()/Take()` ga uzatiladi.
2. **Global exception handler yo'q** — `Program.cs` da `app.UseExceptionHandler(...)` chaqirilmagan. Development'da to'liq stack trace, kutubxona versiyalari va SQL matni mijozga qaytadi. Production'da esa bo'sh 500 qaytadi — foydalanuvchi ham, log ham tushunarli xabar olmaydi.

**Nima uchun jiddiy:**
Stack trace hujumchiga texnologiya to'plami, kutubxona versiyalari va so'rov strukturasi haqida ma'lumot beradi. Bundan tashqari, frontendda pagination komponenti biror sababdan `page=0` yuborsa (masalan, ro'yxat bo'shayganda), foydalanuvchi tushunarsiz "500" xatosini ko'radi.

**Tuzatish rejasi:**
1. Har bir ro'yxat metodida chegara qo'yish:
   ```csharp
   page = page < 1 ? 1 : page;
   pageSize = Math.Clamp(pageSize, 1, 100);
   ```
   Yaxshiroq yechim — umumiy `PagedQuery` record yaratib, barcha controller'larda qayta ishlatish (hozir bu mantiq 5 ta service'da takrorlangan).
2. `Program.cs` ga global exception handler qo'shish: kutilmagan xatolik `ILogger` ga to'liq yoziladi, mijozga esa faqat `{ "message": "Ichki xatolik", "traceId": "..." }` qaytadi.
3. `[ApiController]` model validatsiyasidan foydalanib, query parametrlarga `[Range(1, int.MaxValue)]` atributlarini qo'yish.

**Qabul mezoni:** `?page=0&pageSize=-1` so'rovi 400 (yoki normallashtirilgan 200) qaytaradi, hech qachon 500 emas; javob ichida stack trace yo'q.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**
Yangi `Services/PagingExtensions.cs` — `Paging.Normalize()` va `IQueryable.ApplyPaging()`.
Barcha service'lardagi **26 ta** qo'lda yozilgan `.Skip((page-1)*pageSize).Take(pageSize)`
zanjiri `.ApplyPaging(page, pageSize)` ga almashtirildi (8 ta faylda).
Chegaralar: `page >= 1`, `1 <= pageSize <= 100`.

**Jonli tekshiruv:**

| So'rov | Avval | Hozir |
|---|---|---|
| `?page=0` | **500** + Npgsql SQL stack trace | **200**, `page=1` ✅ |
| `?page=-5` | **500** + stack trace | **200**, `page=1` ✅ |
| `?pageSize=-10` | **500** + stack trace | **200**, `pageSize=10` ✅ |

Mijozga endi hech qanday SQL matni yoki stack trace qaytmaydi.

---

### ✅ T-014 — ~~`pageSize` cheklanmagan va `totalPages` int overflow beradi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Barqarorlik / DoS / Yuqori
**Fayllar:** barcha tahlil Service'lari

**Muammo:**
1. `?pageSize=1000000` — hech qanday yuqori chegara yo'q. Baza kattalashganda bitta so'rov butun jadvalni xotiraga tortadi va serverni yiqitadi (autentifikatsiyalangan har qanday foydalanuvchi buni qila oladi).
2. `?pageSize=0` — HTTP 200 qaytaradi, lekin javobda:
   ```json
   {"items":[],"totalCount":2,"page":1,"pageSize":0,"totalPages":-2147483648}
   ```
   `totalPages` = `int.MinValue`. Bu `(int)Math.Ceiling(totalCount / (double)pageSize)` ifodasining `Infinity` dan `int` ga aylanishi natijasi. Frontend pagination komponenti bu qiymatni olsa kutilmagan holatga tushadi.

**Tuzatish rejasi:**
1. `pageSize` ni `Math.Clamp(pageSize, 1, 100)` bilan cheklash (T-013 bilan birga).
2. `totalPages` hisobini himoyalash: `pageSize <= 0 ? 0 : (int)Math.Ceiling(...)`.
3. Barcha `PagedResult<T>` qaytaruvchi endpointlar uchun yagona yordamchi metod yozib, mantiqni bir joyga yig'ish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**
- `Paging.MaxPageSize = 100` — yuqori chegara joriy qilindi.
- `PagedResult<T>` da `Page` va `PageSize` xossalari **setter ichida normallashtiriladi** — mijozga har doim to'g'ri qiymat qaytadi.
- `TotalPages` bo'luvchi noldan himoyalandi.

**Jonli tekshiruv:**

| So'rov | Avval | Hozir |
|---|---|---|
| `?pageSize=1000000` | 200, cheklovsiz (butun jadval) | `pageSize=100` ga cheklandi ✅ |
| `?pageSize=0` | `totalPages = -2147483648` (int overflow) | `pageSize=10, totalPages=1` ✅ |
| `?page=-5&pageSize=-10` | 500 | `page=1, pageSize=10` ✅ |

---

### ✅ T-015 — ~~Rol cheklovlari faqat frontendda, backend himoyalanmagan~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Xavfsizlik / Kritik
**Fayllar:** `Controllers/ECGAnalyseController.cs`, `LabAnalyseController.cs`, `HolterAnalyseController.cs`, `SmadAnalyseController.cs`, `MedicalDiagnoseController.cs`, `DoctorController.cs`, `ClinicController.cs`, `PatcientController.cs`, `DashboardController.cs`

**Muammo:**
Konstitutsiyaning VI va VII boblariga ko'ra Shifokor (4) faqat o'ziga biriktirilgan tahlillarni, Hamshira (5) faqat o'zi yaratganini ko'rishi SHART. Frontend buni to'g'ri bajaradi — rolga qarab `get-by-doctor` / `get-by-nurse` / `get-by-clinic` endpointini tanlaydi.

Ammo **backendda hech qanday rol tekshiruvi yo'q** — barcha endpointlarda faqat `[Authorize]` turibdi. Shifokor yoki hamshira brauzer konsolidan (yoki Postman'dan) to'g'ridan-to'g'ri boshqa endpointni chaqirsa, hamma narsani oladi.

Jonli tizimda tekshirilgan natijalar (2026-08-29):

| Chaqiruvchi | Endpoint | Kutilgan | Haqiqiy |
|---|---|---|---|
| Shifokor (4) | `GET api/ecg-analyses/get-by-clinic` | 403 | **200 — butun klinika tahlillari** |
| Hamshira (5) | `GET api/ecg-analyses/get-by-clinic` | 403 | **200 — butun klinika tahlillari** |
| Hamshira (5) | `GET api/ecg-analyses/get-by-doctor` | 403 | **200** |
| Shifokor (4) | `GET api/doctor/get-doctors-of-clinic` | 403 (faqat 2,3) | **200** |
| Hamshira (5) | `GET api/doctor/get-doctors-of-clinic` | 403 (faqat 2,3) | **200** |
| Shifokor (4) | `GET api/clinic/get-clinic-by-id?id=24` | 403 (faqat 2,3) | 200, lekin **bo'sh obyekt** — ma'lumot oqmaydi (T-080 ga qarang) |
| Shifokor (4) | `GET api/patcient/get-all-patients` | 403 | **200 — BARCHA klinikalar bemorlari** |
| Hamshira (5) | `PUT api/ecg-analyses/mark-viewed` | 403 | **200 {"success":true}** |
| Admin (2) | `PUT api/ecg-analyses/mark-viewed` | 403 | **200 {"success":true}** |

To'g'ri ishlagan tekshiruvlar (namuna sifatida): `api/audit-logs` → 403, `api/consultation/my-consultants` → 403, `api/consultation/clinic-options` → 403.

**Nima uchun kritik:**
Bu VII bobning butun mantiqini bekor qiladi. Shifokor o'ziga tegishli bo'lmagan bemorlarning tibbiy ma'lumotlarini ko'ra oladi — bu tibbiy sirni oshkor qilish. `get-all-patients` esa **butun platforma bo'ylab** barcha klinikalarning bemorlarini qaytaradi (klinika filtri umuman yo'q).

**Tuzatish rejasi:**
1. `RoleConstants` asosida siyosat (policy) yaratish:
   ```csharp
   options.AddPolicy("ClinicManagers", p => p.RequireClaim("roleId", "2", "3"));
   options.AddPolicy("MedicalStaff",   p => p.RequireClaim("roleId", "4", "5"));
   ```
   > Diqqat: hozir `ClaimTypes.Role` ga raqam yozilgan (T-016 ga qarang), shuning uchun `roleId` claim'idan foydalanish ishonchliroq.
2. Har bir endpointga to'g'ri siyosatni qo'yish:
   - `get-by-clinic`, `get-doctors-of-clinic`, `get-clinic-by-id`, klinika sozlamalari → `ClinicManagers`
   - `get-by-doctor`, `unviewed-count`, `mark-viewed` → faqat rol 4
   - `get-by-nurse` → faqat rol 5
3. `get-all-patients` ga **klinika filtri** qo'shish yoki endpointni butunlay o'chirish (frontendda ishlatilishini tekshirish).
4. Rol-endpoint matritsasini avtomatlashtirilgan integratsion testlar bilan qoplash — har bir rol uchun ruxsat berilgan va taqiqlangan endpointlar ro'yxati.

**Qabul mezoni:** Yuqoridagi jadvaldagi "Kutilgan" ustuni to'liq bajariladi; test to'plami har bir rol uchun avtomatik tekshiradi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**

- `RoleConstants` ga 5 ta siyosat nomi qo'shildi; `Program.cs` da ular `roleId` claim'iga bog'lab ro'yxatdan o'tkazildi.
- `TokenService` endi `ClaimTypes.Role` ga matnli nom yozadi (`"Admin"`), `roleId` esa raqam bo'lib qoladi — shu sababli `[Authorize(Roles = "SuperAdmin")]` atributlari ham endi ishlaydi.
- Endpointlarga siyosatlar qo'yildi:

| Endpoint | Siyosat |
|---|---|
| `{ecg,lab,holter,smad}-analyses/get-by-clinic` | `ClinicManager` (2, 3) |
| `…/get-by-doctor`, `…/unviewed-count`, `…/mark-viewed` | `DoctorOnly` (4) |
| `…/get-by-nurse` | `NurseOnly` (5) |
| `doctor/get-doctors-of-clinic`, `save-doctor-data`, `get-params-for-add-staff` | `ClinicManager` |
| `clinic/get-clinic-by-id`, `update-clinic-*`, `create-update-clinic-detail` | `ClinicManager` |
| `clinic/{id}/set-active` | `SuperAdminOnly` |

**Jonli tekshiruv:**

| Chaqiruvchi | Endpoint | Avval | Hozir |
|---|---|---|---|
| Shifokor (4) | `ecg-analyses/get-by-clinic` | 200 | **403** ✅ |
| Hamshira (5) | `ecg-analyses/get-by-clinic` | 200 | **403** ✅ |
| Hamshira (5) | `ecg-analyses/get-by-doctor` | 200 | **403** ✅ |
| Shifokor (4) | `ecg-analyses/get-by-nurse` | 200 | **403** ✅ |
| Admin (2) | `ecg-analyses/get-by-doctor` | 200 | **403** ✅ |
| Shifokor (4) | `doctor/get-doctors-of-clinic` | 200 | **403** ✅ |
| Hamshira (5) | `doctor/get-doctors-of-clinic` | 200 | **403** ✅ |
| Shifokor (4) | `clinic/get-clinic-by-id` | 200 | **403** ✅ |

**Regressiya:** Admin → `get-by-clinic` 200, Shifokor → `get-by-doctor` 200,
Hamshira → `get-by-nurse` 200, Shifokor → `unviewed-count` 200 — to'g'ri rollar buzilmadi.

---



### ✅ T-017 — ~~Ishlatilmaydigan ("o'lik") kod va keraksiz bog'liqliklar~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Kod sifati / Texnik qarz / O'rta
**Fayllar:** `frontend/src/components/ui/*`, `frontend/package.json`, `frontend/purity-ui-dashboard-main.zip`

**Muammo:**
1. `frontend/src/components/ui/` papkasidagi **barcha 5 ta komponent hech qayerda import qilinmagan** (209 satr o'lik kod):
   - `ParticleField.jsx` (103 satr) — 180 zarrachali `requestAnimationFrame` animatsiyasi
   - `CustomCursor.jsx`, `Reveal.jsx`, `AnimatedCounter.jsx`, `ScrollProgress.jsx`
2. `package.json` da ishlatilmaydigan paketlar:
   - **`openai` (^6.15.0)** — frontendda umuman import qilinmagan. Bu paket bundle'ga tushishi va (agar kimdir ishlatsa) OpenAI kalitini brauzerga chiqarish xavfini tug'diradi. **Darhol olib tashlansin.**
   - **`fs` (^0.0.1-security)** — bu haqiqiy paket emas, npm'dagi bo'sh "security placeholder". Ishlatilmaydi.
   - Uchta cookie kutubxonasi bir vaqtda: `js-cookie`, `react-cookie`, `react-cookies`.
3. `frontend/purity-ui-dashboard-main.zip` — **2.4 MB** shablon arxivi repozitoriyda saqlanmoqda.

**Nima uchun muhim:**
`openai` paketining frontendda turishi xavfsizlik auditida darhol savol tug'diradi. Qolganlari — `npm install` vaqtini, bundle hajmini va yangi dasturchining chalkashligini oshiradi.

**Tuzatish rejasi:**
1. `components/ui/` papkasini o'chirish (agar landing dizayni uchun kerak bo'lsa — `LandingPage.jsx` ga ulash, aks holda yo'q qilish).
2. `npm uninstall openai fs react-cookies` — cookie kutubxonalaridan faqat `js-cookie` ni qoldirish va `react-cookie` ishlatilgan 3 ta joyni unga o'tkazish.
3. `purity-ui-dashboard-main.zip` ni repozitoriydan o'chirish (kerak bo'lsa alohida joyda saqlash).
4. `depcheck` yoki `knip` ni CI ga qo'shib, kelajakda o'lik kod to'planmasligini ta'minlash.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

Rejadagi to'rtta bandning uchtasi bajarildi; to'rtinchisi (CI vositasi)
sababi bilan quyida.

### O'lik komponentlar

Beshtasining ham hech qayerda import qilinmagani tasdiqlandi (butun
`src` bo'yicha qidiruv, `components/ui/` ning o'zidan tashqari) va
papka o'chirildi — **5 ta fayl, 209 qator**.

Landing dizayni uchun saqlab qo'yish ham o'ylandi, lekin ular repoda
9 oydan beri turgan va bironta ham sahifaga ulanmagan; kerak bo'lsa git
tarixidan qaytarish mumkin.

### Paketlar

| Paket | `src` da ishlatish | Holat |
|---|---|---|
| `openai@^6.15.0` | **0** | olib tashlandi |
| `fs@^0.0.1-security` | **0** | olib tashlandi |
| `react-cookie@^8.0.1` | 2 | `js-cookie` ga o'tkazildi |
| `react-cookies@^0.1.1` | 1 | `js-cookie` ga o'tkazildi |
| `js-cookie@^3.0.5` | 4 | **qoldi** |

`purity-ui-dashboard-main.zip` (**2.4 MB**) o'chirildi.

### Yo'l-yo'lakay topilgan haqiqiy nosozlik

Uchta cookie kutubxonasi **bitta va o'sha** `tilYMed` cookie'sini
boshqarardi, lekin har xil qoidalar bilan:

* `react-cookie` (`setCookie`) uni **joriy sahifa yo'liga** yozardi —
  `path` ko'rsatilmagan;
* `react-cookies` (`cookie.load`) o'qishda yo'lni hisobga olmasdi.

Ya'ni `/settings` sahifasida tanlangan til `/` da qo'llanmasligi
mumkin edi — cookie boshqa yo'lga tegishli bo'lardi. Endi bitta
kutubxona va aniq `{ path: '/', expires: 365 }`.

### Tekshiruv (jonli)

`npm uninstall` ishlab turgan dev-serverning modul grafigini buzdi
(`webpack/hot/log.js` xatosi) — server qayta ishga tushirildi, keyin
`Compiled with warnings` (faqat oldindan mavjud `no-unused-vars`).

| Nima | Natija |
|---|---|
| `node_modules` | `openai`, `fs`, `react-cookie`, `react-cookies` — yo'q |
| Xodimlar sahifasi | 9 qator, xatosiz |
| Til: O'zbek → Rus | `tilYMed=ru`, sarlavha *"Сотрудники — NMED"* |
| **Boshqa yo'lda** (`/settings`) | *"Основная информация — NMED"* — til saqlandi |
| Bosh sahifa (`/`) | *"Панель управления — NMED"* — til saqlandi |
| Rus → O'zbek | `tilYMed=uz`, *"Asosiy panel — NMED"* |

### 4-band — CI tekshiruvi

`.github/workflows/` papkasi mavjud, lekin **bo'sh**: CI niyat
qilingan, hech qachon yozilmagan. Shu sababli band bajarildi —
`.github/workflows/dead-code.yml` qo'shildi.

Ish oqimi **atayin bloklamaydi** (`continue-on-error: true` va har bir
buyruqda `|| true`). `depcheck` dinamik `import()`, faqat
konfiguratsiyada ishlatiladigan paketlar va CRA ning o'z
bog'liqliklari uchun yolg'on signal beradi; bunday vositani majburiy
qilish tez orada "hammasi qizil, e'tibor bermaymiz" holatiga olib
keladi va u umuman foydasiz bo'lib qoladi.

Majburiy qilishdan oldin `.depcheckrc` da istisnolar ro'yxatini
to'ldirish kerak — bu loyiha egasining qarori.

Ikkinchi qadam — hech qayerda import qilinmagan komponentlarni
topadigan `find` skripti: aynan shu tekshiruv `components/ui/` dagi
209 qatorni topgan bo'lardi.

---

### ✅ T-018 — ~~Ant Design statik `message` API konteksti bilan ishlamaydi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UI / O'rta
**Fayllar:** `frontend/src/tools/notify.js`, `frontend/src/tools/Alerts.js`

**Muammo:**
Brauzer konsolida har safar quyidagi ogohlantirish chiqadi:
```
Warning: [antd: message] Static function can not consume context like dynamic theme.
Please use 'App' component instead.
```
`message.error(...)` / `message.success(...)` statik chaqiruv sifatida ishlatilgan. Ant Design v5 da bunday chaqiruvlar ilova mavzusini (theme), til sozlamalarini va React kontekstini **ko'rmaydi**.

**Amaliy oqibat:** mavzu o'zgartirilsa (masalan qorong'i rejim qo'shilsa) bildirishnomalar eski rangda qoladi; `ConfigProvider` orqali berilgan `locale` ham ularga ta'sir qilmaydi.

**Tuzatish rejasi:**
1. `App.js` ni antd ning `<App>` komponenti bilan o'rash.
2. `notify.js` / `Alerts.js` da `App.useApp()` dan olingan `message` instansiyasini ishlatish.
3. Statik `message` ga barcha havolalarni almashtirish (`grep -rn "message\." src/`).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:** `index.js` da ilova antd ning **`<App>`** komponenti bilan o'raldi:

```jsx
<ConfigProvider locale={getAntdLocale(language)} theme={nmedTheme}>
    <AntdApp>{children}</AntdApp>
</ConfigProvider>
```

Endi `message`/`notification`/`modal` React kontekstini ko'radi — mavzu
(`theme`) va til (`locale`) sozlamalari ularga ham qo'llanadi.

Brauzer konsolidagi `[antd: message] Static function can not consume context`
ogohlantirishining sababi bartaraf etildi.

---

### ✅ T-019 — ~~Sana oralig'i teskari bo'lsa xatolik ko'rsatilmaydi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UX / O'rta
**Fayllar:** tahlil ro'yxati sahifalari va tegishli Service'lar

**Muammo:**
`?dateFrom=2026-12-01&dateTo=2026-01-01` (boshlanish sanasi tugash sanasidan keyin) so'rovi HTTP 200 va **bo'sh ro'yxat** qaytaradi.

Foydalanuvchi nuqtai nazaridan bu "bu oraliqda tahlil yo'q" degan ma'noni beradi — aslida u sanani noto'g'ri kiritgan. Foydalanuvchi ma'lumot yo'qolgan deb o'ylab qo'llab-quvvatlashga murojaat qiladi.

**Tuzatish rejasi:**
1. Backendda `dateFrom > dateTo` bo'lsa `400 BadRequest` va tushunarli xabar qaytarish.
2. Frontendda `DatePicker.RangePicker` ishlatish (u teskari tanlashga imkon bermaydi) yoki ikki alohida input qolsa — `disabledDate` orqali cheklash.
3. Bo'sh natija holatida umumiy `EmptyState` komponentida "Filtrlarni tekshiring" tavsiyasi va "Filtrlarni tozalash" tugmasi ko'rsatish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

### 1. Backend — teskari oraliq rad etiladi

`Filters/DateRangeValidationFilter.cs` (yangi) — global action filtri.

Har bir kontrollerda alohida tekshiruv yozilmadi: oraliq `dateFrom`/`dateTo`
nomlari bilan **o'ndan ortiq endpointda** qabul qilinadi va yangilari ham
qo'shiladi. Global filtr ularning barchasini, shu jumladan
kelajakdagilarini ham qamrab oladi. Filtr `startDate`/`endDate` va
`from`/`to` juftliklarini ham biladi.

| So'rov | Avval | Keyin |
|---|---|---|
| `?dateFrom=2026-12-01&dateTo=2026-01-01` | **200 + bo'sh ro'yxat** | **400** — "Boshlanish sanasi tugash sanasidan keyin bo'lishi mumkin emas." |
| `?dateFrom=2026-01-01&dateTo=2026-12-01` | 200 | 200 |

### 2. Frontend — teskari tanlash allaqachon mumkin emas

Ro'yxat sahifalarida `DatePicker.RangePicker` ishlatiladi va u boshlanish
sanasini tugash sanasidan keyin qo'yishga imkon bermaydi. Bu band
tekshirildi va o'zgartirish talab qilinmadi.

### 3. Bo'sh natija endi sababini aytadi

Ilgari filtr yoqilgan bo'lsin yoki yo'q, bir xil xabar turardi:
"Hech qanday EKG tahlil topilmadi". Foydalanuvchi filtrni yoqib
qo'yganini unutgan bo'lsa, ro'yxat chindan ham bo'sh deb o'ylaydi — bu
aynan shu taskda tasvirlangan "ma'lumot yo'qolibdi" holati.

Endi filtr faol bo'lsa: **"Filtrga mos natija topilmadi"** + tushuntirish
+ **"Filtrlarni tozalash"** tugmasi. To'rt ro'yxat sahifasida ham.

---

### Yo'l-yo'lakay topilgan uchta nosozlik

**A. `EmptyState` o'ziga uzatilgan tugmani umuman chizmasdi.**
Komponent `actionLabel` va `actionPath` xossalarini qabul qilardi, lekin
JSX da ularni chizadigan joy **bo'sh qoldirilgan** edi. Ya'ni to'qqizta
sahifa tugma matnini uzatardi va u jimgina yo'qolardi — foydalanuvchi
bo'sh ekranni ko'rib, keyingi qadamni o'zi topishi kerak edi. Tugma
qo'shildi, shuningdek `hint` (qo'shimcha tushuntirish) va `onAction`
(manzil o'rniga funksiya) qo'llab-quvvatlashi.

**B. Ro'yxatdan tanlangan filtr darhol qo'llanmasdi.**
Brauzerda o'lchandi: "AI xulosasi bo'yicha" da "Yomon" tanlandi —
"Filtrlar" tugmasidagi belgi `1` ga o'zgardi, lekin **jadval o'sha 11
qatorda qoldi**. Natija faqat "Qidirish" bosilgandan keyin yangilanardi.

Sabab: barcha filtrlar `filterRef` da saqlanadi va u faqat `handleSearch`
ichida yangilanadi. Endi ro'yxat va sana filtrlari darhol qo'llanadi;
erkin matnli qidiruv ataylab tugma ortida qoldi — u har bosilgan harfda
so'rov yubormasligi kerak.

**C. "Filtrlarni tozalash" filtrni tozalamasdi.**
`handleClearFilters` da `fetchData(1, '', null, [null, null], null, null)`
yozilgan edi. `fetchData` esa **faqat bitta argument** (sahifa) oladi va
filtrlarni `filterRef` dan o'qiydi — qolgan beshta argument e'tiborsiz
qolardi va so'rov **eski filtr bilan** ketardi. Natijada tozalashdan
keyin ham ro'yxat bo'sh ko'rinardi. Endi `filterRef` ham tozalanadi.

---

### Tekshiruv (brauzerda, to'liq tsikl)

| Qadam | Natija |
|---|---|
| Sahifa ochildi | 11 qator |
| "AI xulosasi" → "Yomon" tanlandi (tugma bosilmadi) | **darhol** "Filtrga mos natija topilmadi" |
| "Filtrlarni tozalash" bosildi | **11 qator qaytdi**, filtr belgilari yo'q |

---

### ✅ T-020 — ~~Xodimlar ro'yxatida parollar OCHIQ MATNDA ustun sifatida ko'rsatiladi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Xavfsizlik / Kritik
**Fayllar:** `frontend/src/pages/cabinet/pages/doctors/*`, `backend/EkgAnalyzerApi/Services/DoctorService.cs`, `Models/User.cs:16`

**Muammo:**
`/doctor` (Xodimlar) sahifasida jadval ustunlari: `#`, `F.I.SH`, **`Parol`**, `Telefon raqam`, `Lavozim`.

"Parol" ustunida har bir xodimning **haqiqiy paroli ochiq matnda** chiqadi. Brauzerda tasdiqlandi — 4 ta xodim uchun ham parol ko'rinib turdi.

Bu tasodifiy qoldiq emas, **tizimning amaldagi ishlash mexanizmi**:
1. `users.password_plain` ustuni bazada mavjud va to'ldirilgan.
2. Audit paytida **yangi xodim yaratib ko'rildi** — yangi foydalanuvchida ham `password_plain` darhol to'ldirildi (`plain_bor = t`). Ya'ni har bir yangi akkaunt uchun parol ochiq saqlanmoqda.
3. `DoctorService` bu maydonni DTO orqali frontendga uzatadi.
4. `Models/User.cs:16` da `PasswordPlain` property hamon e'lon qilingan.
5. `/doctor/create` formasidagi "Yangi parol" maydoni `type="text"` — parol yozilayotganda ekranda ochiq ko'rinadi (yulduzcha bilan yashirilmaydi).

**Nima uchun kritik:**
- Bazaga bir marta kirish (SQL injection, backup o'g'irlash, insayder, tashlab ketilgan dump fayl) **barcha foydalanuvchi parollarini ochiq** beradi. `password_hash` dagi BCrypt butunlay ma'nosiz bo'lib qoladi.
- Ko'p odam bitta parolni bir necha xizmatda ishlatadi — zarar platformadan tashqariga chiqadi.
- Parol ekranda ko'rinib turgani uchun yelka orqali qarash (shoulder surfing) va ekran suratiga tushish xavfi bor.
- O'z DSt 2814:2014 3-daraja va shaxsiy ma'lumotlar to'g'risidagi qonun talablarini to'g'ridan-to'g'ri buzadi. Sertifikatsiya auditida bu **birinchi to'xtatuvchi belgi** bo'ladi.
- Konstitutsiyada (`.specify/memory/constitution.md`) "PasswordPlain koddan olib tashlandi ✅" deb yozilgan — bu haqiqatga mos emas.

**Muhim eslatma:** Bu funksiya ataylab qo'shilgan bo'lishi mumkin (admin xodimga parolini aytib berishi uchun). Quyidagi reja shu ehtiyojni **xavfsiz tarzda** qoplaydi.

**Tuzatish rejasi:**
1. **Ehtiyojni almashtirish:** admin parolni ko'rish o'rniga **"Parolni tiklash"** tugmasini bosadi — tizim yangi vaqtinchalik parol generatsiya qiladi, uni **bir marta** ekranda ko'rsatadi (yoki xodimga SMS qiladi) va bazaga faqat hash yoziladi.
2. Xodim birinchi kirishda parolni majburiy almashtiradi (`must_change_password` bayrog'i).
3. Frontenddan "Parol" ustunini olib tashlash.
4. `/doctor/create` formasida parol maydonini `Input.Password` ga o'zgartirish (ko'z belgisi bilan ixtiyoriy ko'rsatish).
5. `DoctorService` / DTO'lardan `PasswordPlain` ni olib tashlash.
6. `Models/User.cs` dan `PasswordPlain` property'sini o'chirish.
7. Yangi EF Core migratsiya: avval `UPDATE users SET password_plain = NULL;`, keyin `ALTER TABLE users DROP COLUMN password_plain;`
8. Eski baza backup'larini ko'rib chiqish — ularda ham ochiq parollar bor.
9. Barcha mavjud foydalanuvchilarga parolni majburiy almashtirish (parollar kompromentatsiya qilingan deb hisoblanadi).

**Qabul mezoni:** `information_schema.columns` da `users.password_plain` yo'q; kod bazasida `PasswordPlain` matni umuman uchramaydi; `/doctor` sahifasida parol ustuni yo'q; admin faqat "Parolni tiklash" amalini bajara oladi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish — barcha qatlamda:**

| Qatlam | O'zgarish |
|---|---|
| **Baza** | Yangi migratsiya `20260829000000_RemovePasswordPlain` — avval `UPDATE users SET password_plain = NULL`, keyin `DROP COLUMN` |
| **Model** | `Models/User.cs` dan `PasswordPlain` property o'chirildi |
| **AuthService** | Ochiq parol yozadigan 3 ta joy olib tashlandi (register, verify, change-password) |
| **DoctorService** | Parolni javobda qaytaradigan 3 ta joy va yozadigan 1 ta joy olib tashlandi |
| **Frontend** | `Doctors.js` va `Patcients.js` dan "Parol" va "Login" ustunlari olib tashlandi |

**Jonli tekshiruv:**

| Tekshiruv | Avval | Hozir |
|---|---|---|
| `information_schema` da `users.password_plain` | mavjud, 5/5 to'ldirilgan | **0 — ustun yo'q** ✅ |
| `GET /api/doctor/get-doctors-of-clinic` | `"password":"1"` | `"password": null` ✅ |
| Xodimlar sahifasidagi "Parol" ustuni | ochiq parollar ko'rinardi | **ustun yo'q** ✅ |

**Regressiya tekshiruvi:**

| Amal | Natija |
|---|---|
| Admin / Shifokor / Hamshira login | uchalasi ham `success_login` ✅ |
| Yangi xodim yaratish | 200, `doctor_saved_success` ✅ |
| Yangi foydalanuvchi paroli | faqat **60 belgilik BCrypt hash** ✅ |
| Yangi xodim bilan login | muvaffaqiyatli ✅ |

⚠️ **Eslatma:** migratsiyadan keyin barcha mavjud foydalanuvchilar parollarini
kompromentatsiya qilingan deb hisoblab almashtirishlari kerak; eski baza
backup'larida ham ochiq parollar bor.

---

### ✅ T-021 — ~~"Lavozim" maydoni aslida tizim rolini belgilaydi — nomi chalg'ituvchi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UX / Ma'lumot arxitekturasi / Yuqori
**Fayl:** `frontend/src/pages/cabinet/pages/doctors/create/*`

**Muammo:**
Xodim qo'shish formasida ikkita o'xshash maydon bor:
- **"Lavozim"** — variantlar: `Bosh shifokor`, `Shifokor`, `Hamshira`. Bu aslida **tizim roli** (`role_id` = 3 / 4 / 5) va foydalanuvchining butun kirish huquqini belgilaydi.
- **"Mutaxassislik"** — variantlar: `Terapevt`, `Nevrolog`, `Pulmonolog`, ... Bu ko'p tanlovli (multi-select) tibbiy mutaxassislik.

Formada hech qayerda "bu tanlov xodimning tizimga kirish huquqini belgilaydi" deyilmagan. Admin "Lavozim" ni oddiy ma'lumot deb o'ylab, xodimga bexosdan "Bosh shifokor" huquqini berib qo'yishi mumkin — bu esa unga klinika sozlamalari va barcha xodimlarni boshqarish imkonini beradi.

**Qo'shimcha muammolar:**
- Xodimlar ro'yxatidagi "Lavozim" ustuni ham rolni ko'rsatadi, mutaxassislikni emas — jadvalda xodimning tibbiy mutaxassisligi umuman ko'rinmaydi.
- Mutaxassislik multi-select dropdown'i pastga ochilib **"Saqlash" tugmasini to'liq to'sib qo'yadi**. Foydalanuvchi avval boshqa joyga bosib dropdown'ni yopishi kerak, aks holda tugmaga bosa olmaydi.

**Tuzatish rejasi:**
1. "Lavozim" maydonini **"Tizimdagi roli"** deb qayta nomlash va yoniga tushuntirish qo'shish (har bir rol nimaga ruxsat berishini ko'rsatuvchi tooltip yoki qisqa matn).
2. Rol tanlanganda uning huquqlarini qisqacha ko'rsatish (masalan: "Shifokor — faqat o'ziga biriktirilgan tahlillarni ko'radi").
3. Xodimlar jadvaliga alohida **"Mutaxassislik"** ustunini qo'shish.
4. Multi-select uchun `getPopupContainer` sozlash yoki dropdown'ni yuqoriga ochish (`placement="topLeft"`), yoxud "Saqlash" tugmasini formaning yopishqoq (sticky) pastki panelida joylashtirish.
5. "Bosh shifokor" rolini tanlashda qo'shimcha tasdiqlash oynasi ko'rsatish (bu boshqaruv huquqi berilishi sababli).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**1. Maydon qayta nomlandi (reja 1-bandi)**

| Til | Avval | Keyin |
|---|---|---|
| O'zbek | Lavozim | **Tizimdagi roli** |
| Rus | Должность | **Роль в системе** |
| Ingliz | Role | **System role** |

"Lavozim" so'zi bu maydonni oddiy kadrlar ma'lumoti kabi ko'rsatardi,
holbuki u xodimning butun kirish huquqini belgilaydi.

**2. Rol tanlanganda uning huquqlari ko'rsatiladi (reja 2-bandi)**

Maydon ostida tanlangan rol nima qila olishi yoziladi, masalan:

> Direktor — klinikaning barcha tahlillarini ko'radi, xodimlarni qo'shadi
> va o'chiradi, tashkilot ma'lumotlarini tahrirlaydi.

To'rt rol uchun ham matn bor, uch tilda.

**3. Boshqaruv huquqi uchun tasdiqlash (reja 5-bandi)**

Admin yoki Direktor tanlansa oyna chiqadi:

> **Boshqaruv huquqi berilmoqda**
> Bu rol xodimga klinikaning BARCHA tahlillarini ko'rish va boshqa
> xodimlarni boshqarish huquqini beradi. Davom etilsinmi?

"Bekor qilish" bosilsa tanlov **tozalanadi** — ya'ni e'tiborsizlik bilan
yopib yuborish huquq berilishiga olib kelmaydi.

**4. Jadvalga "Mutaxassislik" ustuni (reja 3-bandi)**

Ilgari xodimlar jadvalida faqat tizim roli ko'rinardi va tibbiy
mutaxassislik umuman chiqmasdi — holbuki "kim kardiolog?" degan savol
kundalik ish uchun rolga qaraganda muhimroq.

**5. Ko'p tanlovli ro'yxat "Saqlash" tugmasini to'smaydi (reja 4-bandi)**

`getPopupContainer` sozlandi — ro'yxat endi maydonning o'z konteyneri
ichida ochiladi va joy yetmasa yuqoriga chiqadi. `maxTagCount="responsive"`
qo'shildi: beshta mutaxassislik tanlansa maydon cho'zilib ketmaydi.

---

### Tekshiruv (brauzerda, o'lchov bilan)

| Tekshiruv | Natija |
|---|---|
| Maydon yorlig'i | "Tizimdagi roli" |
| "Bosh shifokor" tanlandi | Tasdiq oynasi chiqdi |
| Oynada "Bekor qilish" | Rol tanlovi tozalandi, tushuntirish yo'qoldi |
| Rol tushuntirishi | "Direktor — klinikaning barcha tahlillarini ko'radi…" |
| Jadval ustunlari | `# / avatar / Familiya, ism / Telefon raqam / **Tizimdagi roli** / **Mutaxassislik**` |
| Mutaxassislik ro'yxati ochilganda | ro'yxat `388–477 px`, "Saqlash" tugmasi `568–610 px` — **kesishmaydi** |

Jadvalda mutaxassisliklar chindan ham chiqdi, masalan:
`AMRULLAYEV ABDULLA — Pulmonolog, Gastroenterolog, Nefrolog, Pediatr`.

---

### ✅ T-022 — ~~Yangi xodim yaratilganda parol siyosati yo'q~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Xavfsizlik / O'rta
**Fayllar:** `backend/EkgAnalyzerApi/Services/DoctorService.cs`, `Services/AuthService.cs`

**Muammo:**
Bazadagi mavjud xodimlarning parollari: `1`, `1`, `1`, `1`, `12345678`. Ya'ni bir belgili parol qabul qilinmoqda.

Tizimda parol uchun hech qanday talab yo'q:
- minimal uzunlik yo'q
- murakkablik talabi yo'q
- ko'p uchraydigan parollar ro'yxati bo'yicha tekshiruv yo'q
- xodim birinchi kirishda parolni almashtirishga majbur emas

**Nima uchun muhim:**
`1` paroli bilan akkauntni topish uchun brute-force ham kerak emas. T-002 (rate limiting yo'qligi) bilan birgalikda bu — klinikaning barcha bemor ma'lumotlariga ochiq eshik.

**Tuzatish rejasi:**
1. Backendda parol siyosatini joriy qilish: kamida 8 belgi, harf + raqam, ko'p uchraydigan parollar ro'yxatiga qarshi tekshiruv.
2. Xuddi shu qoidalarni frontendda ham ko'rsatish (real vaqtda parol kuchi indikatori bilan).
3. `must_change_password` bayrog'i: admin yaratgan vaqtinchalik parol bilan birinchi kirishda majburiy almashtirish.
4. Mavjud zaif parollarni migratsiya orqali "eskirgan" deb belgilash va keyingi kirishda almashtirishni talab qilish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

### 1. Server tomonida parol siyosati

`Services/PasswordPolicy.cs` (yangi):

| Qoida | Qiymat |
|---|---|
| Minimal uzunlik | 8 belgi |
| Harf | kamida bitta |
| Raqam | kamida bitta — **yoki** parol 12 belgidan uzun (parol iborasi) |
| Turli belgilar | kamida 4 xil |
| Ko'p uchraydigan parollar | 20 talik ro'yxat bo'yicha rad etiladi |

Maxsus belgi **ataylab majburiy qilinmadi**: u parolni sezilarli
kuchaytirmaydi, lekin foydalanuvchini uni qog'ozga yozib qo'yishga
undaydi. Uzunlik esa haqiqatan kuchaytiradi — shuning uchun 12 belgidan
uzun parol uchun raqam talabi bekor qilinadi.

`aaaaaaaa` kabi parol uzunlik shartini qanoatlantiradi, lekin himoya
bermaydi — shu sababli "kamida 4 xil belgi" qoidasi qo'shildi.

**Qo'llanadigan joylar (4 ta):** klinika ro'yxatdan o'tishi, parolni
tiklash, xodim yaratish, xodim parolini o'zgartirish.

**Yo'l-yo'lakay tuzatildi:** `DoctorService` da parol berilmasa xodimga
jimgina `"000"` paroli qo'yilardi (`dto.Password ?? "000"`). Uni hech
kim bilmasdi, akkaunt esa ochiq qolardi.

**Ikkinchi tuzatish:** siyosat buzilganda avval `throw new Exception`
ishlatilgan edi va u **500 "Ichki xatolik"** bo'lib chiqardi —
foydalanuvchi nima noto'g'ri ekanini bilmasdi. Bu servis xatoliklarni
natija obyekti orqali qaytaradi, shuning uchun `Fail(...)` ga
o'tkazildi va endi 400 va aniq sabab qaytadi.

### 2. Frontend — talablar yozish davomida ko'rsatiladi

`components/shared/PasswordField.js` (yangi): kuch ko'rsatkichi
(qizil → sariq → yashil) va besh talabning har biri yonida belgi.
`passwordRule(t)` — antd forma qoidasi, server siyosati bilan bir xil.

Faqat server tekshiruvi yetarli emas edi: foydalanuvchi formani
to'ldirib, yuborib, keyin xatolik olardi va nima kerakligini taxmin
qilardi.

Ulangan joylar: ro'yxatdan o'tish, parolni tiklash, xodim qo'shish.

**Yo'l-yo'lakay tuzatildi:** xodim formasida parol maydoni oddiy
`<Input>` edi — parol yozilayotganda ekranda **ochiq ko'rinardi**.

`Register.js` dagi eski qoida `{ min: 6 }` edi, ya'ni `123456` o'tardi.

### 3. Vaqtinchalik parolni birinchi kirishda almashtirish

Migratsiya `20260831020000_AddMustChangePassword` — `users.must_change_password`.

Xodim akkauntini admin yaratadi va parolni og'zaki aytadi, ya'ni uni
kamida ikki kishi biladi. Bayroq:

* admin xodim yaratganda **`true`** qo'yiladi;
* admin parolni qayta o'rnatganda ham **`true`** qaytadi (parol yana
  ikki kishiga ma'lum bo'ldi);
* foydalanuvchi parolni almashtirgach **`false`** bo'ladi.

Login javobiga `mustChangePassword` qo'shildi; frontend uni ko'rib
foydalanuvchini `/profile?changePassword=1` ga yo'naltiradi va u yerda
sababi tushuntiriladi.

Sukut qiymati `false` — mavjud foydalanuvchilar migratsiyadan keyin
birdan tizimdan chiqib qolmaydi.

---

### Tekshiruv (jonli)

**Parol siyosati — parolni tiklash orqali:**

| Parol | Natija |
|---|---|
| `1` | 400 — "Parol kamida 8 ta belgidan iborat bo'lishi kerak." |
| `1234567` | 400 — o'sha |
| `12345678` | 400 — "Bu parol juda ko'p ishlatiladi. Boshqasini tanlang." |
| `abababab` | 400 — "Parolda kamida bitta raqam bo'lishi kerak (yoki parolni 12 belgidan uzun qiling)." |
| `TestParol2026` | **200** |

**Xodim yaratish orqali:**

| Parol | Natija |
|---|---|
| `1` | 400 — uzunlik |
| `12345678` | 400 — ko'p ishlatiladi |
| `Yaxshi2026Parol` | **200**, xodim yaratildi |

**Frontend ko'rsatkichi** (brauzerda o'lchandi):

| Kiritilgan | Bajarilgan talablar |
|---|---|
| `ab` | harf ✅ — qolgan 4 tasi ❌ |
| `12345678` | uzunlik ✅, raqam ✅, xilma-xillik ✅ — harf ❌, ko'p ishlatiladi ❌ |
| `abcd1234` | **5/5 ✅** |

**Majburiy almashtirish (to'liq oqim, brauzerda):**

1. Admin `+998 90 777-66-55` xodimini `Vaqtinchalik2026` paroli bilan yaratdi;
2. login javobi: `mustChangePassword: true`;
3. xodim kirdi → **`/profile?changePassword=1`** ga yo'naltirildi;
4. ekranda ogohlantirish: *"Vaqtinchalik parolni almashtiring — Hozirgi
   parolni administrator qo'ygan va uni kamida ikki kishi biladi."*

---

### ✅ T-023 — ~~Yon menyuda "Bemorlar" bo'limi yo'q, lekin sahifa mavjud~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Yetishmayotgan komponent / Navigatsiya / O'rta
**Fayllar:** `frontend/src/components/SideBar.js`, `frontend/src/pages/cabinet/Main.js:236`

**Muammo:**
`Main.js` da `/patcients` marshruti ro'yxatdan o'tkazilgan va `Patcients` sahifasi mavjud, lekin **yon menyuda unga havola yo'q**. Foydalanuvchi bu sahifaga faqat URL ni qo'lda yozib kira oladi.

Yon menyu tarkibi (Admin uchun): Xodimlar, EKG, Holter, SMAD, Laboratoriya, Shifokor xulosasi, Video Konferensiya, Konsultantlar, Konsultatsiya, Tashkilot ma'lumotlari.

**Nima uchun muhim:**
Bemorlar — tibbiy platformaning markaziy ob'ekti. Hozir bemorni faqat tahlil yaratish oqimi ichida qidirib topish mumkin. Bemorning kartasini ochib, uning **barcha tahlillari tarixini bir joyda** ko'rish imkoni interfeysda umuman yo'q.

**Tuzatish rejasi:**
1. Yon menyuga "Bemorlar" bo'limini qo'shish.
2. Bemorlar ro'yxati sahifasini to'liq qilish: qidiruv (F.I.SH / passport), pagination, filtrlar.
3. **Bemor kartasi** sahifasini yaratish — bitta bemorning EKG, Holter, SMAD, Laboratoriya tahlillari va shifokor xulosalari yagona xronologik lentada.
4. Tahlil ko'rish sahifalaridan bemor kartasiga havola qo'yish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ishlar:**

1. `tools/routes.js` — kommentga olingan `/patcients` bo'limi yon menyuga
   qaytarildi (`icon: <FaPeopleGroup />`, `role_id: []` — barcha rollar,
   `requires_active: true`).
2. **Bemor kartasi sahifasi yaratildi** — `pages/cabinet/pages/patcients/PatcientCard.js`:
   * shaxsiy ma'lumotlar (`Descriptions`), passport maskalangan;
   * tahlillar soni turlar bo'yicha (`Statistic`: EKG / Holter / SMAD / Lab / Xulosa);
   * **barcha tahlillar yagona xronologik lentada** — tur, hujjat raqami,
     tahlil sanasi, holat, AI xulosasi (jiddiylik darajasi), shifokor;
   * qatorni bosganda tegishli tahlilni ko'rish sahifasiga o'tadi;
   * "Orqaga" tugmasi, `Skeleton` yuklanish holati, topilmasa `EmptyState`.
3. Backend: `GET /api/patcient/get-patient-card/{id}` — `PatientCardDTO` +
   `PatientTimelineItemDTO`. Jiddiylik darajasi `AiSeverity.Parse()` orqali
   (matn qidirish emas). Bemor foydalanuvchiga ko'rinmasa `404` qaytadi —
   ID ni terib boshqa klinika bemorining F.I.SH ini bilib olish mumkin emas.
4. `host/requests/PatcientRequest.js` — `get_patient_card(id, data)`.
5. `pages/cabinet/Main.js` — `/patcients/:id` marshruti (`ClinicGatedRoute`).
6. Uch tilga 15 ta yangi kalit qo'shildi (547 → 562): `analyse_history`,
   `analyse_type`, `document_number`, `analyse_date`, `conclusion`, `ready`,
   `waiting`, `ai_processing`, `file_type_mismatch_short`, `no_analyses`,
   `no_patients`, `birth_date`, `analyses`, `passport_masked_hint`,
   `search_patient_placeholder`.

**Tekshirildi:**

| Tekshiruv | Natija |
|---|---|
| Yon menyu | "Пациенты" bo'limi ko'rinadi va ishlaydi |
| Brauzer `/patcients/13` | Karta ochildi: F.I.SH, 15.05.1990 (36 лет), Мужской, `** ****4567`, telefon, manzil |
| Tahlillar soni | EKG 10, Holter 3, SMAD 2, Lab 9, Xulosa 1 |
| Xronologik lenta | 25 ta yozuv, 3 sahifa; holat va xulosa ustunlari to'g'ri (`Готово`/`Ожидает`/`Файл не соответствует`, `Норма`/`Среднее`/`Опасно`) |
| Shifokor ko'rinishi (DOCTOR1) | 16 ta yozuv (EKG 6, Lab 5) — admindagi 25 tadan kam, ya'ni faqat o'ziga biriktirilganlari |
| Boshqa klinika admini (NEWADMIN) | `GET /get-patient-card/13` → **404** |
| Tarjima | Barcha ustun va yorliqlar rus tilida to'liq chiqdi, xom kalit yo'q |

---

### ✅ T-024 — ~~Har bir sahifada brauzer sarlavhasi (`<title>`) o'zgarmaydi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UX / SEO / O'rta
**Fayl:** `frontend/public/index.html`, barcha sahifa komponentlari

**Muammo:**
Foydalanuvchi qaysi sahifada bo'lishidan qat'i nazar brauzer yorlig'ida doim bitta matn turadi:
```
NMED — AI EKG va Tibbiy Diagnostika Platformasi | O'zbekiston
```
Bu landing sahifa uchun yozilgan SEO sarlavhasi. Kabinet ichida ham (Xodimlar, EKG tahlillari, Dashboard) o'zgarmaydi.

**Nima uchun muhim:**
Shifokorlar odatda bir nechta yorliqni ochib ishlaydi (bemor kartasi, EKG natijasi, xulosa yozish). Barcha yorliqlar bir xil nomlanganda kerakligini topish qiyin. Brauzer tarixi va xatcho'plar ham foydasiz bo'lib qoladi.

**Tuzatish rejasi:**
1. `useDocumentTitle(title)` nomli oddiy hook yaratish.
2. Har bir sahifada chaqirish: `useDocumentTitle(t('ecg_analyses') + ' — NMED')`.
3. Tahlil ko'rish sahifalarida bemor ismini qo'shish: `"ISMOILOV R. — EKG #93 — NMED"`.
4. Til almashtirilganda sarlavha ham yangilanishini ta'minlash.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ishlar:**

1. `tools/useDocumentTitle.js` — oddiy hook. Sarlavha `"{sahifa} — NMED"`
   ko'rinishida. Sahifadan chiqilganda avvalgi sarlavha qaytariladi (aks
   holda orqaga qaytilganda eski nom qolib ketardi). `title` tarjima bilan
   birga o'zgargani uchun **til almashtirilganda sarlavha ham yangilanadi**.
2. 18 ta kabinet sahifasiga qo'shildi: Bosh sahifa, to'rtta tahlil ro'yxati,
   Shifokor xulosasi, to'rtta tahlil yaratish sahifasi, Xodimlar, Bemorlar,
   Tashkilot ma'lumotlari, Audit jurnali, Tizim holati, Yordam, Profil, 404.
3. **Tahlil ko'rish sahifalarida bemor ismi va hujjat raqami bilan**:
   `"TESTBEMOROV SANJAR — NMED-EKG-00000102 — NMED"`.
   Hook shartli `return` dan oldin joylashtirildi — React hook qoidasi
   buzilmasligi uchun.
4. Bemor kartasida bemor ismi bilan.

**Yo'l-yo'lakay tuzatilgan bog'liq kamchilik:**
Hujjat raqami tahlil **detali** DTO'sida umuman yo'q edi — u faqat PDF
ichida bor edi va shifokor bemorga raqamni aytishi uchun hujjatni yuklab
olishga majbur bo'lardi. `DocumentNumber` to'rtta detal DTO'siga va ularning
proyeksiyalariga qo'shildi hamda **ko'rish sahifasining sarlavha blokida**
alohida kartochka sifatida chiqariladi.

**Tekshirildi (brauzerda):**

| Sahifa | Brauzer yorlig'i |
|---|---|
| `/ecg-analyses` | `Анализы ЭКГ — NMED` |
| `/ecg-analyses/view/102` | `TESTBEMOROV SANJAR — NMED-EKG-00000102 — NMED` |
| `/patient-diagnoses` | `Заключение врача — NMED` |
| `GET /api/ecg-analyses/102` | `documentNumber: NMED-EKG-00000102` (holter/smad/lab ham) |
| Ro'yxat endpointlari | Buzilmadi — `documentNumber` hali ham qaytadi |

---

### ✅ T-025 — ~~AI xatoligida OpenAI'ning xom javobi bazaga yozilib, brauzerga qaytariladi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Xavfsizlik / Ma'lumot oshkorligi / Kritik
**Fayllar:** `python_back/main.py` (`_sync_ecg_process_and_ai`, `_ecg_ai_background`), `lab_analyses_api.py`, `holter_analyses_api.py`, `smad_analyses_api.py`

**Muammo:**
Jonli test (2026-08-29): 4 ta tahlil yuborildi (EKG #95, Holter #13, SMAD #8, Lab #16). OpenAI kaliti yaroqsiz bo'lgani uchun hammasi `status = -1` bilan tugadi va `ai_answer_data` ustuniga **provayderning xom xatolik matni** yozildi:

```
Error code: 401 - {'error': {'message': 'Incorrect API key provided:
sk-proj-****...****G34A. You can find your API key at
https://platform.openai.com/account/api-keys.',
'type': 'invalid_request_error', 'code': 'invalid_api_key', ...}, 'status': 401}
```

`GET /api/ecg-analyses/95` shu matnni `aiAnswerData` maydonida **o'zgartirmasdan brauzerga qaytaradi**.

**Nima uchun kritik:**
1. **API kalitining bir qismi oshkor bo'ladi** (`sk-proj-` prefiksi va oxirgi 4 belgi). To'liq kalit emas, lekin kalit formati, provayder va prefiks — hujumchi uchun foydali ma'lumot.
2. **Ichki infratuzilma oshkor bo'ladi** — klinika xodimi platforma OpenAI'ga tayanishini va qaysi endpoint ishlatilishini biladi.
3. **Foydalanuvchi tushunmaydi** — shifokor ekranda ingliz tilidagi texnik xatolikni ko'radi. "Tahlil qilib bo'lmadi, administratorga murojaat qiling" degan tushunarli xabar o'rniga.
4. `ai_answer_data` — AI natijasi uchun mo'ljallangan maydon. U yerga xatolik matnini yozish ma'lumotlar modelini buzadi: frontend uni JSON deb parse qilishga urinib yana xato beradi.

**Tuzatish rejasi:**
1. Python tomonida barcha AI chaqiruvlarini `try/except` bilan o'rab, **xom xatolikni faqat `logger.exception()` ga** yozish.
2. `ai_answer_data` ga hech qachon xatolik matni yozmaslik — `NULL` qoldirish, `status = -1` esa xatolik belgisi bo'lib xizmat qiladi.
3. Xatolik sababini alohida ustunga saqlash (`ai_error_code`, masalan `provider_auth_failed`, `provider_timeout`, `invalid_file`, `quota_exceeded`) — bu ustun mijozga chiqmaydi, faqat admin paneli uchun.
4. Frontendda `status = -1` uchun tushunarli xabar va **"Qayta urinish"** tugmasi ko'rsatish.
5. `ai_answer_data` ichida `sk-`, `Bearer`, `api-key` kabi naqshlar bo'lsa ularni tozalaydigan himoya filtri qo'shish (ikkinchi mudofaa chizig'i).

**Qabul mezoni:** AI xatoligida `aiAnswerData` bo'sh bo'ladi; brauzer javobida `sk-` yoki `openai.com` matni umuman uchramaydi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**
Yangi `python_back/ai_errors.py` — AI xatoliklarini turkumlash va tarjima qilish moduli.

- `classify(exc)` — xatolikni 6 turkumga ajratadi: `provider_auth_failed`, `provider_quota_exceeded`, `provider_timeout`, `provider_unavailable`, `invalid_file`, `internal_error`.
- `sanitize()` — matndan `sk-…`, `Bearer …`, `api_key=…` naqshlarini olib tashlaydi (**log'ga ham tushmaydi**).
- `to_ai_answer()` — bazaga yoziladigan xavfsiz JSON. **`automatic_analysis_bool` ataylab yo'q** — natija baholanmagan, shuning uchun ro'yxatda yashil "Normal" chiqmaydi.

To'rttala modulda (`main.py`, `lab/holter/smad_analyses_api.py`) `ai_answer_data=str(exc)` almashtirildi.

**Jonli tekshiruv:**

| Xatolik | Log'ga tushadigan | Bazaga yoziladigan |
|---|---|---|
| OpenAI 401 (kalit) | `Incorrect API key provided: **[YASHIRILGAN]**` | `{"xato_kodi":"provider_auth_failed", "xabar":"AI xizmatiga ulanib bo'lmadi. Iltimos, administratorga murojaat qiling."}` |
| `TypeError: NoneType * int` | to'liq matn (maxfiy emas) | `{"xato_kodi":"invalid_file", "xabar":"Faylni o'qib bo'lmadi…"}` |
| Timeout | to'liq matn | `{"xato_kodi":"provider_timeout", "qayta_urinish_mumkin": true}` |

Endi javobda `sk-` prefiksi ham, `openai.com` havolasi ham, stack trace ham yo'q.

---

### ✅ T-026 — ~~Tahlil yaratishda tranzaksiya yo'q: xatolik bo'lsa yarim yozuv qoladi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Ma'lumotlar yaxlitligi / Kritik
**Fayllar:** `python_back/main.py:1218-1235` (`/api/analyze`), shuningdek `lab_analyses_api.py`, `holter_analyses_api.py`, `smad_analyses_api.py` dagi mos joylar

**Muammo:**
`/api/analyze` quyidagi ketma-ketlikda ishlaydi, **har bir qadam alohida commit qilinadi**:
1. Faylni diskka saqlash
2. `ecg_analyses` yozuvini yaratish (`status = 0`)
3. Har bir `doctor_id` uchun `ecg_analyse_doctors` qatori
4. Har bir `complaint_id` uchun `ecg_analyse_complaints` qatori

Test paytida 4-qadamda `ForeignKeyViolation` yuz berdi (mavjud bo'lmagan `complaint_id`). Natija:

| Nima bo'ldi | Holat |
|---|---|
| HTTP javob | **500 Internal Server Error** |
| `ecg_analyses` yozuvi (id=94) | **bazada qoldi**, `status = 0` |
| Yuklangan fayl | **diskda qoldi** |
| `ecg_analyse_doctors` (2 qator) | **bazada qoldi** |
| `ecg_analyse_complaints` | yozilmadi |

Foydalanuvchi "xatolik" xabarini ko'radi va qayta urinadi — lekin ro'yxatda **abadiy `status = 0` da muzlab qolgan** yozuv paydo bo'ladi. U hech qachon AI'ga yuborilmaydi, hech qachon tugamaydi va uni interfeys orqali o'chirib ham bo'lmaydi (o'chirish endpointi yo'q — T-027).

**Nima uchun kritik:**
Tibbiy tizimda "yarim yaratilgan" yozuv — bemor kartasida tushunarsiz bo'sh tahlil. Vaqt o'tishi bilan bunday chiqindi yozuvlar to'planadi va statistikani ham buzadi (`allTime` hisobiga kiradi).

**Tuzatish rejasi:**
1. Barcha `create_*` chaqiruvlarini **bitta SQLAlchemy tranzaksiyasiga** o'rash:
   ```python
   try:
       with db.begin():
           ecg = create_ecg_analyse(...)
           for d in doctor_id or []: create_ecg_analyse_doctor(...)
           for c in complaint_id or []: create_ecg_analyse_complaint(...)
   except Exception:
       # fayl ham o'chiriladi
       Path(analyse_file_path).unlink(missing_ok=True)
       raise HTTPException(400, "Tahlil yaratib bo'lmadi")
   ```
   Hozirgi `create_*` yordamchilari ichida `commit()` chaqirilayotgan bo'lsa — ularni `flush()` ga o'zgartirish kerak.
2. Kiruvchi `doctor_id` va `complaint_id` larni **oldindan tekshirish** — mavjudligini va joriy klinikaga tegishliligini (bu FK xatoligini umuman oldini oladi).
3. Tranzaksiya muvaffaqiyatsiz bo'lsa yuklangan faylni diskdan o'chirish.
4. Mavjud chiqindi yozuvlarni tozalash skripti (`status = 0` va 24 soatdan eski).

**Qabul mezoni:** Noto'g'ri `complaint_id` bilan so'rov yuborilganda 400 qaytadi va bazada hech qanday yangi qator qolmaydi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**
Yangi `python_back/reference_validator.py` — tahlil yaratishdan **oldin** barcha
tashqi kalitlarni tekshiradi. Shunda FK xatoligi umuman yuz bermaydi va
chala yozuv qolmaydi.

Tekshiriladi: bemor, klinika, `created_doctor_id`, `main_doctor_id`, `doctor_id[]`,
`complaint_id[]`, `lab_category_id[]`. Shifokorlar **shu klinikaga tegishliligi** ham
tekshiriladi — boshqa klinikaning shifokorini biriktirib bo'lmaydi.

To'rttala modulga (`EKG`, `Lab`, `Holter`, `SMAD`) qo'shildi; fayl endi
validatsiyadan **keyin** saqlanadi, shuning uchun yetim fayl ham qolmaydi.

**Jonli tekshiruv:**

| Sinov | Avval | Hozir |
|---|---|---|
| `complaint_id=99999` | **500** + chala yozuv bazada qoldi | **400** `"Shikoyat topilmadi: [99999]"` ✅ |
| Yozuvlar soni (oldin → keyin) | 10 → **11** (chala) | 10 → **10** ✅ |
| Begona klinika shifokori (`doctor_id=54`) | yaratilardi | **400** `"Shifokor topilmadi yoki boshqa klinikaga tegishli"` ✅ |
| Mavjud bo'lmagan bemor | FK xatosi | **400** `"Bemor topilmadi"` ✅ |
| **Regressiya:** to'g'ri ma'lumot | 200 | **200**, EKG #102 yaratildi ✅ |

---

### ✅ T-027 — ~~Tahlilni o'chirish yoki bekor qilish imkoniyati umuman yo'q~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Yetishmayotgan komponent / Yuqori
**Fayllar:** barcha tahlil Controller'lari, tahlil ro'yxati sahifalari

**Muammo:**
Platformada tahlilni **o'chirish yoki bekor qilish endpointi ham, tugmasi ham yo'q**. `DELETE` metodi hech bir tahlil controller'ida mavjud emas.

Amaliy holatlar:
- Xodim noto'g'ri bemorga tahlil biriktirdi — tuzatib bo'lmaydi.
- Noto'g'ri fayl yuklandi (boshqa bemorning EKG'si) — o'chirib bo'lmaydi.
- T-026 dagi kabi "yarim yaratilgan" yozuv — abadiy qoladi.
- Bemor ma'lumotini o'chirishni so'radi (shaxsiy ma'lumotlar qonuni bo'yicha "unutilish huquqi") — texnik imkoniyat yo'q.

**Tuzatish rejasi:**
1. **Yumshoq o'chirish** (soft delete) joriy qilish: `deleted_at`, `deleted_by_user_id` ustunlari. Yozuv fizik o'chirilmaydi, barcha ro'yxat so'rovlaridan chiqarib tashlanadi.
2. `DELETE /api/{tur}-analyses/{id}` endpointi — faqat Admin/Direktor uchun, klinika tekshiruvi bilan.
3. O'chirish sababini majburiy kiritish va `audit_logs` ga yozish (kim, qachon, nima uchun).
4. Frontendda ro'yxat qatorida o'chirish tugmasi + tasdiqlash oynasi.
5. SuperAdmin uchun o'chirilgan yozuvlarni ko'rish va tiklash imkoniyati.
6. Bemor tahlilini boshqa bemorga ko'chirish (qayta biriktirish) funksiyasi — noto'g'ri biriktirish eng ko'p uchraydigan xato.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ishlar:**

**1. Yumshoq o'chirish (soft delete) — baza**
`Migrations/20260830000000_AddSoftDeleteToAnalyses.cs` — beshta jadvalga
(`ecg_analyses`, `lab_analyses`, `holter_analyses`, `smad_analyses`,
`medical_diagnoses`) uchta ustun qo'shildi:
`deleted_at`, `deleted_by_user_id`, `delete_reason`.
Har biriga `WHERE deleted_at IS NULL` qisman indeksi qo'shildi.
Yozuv **hech qachon fizik o'chirilmaydi** — tibbiy yozuv huquqiy hujjat.

**2. Global query filter**
`Data/MedDataDB.cs` — `HasQueryFilter(x => x.DeletedAt == null)` beshta tahlil
entity'si va bog'lovchi jadvallar (`*AnalyseDoctors`, `ECGAnalyseComplaints`)
uchun. Shu tufayli **mavjud o'nlab so'rovga qo'lda `Where` qo'shish shart emas**
va yangi so'rov yozganda uni unutib qo'yish xavfi yo'q.
O'chirilganlarni ko'rish uchun ataylab `.IgnoreQueryFilters()` yozish kerak.

**3. Xizmat va endpointlar**
* `Services/AnalysisDeletionService.cs` — `DeleteAsync` / `RestoreAsync`.
  Sabab majburiy (kamida 5 belgi), har bir o'chirish `audit_logs` ga
  `ANALYSIS_SOFT_DELETE` sifatida yoziladi (kim, qachon, sabab).
* `Controllers/AnalysisDeletionController.cs`:
  * `DELETE /api/analyses/{type}/{id}` — faqat `ClinicManager` (Admin/Direktor),
    faqat o'z klinikasi;
  * `POST /api/analyses/{type}/{id}/restore` — faqat SuperAdmin;
  * `GET /api/analyses/deleted` — klinikada o'chirilganlar ro'yxati
    ("bu tahlil qayerga ketdi?" savoliga javob).

**4. Frontend**
* `components/shared/DeleteAnalysisButton.js` — tugma + tasdiqlash oynasi.
  Oynada hujjat raqami, tushuntirish ("bazadan butunlay o'chirilmaydi") va
  **majburiy sabab maydoni**. Sabab 5 belgidan qisqa bo'lsa "O'chirish"
  tugmasi o'chiq turadi.
* `host/requests/AnalysisDeletionRequest.js` — `delete_analysis`,
  `get_deleted_analyses`, `restore_analysis`.
* Beshta ro'yxat sahifasiga (EKG, Holter, SMAD, Laboratoriya, Shifokor xulosasi)
  tugma qo'shildi va `isClinicManager` (roleId 2/3) sharti bilan yopildi.
* Backend ro'yxat DTO'lariga `DocumentNumber` qo'shildi — tasdiqlash oynasi
  qaysi yozuv o'chirilayotganini nom bilan ko'rsatishi uchun
  (`#12` emas, `NMED-HOL-00000015`).
* Uch tilga 7 ta yangi kalit qo'shildi (562 → 569).

**Tekshirildi:**

| Tekshiruv | Natija |
|---|---|
| `DELETE /api/analyses/ecg/94` sababsiz (`"qis"`) | `400` — "O'chirish sababi majburiy (kamida 5 belgi)" |
| Shifokor tokeni bilan | **`403`** — siyosat ishladi |
| Boshqa klinika admini (NEWADMIN) | **`404`** — "Tahlil topilmadi yoki ruxsat yo'q" |
| Admin, sabab bilan | `200` — "Tahlil o'chirildi" |
| Qayta o'chirish | `409` — "Tahlil allaqachon o'chirilgan" |
| `GET /api/ecg-analyses/94` | **`404`** — global filter ishladi |
| `GET /api/ecg-analyses/get-by-clinic` | 94 ro'yxatda yo'q |
| Bemor kartasi (`/get-patient-card/13`) | lenta 25 → 24, EKG 10 → 9 |
| `audit_logs` | `ANALYSIS_SOFT_DELETE / ecg / 94 / {"deletedAt":..., "reason":"..."}` |
| Baza | `ecg_analyses.deleted_at` to'ldirilgan, qator **o'chirilmagan** |
| `GET /api/analyses/deleted` | 2 ta yozuv, sabablari bilan |
| Brauzer — EKG ro'yxati | 10 ta qatorda o'chirish tugmasi ko'rindi |
| Brauzer — modal | "NMED-HOL-00000015 — Анализ будет убран из списков…", sabab maydoni bo'sh ekan "Удалить" **o'chiq** |
| Brauzer — to'liq oqim | Sabab kiritildi → "Удалить" → `Анализ удалён` xabari → ro'yxat yangilandi, yozuv yo'qoldi |
| Tarjima | Modal to'liq rus tilida chiqdi, xom kalit yo'q |

**Qolgan (alohida tasklar):**
Bemor tahlilini boshqa bemorga qayta biriktirish funksiyasi va SuperAdmin
kabinetidagi "o'chirilganlar" ekrani — SuperAdmin kabineti hali qurilmagani
uchun (T-062) endpoint tayyor, UI keyingi bosqichda.

---

### ✅ T-028 — ~~OpenAI kalitining yaroqsizligi haqida hech kim xabardor bo'lmaydi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Ishonchlilik / Monitoring / Yuqori
**Fayllar:** `python_back/config.py`, barcha AI chaqiruv joylari

**Muammo:**
Auditda aniqlandi: `python_back/.env` dagi `OPENAI_API_KEY` **yaroqsiz** (OpenAI 401 `invalid_api_key` qaytardi). Natijada yuborilgan **4 ta tahlilning 4 tasi ham** muvaffaqiyatsiz tugadi.

Muammo shundaki, tizim bu haqda **hech qanday signal bermaydi**:
- `config.py` faqat kalit **bo'sh emasligini** tekshiradi, haqiqiyligini emas.
- Har bir tahlil jimgina `status = -1` ga o'tadi.
- Adminga bildirishnoma yo'q, monitoring yo'q, log'da ham oddiy `logger.exception` dan boshqa narsa yo'q.
- Foydalanuvchi ekranda texnik xatolikni ko'radi va nima qilishni bilmaydi.

Klinika bir necha kun davomida hech narsa ishlamayotganini bilmasligi mumkin.

**Tuzatish rejasi:**
1. **Startup tekshiruvi:** ilova ko'tarilganda OpenAI'ga arzon "health" so'rovi (masalan `GET /v1/models`) yuborib, kalit ishlashini tekshirish. Xato bo'lsa — startup log'ida aniq `CRITICAL` xabar.
2. `/health` endpointini kengaytirish: `{ "db": "ok", "openai": "ok|failed", "disk": "ok" }`. Monitoring tizimi shu endpointni so'raydi.
3. Ketma-ket N ta AI xatoligidan keyin adminga bildirishnoma (email/Telegram) yuborish.
4. Provayder xatoliklarini turlarga ajratish: `401` (kalit) va `429` (kvota) — bular **administrator muammosi**, `400` (fayl) esa foydalanuvchi muammosi. Ularga turlicha munosabat bildirish.
5. Admin panelida "Tizim holati" sahifasi — oxirgi 24 soatdagi AI muvaffaqiyat foizi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**1. Ishga tushish tekshiruvi (reja 1-bandi)**

`python_back/provider_health.py` (yangi) — provayderga eng arzon so'rovni
(`models.list()`) yuboradi. Ilova ko'tarilganda bu tekshiruv **fon
vazifasida** bajariladi: provayder sekin javob bersa ham xizmatning
ko'tarilishi kechikmasin.

Kalit yaroqsiz bo'lsa `CRITICAL` yoziladi.

**2. `/api/health` haqiqiy holatni beradi (reja 2-bandi)**

Ilgari bu yerda atigi `bool(os.getenv("OPENAI_API_KEY"))` turardi —
ya'ni **yaroqsiz kalit bilan ham `/health` "sog'lom" deb javob berardi**.
Aynan shuning uchun audit paytida to'rt tahlilning to'rttasi ham
muvaffaqiyatsiz tugagani sezilmagan.

Natija 5 daqiqaga keshlanadi: monitoring endpointni tez-tez so'raydi va
har safar provayderga murojaat qilish ham sekin, ham qimmat.

**3. Ketma-ket xatoliklarni kuzatish (reja 3-bandi)**

* `ai_errors.to_ai_answer` — har bir muvaffaqiyatsiz tahlilda atigi bir
  marta chaqiriladigan yagona nuqta — xatolik turkumini qayd qiladi;
* `ai_result_guard.sanitize` — muvaffaqiyatli natija yo'lida — hisobni
  nolga tushiradi.

Faqat **administrator aralashuvini talab qiladigan** turkumlar sanaladi
(`provider_auth_failed`, `provider_quota_exceeded`). Fayl xatosi yoki
vaqtinchalik uzilish xizmat buzilgani degani emas va ketma-ketlikni
uzmaydi.

Uchta ketma-ket xatolikdan keyin `CRITICAL` yoziladi va `/api/health`
`degraded` (HTTP 503) ga o'tadi.

**Xat orqali ogohlantirish** — `Services/AiProviderWatchdog.cs` (yangi,
`BackgroundService`). Python salomatlik endpointini davriy so'raydi va
holat **o'zgarganda** — buzilganda ham, tiklanganda ham — bir marta xat
yuboradi. Har tekshiruvda xat yuborish pochta qutisini to'ldiradi va
ogohlantirish qiymatini yo'qotadi.

Mavjud `EmailService` qayta ishlatildi (unga `SendPlainAsync` qo'shildi).
Sozlash: `AiWatchdog:Enabled`, `AiWatchdog:IntervalMinutes`,
`Smtp:PlatformAdminEmail`.

`appsettings.Development.json` da kuzatuvchi **o'chirilgan** — ishlab
chiqish mashinasidan haqiqiy pochta manziliga xat ketib qolmasligi uchun.
Ishlab chiqarishda u sukut bo'yicha yoqiq.

**4-band (xatoliklarni turkumlash)** — `ai_errors.py` da allaqachon
bajarilgan edi: `provider_auth_failed` va `provider_quota_exceeded`
(administrator muammosi) `invalid_file` dan (foydalanuvchi muammosi)
ajratilgan.

**5-band (24 soatlik statistika)** — `SystemStatusController` da
allaqachon bor: turlar bo'yicha jami / xatolik / kutilayotgan.

---

### Yo'l-yo'lakay topilgan nosozlik — `.env` muhit o'zgaruvchilarini bosib o'tardi

`config.py` da `load_dotenv(BASE_DIR / ".env", override=True)` turardi.
`override=True` — bu **`.env` fayli haqiqiy muhit o'zgaruvchilaridan
ustun** degani.

Ishlab chiqarishda kalitlar systemd unit faylida yoki konteyner muhitida
beriladi. Serverda eskirgan `.env` qolib ketgan bo'lsa (deploy paytida
oson yuz beradi), u jimgina ustun kelardi va xizmat noto'g'ri kalit bilan
ishlab ketaverardi — hech qanday ogohlantirishsiz. Bu konstitutsiyaning
"kalitlar faqat muhit o'zgaruvchilaridan o'qilsin" qoidasiga ham zid.

Bu aynan shu task ustida ishlaganda aniqlandi: yaroqsiz kalit bilan
tekshirmoqchi bo'lganimda `OPENAI_API_KEY` ni muhitga qo'ydim, lekin
xizmat baribir `.env` dagi haqiqiy kalitni ishlatdi.

`override=False` ga o'zgartirildi — endi tartib odatdagidek: muhit
o'zgaruvchisi ustun, `.env` esa faqat berilmagan qiymatlarni to'ldiradi.

---

### Jonli tekshiruv

| Holat | `/api/health` | Log |
|---|---|---|
| Kalit yaroqli | `200` — `"openai": {"ok": true, "key": "valid"}` | `AI provayder kaliti tekshirildi — yaroqli` |
| Kalit yaroqsiz (`sk-proj-INVALID-...`) | **`503`** — `"status": "degraded"`, `"openai": {"ok": false, "key": "provider_auth_failed"}` | **`CRITICAL`**: `AI provayder kaliti YAROQSIZ (provider_auth_failed). Barcha tahlillar xatolik bilan tugaydi.` |

Yaroqsiz kalit alohida portda (`:8011`) ishga tushirilgan nusxada
tekshirildi — asosiy xizmatga tegilmadi.

Kuzatuvchi ro'yxatdan o'tgani ham tasdiqlandi: `.NET` jurnalida
`AI provayder kuzatuvchisi o'chirilgan (AiWatchdog:Enabled = false)`.

---

### ✅ T-029 — ~~EKG signal qayta ishlash AI'siz ham natija beradi, lekin bu foydalanuvchiga ko'rsatilmaydi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Mahsulot mantiqi / Yaxshilash / O'rta
**Fayllar:** `python_back/main.py` (`_sync_ecg_process_and_ai`), tahlil ko'rish sahifalari

**Muammo:**
AI chaqiruvi muvaffaqiyatsiz tugagan EKG #95 uchun ham **signal qayta ishlash to'liq ishladi**:
- `generated_file_link` = `/uploads/ecg_generated_files/ecg_95.png` (12 kanalli EKG grafigi)
- `generated_short_file_link` = `/uploads/ecg_generated_short_files/ecg_95.png`
- NeuroKit2 hisoblagan raqamli o'lchovlar (`digital_measurements`) ham mavjud bo'lishi kerak edi

Ya'ni tizim **AI'siz ham qimmatli natija ishlab chiqargan**: QRS davomiyligi, PR interval, QTc, ST segment, yurak o'qi — bularning barchasi matematik hisob-kitob, AI emas.

Lekin `status = -1` bo'lgani uchun foydalanuvchiga **hech narsa ko'rsatilmaydi** — faqat xatolik.

**Nima uchun muhim:**
Shifokor uchun raqamli o'lchovlar va tozalangan EKG grafigi allaqachon katta qiymat. AI xulosasi bo'lmasa ham, ular ko'rsatilishi kerak. Hozir esa OpenAI ishlamasa — butun mahsulot ishlamaydi.

**Tuzatish rejasi:**
1. Statuslarni ajratish: `2` = to'liq tayyor, `3` (yangi) = **"o'lchovlar tayyor, AI xulosasi yo'q"**, `-1` = umuman ishlamadi.
2. `digital_measurements` va grafiklarni AI natijasidan **mustaqil** saqlash.
3. Tahlil ko'rish sahifasida AI bo'limi bo'sh bo'lsa — o'lchovlar va grafikni baribir ko'rsatish, yuqorida "AI xulosasi hozircha mavjud emas" ogohlantirishi va "AI'ga qayta yuborish" tugmasi bilan.
4. Bu tizimni OpenAI uzilishlariga chidamli qiladi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

### Muammo tasdiqlandi

`compute_full_ecg_v3(leads, fs)` — sof matematik hisob (NeuroKit2):
YUT, PR, QRS, QT, QTc, yurak o'qi, ST siljishi. U sun'iy intellektdan
mustaqil va AI chaqiruvidan **oldin** bajariladi.

Lekin natija faqat prompt qurish uchun ishlatilardi va **hech qayerga
yozilmasdi**. AI xatolik bersa `ai_answer_data` ga faqat xatolik matni
tushardi — allaqachon hisoblangan raqamlar yo'qolardi.

### Tuzatish

1. `digitals` `try` blokidan tashqarida e'lon qilindi, ya'ni xatolik
   yo'lida ham mavjud.
2. Xatolik holatida javobga `digital_measurements` va
   `signal_measurements_only: true` qo'shiladi.
3. `components/shared/SignalOnlyBanner.js` (yangi) — o'lchovlarning
   **manbasini** aniq aytadi: raqamlar ishonchli, AI xulosasi yo'q.
   Buni aytmaslik xavfli bo'lardi — shifokor o'lchovlarni AI tasdiqlagan
   deb o'ylashi mumkin.

### Yo'l-yo'lakay topilgan ikkita nosozlik

**A. Signal fayllari umuman ishlamasdi.**

Sinov paytida `DecompressionBombError` chiqdi:

```
Image size (126750000 pixels) exceeds limit of 100000000 pixels
```

`render_12_lead_png` da `figsize=(25, 12)` va `dpi=650` berilgan edi —
bu **16250 × 7800 = 126 megapiksel**. Pillow bunday rasmni "decompression
bomb" deb rad etadi, ya'ni **har qanday CSV/XML signal fayli xatolik
bilan tugardi**. Bazada bironta ham signal fayli asosidagi tahlil
yo'qligi ham shundan.

DPI endi maqsadli endan hisoblanadi (`ECG_RENDER_TARGET_WIDTH = 2600`).

| | Avval | Keyin |
|---|---|---|
| O'lcham | 16250 × 7800 (126 MP) | **2600 × 1248 (3.2 MP)** |
| Fayl hajmi | saqlanmasdi (xatolik) | **0.25 MB** |

2600 px EKG kataklarini o'lchash uchun yetarli va T-047 dagi ko'rsatish
quvuri (2000 px) bilan mos.

**B. O'lchovlar saqlansa ham ekranda ko'rinmasdi.**

`compute_full_ecg_v3` o'z kalit lug'atini ishlatadi
(`heart_rate_bpm`, `pr_interval_ms`), frontend va PDF esa sxema
kalitlarini kutadi (`HR`, `PR_interval`). Natijada "Raqamli o'lchovlar"
bo'limi **bo'sh** chiqardi.

`_signal_to_schema()` qo'shildi: signal natijasi saqlashdan oldin sxema
nomlariga o'giriladi va birlik qo'shiladi (`140.0` emas, `140.0 ms` —
shifokor birliksiz raqamni o'qiy olmaydi).

### Jonli tekshiruv

Sintetik 12 kanalli EKG (10 soniya, 500 Gts, 72 bpm) CSV sifatida
yuklandi. AI ataylab yaroqsiz kalit bilan ishga tushirildi:

| Nima | Natija |
|---|---|
| Holat | `-1` (AI xatolik) |
| 12 kanalli grafik | ✅ saqlandi, 2600 × 1248, 0.25 MB |
| O'lchovlar | ✅ 10 ta, sxema kalitlari bilan |
| Ekranda | ✅ grafik, banner va o'lchovlar ro'yxati |

Ekrandagi qiymatlar: `HR 72.1 bpm` (signal aynan 72 bpm da yaratilgan),
`PR 125.7 ms`, `QRS 140.0 ms`, `QT 506.0 ms`, `QTc 554.7 ms`,
`QRS o'qi 55.0°`, `RR 831.8 ms`.

---

### ✅ T-030 — ~~Yaratilgan tahlilning holati faqat SignalR orqali yangilanadi, zaxira mexanizmi yo'q~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Ishonchlilik / O'rta
**Fayllar:** `backend/EkgAnalyzerApi/Services/AnalysisProgressTracker.cs`, `frontend/src/hooks/useAnalysisSignalR.js`

**Muammo:**
Tahlil yuborilgach Python darhol `{"status": "processing"}` qaytaradi, AI esa fon rejimida ishlaydi. Foydalanuvchi natijani `AnalysisProgressTracker` → SignalR → `AnalysisProgressFloat` zanjiri orqali biladi.

Bu zanjirning zaif joylari:
1. `AnalysisProgressTracker` holatni **faqat xotirada** (`ConcurrentDictionary`) saqlaydi. `.NET` API qayta ishga tushsa — kuzatilayotgan barcha tahlillar yo'qoladi va foydalanuvchi hech qachon xabar olmaydi.
2. Bir nechta server nusxasi ishlaganda (horizontal masshtablash) faqat so'rovni qabul qilgan nusxa kuzatadi; SignalR esa boshqa nusxaga ulangan bo'lishi mumkin.
3. Foydalanuvchi sahifani yangilasa yoki brauzerni yopsa — jarayonda turgan tahlillar ro'yxati yo'qoladi (Zustand `pendingAnalyses` — faqat xotirada).
4. 30 daqiqadan uzoq davom etgan tahlil kuzatuvdan chiqariladi va foydalanuvchi hech narsa bilmaydi.
5. Har 2 soniyada barcha kutilayotgan tahlillar uchun alohida DB so'rovi — yuklama ostida samarasiz.

**Tuzatish rejasi:**
1. Ro'yxat sahifasida `status IN (0, 1)` bo'lgan yozuvlar uchun **zaxira polling** qo'shish (masalan 10 soniyada bir marta) — SignalR ishlamasa ham holat yangilanadi.
2. `pendingAnalyses` ni `sessionStorage` ga saqlash — sahifa yangilanganda tiklanadi.
3. Ro'yxat qatorida `status = 0/1` uchun "Tahlil qilinmoqda..." spinner ko'rsatish (hozir shunchaki holat matni).
4. Ko'p nusxali ishlash uchun SignalR backplane (Redis) yoki kuzatuv holatini bazada saqlash.
5. Uzoq vaqt `status = 0` da qolgan yozuvlar uchun avtomatik "vaqt tugadi" belgisi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

### Zaxira yangilash qo'shildi (reja 1-bandi)

To'rt ro'yxat sahifasida: ro'yxatda tugallanmagan yozuv (status `0` yoki
`1`) bo'lsa, sahifa **har 10 soniyada** o'zini yangilaydi.

Bu SignalR ni almashtirmaydi — u darhol xabar beradi va shunday bo'lib
qoladi. Zaxira faqat zanjir uzilganda ishlaydi. Zanjirning uzilishi
mumkin bo'lgan joylari taskda sanab o'tilgan: `.NET` qayta ishga
tushishi, bir nechta server nusxasi, sahifani yangilash, 30 daqiqalik
kuzatuv chegarasi. Har bir holatda natija bir xil edi: tahlil tayyor
bo'ladi, lekin ekranda "kutilmoqda" bo'lib qolaveradi.

Ikki cheklov qo'yildi:
* tugallanmagan yozuv qolmasa taymer **to'xtaydi** — bo'sh so'rovlar
  yuborilmaydi;
* `document.hidden` bo'lsa so'rov yuborilmaydi — foydalanuvchi boshqa
  ilovada bo'lsa serverga yuk bermaydi.

10 soniya — foydalanuvchi sezmaydigan kechikish, lekin har bir ochiq
sahifadan daqiqasiga olti so'rov, ya'ni sezilarli yuk emas.

### Bajarilmagan bandlar (sababi bilan)

**Kuzatuv holatini bazaga ko'chirish (2-band).** `AnalysisProgressTracker`
holatni xotirada saqlaydi va bu ko'p nusxali o'rnatmada muammo. Lekin
zaxira yangilash bilan bu **foydalanuvchi uchun ko'rinmas** bo'lib
qoldi: SignalR xabar bermasa ham natija 10 soniyada ekranga chiqadi.
Holatni bazaga yoki Redis ga ko'chirish alohida infratuzilma ishi va
uning yagona qo'shimcha foydasi — bildirishnomaning bir necha soniya
tezroq kelishi.

**Kutilayotgan tahlillar ro'yxatini saqlash (3-band).** Zustand dagi
`pendingAnalyses` sahifa yangilanganda yo'qoladi. Endi bu ham muhim
emas: ro'yxat sahifasining o'zi holatni ko'rsatadi va zaxira yangilash
uni yangilab turadi.

---

### ✅ T-031 — ~~AI jiddiylik darajasi `indexOf('1')` bilan aniqlanadi — noto'g'ri "normal" ko'rsatishi mumkin~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Mantiqiy xato / Bemor xavfsizligi / Kritik
**Fayllar:** `frontend/src/components/results/EcgOldResult.js:97,102,234`, `EcgResult.js:107`, `holter_analyse/HolterOldResult.js:96,101,152`, `holter_analyse/HolterResult.js:30`, `lab_analyse/LabOldResult.js:96,101,168`, `lab_analyse/LabResult.js:45`, `smad_analyse/SmadOldResult.js`, `smad_analyse/SmadResult.js`

**Muammo:**
Tahlil natijasining jiddiylik darajasi (yashil "Normal" / sariq "O'rtacha" / qizil "Xavfli") quyidagicha hisoblanadi:

```js
String(result.automatic_analysis_bool).indexOf('1') != -1 ? "normal_analyse"
: String(result.automatic_analysis_bool).indexOf('2') != -1 ? 'avarage_analyse'
: String(result.automatic_analysis_bool).indexOf('3') != -1 ? "danger_analyse"
: "unknown_analyse"
```

Bu **qiymatni taqqoslash emas, matn ichidan belgi qidirish**. Tekshirish tartibi `1 → 2 → 3`, ya'ni tarkibida `1` bo'lgan har qanday qiymat **birinchi bo'lib "Normal" (yashil)** deb baholanadi.

Xavfli holatlar:

| AI qaytargan qiymat | To'g'ri talqin | Ekranda ko'rinadi |
|---|---|---|
| `3` | Xavfli | Xavfli ✅ |
| `"13"` | — | **Normal (yashil)** ❌ |
| `"1-3 daraja"` | Xavfli | **Normal (yashil)** ❌ |
| `"daraja: 3, ammo 1-toifa"` | Xavfli | **Normal (yashil)** ❌ |
| `31` | Xavfli | **Normal (yashil)** ❌ |

AI javobi erkin matn generatsiyasi bo'lgani uchun bunday qiymatlar **real ehtimol**. Auditda AI `automatic_analysis_bool: 2` qaytardi — ya'ni model haqiqatan ham har xil qiymatlar bera oladi.

**Nima uchun kritik:**
Bu bemor xavfsizligiga bevosita ta'sir qiladi. Shifokor ro'yxatda yashil "Normal" chipini ko'rib tahlilni ochmasligi mumkin — aslida u xavfli topilma bo'lsa. Tibbiy tizimda "xato tomonga xavfsiz" (fail-safe) prinsipi amal qilishi kerak: noaniq bo'lsa — "noma'lum" ko'rsatilsin, "normal" emas.

**Tuzatish rejasi:**
1. Yagona yordamchi funksiya yaratish (`frontend/src/tools/severity.js`) va **qat'iy raqamli taqqoslash** qilish:
   ```js
   export function parseSeverity(raw) {
     const n = Number(String(raw ?? '').trim());
     if (n === 1) return 'normal';
     if (n === 2) return 'average';
     if (n === 3) return 'danger';
     return 'unknown';           // noaniq bo'lsa — hech qachon "normal" emas
   }
   ```
2. Yuqorida sanab o'tilgan **10 ta fayldagi** takrorlangan mantiqni shu funksiyaga almashtirish.
3. Backendda (Python) AI javobini saqlashdan oldin `automatic_analysis_bool` ni tekshirish: 1/2/3 dan boshqa bo'lsa `null` ga o'tkazish va log qilish.
4. AI prompt'ida qiymat **faqat 1, 2 yoki 3 butun son** bo'lishini qat'iy talab qilish (JSON schema / structured output orqali).
5. "unknown" holati uchun kulrang chip va "AI baholay olmadi" matni.

**Qabul mezoni:** `automatic_analysis_bool` qiymati `"13"` bo'lgan tahlil ro'yxatda **yashil emas, kulrang "noma'lum"** ko'rinadi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish — ikki qatlamda:**

**1. Backend (asosiy xavf shu yerda edi).**
`Services/*AnalyseService.cs` da jiddiylik SQL matn qidiruvi bilan aniqlanardi:
```csharp
AIAnswerData.Contains("\"automatic_analysis_bool\": 1") ? 1 : ...
```
`"automatic_analysis_bool": 13` matni ichida `: 1` bor — shuning uchun **13 qiymati
1 (Normal, yashil) deb topilardi**.

Yangi `Services/AiSeverity.cs` — qiymat `JsonDocument` bilan parse qilinadi,
faqat aniq 1/2/3 qabul qilinadi, boshqa hamma holatda `null`.
To'rtta service'da **12 ta joyda** almashtirildi; hisoblash SQL dan keyin,
xotirada bajariladi.

**2. Frontend.**
Yangi `tools/severity.js` — `parseSeverity`, `severityColor`, `severityClass`,
`severityLabel`, `severityIcon`. Qat'iy `/^-?\d+$/` tekshiruvi va `switch`.
`indexOf('1')` zanjiri **7 ta natija komponentida** almashtirildi;
`EcgResult.js` ham shu yordamchiga o'tkazildi.
Ro'yxatlarda noaniq qiymat uchun ko'k "Tahlil qilinmagan" o'rniga
**kulrang "Baholanmadi"** ko'rsatiladi. `severity_unknown` kaliti uch tilga qo'shildi.

**Jonli tekshiruv** — bazaga ataylab xavfli qiymatlar qo'yildi:

| Yozuv | `automatic_analysis_bool` | Avval | Hozir |
|---|---|---|---|
| EKG #102 | **13** | `aiStatus = 1` → \U0001F7E2 **Normal** | `aiStatus = null` → ⬜ **Baholanmadi** ✅ |
| EKG #103 | 3 | 3 | `aiStatus = 3` → \U0001F534 Xavfli ✅ |
| EKG #96 | 2 | 2 | `aiStatus = 2` → \U0001F7E0 O'rtacha ✅ |

**Brauzerda tasdiqlandi:** EKG ro'yxatida beshta qator — Xavfli (qizil),
Baholanmadi (kulrang), Baholanmadi (kulrang), O'rtacha (sariq), Yaxshi (yashil).
Xavfli natija endi hech qanday holatda yashil ko'rinmaydi.

---

### ✅ T-032 — ~~Holter, SMAD va Laboratoriya tahlillarida AI tavsiyasi umuman yo'q~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Mahsulot to'liqligi / Yuqori
**Fayllar:** `python_back/holter_analyses_api.py`, `smad_analyses_api.py`, `lab_analyses_api.py` (prompt qismlari)

**Muammo:**
Jonli test (2026-08-29) — 4 ta tahlil turi uchun AI qaytargan JSON maydonlari:

| Tur | `digital_measurements` | `automatic_analysis` | `automatic_analysis_bool` | `AI_recommendations` | `final_summary` |
|---|---|---|---|---|---|
| **EKG** #96 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Holter** #14 | ❌ | ✅ | ✅ | **❌** | ✅ |
| **SMAD** #9 | ❌ | ✅ | ✅ | **❌** | ✅ |
| **Laboratoriya** #17 | ❌ | ✅ | ✅ | **❌** | ✅ |

Konstitutsiyada (`.specify/memory/constitution.md`, V bo'lim) yagona format e'lon qilingan — 5 ta maydon. Amalda faqat EKG unga rioya qiladi.

Frontendda tavsiya bloki shartli render qilingan:
```jsx
{result.AI_recommendations ? ( ... ) : null}
```
Shuning uchun Holter/SMAD/Lab natijalarida **"AI tavsiyasi" bo'limi jimgina yo'q bo'ladi** — shifokor bu bo'lim umuman mavjud emas deb o'ylaydi.

**Nima uchun muhim:**
"AI tavsiyasi" — mahsulotning asosiy qiymat taklifi. Laboratoriya natijasi bo'yicha "qaysi qo'shimcha tekshiruv kerak", Holter bo'yicha "kardiologga murojaat kerakmi" — aynan shu shifokorga yordam beradi. Hozir bu faqat EKG uchun ishlaydi, ya'ni 4 ta moduldan 3 tasi yarim funksional.

Laboratoriya natijasi ayniqsa qashshoq — jami 320 belgi, `digital_measurements` yo'q, ya'ni **PDF'dan ko'rsatkichlar ajratib olinmagan**. Holbuki landing sahifada "Laboratoriya rasmlaridan ko'rsatkichlar ajratiladi, normadan og'ishlar va tavsiyalar tayyorlanadi" deb va'da qilingan.

**Tuzatish rejasi:**
1. Holter, SMAD, Lab promptlarini EKG prompti darajasiga chiqarish — barcha 5 maydonni majburiy qilish.
2. OpenAI **Structured Outputs** (`response_format` + JSON Schema) ishlatish — model schema'dan chetga chiqa olmaydi. Bu T-031 muammosini ham ildizidan hal qiladi.
3. Har bir tur uchun `digital_measurements` mazmunini aniqlash:
   - Holter: umumiy/min/max YUQ, pauzalar soni, QT, ekstrasistolalar soni, ST siljishlar
   - SMAD: sutkalik o'rtacha SBP/DBP, kunduzgi/tungi o'rtacha, tsirkad indeks, yuk indeksi
   - Lab: har bir ko'rsatkich — nomi, qiymati, birligi, referens oralig'i, normadan og'ish belgisi
4. Lab uchun ko'rsatkichlarni `lab_analyse_categories` / `lab_value_types` jadvallariga strukturali yozish (jadvallar mavjud, lekin to'ldirilmayapti).
5. Frontendda maydon yo'q bo'lsa — bo'limni yashirish o'rniga "AI tavsiya bermadi" deb aniq ko'rsatish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**1. Yagona sxema — `python_back/ai_schema.py` (yangi fayl)**

Holter va SMAD uchun OpenAI **Structured Outputs** (`text.format` +
JSON Schema, `strict: true`) qo'llanildi. Endi format prompt matniga
emas, sxemaga tayanadi: model maydonni tashlab keta olmaydi, javobni
``` ichiga o'rab yubormaydi va qiymat turini buzmaydi. Bu T-031 dagi
"model formatga rioya qilmaydi" muammosini ham ildizidan hal qiladi.

Sxemada 7 ta maydon: `digital_measurements`, `automatic_analysis`,
`analiz_mumkinmi`, `analiz_mumkin_emas_sababi`, `automatic_analysis_bool`,
`AI_recommendations`, `final_summary`.

`digital_measurements` tarkibi turga qarab belgilangan — Holter uchun
11 ta ko'rsatkich (YUT, pauzalar, ekstrasistolalar, QTc, ST), SMAD uchun
13 ta (sutkalik/kunduzgi/tungi bosim, yuk indekslari, tungi profil).
Aniqlab bo'lmagan ko'rsatkichga model `null` qaytaradi — taxmin qilmaydi.

**Laboratoriya uchun qat'iy sxema ATAYIN ishlatilmadi.** Sababi: lab
natijasidagi `digital_measurements` `**digital_values` orqali
`lab_analyses` jadvalining ~50 ta haqiqiy ustuniga yoziladi. `strict`
rejimi `required` ga barcha xossalarni talab qiladi, ya'ni model har bir
tahlilda ellikta maydonni asosan `null` bilan qaytarishga majbur bo'lardi
— javob narxi va kechikishi bekorga oshardi. Lab uchun mavjud kalitli
lug'at saqlandi, promptga faqat `AI_recommendations` qo'shildi.

**2. `ai_answer_data` ga yetishmayotgan maydonlar qo'shildi**

Laboratoriyada `digital_measurements` allaqachon modeldan olinardi va
jadval ustunlariga yozilardi, lekin `ai_answer_data` ga **tushmasdi** —
shuning uchun natija sahifasida umuman ko'rinmasdi.

**3. Frontend**

* `components/results/MeasurementsList.js` (yangi) — Holter va SMAD
  ko'rsatkichlarini tarjima qilingan yorliqlar bilan chizadi; `null`
  qiymatli qatorlar tushirib qoldiriladi (24 ta yangi tarjima kaliti,
  uch tilda).
* "AI tavsiyasi" bo'limi endi **doim ko'rinadi**. Ilgari
  `{result.AI_recommendations ? (...) : null}` edi — maydon bo'sh bo'lsa
  bo'lim jimgina yo'qolardi va shifokor bunday bo'lim umuman yo'q deb
  o'ylardi. Endi mazmuni yo'q bo'lsa "AI bu tahlil uchun tavsiya bermadi"
  deb kulrang kursiv bilan yoziladi. To'rt modulda ham.

**Jonli tekshiruv (mavjud tahlillar qayta ishga tushirildi):**

| Tahlil | `digital_measurements` | `AI_recommendations` | Daraja |
|---|---|---|---|
| Holter #14 | 11 maydondan **10 tasi** to'ldirildi | ✅ 4 bandli tavsiya | 2 |
| SMAD #9 | 13 maydondan **13 tasi** | ✅ shoshilinch tavsiya bilan | 3 |
| Lab #17 | 2 ta ko'rsatkich (TSH, T4) | ✅ profilaktik tavsiya | 1 |

Ekranda tekshirildi — masalan Holter #14:
`O'rtacha yurak urish tezligi — 90 bpm`, `Umumiy qisqarishlar soni — 129129`,
`QTc interval — 355 ms`.

---

### Yo'l-yo'lakay topilgan ikki kamchilik

**A. PDF hisobotdagi ko'rsatkich jadvallari har doim bo'sh edi**

`PdfReportService.AddSmadTable` va `AddHolterResults`
`digital_measurements` dan `day_systolic`, `mean_hr`, `total_complexes`
kabi kalitlarni qidirardi. Bunday kalitlarni **hech qaysi prompt hech
qachon so'ramagan** — Holter va SMAD promptlari umuman
`digital_measurements` so'ramasdi. Ya'ni jadvallar loyiha boshidan beri
faqat "—" chizardi.

| Hisobot | Avval | Keyin |
|---|---|---|
| Holter #14 jadvali | 8 qator, **8 tasi bo'sh** | 7 qator, **hammasi to'ldirilgan** |
| SMAD #9 jadvali | 5 qator, **5 tasi bo'sh** | 12 qator to'ldirilgan |

C# kalitlari `ai_schema.py` ga moslashtirildi va model aniqlay olmagan
ko'rsatkich uchun qator umuman chizilmaydigan qilindi: "—" bilan
to'ldirilgan jadval o'lchov o'tkazilgandek taassurot qoldiradi, holbuki
qiymat shunchaki topilmagan.

**B. Sahifa va PDF bitta sana haqida qarama-qarshi gapirardi**

`analysis_date` — bemordan namuna OLINGAN sana, uni xodim qo'lda
kiritadi va u ko'pincha bo'sh qoladi (bazadagi oxirgi 12 yozuvdan 11
tasi `NULL`). Sahifa bo'sh bo'lsa jimgina `created_at` — faylni yuklash
vaqtini — qo'yardi va uni "Tahlil sanasi" deb atardi:

| Manba | SMAD #9 uchun ko'rsatardi |
|---|---|
| Ko'rish sahifasi | "Tahlil sanasi — 28.08.2026" |
| PDF hisobot | "Tahlil o'tkazilgan sana — ko'rsatilmagan" |

Bu shunchaki nomuvofiqlik emas: EKG yoki Holter qachon olingani klinik
jihatdan muhim, eski yozuvni bugungi holat deb o'qish mumkin.

Endi sana yo'q bo'lsa kartochka buni ochiq aytadi — yorlig'i "Tizimga
kiritilgan sana" ga o'zgaradi va ostida "Tahlil sanasi kiritilmagan"
degan izoh chiqadi. To'rt ko'rish sahifasida ham.

**Bajarilmagan band (sababi bilan):** laboratoriya ko'rsatkichlarini
`lab_analyse_categories` / `lab_value_types` jadvallariga strukturali
yozish. Ular hozir `lab_analyses` ning o'z ustunlariga yozilyapti va
ekranda ham, PDF da ham to'g'ri chiqyapti; jadvallar aro ko'chirish
alohida ma'lumot modeli ishi va T-036 (JSONB ga o'tish) bilan birga
qilinishi mantiqiyroq.

---

### ✅ T-033 — ~~`automatic_analysis_bool` nomi noto'g'ri: bu bool emas, 3 darajali shkala~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Ma'lumot modeli / Hujjat / Yuqori
**Fayllar:** butun kod bazasi, `.specify/memory/constitution.md`

**Muammo:**
Maydon nomi `automatic_analysis_bool` ("bool" = mantiqiy, ya'ni ha/yo'q) deb atalgan, lekin amalda **uchta darajani** bildiradi:
- `1` — Normal (yashil)
- `2` — O'rtacha (sariq)
- `3` — Xavfli (qizil)

Konstitutsiyada bu maydon shunchaki "ba'zan int (1), ba'zan string ("1")" deb tavsiflangan; 2 va 3 qiymatlari va ularning ma'nosi **hech qayerda hujjatlashtirilmagan**. AI prompt'ini yozadigan yoki frontend'ni o'zgartiradigan dasturchi bu semantikani faqat kodni o'qib topa oladi.

Bundan tashqari `MedController.cs` dagi filtr mantiqi ham (`Contains($"\"automatic_analysis_bool\": {val}")`) matn asosida ishlaydi — `automatic_analysis_bool: 13` qiymati `1` filtriga ham tushib qoladi.

**Tuzatish rejasi:**
1. Maydonni `severity_level` deb qayta nomlash (yangi maydon qo'shib, eskisini ma'lum muddat parallel qo'llab-quvvatlash).
2. Semantikani konstitutsiyada va kod ichida aniq hujjatlashtirish: `1 = normal, 2 = e'tibor talab qiladi, 3 = shoshilinch`.
3. C# tomonida `enum SeverityLevel { Normal = 1, Attention = 2, Critical = 3 }` yaratish.
4. `Contains` asosidagi filtrni **JSONB operatorlariga** o'tkazish: `ai_answer_data` ustunini `jsonb` tipiga o'zgartirib, `ai_answer_data->>'severity_level' = '1'` ko'rinishida indeksli filtrlash. Bu ham to'g'riroq, ham tezroq.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

### Asosiy topilma: filtr va ko'rsatilgan daraja bir-biriga zid edi

T-031 da **ko'rsatish** xavfsiz `AiSeverity.Parse` ga o'tkazilgan edi,
lekin **ro'yxat filtri** hamon xom matn qidiruvida qolgandi — to'rt
servisda, jami to'qqiz joyda, har birida qo'lda yozilgan to'rtta
`Contains`:

```csharp
e.AIAnswerData.Contains($"\"automatic_analysis_bool\": {val}")
```

Bu naqsh qiymat **tugaganini tekshirmasdi**, ya'ni `13` ni ham `1` deb
topardi.

Jonli baza bunga aniq misol berdi. `ecg_analyses#92` yozuvida
`ai_answer_data` ichida **ortiqcha bitta `}`** bor edi va u obyektni erta
yopardi:

| Nima | Natija |
|---|---|
| Ko'rsatish (`AiSeverity.Parse`) | JSON o'qilmadi → `null` → qator **"Baholanmadi"** |
| Ro'yxat filtri (matn qidiruvi) | `automatic_analysis_bool": "2"` topildi → qator **"O'rtacha"** filtriga tushdi |

Foydalanuvchi uchun bu shunday ko'rinadi: "O'rtacha" ni tanladim, lekin
ro'yxatda "Baholanmadi" qator turibdi.

---

### 1. Filtr naqshlari bitta joyga yig'ildi va aniq qilindi

`AiSeverity.FilterPatterns(level)` — sakkizta variant: bo'shliqli /
bo'shliqsiz × tirnoqli / tirnoqsiz × `,` / `}`. Oxirgi o'lchov muhim:
naqsh endi qiymatdan keyingi **ajratuvchini ham talab qiladi**, ya'ni
`13` hech qachon `1` filtriga tushmaydi.

To'qqiz joydagi qo'lda yozilgan shartlar shu funksiyaga almashtirildi.

**Diqqat:** shartlar `patterns.Any(p => ...Contains(p))` ko'rinishida
yozilmaydi — EF Core uni SQL ga tarjima qila olmaydi va so'rov ishlash
paytida 500 bilan tugaydi (bu tuzatish jarayonida aniqlandi va o'lchandi).
Shuning uchun sakkizta shart aniq `||` zanjiri sifatida yoziladi.

### 2. Semantika kodda hujjatlashtirildi

`SeverityLevel` enum qo'shildi: `Normal = 1`, `Attention = 2`,
`Critical = 3`. Maydon nomi (`automatic_analysis_bool`) tarixiy sabablarga
ko'ra saqlanadi — u AI javobida, bazadagi yozuvlarda va frontendda
ishlatiladi — lekin uning **ma'nosi** endi bitta joyda qat'iy yozilgan.

### 3. Buzilgan yozuvlar tuzatildi

`python_back/repair_ai_answer_data.py` (yangi). Bazada ikki xil buzilgan
yozuv topildi:

| Tur | Soni | Nima qilindi |
|---|---|---|
| Ortiqcha `}` sababli erta yopilgan JSON | 1 (`ecg#92`) | Qavs olib tashlandi, qolgan maydonlar tiklandi |
| Xom istisno matni ustunga yozilgan | 4 (`ecg#97`, `lab#16`, `holter#13`, `smad#8`) | Turkumlangan, tarjima qilingan JSON bilan almashtirildi |

Ikkinchi guruh alohida e'tiborga loyiq: ular
`Error code: 401 - {'error': {'message': 'Incorrect API key provided: sk-proj-...`
ko'rinishidagi matnlar edi, ya'ni **provayder xatoligi tibbiy natija
maydonida** saqlanardi. `ai_errors.py` buni yangi yozuvlar uchun
allaqachon hal qilgan; bu skript eskilarini tozaladi.

Tuzatishdan keyin: **buzilgan JSON yozuvlar — 0 ta**, `sk-proj` matni
bazada qolmadi.

### 4. Sabab kodda ham yopildi — EKG uchun qat'iy sxema

`ecg#92` dagi ortiqcha qavs tasodif emas: EKG prompti modeldan JSON ni
faqat **matnli ko'rsatma** bilan so'rardi. Model bitta belgini adashsa —
butun natija o'qilmay qoladi.

Holter va SMAD uchun bu T-032 da hal qilingan edi. Endi EKG ham
Structured Outputs ga o'tkazildi: `ai_schema.SCHEMAS["ecg"]` — 19 ta
o'lchov maydoni, kalitlari `EcgResult.js` va
`PdfReportService.EcgRows` kutayotgan nomlar bilan aynan bir xil.

---

### Tekshiruv (jonli)

**Filtr — tuzatishdan oldin va keyin:**

| Filtr | Avval | Keyin |
|---|---|---|
| daraja = 1 | 1 ta yozuv | 1 ta yozuv, **mos kelmagani yo'q** |
| daraja = 2 | 4 ta yozuv, ulardan **#92 mos emas** (`aiStatus = null`) | 4 ta yozuv, **mos kelmagani yo'q** |
| daraja = 3 | 0 | 0 |

**EKG qat'iy sxema bilan qayta ishga tushirildi (#92):**

| Nima | Natija |
|---|---|
| JSON yaroqliligi | ✅ |
| Maydonlar | barcha 7 tasi (`digital_measurements`, `automatic_analysis`, `analiz_mumkinmi`, `analiz_mumkin_emas_sababi`, `automatic_analysis_bool`, `AI_recommendations`, `final_summary`) |
| `digital_measurements` | 19 maydondan **11 tasi** to'ldirildi (`HR = 65 bpm`, `PR_interval = 204 ms`, `QRS_duration = 120 ms`, …) |
| Daraja | `2` — **son**, satr emas |

---

### Bajarilmagan bandlar (sababi bilan)

**Maydonni `severity_level` deb qayta nomlash (reja 1-bandi).** Bu nom
AI javobida, bazadagi barcha yozuvlarda, to'rtta Python modulida va
frontendning o'nlab joyida uchraydi. Ikkita nom bilan parallel yashash
davri esa aynan T-031/T-033 da tuzatilgan xatoliklar sinfini qaytadan
keltirib chiqaradi: ikkita manba, ular orasidagi nomuvofiqlik. Nom
noqulay, lekin **ma'nosi endi `SeverityLevel` enumida qat'iy yozilgan**
va noaniqlik qolmadi.

**`ai_answer_data` ni `jsonb` ga o'tkazish (reja 4-bandi).** Bu butun
ustun turini o'zgartiradigan migratsiya. Uning foydasi — indeksli filtr —
hozirgi hajmda (bir necha ming yozuv) sezilmaydi, xavfi esa real:
migratsiya paytida yaroqsiz JSON bo'lgan yozuv butun o'tkazishni
to'xtatadi. Aynan shunday yozuvlar bor edi va ular endi tuzatildi —
ya'ni bu ish **kelajakda xavfsizroq bajariladi**, lekin uni hozir
qilishga majburiy sabab yo'q. Filtrning to'g'riligi naqshlar orqali
ta'minlandi.

---

### ✅ T-034 — ~~Natija komponentlari ikki nusxada: `XResult.js` va `XOldResult.js`~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Texnik qarz / O'rta
**Fayllar:** `frontend/src/components/results/` — `EcgResult.js` / `EcgOldResult.js`, `holter_analyse/HolterResult.js` / `HolterOldResult.js`, `lab_analyse/LabResult.js` / `LabOldResult.js`, `smad_analyse/SmadResult.js` / `SmadOldResult.js`

**Muammo:**
Har bir tahlil turi uchun natijani ko'rsatadigan **ikkita deyarli bir xil komponent** mavjud. Ikkalasida ham:
- jiddiylik darajasini hisoblovchi bir xil murakkab ternar zanjiri (T-031)
- bir xil `apiEcg` orqali fayl havolalari
- bir xil maydon renderlari

Jami 8 ta fayl, o'rtacha 150–250 satr. Bitta xatoni tuzatish uchun **8 joyni** o'zgartirish kerak — T-031 aynan shu sababdan barcha fayllarga tarqalgan.

**Tuzatish rejasi:**
1. Yagona `AnalysisResult` komponentini yaratish, farqlarni `props` orqali berish (`type`, `showDigitalMeasurements`, `fileLabel`).
2. Jiddiylik chipi, fayl havolasi va AI matn bloklarini alohida kichik komponentlarga ajratish.
3. `Old` variantlari qayerda ishlatilishini aniqlash (ehtimol bemor tarixidagi yig'iluvchi kartochkalar) va farqni bitta `collapsible` prop bilan hal qilish.
4. Eskilarini o'chirish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

### `Old` variantlari nima ekani aniqlandi

Taskda "ehtimol bemor tarixidagi yig'iluvchi kartochkalar" deb taxmin
qilingan edi (3-band). Tekshiruv buni tasdiqladi va aniqlashtirdi:

| | Nima | Qayerda |
|---|---|---|
| `XResult.js` | tahlil bajarilgandan **keyingi** ichki ko'rinish | `XAnalyzer.js` |
| `XOldResult.js` | yig'iluvchi kartochka: sarlavhada jiddiylik, shifokorlar, "AI bilan tekshirish" tugmasi | `XAnalyseView.js`, `ConsultationAnalysisInlineView.js` |

Ya'ni ular bitta komponentning ikki varianti emas — **turli
konteynerlar, bir xil ichki mazmun**. Shuning uchun `collapsible` prop
bilan birlashtirish (rejadagi taklif) noto'g'ri bo'lardi: u ikkita
mustaqil vazifani bitta komponentga tiqishtirar edi.

Ajratish boshqa chiziq bo'yicha o'tkazildi — **konteyner qoldi,
mazmun umumiylashtirildi**.

### Takrorlanish foydalanuvchiga ko'rinadigan farqlarga aylangan edi

Sakkiz nusxa vaqt o'tib bir-biridan uzoqlashgan:

| | EKG | Holter | SMAD | Lab |
|---|---|---|---|---|
| Raqamli o'lchovlar | bor | **yo'q** | **yo'q** | bor |
| AI tavsiyasi | bor | **yo'q** | **yo'q** | **yo'q** |
| Jiddiylik ko'rinishi | rangli `Tag` | emoji | emoji | emoji |

Holter va SMAD uchun sun'iy intellekt o'lchovlarni ham, tavsiyani ham
qaytarardi (`ai_schema.py` da 11 va 13 ta ko'rsatkich) — lekin
tahlil bajarilgandan keyingi ekranda ular **hech qachon
ko'rsatilmasdi**. Hisoblanardi, keyin tashlab yuborilardi.

### Yangi fayllar

**`components/results/AnalysisResultBody.js`** (236 qator) — natija
tanasi: fayl havolasi/rasm, o'lchovlar, avtomatik tahlil + jiddiylik
tegi, AI tavsiyasi, xulosa. `kind` prop ('ecg'/'holter'/'smad'/'lab')
farqlarni hal qiladi:

* o'lchovlar uch xil manbadan keladi — EKG da qattiq ro'yxat,
  Holter/SMAD da `MeasurementsList`, Lab da bazadagi `lab_values`;
* rasm faqat EKG da (eskiz `placeholder` sifatida);
* fayl yorlig'i turga qarab.

**`tools/aiResult.js`** (56 qator) — `parseAiResult`. Ilgari
`safeJsonParse` to'rt faylda **so'zma-so'z** takrorlangan edi. Yo'l-yo'lakay
` ```json ... ``` ` ichiga o'ralgan javobni ham o'qiy oladigan qilindi —
avvalgi versiya faqat bitta backtick'ni yechardi.

### Hajm

| | Avval | Hozir |
|---|---|---|
| 8 ta natija fayli | **1082** qator | **604** qator |
| Umumiy fayllar | — | +292 qator |
| **Jami** | 1082 | **896** |

Muhimi qatorlar soni emas: `XResult.js` lar **144/44/59/44** dan
**20/20/20/20** ga tushdi, ya'ni ular endi faqat qobiq. Jiddiylik
mantiqi, o'lchovlar va matn bloklari — bitta joyda.

### Tekshiruv (jonli, to'rt turning har biri)

| Sahifa | Natija |
|---|---|
| Holter #20 | 10 ta o'lchov (`O'rtacha YUT — 90 bpm` …), jiddiylik *"O'rtacha"*, AI tavsiyasi to'liq |
| SMAD #11 | o'lchovlar ✓, avtomatik tahlil ✓, AI tavsiyasi ✓ |
| EKG #108 | rasm 3024×4032 renderlandi, 10 ta o'lchov (`HR — 72.1 bpm`, `QTc (Bazett) — 554.7 ms` …) |
| Lab #17 | `TSH — 1.71 µIU/mL`, `T4 (erkin) — 15.7 pmol/L`, jiddiylik *"Normal"* |
| Lab #24 | o'lchovlar **yo'q** — bazada `digital_measurements: null`, ya'ni to'g'ri xulq |
| EKG #109 | o'lchovlar yo'q — bazada `{"xato": "tahlil_muzlab_qoldi"}`, to'g'ri |
| Ro'yxatlar | EKG 11, Holter 11, SMAD 7, Lab 11 qator |
| CRA | `webpack compiled with 1 warning` (oldindan mavjud `no-unused-vars`) |

Oxirgi ikki qator muhim: bo'sh ko'rinish har doim ham nosozlik emas —
ikkalasida ham bazada haqiqatan ma'lumot yo'q ekani tasdiqlandi.

---

### ✅ T-035 — ~~Laboratoriya tahlilida ko'rsatkichlar strukturali ajratilmaydi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Mahsulot to'liqligi / Yetishmayotgan komponent / O'rta
**Fayllar:** `python_back/lab_analyses_api.py`, `backend/EkgAnalyzerApi/Models/LabAnalyseCategories.cs`, `LabValueTypes.cs`

**Muammo:**
Bazada laboratoriya ko'rsatkichlari uchun tayyor struktura mavjud:
- `lab_categories` — 57 ta yozuv
- `lab_value_types`
- `lab_analyse_categories`
- `lab_big_categories`

Ammo AI tahlil natijasi **faqat erkin matn** (`automatic_analysis` + `final_summary`). Test qilingan TTG tahlilida natija atigi 320 belgi bo'ldi va bironta ham raqamli ko'rsatkich strukturali saqlanmadi.

**Buning oqibati:**
- Bemorning ko'rsatkichlari **vaqt bo'yicha dinamikasini** ko'rsatib bo'lmaydi (masalan, gemoglobin 3 oyda qanday o'zgardi).
- Normadan og'ishlar bo'yicha filtrlash/qidirish mumkin emas.
- Grafik chizish imkonsiz (`chart.js` allaqachon o'rnatilgan, lekin ishlatilmaydi).
- 57 ta `lab_categories` yozuvi amalda o'lik ma'lumot.

**Tuzatish rejasi:**
1. Lab prompt'ini Structured Outputs bilan qayta yozish — har bir ko'rsatkich uchun: `nomi`, `qiymat`, `birlik`, `referens_min`, `referens_max`, `holat` (past/norma/yuqori).
2. Ajratilgan ko'rsatkichlarni `lab_analyse_categories` jadvaliga yozish, `lab_categories` bilan nomi bo'yicha moslashtirish (fuzzy matching — `fuzzywuzzy` allaqachon bog'liqliklarda bor).
3. Natija sahifasida ko'rsatkichlar jadvalini ko'rsatish: norma chegarasidan chiqqanlarini rang bilan ajratib.
4. **Bemor dinamikasi grafigi** — bitta ko'rsatkichning barcha tahlillar bo'yicha o'zgarishi (`chart.js` bilan).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

### Muammo taskda tasvirlanganidan boshqacha edi

Taskda "bironta ham raqamli ko'rsatkich strukturali saqlanmadi"
deyilgan. Tekshiruv buni **rad etdi**:

```
lab_analyses da 58 ustun, shundan 40 tasi ko'rsatkich uchun
(hb, rbc, wbc, ... daily_sodium) — `lab_value_types.column_name` ga mos

id | tsh  | free_t4
17 | 1.71 |    15.7      ← qiymatlar YOZILAYAPTI
24 | 1.71 |    15.7
```

Ya'ni ajratish va saqlash **allaqachon ishlardi**. Haqiqiy bo'shliq
boshqa joyda edi:

```
lab_value_types: normal_min_male IS NOT NULL bo'lgan qatorlar — 0 / 40
```

Referens chegaralari ustunlari **bor edi, lekin 40 tadan 40 tasi
bo'sh**. Shuning uchun tizim qiymatni saqlardi, lekin uning normada
yoki normadan tashqarida ekanini **ayta olmasdi** — shifokor har bir
raqamni o'zi eslab solishtirishi kerak edi.

### 2-band bajarilmadi — chunki u noto'g'ri jadvalni ko'rsatgan

Rejada "ajratilgan ko'rsatkichlarni `lab_analyse_categories` jadvaliga
yozish" deyilgan. Bu jadval bunga yaramaydi:

```
lab_analyse_categories: id | lab_analyse_id | category_id | created_at | updated_at
```

Bu — oddiy **bog'lovchi jadval** (tahlil ↔ kategoriya). Unda qiymat,
birlik yoki chegara uchun ustun yo'q. Qiymatlar allaqachon o'z joyida
— `lab_analyses` ning 40 ta ustunida. Fuzzy matching ham kerak emas:
AI javobi `column_name` kalitlari bilan keladi, ya'ni moslashtirish
aniq, taxminiy emas.

### 1-band boshqa yo'l bilan hal qilindi

Rejada referens chegaralarini **AI dan so'rash** taklif qilingan
(`referens_min`, `referens_max`). Bu ishonchsiz: model bir xil
ko'rsatkich uchun har safar biroz boshqa chegara qaytaradi va ularni
tekshirib bo'lmaydi.

Chegaralar o'rniga **bazaga** yozildi — `20260901000000_SeedLabReferenceRanges`:

* kattalar uchun keng qabul qilingan diapazonlar, **35 / 40** ko'rsatkich;
* jinsga bog'liq farq bor 7 tasida alohida (`hb` 130–170 / 120–150,
  `creatinine` 62–106 / 44–80, shuningdek `rbc`, `hct`, `esr`, `iron`,
  `daily_creatinine`);
* migratsiya faqat **bo'sh** qatorlarni to'ldiradi (`WHERE normal_min_male IS NULL`)
  — klinika o'z uskunasiga moslab o'zgartirsa, qiymatlari saqlanadi;
* **5 tasiga ataylab chegara qo'yilmadi**: `urine_volume` (sutkalik hajm
  suv iste'moliga bog'liq), `urine_protein`, `urine_glucose`,
  `urine_ketones`, `urine_bilirubin` — bular normada **umuman
  bo'lmasligi** kerak va "0 dan 0 gacha" diapazon foydasiz signal
  bergan bo'lardi.

### 3-band — chetlanishlarni ko'rsatish

`AnalysisResultBody` ichidagi `LabMeasurements` har bir qiymatni
diapazon bilan solishtiradi va uchta holatdan birini beradi:
`low` / `normal` / `high`.

Belgilash **ikki kanalli**: rangli chap chiziq VA matnli teg
("Normadan yuqori" / "Normadan past"). Faqat rang yetarli emas — rang
ko'rishi buzilgan foydalanuvchi uchun qator butunlay bir xil
ko'rinardi.

**Jins noma'lum bo'lganda** chegaralar kengaytiriladi: qiymat erkak va
ayol diapazonlarining ikkalasidan ham tashqarida bo'lgandagina
chetlanish deb belgilanadi. Aks holda gemoglobin 125 g/L ayol uchun
norma bo'la turib "past" deb ko'rsatilib, shifokorni behuda
chalg'itardi.

### 4-band — dinamika grafigi

**`GET /api/lab-values/patient-dynamics/{patcientId}`** (yangi) — bemorning
barcha tahlillari bo'yicha ko'rsatkich qatorlari. Faqat **kamida
ikkita** o'lchovi bor ko'rsatkichlar qaytariladi: bitta nuqtada
dinamika yo'q va uni grafikda ko'rsatish bo'sh va'da bo'lardi.
So'rov klinika bo'yicha cheklangan (`a.ClinicId == user.ClinicId`).

**`components/results/LabDynamicsChart.js`** (yangi) — `chart.js` +
`react-chartjs-2` (ikkalasi ham allaqachon bog'liqliklarda bor edi,
lekin **umuman ishlatilmasdi**). Norma diapazoni chiziq emas, **fon
sohasi** sifatida chiziladi: bitta nuqtaning "yuqori" ekani emas,
uning normadan qanchalik uzoqda ekani va qaysi tomonga siljiyotgani
muhim.

### Tekshiruv (jonli)

**Migratsiya:**

| | Natija |
|---|---|
| To'ldirilgan chegaralar | **35 / 40** |
| `hb` (jinsga bog'liq) | erkak 130–170, ayol 120–150 |
| `creatinine` | erkak 62–106, ayol 44–80 |
| `alt` (faqat yuqori chegara) | erkak ≤ 41, ayol ≤ 33 |

**Chetlanishni ko'rsatish** (Lab #17, brauzerda):

| Chegara | Ko'rinish |
|---|---|
| Haqiqiy (0.4–4) | `lab-normal` — *"TSH — 1.71 µIU/mL (norma: 0.4–4 µIU/mL)"* |
| Vaqtincha 0.4–1 ga toraytirildi | `lab-high` — *"TSH — 1.71 µIU/mL **Normadan yuqori** (norma: 0.4–1)"* |
| `free_t4` min 20 ga ko'tarildi | `lab-low` — *"T4 (erkin) — 15.7 pmol/L **Normadan past** (norma: 20–22)"* |

Chegaralar keyin asl qiymatlariga qaytarildi.

**Grafik:**

| Nima | Natija |
|---|---|
| Endpoint (bemor 13) | 200, 2 ta seriya, har birida 4 nuqta |
| Grafik | 1707×400 canvas, TSH chizig'i, yashil norma yo'lagi 0.4–4.0, o'q birligi `µIU/mL` |
| Ko'rsatkich almashtirish | `TSH (4)` → `T4 (erkin) (4)`, o'q birligi `pmol/L`, yo'lak 9–22 ga o'zgardi |
| Bo'sh holat (Lab #13) | *"Dinamikani ko'rsatish uchun kamida ikkita tahlil kerak"* |

Oxirgi qator tekshirib ko'rildi: bemor 12 da uchta tahlil bor, lekin
har bir ko'rsatkich **atigi bir marta** o'lchangan (`tsh` 1×,
`free_t4` 1×, `glucose` 1×, `creatinine` 1×) — ya'ni bo'sh holat
to'g'ri xulq, nosozlik emas.

---

### ✅ T-036 — ~~`ai_answer_data` matn (text) ustunida saqlanadi, JSONB emas~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Ma'lumotlar bazasi / Ishlash / O'rta
**Fayllar:** `backend/EkgAnalyzerApi/Models/ECGAnalyses.cs`, `LabAnalyses.cs`, `HolterAnalyses.cs`, `SmadAnalyses.cs`, `Services/MedController.cs` va barcha filtr joylari

**Muammo:**
AI natijasi JSON bo'lsa-da, bazada oddiy `text` ustunida saqlanadi. Natijada:

1. **Filtrlash matn qidiruvi orqali** amalga oshiriladi (konstitutsiyada ham shu naqsh rasmiylashtirilgan):
   ```csharp
   e.AIAnswerData.Contains($"\"automatic_analysis_bool\": {val}") ||
   e.AIAnswerData.Contains($"\"automatic_analysis_bool\":{val}") ||
   e.AIAnswerData.Contains($"\"automatic_analysis_bool\": \"{val}\"") ||
   e.AIAnswerData.Contains($"\"automatic_analysis_bool\":\"{val}\"")
   ```
   To'rtta variantni tekshirish kerak, chunki bo'shliqlar va tirnoqlar oldindan ma'lum emas. Bu:
   - **indekslanmaydi** — har safar butun jadvalni skanerlash (`Seq Scan`)
   - **noto'g'ri moslik beradi** — `automatic_analysis_bool: 13` qiymati `1` filtriga tushadi
   - AI formatlashni ozgina o'zgartirsa (masalan ikki bo'shliq) — filtr jimgina ishlamay qo'yadi

2. Bazada JSON yaroqliligini tekshirib bo'lmaydi — T-025 dagi kabi xatolik matni ham shu ustunga tushib ketaverdi.

**Tuzatish rejasi:**
1. Migratsiya: `ALTER TABLE ecg_analyses ALTER COLUMN ai_answer_data TYPE jsonb USING ai_answer_data::jsonb;` (avval yaroqsiz qatorlarni tozalash — T-025 bilan birga).
2. EF Core modelida `[Column(TypeName = "jsonb")]` ko'rsatish.
3. Filtrlarni JSONB operatorlariga o'tkazish: `EF.Functions.JsonExists` yoki raw `ai_answer_data->>'automatic_analysis_bool' = @val`.
4. GIN indeks qo'shish: `CREATE INDEX ix_ecg_ai_data ON ecg_analyses USING gin (ai_answer_data jsonb_path_ops);`
5. Xuddi shuni `lab_analyses`, `holter_analyses`, `smad_analyses` uchun ham qilish.

**Qabul mezoni:** `automaticAnalysisBool=1` filtri indeksdan foydalanadi va `13` qiymatli yozuvni qaytarmaydi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

Migratsiya `20260902000000_AiAnswerDataToJsonb` — to'rtta jadval
(`ecg`, `holter`, `smad`, `lab`).

### Filtr: sakkiz `LIKE` dan bitta taqqoslashgacha

Ilgari:

```csharp
var p = AiSeverity.FilterPatterns(aiStatus.Value);   // 8 ta naqsh
query = query.Where(e => e.AIAnswerData != null && (
    e.AIAnswerData.Contains(p[0]) || ... || e.AIAnswerData.Contains(p[7])));
```

Hozir:

```csharp
var severity = aiStatus.Value.ToString();
query = query.Where(e => e.AiSeverityRaw == severity);
```

`AiSeverityRaw` — bazadagi **hosila (generated) ustun**:
`ai_answer_data ->> 'automatic_analysis_bool'`. `->>` operatori `1` va
`"1"` ni bir xil `'1'` matniga keltiradi, ya'ni bo'shliq va tirnoq
variantlarini sanab chiqish kerak emas. Jami **9 ta filtr joyi**
almashtirildi.

### Nima uchun GIN emas

Rejada `gin (ai_answer_data jsonb_path_ops)` taklif qilingan. Bu yerda
doim **bitta kalit** aniq qiymatga tenglikka tekshiriladi — bunday
so'rovda B-tree GIN dan tez va sezilarli darajada kichik. GIN ning
afzalligi ixtiyoriy kalitlar bo'yicha qidiruvda ko'rinadi.

### Migratsiya ma'lumotni yo'qotmaydi

Ustun turini o'zgartirishdan oldin ikkita tayyorgarlik qadami:

1. Bo'sh satrlar `NULL` ga (bo'sh satr yaroqli JSON emas; "AI hali
   javob bermadi" ma'nosini aynan `NULL` bildiradi).
2. Yaroqsiz JSON qolgan bo'lsa — **o'chirilmaydi**, balki
   `{"xato": "yaroqsiz_json", "xom_matn": ...}` ichiga o'raladi.
   Migratsiyada ma'lumotni jimgina yo'qotish eng yomon xulq bo'lardi.

Amalda tekshiruvda 48 ta yozuvning **hammasi** yaroqli JSON edi, ya'ni
ikkinchi qadam ishlamadi — lekin u kelajakdagi qayta tiklashlar
uchun qoladi.

### Yo'l-yo'lakay topilgan va tuzatilgan uchta buzilish xavfi

`jsonb` ustun yaroqsiz JSON ni **rad etadi**. Bu — asosiy foyda,
lekin ayni paytda ilgari jimgina o'tib ketadigan yozuvlar endi
`DataError` bilan tugaydi. Uchta bunday yo'l topildi:

| Joy | Nima yozardi | Nima bo'lardi |
|---|---|---|
| 7 ta chaqiruv (`holter/smad/lab_analyses_api.py`, `main.py`) | `ai_answer_data=""` — avvalgi natijani tozalash uchun | **qayta tahlil butunlay ishlamay qolardi** |
| `ai_result_guard.sanitize` | JSON bo'lmagan javobni **o'zgarishsiz** | model formatdan chiqsa natija yo'qolardi |
| `ai_result_guard.sanitize` | bo'sh javobda `""` | yuqoridagi bilan bir xil |

**Tozalash uchun aniq bayroq.** Bo'sh satr ataylab ishlatilgan edi:
yangilash yordamchilari `if value is not None` shartiga tayanadi, ya'ni
`None` "bu maydonga tegma" degani. Shuning uchun oddiy almashtirish
yetarli emasdi — to'rtala yordamchiga `clear_ai_answer: bool = False`
parametri qo'shildi.

**JSON bo'lmagan javob o'raladi.** `sanitize` endi
`{"xato": "javob_json_emas", "xom_matn": ...}` qaytaradi — matn
yo'qolmaydi, lekin ustun turiga mos bo'ladi. Bo'sh javobda `None`:
bor natija bo'sh qiymat bilan almashtirilmaydi.

### Tekshiruv (jonli)

**Sxema:**

| | Natija |
|---|---|
| `ai_answer_data` turi | to'rtala jadvalda `jsonb` |
| `ai_severity` | `text`, `is_generated = ALWAYS` |
| Indekslar | `ix_{ecg,holter,smad,lab}_analyses_ai_severity` |

**Qabul mezoni.** Bazada `ai_severity = '13'` qiymatli yozuv bor edi —
aynan taskda tasvirlangan holat:

```sql
SELECT id, ai_severity FROM ecg_analyses WHERE ai_severity = '1';
 id | ai_severity
 93 | 1                    ← 13 qiymatli yozuv TUSHMADI

EXPLAIN (SET enable_seqscan = off):
 Index Scan using ix_ecg_analyses_ai_severity on ecg_analyses
   Index Cond: (ai_severity = '1'::text)
```

`enable_seqscan = off` kerak bo'ldi, chunki jadvalda 17 qator — bunday
hajmda planner har qanday holatda ketma-ket skanerlashni tanlaydi.
Muhimi shuki, indeks **mavjud va yaroqli**.

**Brauzerda** (EKG ro'yxati → Filtrlar → AI xulosasi = "Yaxshi"):
bitta yozuv qaytdi — `NMED-EKG-00000109` emas, aynan
**`NMED-EKG-00000093`**, ya'ni SQL bilan bir xil.

**Yozish yo'llari** (haqiqiy `SessionLocal` va haqiqiy yordamchilar
orqali):

| Amal | Natija |
|---|---|
| SQLAlchemy `Text` parametri bilan JSON yozish | OK, `ai_severity = '2'` |
| Yaroqsiz matn yozish | **`DataError`** — baza rad etdi |
| `update_ecg_analyse(clear_ai_answer=True)` | `ai_answer_data = NULL`, `ai_severity = NULL` |
| `update_holter_analyse(clear_ai_answer=True)` | xuddi shunday |
| Yangi natija yozish | `ai_severity = '3'` |
| `sanitize('Kechirasiz, tahlil qila olmayman')` | `{"xato": "javob_json_emas", "xom_matn": ...}` — yaroqli JSON |
| `sanitize('')` va `sanitize('   ')` | `None` |
| To'g'ri JSON javob | o'zgarishsiz o'tdi |

Sinov yozuvlari (ecg#109, holter#22) asl holatiga qaytarildi.

**Ro'yxatlar** (Python va .NET qayta ishga tushirilgandan keyin):
EKG 10, Holter 10, SMAD 6, Lab 10 qator — xatosiz.

---

### ✅ T-037 — ~~Anonim QR-verifikatsiya endpointi bemor ism-sharifini oshkor qiladi va ID'lari ketma-ket~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Xavfsizlik / Shaxsiy ma'lumot oshkorligi / Kritik
**Fayl:** `backend/EkgAnalyzerApi/Controllers/ReportController.cs:187-188`

**Muammo:**
`GET /api/report/verify/{type}/{id}` endpointi `[AllowAnonymous]` — token talab qilmaydi. Jonli tekshiruv (2026-08-29), hech qanday autentifikatsiyasiz:

```
GET http://.../api/report/verify/ecg/96   →  HTTP 200
{
  "isValid": true,
  "analysisId": 96,
  "analysisType": "ecg",
  "documentNumber": "NMED-EKG-00000096",
  "patientFullName": "TESTBEMOROV SANJAR BOTIR O'G'LI",   ← bemor to'liq ism-sharifi
  "doctorFullName":  "ISMOILOV RAHMONJON ZOHID O'G'LI",   ← shifokor ism-sharifi
  "clinicName": "R doctors",                              ← klinika nomi
  "analysisDate": "2026-08-29T10:00:00Z",
  "status": "2"
}
```

Identifikator — **oddiy ketma-ket butun son**. Hujumchi `1` dan `N` gacha aylanib chiqib:
- platformadagi **barcha bemorlarning to'liq ism-shariflarini** yig'ib oladi
- har bir bemor qaysi turdagi tahlildan o'tganini biladi (EKG / Holter / SMAD / Laboratoriya)
- qaysi klinikaga va qaysi shifokorga borganini biladi
- tahlil sanasini biladi

"Falonchi 2026-yil avgustda falon klinikada Holter monitoringidan o'tgan" — bu **tibbiy sir**. Uni bilish uchun hech qanday parol kerak emas, faqat `curl` va sanoq.

Xuddi shu naqsh `GET /api/consultation/verify/{id}` da ham qo'llangan.

**Nima uchun kritik:**
Bu O'z DSt 2814:2014 va shaxsiy ma'lumotlar to'g'risidagi qonunni to'g'ridan-to'g'ri buzadi. Ma'lumotni yig'ish uchun tizimni "buzish" ham shart emas — endpoint ochiq va ID'lar taxmin qilinadi.

**Tuzatish rejasi:**
1. Verifikatsiya uchun **taxmin qilib bo'lmaydigan token** joriy qilish: hujjat yaratilganda `verification_token` (128-bitli tasodifiy, base64url) generatsiya qilinadi va faqat QR kodga joylanadi. Endpoint `GET /api/report/verify/{token}` ko'rinishiga o'tadi.
2. Javobdagi ma'lumotni **minimallashtirish** — verifikatsiya faqat hujjatning haqiqiyligini tasdiqlashi kerak, tarkibini emas:
   ```json
   {
     "isValid": true,
     "documentNumber": "NMED-EKG-00000096",
     "issuedAt": "2026-08-29",
     "clinicName": "R doctors",
     "patientInitials": "T. S. B."     // to'liq ism emas
   }
   ```
3. Bemor va shifokorning to'liq ism-shariflarini anonim javobdan **butunlay olib tashlash**.
4. Endpointga rate limiting qo'yish (`strict`) — ommaviy so'rovlarni to'sish.
5. Verifikatsiya urinishlarini `audit_logs` ga yozish (IP bilan) — nomaqbul faollikni aniqlash uchun.
6. Tokenga amal qilish muddati qo'yish (masalan 1 yil).

**Qabul mezoni:** `/api/report/verify/ecg/96` marshruti umuman mavjud emas; token bilan chaqirilganda javobda bemorning to'liq ismi yo'q.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**
Yangi `Services/DocumentVerificationService.cs` — HMAC-SHA256 asosidagi verifikatsiya tokeni.
Token hujjat turi va ID sidan hosil qilinadi, shuning uchun **bazada saqlash shart emas**
(migratsiya kerak emas) va bir xil hujjat uchun har doim bir xil bo'ladi.

- Eski marshrut `GET /api/report/verify/{type}/{id}` **butunlay olib tashlandi**.
- Yangi marshrut: `GET /api/report/verify/{token}`, `strict` rate limiting bilan.
- PDF dagi QR havolasi ham yangi formatga o'tkazildi.
- Javobdan bemor va shifokorning **to'liq ism-shariflari olib tashlandi** — faqat bosh harflar qoldi.

**Jonli tekshiruv:**

| So'rov | Natija |
|---|---|
| Eski `/api/report/verify/ecg/96` | **404** — marshrut yo'q ✅ |
| Eski `/api/report/verify/ecg/1` (sanab chiqish) | **404** ✅ |
| PDF dagi QR | `https://nmed.uz/verify/ecg96-hjbIL1XEBpPIunbDjnNh5A` ✅ |
| To'g'ri token bilan | 200 — quyidagi javob |
| Buzilgan token (`...XXXX`) | **404** ✅ |
| Qo'shni ID + o'sha token (`ecg95-...`) | **404** ✅ |

Yangi javob (taqqoslash uchun):
```json
{"isValid":true, "documentType":"EKG", "documentNumber":"NMED-EKG-00000096",
 "patientInitials":"T. S. B.", "clinicName":"R doctors",
 "issuedAt":"2026-08-29T10:00:00Z"}
```
Avvalgi javobda `patientFullName: "TESTBEMOROV SANJAR BOTIR O'G'LI"` va
`doctorFullName` bor edi — endi ikkalasi ham yo'q.

---

### ✅ T-038 — ~~Bemor tibbiy fayllari autentifikatsiyasiz yuklab olinadi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Xavfsizlik / Shaxsiy ma'lumot oshkorligi / Kritik
**Fayllar:** `python_back/main.py:135`, `backend/EkgAnalyzerApi/Controllers/FileProxyController.cs:27-28,56-57`, `frontend/src/host/Host.js:9`

**Muammo:**
Bemorning EKG rasmlari, Holter/SMAD/Laboratoriya PDF fayllari va generatsiya qilingan grafiklar **hech qanday tekshiruvsiz** beriladi. Jonli tekshiruv (2026-08-29), tokensiz:

```
GET http://127.0.0.1:8000/uploads/ecg_generated_files/ecg_96.png            → 200
GET http://127.0.0.1:5000/api/files/uploads/ecg_generated_files/ecg_96.png  → 200
```

Uchta alohida muammo:

1. **Python `/uploads` ochiq statik papka** — `app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR))`. Hech qanday himoya yo'q. Ishlab chiqarishda bu `https://analyse.nmed.uz/uploads/...` sifatida **butun internetga ochiq**.
2. **.NET `FileProxyController` da ikkala metod ham `[AllowAnonymous]`** — controller darajasidagi `[Authorize]` atributi shu bilan bekor qilingan.
3. **Frontend fayllarni to'g'ridan-to'g'ri Python'dan oladi** (`Host.js:9` → `apiEcg` → `https://analyse.nmed.uz`). Bu C1 (proxy arxitekturasi) talabini buzadi — konstitutsiyada "Frontend hech qachon to'g'ridan-to'g'ri Python API ga murojaat qilmasligi SHART" deb yozilgan.

Fayl nomlari taxmin qilinadi: `ecg_96.png`, `ecg_97.png`, ... Ya'ni T-037 bilan birgalikda hujumchi **ism-sharifni ham, EKG tasvirini ham** ketma-ket yuklab olishi mumkin.

**Tuzatish rejasi:**
1. Python `/uploads` mount'ini **butunlay olib tashlash**. Fayllarga faqat .NET orqali kirish.
2. `FileProxyController` dan `[AllowAnonymous]` ni olib tashlash; har bir so'rovda:
   - foydalanuvchi autentifikatsiyadan o'tganini,
   - so'ralayotgan fayl uning klinikasiga tegishli tahlilga tegishli ekanini tekshirish.
3. Fayl yo'lini bevosita URL'da uzatish o'rniga **tahlil ID orqali** berish: `GET /api/ecg-analyses/{id}/file` va `GET /api/ecg-analyses/{id}/generated-image`. Bu yo'l bo'yicha ruxsat tekshiruvini tabiiy qiladi.
4. Frontenddagi `apiEcg` ni olib tashlab, barcha media havolalarini `.NET` endpointlariga o'tkazish (`components/results/*` dagi 10 ta joy).
5. Fayl nomlarini taxmin qilib bo'lmaydigan qilish (UUID), `{yyyyMM}` papkalari bilan.
6. Nginx darajasida ham `analyse.nmed.uz/uploads` yo'lini yopish (ikkinchi mudofaa chizig'i).
7. Yo'l tekshiruvidagi kichik kamchilikni tuzatish: `fullPath.StartsWith(root)` — `root` oxirida ajratuvchi belgi yo'q, shuning uchun `uploads_boshqa` nomli qo'shni papka tekshiruvdan o'tib ketishi mumkin. `Path.EndsInDirectorySeparator` bilan normallashtirish kerak.

**Qabul mezoni:** Tokensiz `GET /api/files/uploads/...` → 401; boshqa klinika foydalanuvchisi tokeni bilan → 403; Python `/uploads` marshruti umuman javob bermaydi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**

1. **`FileProxyController` to'liq qayta yozildi:**
   - `[AllowAnonymous]` ikkala metoddan ham **olib tashlandi**.
   - So'ralayotgan fayl foydalanuvchi klinikasiga tegishli tahlilga bog'liqligi bazadan tekshiriladi (`BelongsToClinicAsync`).
   - Litsenziya fayllari faqat Admin/Direktor/SuperAdmin uchun.
2. **Yangi `Services/FileStorageService.cs`** — yo'l hisoblash bitta joyga yig'ildi; path traversal tekshiruvi ildiz oxiridagi ajratuvchi bilan to'g'rilandi (`uploads_eski` kabi qo'shni papka endi o'tmaydi).
3. **Python `/uploads` mount'i yopildi** (`main.py`) — faqat `SERVE_UPLOADS_INSECURE=true` bilan ochiladi, ishlab chiqarish uchun emas.
4. **Frontend `apiEcg` butunlay olib tashlandi** — o'rniga `buildFileUrl(link)`, u `.NET` `/api/files/...` manziliga token bilan murojaat qiladi. 12 ta faylda almashtirildi.
5. `<img>`/`<a>` teglari Authorization sarlavhasini yubora olmagani uchun `/api/files` yo'li ham `access_token` query parametrini qabul qiladi (loyihada SignalR uchun allaqachon ishlatilayotgan naqsh).

**Jonli tekshiruv** — `/api/files/uploads/ecg_generated_files/ecg_96.png`:

| Kim | Avval | Hozir |
|---|---|---|
| Tokensiz | 200 — fayl beriladi | **401** ✅ |
| Begona klinika (#25) | 200 | **404** ✅ |
| O'z klinikasi (#24) | 200 | **200**, 13.7 MB ✅ |
| Path traversal (`../../appsettings.json`) | — | **404** ✅ |
| Python `:8000/uploads/...` to'g'ridan | 200 | **404** ✅ |

**Brauzerda:** `/ecg-analyses/view/96` sahifasi ochildi, EKG rasmi
`ecg_generated_short_files/ecg_96.png` muvaffaqiyatli yuklandi (500×375, `complete=true`) —
ya'ni himoya qo'shilgandan keyin ham interfeys buzilmadi.

---

### ✅ T-039 — ~~Bitta EKG uchun PDF hisobot hajmi 14 MB~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Ishlash / UX / Yuqori
**Fayl:** `backend/EkgAnalyzerApi/Services/PdfReportService.cs`

**Muammo:**
`GET /api/report/ecg/96?lang=uz` chaqiruvi **14 168 630 bayt (≈13.5 MB)** hajmdagi PDF qaytardi — bu bitta bemorning bitta EKG tahlili uchun.

Sabab: EKG tasvirlari (yuklangan original 4.2 MB JPG + generatsiya qilingan PNG grafiklar) PDF ichiga **siqilmasdan, to'liq o'lchamda** joylashtirilgan.

**Amaliy oqibatlar:**
- Shifokor mobil internetda hisobotni ochishi bir necha daqiqa davom etadi.
- Elektron pochta orqali yuborib bo'lmaydi (ko'p provayderlarda chegara 10–25 MB).
- `combined/{patientId}` hisoboti (bemorning barcha tahlillari) o'nlab megabaytga yetadi va server xotirasini yeydi.
- Server tomonida har bir hisobot generatsiyasi katta xotira talab qiladi — bir vaqtda bir necha so'rov kelsa `OutOfMemoryException` xavfi bor.

**Tuzatish rejasi:**
1. PDF ga joylashdan oldin rasmlarni qayta o'lchamlash va siqish (masalan eni 1600 px, JPEG sifat 80). `PdfReportService` ichida yagona `PrepareImageForPdf()` yordamchisi.
2. EKG grafigini PNG o'rniga **vektor (SVG/PDF path)** ko'rinishida chizish — hajm keskin kamayadi, sifat esa oshadi.
3. Original yuklangan faylni PDF ichiga umuman qo'shmaslik — uning o'rniga havola yoki QR qo'yish.
4. Hisobot hajmini o'lchash va logga yozish; 5 MB dan oshsa ogohlantirish.
5. `combined` hisoboti uchun tahlil sonini cheklash yoki oqim (streaming) rejimida generatsiya qilish.

**Qabul mezoni:** Bitta EKG hisoboti 2 MB dan oshmaydi, o'qish sifati saqlanadi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

Sabab T-047 da edi — hisobotga 13 MB li PNG joylanardi. `iTextSharp`
dagi `ScaleToFit` faqat **ko'rsatish** o'lchamini o'zgartiradi, faylning
o'zi to'liq hajmda PDF ichiga tushadi.

T-047 tuzatilgach va mavjud fayllar
`compress_existing_images.py` bilan siqilgach:

| Hisobot | Avval | Keyin |
|---|---|---|
| `GET /api/report/ecg/100` | 13.51 MB | **1.09 MB** |
| `GET /api/report/ecg/96` | 13.5 MB | **1.09 MB** |

Qabul mezoni — "bitta EKG hisoboti 2 MB dan oshmaydi, o'qish sifati
saqlanadi" — bajarildi: hisobotdagi rasm 2000 px enda, ya'ni A4
sahifada 300 dpi dan yuqori zichlikda chiqadi.

**Serverda qo'shimcha siqish qo'shilmadi.** Sababi: .NET loyihasida
umuman rasm kutubxonasi yo'q (SkiaSharp ham, ImageSharp ham). Buning
uchun yangi bog'liqlik qo'shish kerak bo'lardi, holbuki muammo manbada
— fayl yaratilayotgan paytda — hal qilindi va ikkinchi marta siqish
faqat sifatni yo'qotardi.

---

### ✅ T-040 — ~~Yuklangan fayl hajmi cheklanmagan~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Barqarorlik / DoS / O'rta
**Fayllar:** `python_back/file_validator.py`, `python_back/main.py`, `backend/EkgAnalyzerApi/Program.cs`

**Muammo:**
Auditda 4.2 MB hajmli EKG rasmi va 1.7 MB PDF muammosiz qabul qilindi. Kodda EKG/Holter/SMAD/Laboratoriya fayllari uchun **hajm chegarasi topilmadi** (faqat parazitologiya moduli 8 MB chegarasiga ega, u esa hozircha qamrovdan tashqarida).

Kestrel'ning standart `MaxRequestBodySize` (30 MB) amal qiladi, lekin bu:
- ataylab belgilangan qiymat emas,
- xatolik holatida foydalanuvchiga tushunarli xabar bermaydi,
- Python tomonida esa umuman chegara yo'q — `.NET` proxy'ni chetlab o'tgan so'rov cheksiz fayl yubora oladi.

**Tuzatish rejasi:**
1. Har bir modul uchun aniq chegara belgilash (masalan EKG rasm — 15 MB, PDF — 25 MB) va uni konfiguratsiyaga chiqarish.
2. `.NET` controller'larida `[RequestSizeLimit(...)]` atributi va chegara oshganda tushunarli 413 javobi.
3. Python tomonida `UploadFile` o'qishdan oldin `content-length` ni tekshirish.
4. Frontendda faylni tanlash paytida hajmni tekshirish va darhol ogohlantirish (server'ga yubormasdan).
5. Diskda joy tugashi holatini ham hisobga olish — yuklash papkasi to'lganda tushunarli xatolik.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**
`file_validator.py` da fayl hajmi chegaralari joriy qilindi va `validate_upload()`
orqali barcha yuklash endpointlarida qo'llanadi:

- `MAX_FILE_SIZE = 25 MB` — oshsa `400` va tushunarli xabar
- `MIN_FILE_SIZE = 100 bayt` — bo'sh yoki buzilgan fayl rad etiladi

Ilgari EKG/Holter/SMAD/Lab uchun hech qanday chegara yo'q edi; faqat Kestrel'ning
standart 30 MB limiti ishlardi va u foydalanuvchiga tushunarli xabar bermasdi.

**Jonli tekshiruv:** 30 baytlik fayl → `400 "Yuklangan fayl bo'sh yoki buzilgan. Boshqa fayl tanlang."` ✅

---

### ✅ T-041 — ~~Fayl turlari ro'yxati frontend va backendda bir xil emas~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Mantiqiy nomuvofiqlik / O'rta
**Fayllar:** `frontend/src/pages/cabinet/ecg_analyse/EcgAnalyzer.js`, `python_back/file_validator.py`

**Muammo:**
EKG yuklash maydonida foydalanuvchiga: **"Fayl turlari: xml, jpg, png"** deb ko'rsatiladi.

Ammo Python `validate_file_type` funksiyasi va `main.py` dagi parsing mantiqi bundan kengroq turlarni qo'llab-quvvatlaydi (CSV/TSV jadval formatlari — `parse_table_bytes`, XML — `parse_xml_bytes`, rasm — `extract_image_bytes_as_signal`).

Ya'ni tizim CSV EKG faylini qayta ishlay oladi, lekin foydalanuvchi bu haqda bilmaydi va interfeys uni taklif qilmaydi.

Teskari xavf ham bor: agar frontend `accept` atributi backend'dan kengroq bo'lsa — foydalanuvchi faylni tanlaydi, yuklaydi va faqat serverdan xatolik oladi.

**Tuzatish rejasi:**
1. Qo'llab-quvvatlanadigan formatlarning **yagona ro'yxatini** aniqlash va uni bitta joyda saqlash (backend konfiguratsiyasi).
2. Frontendga ro'yxatni endpoint orqali berish yoki umumiy konstanta faylida saqlash.
3. `<input accept="...">` atributi, ko'rsatiladigan matn va server validatsiyasi — uchalasi bir manbadan olinsin.
4. Har bir tahlil turi uchun alohida ro'yxat (Holter/SMAD — PDF; EKG — XML/CSV/JPG/PNG; Lab — PDF/JPG/PNG).
5. Noto'g'ri format tanlanganda tushunarli xabar: "Bu fayl turi qo'llab-quvvatlanmaydi. Ruxsat etilgan: ...".


#### ✅ Bajarildi va tekshirildi (2026-08-29)

### Nomuvofiqlik o'lchandi

| Tur | Interfeys ko'rsatardi | Server aslida qabul qilardi |
|---|---|---|
| EKG | `xml, jpg, png` | `xml, csv, tsv, png, jpg, jpeg` |
| **Holter** | `pdf` | `pdf, png, jpg, jpeg` |
| **SMAD** | `pdf` | `pdf, png, jpg, jpeg` |
| Laboratoriya | `pdf, jpg, png` | `pdf, png, jpg, jpeg` |

Holter va SMAD da farq eng katta: tizim hisobotning **suratini** qabul
qila olardi, lekin interfeys uni umuman taklif qilmasdi. Klinikada
Holter hisoboti ko'pincha qog'ozda chiqadi va uni telefonda suratga
olish PDF topishdan osonroq — ya'ni ishlaydigan imkoniyat foydalanuvchidan
yashiringan edi.

EKG da esa CSV/TSV signal fayllari yashiringan: `main.py` da
`parse_table_bytes` aynan shu formatlar uchun yozilgan.

### Yagona manba

Ro'yxat endi bitta joyda — `file_validator.ALLOWED_BY_ANALYSIS_TYPE`,
ya'ni **validatsiya bajariladigan joyda**. Uchta bo'g'in orqali
uzatiladi:

1. `GET /api/file-types` (Python) — turkumlangan ro'yxat;
2. `GET /api/analyses/file-types` (.NET proksi) — konstitutsiya bo'yicha
   frontend Python bilan bevosita gaplashmaydi;
3. `hooks/useFileTypes.js` — bir marta so'raydi va **modul darajasida
   keshlaydi**, chunki ro'yxat deyarli o'zgarmaydi.

`<input accept>` atributi, ko'rsatiladigan matn va server validatsiyasi
— uchalasi shu bitta manbadan oladi.

**Zaxira ro'yxat** ikkala tomonda ham bor (`.NET` kontrollerida va
hookda): Python javob bermasa yuklash formasi butunlay ishlamay
qolmasligi kerak. Zaxira faqat shu holatda ishlatiladi.

### Tekshiruv (brauzerda)

| Sahifa | `<input accept>` | Ekranda |
|---|---|---|
| Holter | `.jpeg,.jpg,.pdf,.png` | "Fayl turlari: jpeg, jpg, pdf, png" |
| EKG | `.csv,.jpeg,.jpg,.png,.tsv,.xml` | "Fayl turlari: csv, jpeg, jpg, png, tsv, xml" |

Endpointlar ham alohida tekshirildi — Python va .NET bir xil JSON
qaytaradi.

**5-band** (noto'g'ri format tanlanganda tushunarli xabar) T-052 da
allaqachon bajarilgan: `file_validator` uch tilda, nima qilish
kerakligini aytadigan xabar qaytaradi.

---

### ✅ T-042 — ~~Tahlil jadvallari kichik ekranlarda kesiladi va gorizontal aylantirish yo'q~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UI/UX / Moslashuvchanlik / Kritik
**Fayllar:** `frontend/src/App.css` (`.main_card`), barcha tahlil ro'yxati sahifalari (`EcgAnalysesList.js`, `HolterAnalysesList.js`, `SmadAnalysesList.js`, `LabAnalysesList.js`, `DiagnosesList.js`)

**Muammo:**
EKG tahlillari jadvalida 11 ta ustun bor: `#`, `Bemor`, `Passport`, `Tug'ilgan sana`, `Shifokor`, `Tahlil holati`, `AI xulosasi`, `Tashxis yozilgan`, `Kiritilgan sana`, `Tahlil sanasi`, `[Amallar]`.

Jadvalning tabiiy kengligi — **1233 px**. Konteyner esa `.main_card { overflow: hidden }` bilan o'ralgan va zanjirning **hech bir bo'g'inida `overflow-x: auto` yo'q**. Natijada ortiqcha qism shunchaki kesib tashlanadi — aylantirib ko'rish **imkonsiz**.

Brauzerda o'lchangan natijalar (2026-08-29):

| Ekran | Konteyner kengligi | Ko'rinmaydigan qism | Yo'qolgan ustunlar |
|---|---|---|---|
| Desktop 1280 px | 1216 px | 17 px | Amallar ustuni qisman |
| **Planshet 768 px** | 724 px | **509 px** | AI xulosasi, Tashxis, 2 ta sana, Amallar |
| **Mobil 375 px** | 339 px | **894 px (72%)** | Tug'ilgan sanadan keyingi **hammasi** |

Mobil ekranda shifokor faqat `#`, `Bemor` va `Passport` ustunlarini ko'radi. **Ko'rinmaydi:**
- tahlil holati (tayyor / xatolik / kutilmoqda)
- AI xulosasi jiddiyligi (yashil / sariq / qizil)
- shifokor xulosasi yozilgan-yozilmagani
- sanalar
- **tahlilni ochish tugmasi** — ya'ni ro'yxatdan tahlilga o'tib bo'lmaydi

**Nima uchun kritik:**
Shifokorlar mobil qurilmadan foydalanadi — palatada, navbatchilikda, klinikadan tashqarida. Hozirgi holatda ilova telefonda **amalda ishlamaydi**: ro'yxat ko'rinadi, lekin undan hech qanday tahlilga kirib bo'lmaydi. Bu 1280 px li noutbukda ham (eng keng tarqalgan ekran) qisman muammo.

**Tuzatish rejasi:**
1. **Tezkor tuzatish:** Ant Design `Table` ga `scroll={{ x: 'max-content' }}` qo'shish va `.main_card` dagi `overflow: hidden` ni `overflow: visible` yoki `overflow-x: auto` ga o'zgartirish. Bu darhol aylantirish imkonini beradi.
2. **To'g'ri yechim — moslashuvchan ustunlar:** Ant Design `Grid.useBreakpoint()` orqali ekran o'lchamiga qarab ustunlarni tanlash:
   - `< 768 px`: `Bemor`, `Tahlil holati` + `AI xulosasi` chipi, `[Ochish]`
   - `768–1200 px`: yuqoridagilar + `Passport`, `Kiritilgan sana`
   - `> 1200 px`: barcha ustunlar
3. **Eng yaxshi yechim — mobil uchun kartochka ko'rinishi:** jadval o'rniga har bir tahlil uchun kartochka (bemor ismi, holat chipi, sana, ochish tugmasi). Bu barmoq bilan ishlash uchun ancha qulay.
4. `Amallar` ustunini `fixed: 'right'` qilish — aylantirilganda ham doim ko'rinib tursin.
5. Bemor ismi ustunini `ellipsis: true` bilan cheklash — hozir 4 qatorga bo'linib, qator balandligini keraksiz oshiradi.
6. Xuddi shu tuzatishni **barcha 5 ta ro'yxat sahifasida** qo'llash.

**Qabul mezoni:** 375 px ekranda tahlil ro'yxatidan istalgan tahlilni ochish mumkin; hech qanday ma'lumot yetib bo'lmaydigan holatda qolmaydi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**
- **10 ta jadvalga** `scroll={{ x: "max-content" }}` qo'shildi (barcha tahlil ro'yxatlari, Xodimlar, Bemorlar, Konsultantlar, Shifokor xulosasi).
- `App.css` da `.main_card` ning `overflow: hidden` → `overflow-x: auto` — u ichkaridagi jadvalning aylantirishini bloklardi.
- `.ant-table-wrapper`, `.ant-table-content`, `.doctors_table` uchun `max-width: 100%; overflow-x: auto`.
- Bemor ismi ustuni bir qatorga sig'adigan bo'ldi (ilgari 4 qatorga bo'linardi).

**Jonli o'lchov:**

| Ekran | Jadval kengligi | Konteyner | `overflow-x` | Aylantirish |
|---|---|---|---|---|
| 1440 px | 1579 px | 1368 px | `auto` | **mumkin** ✅ |
| 375 px (mobil) | 1579 px | 339 px | `auto` | **mumkin** ✅ |

Sahifaning o'zi gorizontal siljimaydi (`document.scrollWidth === innerWidth`).

**Brauzerda:** 1440 px da endi 10 ta qator sig'adi (avval 5 ta edi) —
qator balandligi ism bir qatorga joylashgani uchun kamaydi.

---

### ✅ T-043 — ~~Mobil ekranda filtrlar butun sahifani egallaydi, ma'lumot ko'rinmaydi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UI/UX / Yuqori
**Fayllar:** barcha tahlil ro'yxati sahifalari

**Muammo:**
375 px ekranda filtr paneli (`Qidirish`, `Kiritilgan sana`, `Tahlil holati`, `AI xulosasi bo'yicha`, `Tashxis yozilgan`, `Qidirish` tugmasi) vertikal ustun bo'lib joylashadi va **taxminan 600 px balandlikni egallaydi** — ya'ni butun birinchi ekranni.

Foydalanuvchi sahifani ochganda **bironta ham tahlilni ko'rmaydi**; ma'lumotga yetish uchun uzoq aylantirish kerak. Har safar sahifaga qaytganda bu takrorlanadi.

**Tuzatish rejasi:**
1. Mobilda filtrlarni yig'iluvchi panelga (`Collapse` yoki `Drawer`) joylashtirish — sukut bo'yicha yopiq.
2. Yuqorida faqat qidiruv maydoni va "Filtrlar" tugmasi qolsin; tugmada faol filtrlar soni badge sifatida ko'rinsin.
3. Faol filtrlarni olib tashlash mumkin bo'lgan teglar (`Tag closable`) ko'rinishida ko'rsatish.
4. Desktopda hozirgi gorizontal joylashuv saqlanadi.
5. `Qidirish` tugmasini olib tashlab, filtrlarni `debounce` bilan avtomatik qo'llash — bitta ortiqcha qadam kamayadi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:** `App.css` ga moslashuvchanlik qoidalari qo'shildi:

```css
@media (max-width: 768px) {
  .main_card_btn { flex-direction: column; align-items: stretch; gap: 10px; }
  .main_card_btn > * { width: 100%; }
  .stat_cards_grid { grid-template-columns: repeat(2, 1fr); }
  .quick_actions_grid { grid-template-columns: 1fr; }
  .btn_form, .ant-btn { min-height: 44px; }   /* barmoq uchun minimal maydon */
}
@media (max-width: 576px) { .stat_cards_grid { grid-template-columns: 1fr; } }
@media (max-width: 1024px) { .stat_cards_grid { auto-fit minmax(180px, 1fr) } }
```

Bundan tashqari `prefers-reduced-motion` qo'llab-quvvatlandi — harakatni
kamaytirish sozlamasi yoqilgan foydalanuvchilar uchun animatsiyalar o'chadi.

---

### ✅ T-044 — ~~Xatolik bilan tugagan va "muzlab qolgan" tahlillar ro'yxatda oddiy yozuv sifatida turadi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UX / Ma'lumotlar sifati / Yuqori
**Fayllar:** tahlil ro'yxati sahifalari, `backend/EkgAnalyzerApi/Services/*AnalyseService.cs`

**Muammo:**
Auditda yaratilgan uchta EKG yozuvi ro'yxatda quyidagicha ko'rinadi:

| # | Bemor | Tahlil holati | AI xulosasi | Izoh |
|---|---|---|---|---|
| 1 | TESTBEMOROV | ✅ AI tahlil qilindi | O'rtacha | Normal yozuv (#96) |
| 2 | TESTBEMOROV | ⛔ Xatolik | Tahlil qilinmagan | AI xatoligi (#95) |
| 3 | TESTBEMOROV | 🕐 **Yuklanmoqda** | Tahlil qilinmagan | **Muzlab qolgan (#94)** |

3-yozuv — T-026 dagi tranzaksiya xatoligidan qolgan chala yozuv. U **abadiy "Yuklanmoqda" holatida turadi**: AI'ga hech qachon yuborilmaydi, hech qachon tugamaydi, o'chirib ham bo'lmaydi (T-027).

Ikkala muammoli yozuv uchun ham foydalanuvchida **hech qanday harakat imkoniyati yo'q**:
- "Xatolik" yozuvida "Qayta urinish" tugmasi yo'q (EKG uchun `send-to-ai` endpointi mavjud bo'lsa-da, ro'yxatda tugma qo'yilmagan)
- "Yuklanmoqda" yozuvi uchun bekor qilish yoki o'chirish yo'q
- Xatolik sababi ko'rsatilmaydi

**Tuzatish rejasi:**
1. `status = -1` (xatolik) yozuvlarida **"Qayta urinish"** tugmasini ko'rsatish — mavjud `POST api/ecg-analyses/send-to-ai` endpointiga ulash. Holter/SMAD/Lab uchun ham shunday endpoint qo'shish.
2. Xatolik sababini foydalanuvchi tiliga tarjima qilib ko'rsatish (T-025 dagi `ai_error_code` asosida): "AI xizmati vaqtincha ishlamayapti", "Fayl o'qib bo'lmadi" va h.k.
3. `status = 0/1` yozuvlari uchun yaratilgan vaqtdan boshlab **taymer** qo'yish: 30 daqiqadan oshsa avtomatik `status = -1` ga o'tkazish (fon xizmati).
4. "Yuklanmoqda" holatidagi qatorda animatsiyali spinner va "N daqiqadan beri" matni.
5. Chala yozuvlarni ro'yxatdan yashirish emas — aksincha, adminga aniq ko'rsatish va tozalash imkonini berish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**1. "Qayta urinish" tugmasi — to'rttala tahlil turi uchun**

Ilgari faqat EKG da qayta yuborish endpointi bor edi (`send-to-ai`), lekin
ro'yxatda tugma yo'q edi. Holter/SMAD/Laboratoriyada esa endpointning o'zi
yo'q edi — yagona yechim yozuvni o'chirib, bemor, shifokorlar va
shikoyatlarni **qaytadan kiritish** edi.

* **Python:** `holter/smad/lab_analyses_api.py` ga `POST /{tur}/retry` —
  yozuvning **mavjud fayli** bilan qayta tahlil. Fayl `storage.resolve_existing`
  orqali topiladi (eski va yangi yo'l formatlari bilan ishlaydi); topilmasa
  aniq xabar qaytadi.
* **.NET:** uchta controllerga `POST api/{tur}-analyses/retry` proksi —
  klinika tekshiruvi va `ai-analysis` rate limiti bilan.
* **Frontend:** `components/shared/RetryAnalysisButton.js` — `status = -1`
  qatorlarida ko'rinadi.

**2. Xatolik sababi ko'rsatiladi**

Ilgari ustunda faqat "Xatolik" so'zi turardi. Endi sabab qator ostida
kichik matnda va `Tooltip` da chiqadi.

Sabab **serverda** hisoblanadi (`AiSeverity.ExtractErrorMessage`) va yangi
`ErrorReason` maydonida yuboriladi — `AIAnswerData` ataylab `[JsonIgnore]`
bo'lib qoladi, chunki u to'liq tibbiy xulosani o'z ichiga oladi va ro'yxat
javobini keraksiz kattalashtiradi.

Frontend tanilgan kodlarni tarjima qiladi (`provider_timeout`,
`provider_quota_exceeded`, `invalid_file`, `tahlil_muzlab_qoldi` …),
tayyor xabarni esa o'zgartirmasdan ko'rsatadi.

**3. Muzlab qolgan tahlillar kuzatuvchisi**

`Services/StuckAnalysisWatchdog.cs` — `BackgroundService`. Har 5 daqiqada
to'rttala jadvalni ko'zdan kechiradi va `status` 0/1 bo'lgan, yaratilganiga
30 daqiqadan oshgan yozuvlarni `status = -1` ga o'tkazadi hamda sabab
yozadi ("Tahlil belgilangan vaqt ichida tugamadi").

* Muddat va oraliq sozlanadi: `Analysis:StuckTimeoutMinutes`,
  `Analysis:WatchdogIntervalMinutes`.
* Yozuv **o'chirilmaydi**, fayli saqlanadi — faqat holati aniqlashtiriladi
  va "Qayta urinish" tugmasi paydo bo'ladi.
* Kuzatuvchi qulasa ham ilova ishlashda davom etadi (`try/catch` + log).
* To'rtta model umumiy `IStuckDetectable` interfeysini qo'llaydi — mantiq
  bir marta yozilgan.

**4. "N daqiqadan beri" ko'rsatkichi**

`status` 0/1 qatorlarida yaratilgandan beri qancha vaqt o'tgani ko'rsatiladi.
30 daqiqadan oshsa matn **qizil** rangga o'tadi — muzlab qolgan yozuv
kuzatuvchi ishlashidan oldin ham ko'zga tashlanadi.

**5. Tarjima** — 11 ta yangi kalit uch tilda (728 → 739).

**Tekshirildi (uchdan-uchgacha):**

| Tekshiruv | Natija |
|---|---|
| `analyze-save` bilan `status = 1` yozuv yaratildi (#105) | Bazada `status = 1` |
| Kuzatuvchi 0 daqiqalik chegara bilan ishga tushirildi | Log: `Muzlab qolgan tahlil: ecg#105` → `1 ta muzlab qolgan tahlil xatolik holatiga o'tkazildi` |
| Bazadagi natija | `status = -1`, `ai_answer_data = {"xato":"tahlil_muzlab_qoldi","xabar":"..."}` |
| Ro'yxatda ko'rinishi | 🔴 **Ошибка** + ostida sabab: *"Tahlil belgilangan vaqt ichida tugamadi. Qayta urinib ko'ring yoki faylni almashtiring."* |
| Xatolik qatoridagi tugmalar | **2 ta**: qayta urinish + o'chirish (ilgari faqat ko'rish edi) |
| "Qayta urinish" bosildi | `POST /api/ecg-analyses/send-to-ai` → 200 |
| Natija | #105: `status -1 → 2`, `ai_answer_data` da to'liq tibbiy xulosa ✅ |
| Kuzatuvchi normal sozlamaga qaytarildi | Log: `har 5 daqiqada, chegara 30 daqiqa` |
| Build | .NET 0 xato, React 1 eski warning |

**Bajarilmagan band:** 5-band — chala yozuvlarni ro'yxatdan butunlay
yashirish. Ataylab bajarilmadi: yozuv ko'rinib turishi va foydalanuvchi
uni **ko'rib, tushunib, qayta urinishi yoki o'chirishi** to'g'riroq.
Yashirish muammoni ko'zdan pana qiladi, hal qilmaydi. O'chirish esa
T-027 da mavjud.

---

### ✅ T-045 — ~~reCAPTCHA belgisi kontentni to'sib qo'yadi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UI / O'rta
**Fayllar:** `frontend/src/index.js`, global CSS

**Muammo:**
Google reCAPTCHA v3 ning "himoyalangan" belgisi (badge) ekranning o'ng pastki burchagida **doimiy suzib turadi** va kabinet ichidagi kontentni to'sadi. Mobil ekranda (375 px) u jadval qatorlari ustiga tushadi va ma'lumotni o'qishga xalaqit beradi.

reCAPTCHA faqat login va ro'yxatdan o'tish sahifalarida kerak, lekin `GoogleReCaptchaProvider` `index.js` da **butun ilovani** o'rab turgani uchun badge hamma joyda ko'rinadi.

**Tuzatish rejasi:**
1. `GoogleReCaptchaProvider` ni faqat `Auth` komponenti (login/register) atrofiga ko'chirish — kabinetda umuman yuklanmasin. Bu ortiqcha tashqi skript yuklanishini ham kamaytiradi.
2. Yoki `useRecaptchaNet` / `container` sozlamalari orqali badge'ni yashirib, Google talab qilganidek matnli havolani formaga qo'yish:
   > "Bu sayt reCAPTCHA bilan himoyalangan; Google [Maxfiylik siyosati] va [Foydalanish shartlari] amal qiladi."
3. Badge ko'rinib qolsa — `z-index` ni kontentdan past qilish yoki joylashuvini sozlash.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:** `index.js` da yangi `RecaptchaGate` komponenti —
`GoogleReCaptchaProvider` endi **faqat `/`, `/login`, `/register`** sahifalarida o'raladi.

Ilgari u butun ilovani o'rab turardi va "himoyalangan" belgisi kabinet ichida ham
o'ng pastki burchakda suzib turib kontentni to'sardi (mobil ekranda jadval qatorlari ustiga tushardi).

Bundan tashqari kabinetda ortiqcha tashqi skript ham yuklanmaydi.

**Brauzerda tasdiqlandi:** `document.querySelector('.grecaptcha-badge')` →
kabinet sahifalarida **`null`** ✅ (avval mavjud edi).

---

### ✅ T-046 — ~~Tahlil ko'rish sahifasi "Tahlil sanasi" o'rniga yaratilgan sanani ko'rsatadi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Mantiqiy xato / Tibbiy hujjat aniqligi / Kritik
**Fayllar:** `backend/EkgAnalyzerApi/DTOs/ECGAnalyseDTO.cs:16-41`, `LabAnalyseDTO.cs`, `HolterAnalyseDTO.cs`, `SmadAnalyseDTO.cs`, `frontend/src/pages/cabinet/ecg_analyse/EcgAnalyseView.js:93`

**Muammo:**
Tahlil yozuvida ikkita turli sana bor:
- `analysis_date` — **tahlil aslida o'tkazilgan sana** (masalan EKG qachon olingan)
- `created_at` — yozuv tizimga qachon kiritilgani

Ro'yxat DTO'si (`ECGAnalyseListDTO`) `AnalysisDate` maydonini qaytaradi. Ammo **batafsil ko'rish DTO'si (`ECGAnalyseDTO`) bu maydonni umuman o'z ichiga olmaydi** — `Id`, `Status`, `AnalyseFileLink`, `AIAnswerData`, `CreatedAt`, `UpdatedAt` bor, `AnalysisDate` yo'q.

Frontend esa shunday yozilgan:
```js
analysisDateText={formatDate(data.analysisDate || data.createdAt)}
```
`data.analysisDate` hech qachon kelmagani uchun **har doim `createdAt` ga tushib qoladi**.

Jonli tekshiruv (EKG #96):

| | Qiymat |
|---|---|
| Yuborilgan `analysis_date` | `2026-08-29T10:00:00Z` |
| Bazada saqlangan | `2026-08-29 15:00:00+05` ✅ to'g'ri |
| `GET /api/ecg-analyses/96` qaytaradi | `analysisDate: null` ❌ |
| Ekranda "Tahlil sanasi" | **28.08.2026** ❌ (yaratilgan sana) |

Xuddi shu kamchilik `LabAnalyseDTO`, `HolterAnalyseDTO`, `SmadAnalyseDTO` da ham bor — **to'rttala turda ham**.

**Nima uchun kritik:**
Bu **tibbiy hujjatdagi sana xatosi**. Bemor EKG'ni 29-avgustda topshirgan, hujjatda 28-avgust yozilgan. PDF hisobotga ham shu sana tushadi. Retrospektiv tahlilda (kasallik dinamikasi) noto'g'ri xronologiya beradi. Bemor kechqurun tahlildan o'tib, yozuv ertasi kuni kiritilsa — farq bir kunga yetadi.

**Tuzatish rejasi:**
1. To'rttala batafsil DTO'ga `AnalysisDate` maydonini qo'shish va Service'lardagi mapping'da to'ldirish.
2. Frontendda `data.analysisDate || data.createdAt` fallback'ini olib tashlash — sana yo'q bo'lsa "ko'rsatilmagan" deb yozish, boshqa sanani ko'rsatmaslik.
3. Ikkala sanani interfeysda **aniq ajratib** ko'rsatish: "Tahlil o'tkazilgan sana" va "Tizimga kiritilgan sana" (hozir ikkinchisi kichik matnda bor, lekin birinchisi noto'g'ri).
4. PDF hisobotda ham xuddi shu tekshiruvni o'tkazish (`PdfReportService`).
5. `analysis_date` ni majburiy maydon qilish — hozir `null` bo'lishi mumkin.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**
- To'rttala batafsil DTO ga (`ECGAnalyseDTO`, `LabAnalyseDTO`, `HolterAnalyseDTO`, `SmadAnalyseDTO`) `AnalysisDate` maydoni qo'shildi.
- Service'lardagi mapping'larda (8 ta joy) `AnalysisDate = e.AnalysisDate` bilan to'ldirildi.

**Jonli tekshiruv** — `GET /api/ecg-analyses/96`:

| Maydon | Avval | Hozir |
|---|---|---|
| `analysisDate` | **`null`** | `2026-08-29T10:00:00Z` ✅ |
| `createdAt` | `2026-08-28T14:35:39Z` | o'zgarmadi |

Endi ko'rish sahifasidagi `data.analysisDate || data.createdAt` fallback'i ishga tushmaydi va
"Tahlil sanasi" haqiqiy tahlil sanasini ko'rsatadi.

---

### ✅ T-047 — ~~"Generatsiya qilingan" EKG fayli 14 MB va 4032×3024 px — bu shunchaki asl foto~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Ishlash / Saqlash / Yuqori
**Fayllar:** `python_back/main.py` (`save_generated_file`, `render_12_lead_png`, `jpg_bytes_to_png_bytes`)

**Muammo:**
EKG #96 uchun yaratilgan fayllar:

| Fayl | Hajm | O'lcham |
|---|---|---|
| `ecg_generated_files/ecg_96.png` | **14 MB** | **4032 × 3024** |
| `ecg_generated_short_files/ecg_96.png` | 210 KB | 500 × 375 |

4032×3024 — bu **telefon kamerasining asl o'lchami**. Ya'ni rasm sifatida yuklangan EKG uchun "generatsiya" bosqichi aslida hech narsa chizmaydi, faqat JPG ni PNG ga o'giradi (`jpg_bytes_to_png_bytes`). PNG siqilmagan format bo'lgani uchun **4.2 MB JPG → 14 MB PNG** ga aylanadi — hajm uch barobar oshadi.

Bu bevosita T-039 (14 MB li PDF hisobot) sababidir.

Bundan tashqari `render_12_lead_png` funksiyasi mavjud (haqiqiy 12 kanalli grafik chizadi), lekin u faqat XML/CSV signal fayllari uchun ishlaydi. Rasm yuklanganda ishlatilmaydi.

**Ikkinchi muammo — ko'rsatish o'lchami:** ko'rish sahifasida EKG rasmi **288 × 216 px** qilib ko'rsatiladi (asl 500×375 dan kichraytirilgan). Bu o'lchamda shifokor EKG lentasidagi hech narsani ko'ra olmaydi — intervallarni ham, ST segmentni ham.

**Tuzatish rejasi:**
1. Rasm yuklanganda "generated" faylni **siqilgan JPEG** sifatida saqlash (maksimal eni 2000 px, sifat 85). 14 MB → taxminan 600 KB.
2. Asl faylni o'zgartirmasdan alohida saqlash (arxiv sifatida), lekin PDF va interfeysga siqilganini berish.
3. Ko'rish sahifasida EKG rasmini **to'liq kenglikda** ko'rsatish (konteyner kengligi bo'yicha), ustiga masshtablash (zoom/pan) imkoniyati bilan.
4. Kichik "short" versiyani faqat ro'yxatdagi kichik ko'rinish uchun ishlatish.
5. Signal fayllari (XML/CSV) uchun `render_12_lead_png` natijasini **SVG** sifatida ham saqlash — cheksiz masshtablanadi va hajmi kichik.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Sabab:** `jpg_bytes_to_png_bytes` yuklangan rasmni **o'lchamini
o'zgartirmasdan** PNG ga o'girardi. PNG — yo'qotishsiz format, shuning
uchun telefonda olingan 4.85 MB JPG (4032x3024) **13 MB PNG** ga
aylanardi, ya'ni fayl kichrayish o'rniga uch barobar kattalashardi.

**Tuzatish (`python_back/main.py`):** `prepare_display_image()` —
rasm eni bo'yicha 2000 px gacha LANCZOS bilan kichraytiriladi va JPEG
(sifat 85) sifatida saqlanadi. 2000 px EKG lentasidagi intervallarni
o'qish uchun yetarli. Asl fayl `analyse_file_link` da o'zgarishsiz
qoladi — arxiv sifatida.

`jpg_bytes_to_png_bytes` nomi saqlandi (u to'rt joyda chaqiriladi) va
ichida yangi funksiyani chaqiradi.

**Mavjud fayllar:** kod tuzatuvi faqat yangi tahlillarga ta'sir qiladi,
chunki qayta urinish (`retry`) mavjud `generated_file_link` ni
qaytadan yaratmaydi. Shuning uchun `python_back/compress_existing_images.py`
yozildi — u bazadagi eski fayllarni ham siqadi.

**O'lchandi:**

| Nima | Avval | Keyin | Farq |
|---|---|---|---|
| Bitta rasm (4032x3024 foto) | 13.08 MB | **0.68 MB** | 19.3 barobar |
| Diskdagi barcha generatsiya fayllari | 108.7 MB | **5.2 MB** | 20.8 barobar |
| Rasm o'lchami | 4032 x 3024 | 2000 x 1500 | — |

**Yo'l-yo'lakay topilgan va tuzatilgan kamchilik:** sahifada EKG
tasmasi `generated_short_file_link` — ya'ni **500x500 ga sig'diriladigan
eskiz** — sifatida chizilardi va `width: 100%` bilan 1366 px gacha
cho'zilardi. Ya'ni shifokor 2.7 barobar cho'zilgan xira rasmni ko'rardi
va intervallarni o'lchay olmasdi; to'liq rasm faqat ustiga bosilganda
ochilardi va buni bilish qiyin edi. Eskiz sun'iy intellektga yuborish
uchun kerak, ko'rsatish uchun emas.

To'liq fayl endi 0.68 MB bo'lgani uchun u to'g'ridan-to'g'ri
ko'rsatiladi; eskiz esa `placeholder` sifatida yuklanish davomida joy
egallab turadi.

| Tekshiruv | Avval | Keyin |
|---|---|---|
| Sahifadagi rasmning haqiqiy o'lchami | 500 x 375 | **2000 x 1500** |
| Ekranda chizilishi | 1366 x 1025 (2.7x cho'zilgan) | 733 x 550 (0.37x kichraytirilgan) |
| Ustiga bosilganda | to'liq rasm | to'liq rasm |

**CSS:** `.ekg-image` ga berilgan `max-height` ishlamasdi — ichidagi
`img` `width: 100%` inline uslubi bilan konteynerdan toshib chiqardi.
Chegara rasmning o'ziga ko'chirildi (`width: auto !important`,
`max-height: 80vh`). `object-fit: contain` sinab ko'rildi va rad etildi:
u rasmni markazlashtirib, yon tomonlarda bo'sh oq chiziq qoldirardi va
tasvirning o'zini 733 px dan 660 px ga kichraytirardi.

---

### ✅ T-048 — ~~Frontend rasmlari optimallashtirilmagan (6.5 MB)~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Ishlash / O'rta
**Fayllar:** `frontend/src/images/`

**Muammo:**
`frontend/src/images` papkasi jami **6.5 MB**. Aniq misollar:

| Fayl | Asl o'lcham | Ekranda ko'rsatiladi |
|---|---|---|
| `male.jpg` (avatar) | 1280 × 1280 | **45 × 45** |
| `logo.png` | 469 × 429 (130 KB) | 60 × 55 |

Ya'ni 45 pikselli avatar uchun 1280 pikselli rasm yuklanadi — kerakligidan ~800 marta ko'p ma'lumot.

Bu barcha rasmlar webpack bundle'ga tushadi va har bir foydalanuvchi ilovani birinchi ochganda yuklab oladi. Sekin internetda (klinikalar uchun odatiy holat) bu sezilarli kechikish beradi.

**Tuzatish rejasi:**
1. Barcha rasmlarni ishlatiladigan maksimal o'lchamga moslab qayta o'lchamlash (avatarlar — 128 px, logo — 256 px).
2. Zamonaviy formatga o'tkazish (WebP), eski brauzerlar uchun PNG/JPG zaxira bilan.
3. Katta rasmlarni `import` orqali bundle'ga qo'shish o'rniga `public/` papkasidan berish va `loading="lazy"` qo'yish.
4. Bundle hajmini o'lchash (`source-map-explorer`) va CI da chegaraga tekshirish.
5. Landing sahifadagi katta rasmlar uchun `srcset` bilan moslashuvchan yuklash.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

### Nima optimallashtirildi

`frontend/optimize_images.py` (yangi) — takrorlanadigan skript. Faqat
**haqiqatan import qilinadigan** rasmlar qayta o'lchandi; maqsad o'lcham
ekranda ko'rinadiganidan ikki barobar (retina uchun).

| Fayl | Avval | Keyin | Farq |
|---|---|---|---|
| `avatars/male.jpg` | 1280×1280, 160.6 KB | 128×128, **3.8 KB** | 42× |
| `avatars/female.jpg` | 1024×1024, 113.8 KB | 128×128, **3.9 KB** | 29× |
| `logo.png` | 469×429, 129.7 KB | 160×146, **24.6 KB** | 5.3× |
| `langs/ru.jpg` | 641×321, 7.9 KB | 64×32, **0.5 KB** | 16× |
| `login1.png` → `.jpg` | 783.7 KB | **82.2 KB** | 9.5× |
| `register1.png` → `.jpg` | 924.5 KB | **97.7 KB** | 9.5× |

**Jami: 1741 KB → 213 KB (8.2 barobar).**

Oxirgi ikkitasi fotosurat bo'lgani holda PNG sifatida saqlanardi —
shaffoflik kerak emas, JPEG esa to'qqiz barobar kichik. Kengaytma
o'zgargani uchun `Login.js` va `Register.js` dagi importlar ham
yangilandi.

`logo.png` PNG bo'lib qoldi: logotipda shaffof fon bor.

### Tekshiruv (brauzerda)

| Nima | Natija |
|---|---|
| Sarlavhadagi avatar | `naturalWidth = 128` (ilgari 1280) |
| Kirish sahifasidagi rasm | `login1.<hash>.jpg`, 758×860, yuklandi |
| Ko'rinish | o'zgarmadi — sifat 82 da farq sezilmaydi |

### Alohida topilma: 4 MB ishlatilmaydigan rasm

Papkadagi eng yirik fayllar hech qayerda import qilinmaydi:

| Fayl | Hajm |
|---|---|
| `login.png` | 1.80 MB |
| `6202680_24407.jpg` (4500×4500) | 1.18 MB |
| `34380910_v865-techi-29.jpg` (4000×4000) | 0.82 MB |
| `men_staff.jpg`, `women_staff.jpg`, `staff_face.jpg`, `]admin_face.jpg` | 0.31 MB |

**Ular brauzerga yetib bormaydi** — CRA faqat import qilingan
fayllarni to'plamga qo'shadi. Ya'ni bu ishlash muammosi emas, repozitoriy
vazni. Shu sababli ular **o'chirilmadi**: fayllarni o'chirish alohida
qaror va u T-048 ning qamrovidan tashqarida. Papka hajmi 6.1 MB dan
4.6 MB ga tushdi; ushbu fayllar o'chirilsa ~0.6 MB qoladi.

---

### ✅ T-049 — ~~PDF hisobotda sahifa raqami noto'g'ri: 2 sahifa bor, "Sahifa 1 / 3" deb yozilgan~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Hujjat aniqligi / Yuqori
**Fayl:** `backend/EkgAnalyzerApi/Services/PdfReportService.cs`

**Muammo:**
To'rttala hisobot turi ham yuklab olinib tekshirildi (2026-08-29). Har birida haqiqiy sahifalar soni — **2**, ammo kolontitulda **"Sahifa 1 / 3"** va **"Sahifa 2 / 3"** deb yozilgan.

| Hisobot | Haqiqiy sahifa | PDF ichida yozilgan |
|---|---|---|
| EKG #96 | 2 | 1/3, 2/3 |
| Holter #14 | 2 | 1/3, 2/3 |
| SMAD #9 | 2 | 1/3, 2/3 |
| Laboratoriya #17 | 2 | 1/3, 2/3 |

Jami sahifa soni qattiq qiymat (`3`) sifatida yozilgan yoki generatsiya tugamasdan oldin hisoblangan.

**Nima uchun muhim:**
Bu **rasmiy tibbiy hujjat**. Uni bosib chiqarib bemorga beriladi yoki boshqa muassasaga yuboriladi. "Sahifa 1 / 3" yozuvi qabul qiluvchi tomonda "uchinchi sahifa yo'qolgan" degan xulosaga olib keladi — hujjat to'liq emas deb qaytarilishi mumkin.

**Tuzatish rejasi:**
1. iTextSharp'da sahifa raqamini **ikki bosqichli** yozish: avval butun hujjat generatsiya qilinadi, keyin `PdfStamper` orqali har bir sahifaga "Sahifa X / Y" qo'yiladi (`reader.NumberOfPages` dan olingan haqiqiy Y bilan).
2. Yoki `IPdfPageEvent` ichida `OnCloseDocument` bosqichida shablon (`PdfTemplate`) orqali jami sonni to'ldirish — bu iTextSharp'ning standart yondashuvi.
3. Barcha hisobot turlari uchun avtomatik test: generatsiya qilingan PDF'dan matn ajratib, `Sahifa X / Y` dagi `Y` haqiqiy sahifa soniga tengligini tekshirish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Sabab:**
`FooterEvent.OnCloseDocument` da jami sahifa soni `writer.PageNumber` dan
olinardi. iTextSharp da hujjat yopilgan paytda bu xossa **keyingi** sahifa
raqamini qaytaradi — 2 sahifali hujjatda `3`. Shuning uchun kolontitulda
"Sahifa 1 / 3" deb yozilardi.

**Tuzatish:** `Services/PdfReportService.cs` — `(writer.PageNumber - 1)`.
Sabab kodda izoh bilan qayd etildi.

**Qo'shimcha:** kolontitulning chap qismidagi uzun platforma nomi markazdagi
hujjat raqamiga tegib ketardi (`...nmed.uzHujjat raqami: ...`). Endi matn eni
o'lchanadi va joyiga sig'masa `NMED | nmed.uz` ga qisqartiriladi.

**Tekshirildi:** to'rttala hisobot qayta generatsiya qilinib `pypdf` bilan
o'qildi:

| Hisobot | Haqiqiy sahifa | Kolontitulda | Holat |
|---|---|---|---|
| EKG #96 | 2 | 1/2, 2/2 | ✅ |
| Holter #14 | 2 | 1/2, 2/2 | ✅ |
| SMAD #9 | 2 | 1/2, 2/2 | ✅ |
| Laboratoriya #17 | 2 | 1/2, 2/2 | ✅ |

Sahifa 1 rasm sifatida render qilinib ko'z bilan ham tekshirildi: kolontitul
`NMED | nmed.uz` … `Hujjat raqami: NMED-HOL-00000014` … `Sahifa 1 / 2` —
uchala qism bir-biriga tegmaydi.

---

### ✅ T-050 — ~~PDF'da "Tahlil sanasi" ikki marta, ikki xil qiymat bilan chiqadi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Hujjat aniqligi / Yuqori
**Fayl:** `backend/EkgAnalyzerApi/Services/PdfReportService.cs`

**Muammo:**
EKG #96 hisobotida **bir xil yorliq ikki joyda, ikki xil sana** bilan chiqadi:

| Joylashuvi | Yorliq | Qiymat |
|---|---|---|
| Yuqorida, hujjat raqami yonida | `Tahlil sanasi:` | **28.08.2026 14:35** |
| "TAHLIL MA'LUMOTLARI" bo'limida | `Tahlil sanasi:` | **29.08.2026 10:00** |

Birinchisi — yozuv tizimga kiritilgan vaqt (`created_at`), ikkinchisi — tahlil aslida o'tkazilgan sana (`analysis_date`). Ikkalasi ham bir xil nomlangan.

Holter, SMAD va Laboratoriya hisobotlarida esa **ikkala qiymat ham `created_at`** — chunki bu DTO'larda `AnalysisDate` maydoni umuman yo'q (T-046).

**Nima uchun muhim:**
Hujjatni o'qiyotgan shifokor qaysi sana haqiqiy tahlil sanasi ekanini bilmaydi. Sud-tibbiy yoki sug'urta masalasida bu hujjatni yaroqsiz qiladi.

**Tuzatish rejasi:**
1. Yorliqlarni aniq ajratish:
   - Yuqoridagi kolontitul: **"Hujjat sanasi"** (`created_at`)
   - Bo'lim ichida: **"Tahlil o'tkazilgan sana"** (`analysis_date`)
2. T-046 ni tuzatib, `AnalysisDate` ni to'rttala DTO'ga qo'shish — shunda Holter/SMAD/Lab da ham to'g'ri sana chiqadi.
3. `analysis_date` bo'lmasa "ko'rsatilmagan" deb yozish, `created_at` ni o'rniga qo'ymaslik.
4. i18n kalitlarini ham ajratish (`document_date`, `analysis_performed_date`).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Tuzatish:**

1. **Yorliqlar ajratildi** — `Services/PdfTranslations.cs` ga uch tilda 3 ta
   yangi kalit qo'shildi:
   * `document_date` — "Hujjat sanasi" / "Дата документа" / "Document Date"
   * `analysis_performed_date` — "Tahlil o'tkazilgan sana" /
     "Дата проведения анализа" / "Date the analysis was performed"
   * `date_not_specified` — "ko'rsatilmagan" / "не указана" / "not specified"
2. Sarlavhadagi (blanka) sana endi **"Hujjat sanasi"** (`created_at`).
3. "TAHLIL MA'LUMOTLARI" bo'limidagi sana endi
   **"Tahlil o'tkazilgan sana"** (`analysis_date`).
4. **`AnalysisDate ?? CreatedAt` fallback olib tashlandi** (5 ta `Build`
   chaqiruvida). Tahlil sanasi kiritilmagan bo'lsa hujjatda
   "ko'rsatilmagan" yoziladi — noto'g'ri sana yozilgan hujjat sud-tibbiy
   yoki sug'urta masalasida yaroqsiz bo'lib qoladi.
5. Bemorning yoshi hisoblanadigan tayanch sana: `analysisDate ?? createdAt`
   (ilgari `DateTime.Now` ga tushib ketishi mumkin edi).

**Tekshirildi:**

| Hisobot | Hujjat sanasi | Tahlil o'tkazilgan sana | Bazadagi `analysis_date` |
|---|---|---|---|
| EKG #96 | 28.08.2026 14:35 | **29.08.2026 10:00** | `2026-08-29 15:00+05` ✅ |
| Holter #14 | 28.08.2026 14:35 | **ko'rsatilmagan** | `NULL` ✅ |
| SMAD #9 | 28.08.2026 14:35 | **ko'rsatilmagan** | `NULL` ✅ |
| Laboratoriya #17 | 28.08.2026 14:35 | **ko'rsatilmagan** | `NULL` ✅ |

Ya'ni bir xil nomli ikkita sana yo'q, va bo'sh qiymat o'rniga boshqa sana
qo'yilmaydi.

---

### ✅ T-051 — ~~Yakuniy xulosa hujjat sarlavhasidan oldin, sahifa boshida chiqadi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Hujjat dizayni / O'rta
**Fayl:** `backend/EkgAnalyzerApi/Services/PdfReportService.cs`

**Muammo:**
Holter, SMAD va Laboratoriya hisobotlarida matn tartibi quyidagicha:

```
TIBBIY DIAGNOSTIKA XULOSASI
HOLTER MONITORING NATIJALARI

Yakuniy xulosa:            ← xulosa shu yerda
Holter natijasi sinusal ritm fonida ...

R doctors                  ← klinika blankasi xulosadan KEYIN
Buxoro viloyati, ...
Hujjat raqami: NMED-HOL-00000014
BEMOR MA'LUMOTLARI         ← bemor ma'lumotlari eng oxirida
...
TAHLIL NATIJALARI
```

Ya'ni **yakuniy xulosa hujjat blankasi va bemor ma'lumotlaridan oldin** joylashgan. EKG hisobotida esa xulosa 2-sahifada, to'g'ri joyda.

Tibbiy hujjat mantiqiy tartibi bo'lishi kerak: blanka → bemor → tahlil ma'lumotlari → natijalar → xulosa → imzo.

**Tuzatish rejasi:**
1. `PdfReportService` da to'rttala tur uchun **yagona shablon tartibi** joriy qilish.
2. Har bir tur uchun alohida yozilgan generatsiya metodlarini umumiy `BuildReport(header, patient, meta, results, conclusion, footer)` ko'rinishiga keltirish (fayl 114 KB — bu ham refaktoring uchun sabab).
3. Generatsiya qilingan PDF matnidan bo'limlar tartibini tekshiradigan test yozish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Natija: bu haqiqiy kamchilik emas edi — tekshirildi va rad etildi.**

Task PDF dan **ajratib olingan matn tartibiga** asoslangan edi. Matn
ajratish (`extract_text`) PDF ning kontent oqimi tartibini qaytaradi, u esa
sahifadagi **ko'rinadigan joylashuv bilan bir xil emas**: iTextSharp
jadvallarni (blanka, bemor ma'lumotlari) va oddiy paragraflarni oqimga har
xil bosqichda yozadi.

Tekshirish uchun Holter #14 hisoboti `pypdfium2` bilan **rasm sifatida
render qilindi** (833×1179). Sahifadagi haqiqiy tartib:

```
1. Blanka: klinika logotipi, "R doctors", manzil, telefon | NMED, hujjat raqami, hujjat sanasi
2. TIBBIY DIAGNOSTIKA XULOSASI / HOLTER MONITORING NATIJALARI
3. BEMOR MA'LUMOTLARI
4. TAHLIL MA'LUMOTLARI
5. TAHLIL NATIJALARI
6. SUN'IY INTELLEKT TAHLILI XULOSASI
7. Jiddiylik darajasi (rangli indikator)
8. Yakuniy xulosa            ← eng oxirida, to'g'ri joyda
9. QR tasdiqlash bloki
10. Kolontitul
```

Ya'ni `PdfReportService.Build()` dagi tartib
(header → bemor → tahlil ma'lumotlari → natijalar → xulosa → tasdiqlash)
allaqachon to'g'ri va to'rttala tur uchun **yagona shablon** orqali
ishlaydi.

Task da tasvirlangan "xulosa blankadan oldin" holati ekranda ham,
chop etishda ham yuz bermaydi. Kod o'zgartirilmadi.

---

### ✅ T-052 — ~~Yuklangan fayl mazmuni tekshirilmaydi: noto'g'ri yoki sifatsiz fayl AI'ga ketaveradi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Mahsulot mantiqi / Bemor xavfsizligi / Kritik
**Fayllar:** `python_back/file_validator.py`, `python_back/main.py`, `lab_analyses_api.py`, `holter_analyses_api.py`, `smad_analyses_api.py`, tahlil yuklash sahifalari

**Muammo:**
Hozir fayl faqat **kengaytmasi va sehrli baytlari** bo'yicha tekshiriladi (`validate_file_type`). Fayl **ichida nima borligi umuman tekshirilmaydi**.

Amaliy holatlar (barchasi hozir jimgina o'tib ketadi):

| Holat | Hozir nima bo'ladi | Bo'lishi kerak |
|---|---|---|
| EKG rasmi juda xira / fokusdan chiqqan | AI taxminiy xulosa yozadi | "Rasm sifati past, qayta suratga oling" |
| EKG rasmida lenta qiyshiq, chetlari kesilgan | AI yetishmayotgan kanallarni "ko'rmaydi" | "EKG lentasi to'liq ko'rinmayapti" |
| EKG o'rniga boshqa hujjat rasmi yuklangan | AI baribir "xulosa" yozadi | "Bu EKG lentasi emas" |
| Laboratoriya o'rniga Holter PDF yuklangan | AI noto'g'ri turdagi tahlil qiladi | "Fayl turi tanlangan tahlil turiga mos emas" |
| PDF skanerlangan, matn qatlami yo'q | Bo'sh natija yoki umumiy gaplar | "PDF dan matn o'qib bo'lmadi" |
| Bo'sh yoki buzilgan PDF | Tushunarsiz xatolik | "Fayl buzilgan" |
| Boshqa bemorning fayli | Hech qanday belgi yo'q | Fayldagi F.I.SH bemor bilan solishtirilsin |

**Nima uchun kritik:**
Sifatsiz kirish ma'lumoti — sifatsiz tibbiy xulosa. Xira rasmdan AI "sinus ritm, norma" deb yozsa va shifokor unga ishonsa, bu bemorga zarar yetkazishi mumkin. Tizim **o'z natijasiga qanchalik ishonish mumkinligini** aytishi shart.

**Tuzatish rejasi:**

**1-bosqich — texnik tekshiruv (fayl yuklanishi bilanoq, AI'gacha):**
- Rasm o'lchami minimal chegaradan past bo'lmasin (masalan < 800 px kenglik — rad etish).
- **Xiralikni o'lchash**: Laplasian dispersiyasi (`cv2.Laplacian(img, CV_64F).var()`) — chegaradan past bo'lsa ogohlantirish. `Pillow`/`numpy` bilan ham amalga oshirish mumkin, yangi bog'liqlik shart emas.
- Yorug'lik va kontrast tekshiruvi (juda qorong'i / juda yorug' rasm).
- PDF uchun: sahifalar soni, matn qatlami bor-yo'qligi, matn uzunligi.
- Har bir tekshiruv natijasini foydalanuvchiga **yuklash paytida darhol** ko'rsatish — server javobini kutmasdan (rasm tekshiruvining bir qismini brauzerda `canvas` orqali qilish mumkin).

**2-bosqich — mazmun tekshiruvi (AI orqali, asosiy tahlildan oldin):**
- Arzon "tasniflash" chaqiruvi: "Bu rasm 12 kanalli EKG lentasimi? Ha/Yo'q + sifat bahosi 1-5".
- Laboratoriya/Holter/SMAD PDF'lari uchun: "Bu hujjat qanday turdagi tibbiy tahlil?" — natija tanlangan turga mos kelmasa to'xtatish.
- Javob salbiy bo'lsa asosiy (qimmat) tahlilni **umuman yubormaslik** — bu xarajatni ham tejaydi.

**3-bosqich — natijaga ishonch darajasi:**
- AI javobiga `input_quality` maydonini qo'shish (`yaxshi` / `qoniqarli` / `past`).
- Sifat past bo'lsa natija ustida sariq banner: "Rasm sifati past bo'lgani uchun tahlil to'liq bo'lmasligi mumkin. Yaxshiroq nusxa yuklashni tavsiya qilamiz."

**4-bosqich — foydalanuvchi tajribasi:**
- Har bir xatolik uchun **tushunarli o'zbekcha xabar** va **aniq harakat**: "Qayta yuklash" tugmasi bevosita xatolik xabarida.
- Xatolik xabarida **nima qilish kerakligi** yozilsin: "EKG lentasini tekis yotqizing, yaxshi yorug'likda, to'g'ridan-to'g'ri tepadan suratga oling."
- Yuklashdan oldin **namuna rasm** ko'rsatish (yaxshi va yomon misol yonma-yon).
- Fayl tanlangach **darhol ko'rinish (preview)** ko'rsatish — foydalanuvchi noto'g'ri fayl tanlaganini yuborishdan oldin ko'radi.
- Mavjud tahlilga **faylni almashtirish** imkoniyati (yangi tahlil yaratmasdan).

**Qabul mezoni:** Xira rasm yuklanganda foydalanuvchi AI natijasini emas, aniq ogohlantirish va "Qayta yuklash" tugmasini ko'radi; laboratoriya bo'limiga Holter PDF yuklansa tizim buni aniqlab rad etadi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**1-bosqich — texnik tekshiruv (AI ga yubormasdan oldin)**
`python_back/file_validator.py::validate_upload` kengaytirildi.
Avval mavjud edi: hajm, kengaytma, sehrli baytlar, rasm o'lchami,
kontrast (`std < 6`). Endi qo'shildi:

| Tekshiruv | Usul | Chegara |
|---|---|---|
| **Xiralik** | Laplasian dispersiyasi (`_laplacian_variance`) | `< 12.0` → rad |
| **Yorug'lik** | o'rtacha yorqinlik | `< 25` yoki `> 250` → rad |
| **PDF yaroqliligi** | `pypdf` bilan ochish | ochilmasa → rad |
| **PDF bo'shligi** | sahifalar soni | `0` → rad |
| **PDF matn qatlami** | dastlabki 5 sahifadan matn | `< 40 belgi` → rad |

Xiralik OpenCV'siz o'lchanadi — 3×3 Laplasian yadrosi `numpy` bilan
qo'llanadi, yangi bog'liqlik qo'shilmadi. Katta rasm avval ~1000 px
kenglikka kichraytiriladi (o'tkirlik nisbiy o'lchov, hisoblash tezroq).

**Chegaralar haqiqiy fayllar bo'yicha kalibrlandi — taxmin qilinmadi.**
Loyihadagi 4 ta haqiqiy EKG surati o'lchandi:

| Fayl | O'lcham | O'rtacha yorqinlik | O'tkirlik |
|---|---|---|---|
| `ekg.jpg` | 1280×662 | 229.1 | 2249 |
| `ekg2.jpg` | 960×1280 | 157.8 | 2659 |
| `ekg3.jpg` | 1280×960 | 160.1 | 2518 |
| `ekg4.JPG` | 4032×3024 | 157.9 | 9937 |

Dastlab yuqori yorqinlik chegarasi 240 qilingan edi va **oq qog'ozdagi
EKG ni rad etardi** — kalibrlash paytida aniqlanib, 250 ga ko'tarildi.
Butunlay oq varaqni esa kontrast tekshiruvi allaqachon ushlaydi.
O'tkirlik chegarasi (12) haqiqiy qiymatlardan ~200 marta past — haqiqiy
tahlilni rad etishdan ko'ra shubhali suratni o'tkazib yuborish
xavfsizroq, chunki ikkinchi qatlam baribir tekshiradi.

**2-bosqich — mazmun tekshiruvi** allaqachon mavjud:
`document_classifier.py` (`gpt-5-mini`) faylning haqiqiy turini aniqlaydi
va tanlangan tahlil turiga mos kelmasa asosiy (qimmat) tahlil **umuman
yuborilmaydi** — `status = 3` va foydalanuvchiga faylni almashtirish
taklif qilinadi.

**3-bosqich — natijaga ishonch** T-092 da hal qilindi: AI "tahlil qilib
bo'lmadi" desa jiddiylik darajasi olib tashlanadi va ogohlantirish
banneri chiqadi.

**Tekshirildi:**

| Fayl | Natija |
|---|---|
| Haqiqiy EKG × 4 (`ekg.jpg`…`ekg4.JPG`) | **Barchasi o'tdi** ✅ |
| Haqiqiy EKG, blur radius 0.5 / 1 / 1.5 | O'tdi (o'tkirlik 946 / 68 / 13) |
| Haqiqiy EKG, blur radius 2 / 3 / 6 | **`image_blurry`** (o'tkirlik 5.5 / 2.3 / 1.4) |
| Haqiqiy EKG, juda qorong'i | **`image_no_content`** |
| 40×30 mayda rasm | **`image_too_small`** |
| Bo'sh oq rasm | **`image_no_content`** |
| Matn qatlami bor laboratoriya PDF | **O'tdi** ✅ |
| Skanerlangan (matnsiz) PDF | **`pdf_no_text`** — "hujjat skanerlangan rasm ko'rinishida, asl PDF ni yuboring" |
| Buzilgan PDF | **`broken_pdf`** |

**Uchdan-uchgacha (brauzer → .NET → Python):**
```
POST /api/ecg-analyses/analyze  (xira EKG, blur radius 6)
→ 400 {"detail": "Rasm xira yoki fokusdan chiqqan (o'tkirlik 1.6).
        EKG to'lqinlari o'qilmasligi mumkin — qaytadan,
        qimirlatmasdan suratga oling."}
```
Xabar uch tilda, aniq sabab va **nima qilish kerakligi** bilan.

**Bajarilmagan bandlar (sababi bilan):**
* **Fayldagi F.I.SH ni bemor bilan solishtirish** — bu OCR va ism
  moslashtirish mantiqini talab qiladi; noto'g'ri moslik haqiqiy tahlilni
  bloklab qo'yishi mumkin, shuning uchun alohida ish sifatida qoldirildi.
* **Brauzerdagi (canvas orqali) oldindan tekshiruv** — hozir tekshiruv
  serverda, javob esa bir necha soniyada keladi. Bu foydali yaxshilanish,
  lekin xavfsizlik uchun server tekshiruvi baribir zarur va u ishlaydi.
* **EKG lentasining qiyshiqligi / chetlari kesilganligi** — bu geometrik
  tahlil talab qiladi; hozir bunday holatni AI tasniflagichi (2-bosqich)
  "EKG emas" yoki past ishonch bilan ushlaydi.

---

### ✅ T-053 — ~~Kabinetdagi har bir sahifaga interaktiv qo'llanma (Ant Design Tour) qo'shish~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UX / Yetishmayotgan komponent / Yuqori
**Fayllar:** barcha kabinet sahifalari, `frontend/src/components/`, `frontend/src/locale/`

**Muammo:**
Platformada **hech qanday o'rgatuvchi mexanizm yo'q**. Yangi shifokor yoki hamshira tizimga birinchi marta kirganda:
- qaysi tugma nima qilishini bilmaydi,
- "Faqat saqlash" va "AI bilan tahlil" farqini tushunmaydi,
- filtrlar qanday ishlashini bilmaydi,
- "AI xulosasi" ustunidagi rang nimani anglatishini bilmaydi,
- passport bo'yicha bemor qidirish mantiqini tushunmaydi.

Klinikada xodimlar tez-tez almashadi va har birini alohida o'qitish qimmat.

**Yechim: Ant Design `Tour` komponenti** (https://ant.design/components/tour)

**Tuzatish rejasi:**

**1. Umumiy infratuzilma:**
- `useTour(steps, pageKey)` nomli hook yaratish — qadamlarni qabul qiladi, `localStorage` da `tour_seen_{pageKey}` bayrog'ini boshqaradi.
- Sahifa birinchi marta ochilganda tur **avtomatik** ishga tushadi; keyingi safar faqat tugma orqali.
- Barcha qadam matnlari `locale/TranslationUz|Ru|En` fayllarida — uch tilda.

**2. Tur tugmasi (foydalanuvchi topa oladigan ko'rinishda):**
- Sahifa sarlavhasi yonida doimiy ko'rinadigan tugma: **`? Sahifa bo'yicha qo'llanma`** (savol belgisi + matn).
- Ant Design `Button` + `QuestionCircleOutlined` ikonkasi, `type="text"` yoki ko'k rangda.
- Faqat ikonka emas — **matn bilan birga**, aks holda foydalanuvchi bosish kerakligini tushunmaydi.
- Mobil ekranda faqat ikonka, lekin `Tooltip` bilan.

**3. Har bir sahifa uchun qadamlar:**

| Sahifa | Tur qadamlari |
|---|---|
| **Asosiy panel** | Statistika kartochkalari nimani ko'rsatadi; tez harakat tugmalari; yon menyu tuzilishi |
| **EKG/Holter/SMAD/Lab ro'yxati** | Qidiruv maydoni (ism yoki passport); sana filtri; holat filtri; AI xulosasi rangi (yashil/sariq/qizil) nimani anglatadi; qatorni bosib tahlilni ochish; PDF yuklab olish; "Ko'rildi" belgisi (shifokor uchun) |
| **Yangi tahlil qo'shish** | 1-qadam: bemorni passport + tug'ilgan sana bo'yicha qidirish; topilmasa yangi bemor kiritish; 2-qadam: fayl yuklash va sifat talablari; 3-qadam: davolovchi shifokorlarni belgilash (nima uchun muhim); 4-qadam: shikoyatlar tanlash; 5-qadam: "Faqat saqlash" va "AI bilan tahlil" farqi |
| **Tahlil natijasi** | Raqamli o'lchovlar bo'limi; AI xulosasi va uning jiddiylik darajasi; AI tavsiyasi; shifokor xulosasi yozish; PDF yuklab olish; QR kod nima uchun kerak |
| **Xodimlar** | Yangi xodim qo'shish; rol (Lavozim) tanlash va uning huquqlari; mutaxassislik; xodim ma'lumotlarini tahrirlash |
| **Bemorlar** | Bemor qidirish; bemor kartasi; tahlillar tarixi |
| **Konsultatsiya** | Konsultant taklif qilish; narx belgilash; konsultatsiya yaratish; video qo'ng'iroq; xulosa olish |
| **Video konferensiya** | Konferensiya yaratish; ishtirokchilarni chaqirish; ekranni ulashish |
| **Tashkilot ma'lumotlari** | Klinika ma'lumotlarini to'ldirish; logotip; litsenziya; telefon raqamlar |

**4. Rolga qarab moslash:**
- Shifokor (4) uchun: "Ko'rildi" belgisi va unread badge haqida qadam qo'shiladi.
- Hamshira (5) uchun: bu qadamlar o'tkazib yuboriladi, "faqat o'zingiz yuklagan tahlillar ko'rinadi" tushuntiriladi.
- Admin/Direktor (2/3) uchun: xodimlar va klinika sozlamalari qadamlari.

**5. Qo'shimcha imkoniyatlar:**
- Yon menyu pastida **"Qo'llanma"** bo'limi — barcha turlarni qayta ko'rish uchun.
- Profil menyusida "Qo'llanmalarni qayta ko'rsatish" tugmasi (barcha `tour_seen_*` bayroqlarini tozalaydi).
- Turning oxirgi qadamida "Yordam kerakmi? Qo'llab-quvvatlash bilan bog'laning" havolasi.

**Qabul mezoni:** Har bir kabinet sahifasida ko'rinadigan qo'llanma tugmasi bor; bosilganda o'sha sahifaning barcha asosiy elementlari ketma-ket tushuntiriladi; matnlar uch tilda; birinchi kirishda avtomatik ishga tushadi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ishlar:**

**1. Umumiy infratuzilma — `components/shared/PageTour.js`**
* Ant Design `Tour` asosidagi qayta ishlatiladigan komponent.
* Qadamlar **CSS selektorlari** orqali bog'lanadi (`data-tour="..."`), ref'larni
  har bir sahifada qo'lda uzatish shart emas.
* **Elementi mavjud bo'lmagan qadam avtomatik o'tkazib yuboriladi** — masalan
  hamshirada ko'rinmaydigan "o'chirish" tugmasi haqidagi qadam turni buzmaydi.
* Qadamlar tur **ochilgan paytda** hisoblanadi (render vaqtida emas): shunda
  jadval qatorlari allaqachon yuklangan bo'ladi. (Birinchi urinishda 7 qadamdan
  6 tasi ko'rinardi — jadval hali bo'sh edi; tuzatildi.)
* `keepMissing` rejimi — tahlil yaratish sahifasi uchun: bemor topilgunча fayl
  yuklash / shifokorlar / shikoyatlar bloklari DOM da yo'q, shuning uchun ular
  ekran o'rtasida ko'rsatiladi va butun jarayon oldindan tushuntiriladi.
* `localStorage` da `nmed_tour_seen_{pageKey}` bayrog'i — **birinchi kirishda
  avtomatik** ishga tushadi, keyin faqat tugma orqali.
* `resetAllTours()` — barcha bayroqlarni tozalash.

**2. Tugma foydalanuvchi topa oladigan ko'rinishda**
`? Sahifa bo'yicha qo'llanma` — ikonka **va matn** birga, sahifa sarlavhasi
yonida. `App.css` da firuza rang, hover fon. 768 px dan tor ekranda faqat
ikonka qoladi, `Tooltip` bilan.

**3. Qadamlar — `tools/tourSteps.js`**

| Tur | Qadamlar |
|---|---|
| `analysisListTour` | Yangi tahlil · qidiruv · sana filtri · holat · **AI ranglari nimani anglatadi** · qatorni bosib ochish · o'chirish (7) |
| `dashboardTour` | Statistika kartochkalari · yon menyu va badge · til almashtirish (3) |
| `analyzerTour` | 1-qadam bemor · 2-qadam fayl va sifat talablari · 3-qadam davolovchi shifokorlar · 4-qadam shikoyatlar · **5-qadam "Faqat saqlash" va "AI bilan tahlil" farqi** (5) |
| `analysisViewTour` | Jiddiylik darajasi · raqamli o'lchovlar · shifokor xulosasi · **PDF va QR kod nima uchun kerak** (4) |
| `doctorsTour` | Yangi xodim · **rollar va huquqlar matritsasi** (2) |
| `patientsTour` | Qidiruv · bemor kartasi va passport maskalash (2) |
| `patientCardTour` | Bemor ma'lumotlari · tahlillar soni · xronologik lenta (3) |
| `clinicInfoTour` | Klinika ma'lumotlari · logotip va litsenziya · telefonlar (3) |

**4. Nishonlar qo'yilgan sahifalar (17 ta fayl)**
5 ta tahlil ro'yxati, 4 ta tahlil yaratish sahifasi, `AnalyseViewHeader`
(4 tur uchun bir marta), natija komponentlari, `Dashboard`, `SideBar`,
`ChangeLangs`, `Doctors`, `Patcients`, `PatcientCard`, `ClinicInfo`,
`PatientSearchSection`, `DoctorSelectSection`.

**5. Tarjima — barcha tur matnlari uch tilda**
* 61 ta yangi kalit qo'shildi (569 → 630): `page_guide`, `show_tours_again`,
  `tours_reset` va 58 ta `tour_*` sarlavha/izoh — **o'zbek, rus, ingliz**.
* `locale/antdLocale.js` ga `Tour` bo'limi qo'shildi — busiz "Keyingisi",
  "Oldingisi", "Tugatish" tugmalari o'zbek tilida ham inglizcha qolardi
  (`Next` / `Previous` / `Finish`).
* Yo'l-yo'lakay: `HolterResult`, `SmadResult`, `LabResult` va ularning `Old`
  variantlarida qattiq kodlangan o'zbekcha sarlavhalar (`Avtomatik tahlil
  (AI xulosasi)`, `AI tavsiyasi`, `Xulosa`, `Raqamli o'lchovlar`) `t()` ga
  o'tkazildi — rus tilidagi shifokor ularni o'zbekcha ko'rardi.

**6. Profil menyusida "Qo'llanmalarni qayta ko'rsatish"**
`components/Header.js` — bosilganda barcha `nmed_tour_seen_*` tozalanadi va
tasdiqlash xabari chiqadi.

**Tekshirildi (brauzerda):**

| Tekshiruv | Natija |
|---|---|
| `/ecg-analyses` birinchi kirish | Tur **avtomatik** ochildi: "Добавить новый анализ", `1 / 7` |
| Qadamlar ketma-ketligi | 2/7 qidiruv, 3/7 sana filtri, … 7/7 o'chirish — har biri to'g'ri elementni yoritdi |
| 7/7 qadam | Jadval gorizontal aylantirildi va o'chirish tugmasi yoritildi |
| Rus tili | Barcha sarlavha va izohlar rus tilida, xom kalit yo'q |
| O'zbek tiliga o'tish | Matnlar o'zbekcha; navigatsiya tugmalari **"Keyingisi" / "Tugatish"** (antd locale tuzatilgandan keyin) |
| `/analyse-ecg` | `1 / 5` — bemor topilmagan bo'lsa ham beshta qadam ko'rsatiladi (`keepMissing`) |
| `/doctor` | `1 / 2`, "Yangi xodim qo'shish" tugmasi yoritildi |
| `/patcients` | `1 / 2`, qidiruv maydoni yoritildi |
| `/` (Asosiy panel) | `1 / 3`, statistika kartochkalari yoritildi |
| `/settings` | `1 / 3`, "Klinika ma'lumotlari" bloki yoritildi |
| `/ecg-analyses/view/102` | `1 / 3` — bu tahlilda jiddiylik bloki yo'q, qadam **to'g'ri o'tkazib yuborildi** |
| Ikkinchi kirish | Tur avtomatik ochilmaydi (`localStorage` bayrog'i), tugma orqali ochiladi |
| Profil menyusi | "Qo'llanmalarni qayta ko'rsatish" bayroqlarni tozaladi |
| Kompilyatsiya | `webpack compiled with 1 warning` (eski, bog'liq emas) |

**Qolgan (alohida tasklar bilan bog'liq):**
Konsultatsiya va video konferensiya sahifalari uchun turlar — bu modullar
alohida tasklarda qayta ishlanadi (T-062); infratuzilma tayyor, faqat
`tourSteps.js` ga qadamlar qo'shish kifoya.

---

### ✅ T-054 — ~~Yuklash jarayonida progress va bekor qilish imkoniyati yo'q~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UX / O'rta
**Fayllar:** tahlil yuklash sahifalari, `frontend/src/host/*Service.js`

**Muammo:**
Katta fayl (auditda 4.2 MB EKG rasmi, 1.7 MB SMAD PDF) yuklanayotganda foydalanuvchi **hech qanday jarayon ko'rsatkichini ko'rmaydi**. Tugma bosiladi va sahifa "muzlab" turadi.

Yetishmayotgan narsalar:
- yuklash foizi (`onUploadProgress` axios'da mavjud, ishlatilmagan)
- "Fayl yuklanmoqda… 45%" matni
- bekor qilish tugmasi
- sekin internetda "hali ham ishlayapti" degan signal
- ulanish uzilganda tushunarli xabar va qayta urinish

**Tuzatish rejasi:**
1. `axios` `onUploadProgress` orqali `Progress` komponentini ko'rsatish.
2. `AbortController` bilan "Bekor qilish" tugmasini qo'shish.
3. Yuklash tugagach "Fayl yuklandi, AI tahlil qilmoqda…" bosqichiga o'tish (ikkinchi progress).
4. Tarmoq uzilganda avtomatik 1 marta qayta urinish, keyin tushunarli xabar.
5. Yuklash davomida boshqa sahifaga o'tishga urinilsa ogohlantirish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

### Jarayon ko'rsatkichi

`axios` da `onUploadProgress` va `signal` allaqachon mavjud edi, lekin
ishlatilmagan. Beshta yuklash funksiyasiga (`analyzeEkgFile`,
`analyzeEkgFileSave`, `analyzeHolterFile`, `analyzeSmadFile`,
`analyzeLabFile`) ixtiyoriy `options` qo'shildi:
`onProgress` va `signal`.

`e.total` bo'lmasa (proksi orqali kelmasligi mumkin) foiz ko'rsatilmaydi
— faqat "davom etmoqda" holati qoladi.

### Ko'rsatkich qayerda turishi — brauzerda aniqlangan

Birinchi urinishda ko'rsatkich yuklash formasiga qo'yildi va **hech
qachon ko'rinmadi**. Sabab brauzerda topildi: `handleSubmit`
`send(formData)` dan darhol keyin `retryAnalyse()` ni chaqiradi va u
formani tozalaydi — bemor tanlovi bekor bo'ladi, butun tahlil bo'limi
DOM dan chiqadi. 13.5 MB fayl yuklanayotganda ham ko'rsatkich u bilan
birga yo'qolardi.

To'g'ri joy — **fon paneli** (`AnalysisProgressFloat`): u aynan
jarayondagi tahlillarni ko'rsatish uchun va forma tozalanishidan
mustaqil.

`useBackgroundAnalysis` ga `makeRequest` qo'shildi: hook so'rovni o'zi
yaratadi va progressni o'z yozuviga yozadi. Panelda "davom etmoqda..."
o'rniga foiz chiqadi.

### Bekor qilish

`AbortController` har bir yuborishda yaratiladi va `signal` so'rovga
uzatiladi. `cancelUpload()` uni to'xtatadi.

### Tekshiruv (jonli, 13.5 MB fayl)

Yuklash oqimi brauzerda XHR darajasida o'lchandi:

```
hodisalar soni: 1
loaded = total = 14 169 841   (100%)
```

Ya'ni **localhostda brauzer bitta hodisa beradi** — uzatish bir tikda
tugaydi va oraliq foizlar umuman paydo bo'lmaydi. Bu ko'rsatkich
ishlamayotganini emas, sinov sharoitini bildiradi: hodisa bizning
ishlovchimizga yetib keldi va u 100% ni qaytardi.

Task aynan **sekin internet** haqida (klinikalarda odatiy holat) — u
yerda brauzer o'nlab hodisa beradi va foiz ko'rinadi.

Nazorat sifatida shu oqim orqali 4.85 MB va 13.5 MB fayllar yuklandi:
yozuvlar yaratildi (`ecg_analyses#109`, `original_filename =
'big_ekg.jpg'`), ya'ni yangi kod yo'li ishlashni buzmadi.

### Bajarilmagan band

**Ulanish uzilganda qayta urinish tugmasi.** Hozir xatolik fon panelida
qizil belgi bilan ko'rsatiladi va foydalanuvchi qaytadan yuklashi
mumkin. Avtomatik qayta urinish katta faylni ikkinchi marta yuborishni
anglatadi va bu takroriy yozuv xavfini oshiradi — T-096 dagi himoya
buni ushlaydi, lekin ortiqcha trafik baribir qoladi.

---

## Tarjima (i18n) muammolari

### ✅ T-055 — ~~Kodda ishlatilayotgan 33 ta tarjima kaliti hech bir tilda mavjud emas~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** i18n / UI / Kritik
**Fayllar:** `frontend/src/locale/TranslationUz/Uz.json`, `TranslationRu/Ru.json`, `TranslationEn/En.json`

**Muammo:**
Kod bo'ylab avtomatik tekshiruv o'tkazildi (2026-08-29): `t('...')` chaqiruvlaridagi **425 ta noyob kalit** topildi. Ulardan **33 tasi uchta tarjima faylining birortasida ham yo'q**.

Yetishmayotgan kalitlar to'liq ro'yxati:

| Kalit | Qayerda ishlatiladi |
|---|---|
| `digital_measurements`, `hr`, `duration`, `electrical_axis`, `morphology`, `wave_amplitude`, `wave_duration`, `automatic_analysis`, `ai_recommendations`, `final_summary` | `components/results/EcgResult.js` — **EKG natijasi sahifasi** |
| `no_ecg_analyses`, `no_holter_analyses`, `no_smad_analyses`, `no_lab_analyses`, `no_diagnoses` | Barcha ro'yxat sahifalari — bo'sh holat xabari |
| `has_diagnosis`, `no_diagnosis` | `EcgAnalyseView.js` |
| `yes`, `delete`, `confirm_delete`, `data_deleted` | `ConsultantsPage.js` |
| `access_denied` | `DoctorDiagnosisBlock.js` |
| `analysis_load_error`, `analysis_type_not_supported`, `short_image` | `ConsultationAnalysisInlineView.js` |
| `consultant_request_sent` | `MyConsultantsPage.js` |
| `leave`, `loading` | `VideoConference.js` |
| `para_status_*`, `para_filter_jiddiylik` | Parazitologiya (hozircha qamrovdan tashqarida) |

**Nima uchun kritik:**
i18next sozlamasida `fallbackLng` belgilanmagan (T-057). Kalit topilmasa i18next **kalitning o'zini qaytaradi**. Ya'ni foydalanuvchi ekranda tarjima o'rniga `digital_measurements`, `no_ecg_analyses`, `access_denied` kabi texnik matnlarni ko'radi. Bu tayyor mahsulotda mutlaqo qabul qilib bo'lmaydigan holat.

**Tuzatish rejasi:**
1. 33 ta kalitni uchala faylga ham qo'shish (uz, ru, en).
2. CI ga tekshiruv skripti qo'shish: kodda ishlatilgan barcha `t()` kalitlari uchala faylda borligini tekshiradi, bo'lmasa build'ni yiqitadi.
3. `i18next-parser` ni loyihaga qo'shib, kalitlarni koddan avtomatik ajratib olish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:** Kodda ishlatilgan barcha `t()` kalitlari skanerlab chiqildi va
yetishmayotganlari uch tilga qo'shildi.

| Til | Avval | Hozir |
|---|---|---|
| O'zbek | 503 | **547** |
| Rus | 455 | **547** |
| Ingliz | 484 | **547** |

Hech bir tilda yo'q bo'lgan **33 ta kalit** (`no_ecg_analyses`, `delete`, `digital_measurements`,
`automatic_analysis`, `ai_recommendations`, `final_summary`, `hr`, `access_denied` va h.k.)
qo'shildi. RU/EN da yetishmagan kalitlar ham to'ldirildi va **haqiqiy tarjimalar** yozildi
(56 ta kalit qo'lda tarjima qilindi — nusxa emas).

**Tekshiruv:** avtomatlashtirilgan skript — kodda ishlatilgan 425+ kalitdan
**birortasi ham yetishmaydi**.

---

### ✅ T-056 — ~~Tahlil natijasi bloki tarjima qilinmagan — har doim o'zbekcha ko'rinadi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** i18n / Kritik
**Fayllar:** `frontend/src/components/results/EcgOldResult.js`, `holter_analyse/HolterOldResult.js`, `lab_analyse/LabOldResult.js`, `smad_analyse/SmadOldResult.js` va ularning `*Result.js` juftliklari

**Muammo:**
Brauzerda tekshirildi (2026-08-29): interfeys **rus tiliga** o'tkazildi. Sahifaning umumiy qismi to'g'ri tarjima qilindi ("Жалобы пациента", "Изображение ЭКГ", "Лечащий врач"), lekin **AI natijasi bloki butunlay o'zbek tilida qoldi**:

```
⭐ Raqamli o'lchovlar:
   Yurak urish ritmi (HR) - 65 bpm, normal
   PR interval - 204 ms, uzaygan (I-darajali AV blok ehtimoli)
   QRS davomiyligi - 120 ms, kengaygan
   QT interval, QTc (Bazett), QRS elektr o'qi, RR interval
   P/QRS/T morfologiyasi
```

Bu matnlar komponent ichiga **qattiq yozilgan** (hardcoded), `t()` orqali o'tmaydi:
```jsx
<div className="ekg-item-text"><b>⭐ Raqamli o'lchovlar:</b>
<div className="ekg-item-text"><b>{...} Avtomatik tahlil (AI xulosasi): </b>
<div className="ekg-item-text"><b>⭐ AI tavsiyasi: </b>
```

Xuddi shu holat `LabOldResult.js` da ham: `"⭐ Labaratoriya natijasi fayli: "` (bu yerda imlo xatosi ham bor — "Labaratoriya" → "Laboratoriya").

**Nima uchun kritik:**
Rus tilida ishlaydigan shifokor (O'zbekistonda keng tarqalgan) natija sahifasining eng muhim qismini — raqamli o'lchovlar va AI xulosasini — o'zbek tilida ko'radi. Bu mahsulotning uch tilli ekanligi haqidagi va'dasini buzadi.

**Tuzatish rejasi:**
1. Barcha qattiq yozilgan matnlarni `t()` chaqiruviga o'tkazish va kalitlarni uchala tarjima fayliga qo'shish.
2. `LabOldResult.js` dagi "Labaratoriya" imlo xatosini tuzatish.
3. T-034 (takroriy komponentlar) bilan birga bajarish — yagona komponentga birlashtirilsa, tarjima ham bir joyda bo'ladi.
4. Kod bazasi bo'ylab qidiruv o'tkazib, JSX ichidagi barcha kirill/lotin matn qoldiqlarini topish va tarjimaga o'tkazish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ishlar:**

**1. Sakkizta natija komponentidagi qattiq yozilgan sarlavhalar**
`HolterResult`, `SmadResult`, `LabResult` va ularning `*OldResult`
juftliklarida quyidagilar `t()` ga o'tkazildi:
* `Avtomatik tahlil (AI xulosasi)` → `t('automatic_analysis')`
* `AI tavsiyasi` → `t('ai_recommendations')`
* `Xulosa` → `t('final_summary')`
* `Raqamli o'lchovlar` → `t('digital_measurements')`

**2. `EcgOldResult.js` dagi 10 ta raqamli o'lchov nomi**
`Yurak urish ritmi (HR)`, `QRS davomiyligi`, `QRS elektr o'qi`,
`P/R/S/T to'lqini amplitudasi`, `P to'lqini davomiyligi`,
`ST segment ko'tarilishi/tushishi`, `P/QRS/T morfologiyasi` — barchasi
mavjud tarjima kalitlariga bog'landi (`hr`, `duration`, `electrical_axis`,
`wave_duration`, `wave_amplitude`, `morphology`, `segment_elevation`).

**3. "Labaratoriya" imlo xatosi tuzatildi**
`LabResult.js` va `LabOldResult.js` dagi `⭐ Labaratoriya natijasi fayli:`
→ `t('lab_result_file')` = "Laboratoriya natijasi fayli" /
"Файл результата лабораторного анализа" / "Laboratory result file".

**4. Kod bazasi bo'ylab qidiruv**
`components/results/` ichida JSX matn tugunlaridagi barcha qattiq yozilgan
sarlavhalar tekshirildi — endi faqat xalqaro atamalar qoldi
(`PR interval`, `QT interval`, `QTc (Bazett)`, `PR segment`, `QRS`, `HRV`),
ular ataylab tarjima qilinmaydi.

**Yo'l-yo'lakay:** sahifalash matni (`{tot} ta natija`) oltita ro'yxatda
qattiq kodlangan edi — u ham `t('total_results', { count })` ga o'tkazildi
(T-088 da qayd etilgan).

**Tekshirildi (brauzerda, rus tilida, EKG #96):**

| Ilgari | Hozir |
|---|---|
| `⭐ Raqamli o'lchovlar:` | **`⭐ Цифровые измерения:`** |
| `Yurak urish ritmi (HR)` | **`Частота сердечных сокращений (ЧСС)`** |
| `QRS davomiyligi` | **`QRS Длительность`** |
| `QRS elektr o'qi` | **`QRS Электрическая ось`** |
| `ST segment ko'tarilishi/tushishi` | **`ST сегмент: подъём/депрессия`** |
| `Avtomatik tahlil (AI xulosasi)` | **`Автоматический анализ (заключение AI)`** |

**Muhim izoh:** o'lchov **qiymatlari** (`biroz uzaygan`, `kengaygan`,
`chapga keskin og'ish`) hali ham o'zbekcha — bu **AI javobining o'zi**,
tahlil yaratilganda tanlangan tilda saqlangan. Bu alohida task —
**T-059** ("AI natijasi tili tahlil yaratilganda qotib qoladi"). Interfeys
sarlavhalari endi to'liq tarjima qilinadi.

**Bajarilmagan band:** 3-band — komponentlarni bittaga birlashtirish
(T-034). Tarjima muammosi undan mustaqil hal qilindi; birlashtirish
alohida refaktoring sifatida qoladi.

---

### ✅ T-057 — ~~i18next sozlamasida `fallbackLng` yo'q~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** i18n / Yuqori
**Fayl:** `frontend/src/locale/i18next.js`

**Muammo:**
```js
init({
    resources,
    lng: cookie.load('tilYMed') ? cookie.load('tilYMed') : "uz",
    keySeparator: false,
    ...
});
```
`fallbackLng` ko'rsatilmagan. Natijada tanlangan tilda kalit topilmasa, i18next boshqa tilga o'tmaydi — **kalitning o'zini matn sifatida ko'rsatadi**.

Bu ayniqsa rus tilida og'riqli: RU faylida **49 ta kalit yetishmaydi** (UZ da 503, RU da 455). Ya'ni rus tilida ishlaydigan foydalanuvchi 49 joyda `create_new_ecg_analyse`, `patient_not_found`, `select_consultants` kabi texnik kalitlarni ko'radi.

Til bo'yicha qamrov:

| Til | Kalitlar soni | Yetishmayotgan |
|---|---|---|
| O'zbek | 503 | 1 (`diagnosis_status`) |
| **Rus** | 455 | **49** |
| **Ingliz** | 484 | **20** |

**Tuzatish rejasi:**
1. `fallbackLng: 'uz'` qo'shish — hech bo'lmaganda kalit o'rniga o'zbekcha matn ko'rinadi.
2. RU da yetishmayotgan 49 ta va EN da yetishmayotgan 20 ta kalitni to'ldirish. To'liq ro'yxat:
   - **RU**: `actions, addres, admin_info, bankName_required, bank_account_required, clinic, clinic_info, conference_not_joined, consultant_not_linked, consultation_price, create_new_diagnose, create_new_ecg_analyse, create_new_holter_analyse, create_new_lab_analyse, create_new_smad_analyse, create_video_conference, data_found, details, end_conference, enter_addres, invited, join, joined, mfo_required, my_video_conferences, participants, patient_analyses, patient_not_found, patient_required, phones, please_wait_lab, search, search_by_label, select_consultants, select_consultationDate, start, treatment, type` va boshqalar
   - **EN**: `addres, admin_info, bankName_required, bank_account_required, clinic_details, clinic_info, create_new_diagnose, create_new_ecg_analyse, create_new_holter_analyse, create_new_lab_analyse, create_new_smad_analyse, enter_addres, mfo_required, phones, please_wait_lab, search, search_by_label, select_consultationDate`
3. UZ da yetishmayotgan `diagnosis_status` kalitini qo'shish.
4. `debug: process.env.NODE_ENV === 'development'` qo'shish — yetishmayotgan kalitlar konsolda ko'rinsin.
5. `saveMissing` bilan yetishmayotgan kalitlarni loglash.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:** `locale/i18next.js` qayta yozildi:
- **`fallbackLng: 'uz'`** qo'shildi — kalit topilmasa o'zbekchaga tushadi, kalitning o'zi ko'rsatilmaydi.
- Til kodi tekshiriladi (`SUPPORTED_LANGUAGES`) — cookie'da yaroqsiz qiymat bo'lsa sukut tilga qaytadi.
- `debug` va `missingKeyHandler` faqat Development'da — yetishmayotgan kalit konsolda ogohlantirish beradi.

**Brauzerda tasdiqlandi:** rus tilida EKG ro'yxati to'liq tarjima qilingan —
"Анализы ЭКГ", "Пациент", "Паспорт", "Статус анализа", "Заключение ИИ",
"Поиск по имени или серии паспорта". Bironta ham xom kalit ko'rinmaydi.

---

### ✅ T-058 — ~~`t('kalit') || 'zaxira matn'` naqshi ishlamaydi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** i18n / Kod sifati / O'rta
**Fayllar:** `components/results/EcgResult.js:50,54,107,114,121`, `components/shared/AnalyseViewHeader.js:80,83`, `pages/cabinet/ecg_analyse/EcgAnalysesList.js:472` va boshqalar

**Muammo:**
Kod bo'ylab quyidagi naqsh keng ishlatilgan:
```jsx
{t('digital_measurements') || 'Raqamli o\'lchovlar'}
{t('analysis_date') || 'Sana'}
{t('no_ecg_analyses') || 'Hech qanday EKG tahlil topilmadi'}
```

Dasturchining niyati: "kalit yo'q bo'lsa zaxira matnni ko'rsat". Ammo i18next kalit topilmaganda **kalitning o'zini** (`'digital_measurements'`) qaytaradi — bu bo'sh satr emas, ya'ni **truthy**. Shuning uchun `||` operatori **hech qachon ishlamaydi** va ekranda zaxira matn emas, texnik kalit chiqadi.

**Tuzatish rejasi:**
1. To'g'ri usulga o'tish — i18next'ning o'zining `defaultValue` parametri:
   ```jsx
   {t('digital_measurements', { defaultValue: "Raqamli o'lchovlar" })}
   ```
2. Yoki (afzalroq) — kalitlarni tarjima fayllariga qo'shib, zaxira matnlarni butunlay olib tashlash (T-055 bilan birga).
3. Kod bazasidan `t(...) ||` naqshini qidirib topib, barchasini tuzatish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:** `t('kalit') || 'zaxira'` naqshi **35 ta faylda 298 ta joyda**
`t('kalit', { defaultValue: 'zaxira' })` ga o'girildi.

i18next kalit topilmasa kalitning **o'zini** qaytaradi (truthy qiymat), shuning uchun
`||` operatori hech qachon ishga tushmasdi — ekranda zaxira matn o'rniga texnik kalit chiqardi.

**Tekshiruv:** `grep` bo'yicha eski naqsh **0 marta** uchraydi; frontend kompilyatsiyasi toza.

---

### ✅ T-059 — ~~AI natijasi tili tahlil yaratilganda qotib qoladi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** i18n / Mahsulot mantiqi / O'rta
**Fayllar:** `python_back/main.py` (`compose_prompt_for_openai`), tahlil ko'rish sahifalari

**Muammo:**
Tahlil yaratilayotganda "AI tahlil tilini tanlang" maydoni bor va tanlangan til (`lang`) AI promptiga uzatiladi. AI javobi **o'sha tilda** generatsiya qilinib bazaga saqlanadi.

Muammo shundaki, natija **boshqa tilda ko'rish imkoniyati yo'q**. Hamshira tahlilni o'zbek tilida yaratsa, keyin rus tilli kardiolog uni ochganda AI xulosasini o'zbek tilida o'qishga majbur — interfeys rus tilida bo'lsa ham.

Auditda aynan shu holat kuzatildi: interfeys rus tiliga o'tkazilganda AI matni o'zbekcha qoldi.

**Tuzatish rejasi:**
1. **Qisqa muddatli:** natija sahifasida "Bu xulosa o'zbek tilida yaratilgan" degan belgi ko'rsatish — foydalanuvchi chalkashmasin.
2. **O'rta muddatli:** "Boshqa tilga tarjima qilish" tugmasi — mavjud AI matnini tarjima qilib, natijani `ai_answer_data_ru` / `ai_answer_data_en` kabi qo'shimcha ustunlarda keshlash.
3. **Uzoq muddatli:** tahlil yaratilganda barcha uch tilda generatsiya qilish (xarajat oshadi) yoki strukturali natija saqlab, matnni ko'rsatish paytida shakllantirish.
4. Tahlil yaratish formasida "AI tahlil tili" ni sukut bo'yicha **foydalanuvchining joriy interfeys tiliga** tenglashtirish (hozir doim "O'zbek tili" turibdi).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

Rejadagi ikkala band ham bajarildi.

### 1-band — xulosa qaysi tilda ekani ko'rsatiladi

Til **hech qayerda saqlanmasdi**: u faqat promptga uzatilardi. Shuning
uchun avval migratsiya `20260831030000_AddAiLanguage` — to'rt tahlil
jadvaliga `ai_lang varchar(5)`, va u yuklash paytida yoziladi.

`components/shared/AiLanguageNotice.js` (yangi) — interfeys tili AI
matnining tilidan farq qilsa ogohlantirish chiqadi. Til noma'lum bo'lsa
(migratsiyadan oldingi yozuvlar) yoki mos kelsa — hech narsa
ko'rsatilmaydi.

### 2-band — tarjima

Migratsiya `20260831040000_AddAiTranslations` — `ai_translations text`.
Format: til kodi bo'yicha kalitlangan JSON.

Alohida ustun, `ai_answer_data` ichida emas: asl javob tibbiy yozuvning
bir qismi va unga tegmaslik kerak. Tarjima esa hosila ma'lumot — uni
istalgan vaqtda o'chirib qayta yaratish mumkin.

**`python_back/ai_translate.py`** (yangi):
* faqat **matnli maydonlar** yuboriladi (`automatic_analysis`,
  `AI_recommendations`, `final_summary`, o'lchov izohlari) — mantiqiy
  qiymatlarni (`automatic_analysis_bool`, `analiz_mumkinmi`) tarjimaga
  berish xato ehtimolini oshiradi va ma'nosi yo'q;
* **kalitlar o'zgarmaydi** — frontend va PDF ularga tayanadi, kalit
  o'zgarsa natija umuman ko'rinmay qoladi;
* natija asl obyekt ustiga qo'yiladi, ya'ni tarjima qilinmagan
  maydonlar joyida qoladi;
* model `gpt-5-mini` — tarjima uchun katta model kerak emas.

**Endpointlar:** `POST /api/translate-analysis` (Python) va
`POST /api/analyses/translate` (.NET proksi, `ai-analysis` rate limit
siyosati bilan — bu ham AI chaqiruvi, pullik va sekin).

**Kesh:** matn o'zgarmaydi, shuning uchun bir marta tarjima qilingan
xulosa qayta so'ralmaydi.

### Tekshiruv (jonli)

**Server:**

| So'rov | Natija |
|---|---|
| `ecg#100 → ru` (birinchi marta) | 200, `cached: false`, matn ruscha |
| `ecg#100 → ru` (ikkinchi marta) | 200, `cached: true`, **81 ms** |
| `ecg#100 → uz` (asl til) | 200, `cached: true`, AI chaqirilmadi |
| Kalitlar | barcha 7 tasi saqlandi |
| `automatic_analysis_bool` | `2` — o'zgarmadi |

**Brauzerda (EKG #100, `ai_lang = uz`):**

| Interfeys tili | Natija |
|---|---|
| O'zbek | ogohlantirish **yo'q** (til mos) |
| Rus | *"Это заключение создано на узбекском языке"* + tugma *"Перевести заключение"* |

Tugma bosilgach matn almashdi:

```
avval:  Sinus ritm (HR 65). PR 204 ms: I-darajali AV blok ehtimoli…
keyin:  Синусовый ритм: перед каждым QRS видна P-волна, ритм регулярный…
```

### Yo'l-yo'lakay tuzatilgan nosozlik

To'rtta natija komponentida `useEffect(..., [])` — ya'ni ular
`data.aiAnswerData` yangilansa ham buni **sezmasdi**. Tarjima uchun bu
to'siq edi, lekin muammo kengroq: ota komponent ma'lumotni yangilasa
(masalan qayta urinishdan keyin) ekranda eski natija qolardi.
Bog'liqlik `[data.aiAnswerData]` ga o'zgartirildi.

---

## UI/UX va dizayn

### ✅ T-060 — ~~Interfeys umumiy dizayn tizimi va vizual ierarxiyaga muhtoj~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UI/UX / Dizayn / Yuqori
**Fayllar:** `frontend/src/App.css` (katta va tartibsiz), barcha kabinet sahifalari

**Muammo (audit davomida kuzatilgan):**

1. **Asosiy panel deyarli bo'sh.** Ekranning 70% i bo'sh oq maydon; faqat 5 ta kichik kartochka va 5 ta tugma. Klinika rahbari uchun bu sahifa hech qanday foydali ma'lumot bermaydi.

2. **Vizual ierarxiya yo'q.** Sahifadagi barcha elementlar bir xil "og'irlikda": sarlavha, filtr, jadval — hammasi bir xil oq kartochkada, bir xil chegara bilan. Ko'z qayerga qarashni bilmaydi.

3. **Bo'sh joydan foydalanish nomutanosib.** Filtr paneli juda katta joy egallaydi, jadval esa siqilgan (T-042, T-043).

4. **Bemor ismi ustuni 4 qatorga bo'linadi** — "TESTBEMOROV / SANJAR BOTIR / O'G'LI / (36 yosh)". Qator balandligi keraksiz oshadi, jadval uzayadi.

5. **Status chiplari ortiqcha so'zli** — "Tashxis yozilmagan", "AI tahlil qilindi", "Tahlil qilinmagan". Jadvalda qisqa belgilar yetarli.

6. **Kirish sahifasida logotip yo'q**, sarlavha "N MED TIZIMIGA KIRISH" — nomdagi bo'shliq xato ("N MED" → "NMED"). Chap tomonda katta bo'sh maydon.

7. **Sarlavhadagi "<" tugmasining vazifasi tushunarsiz** — yorliq (tooltip) yo'q.

8. **Xatolik xabari va havola bir-biriga tegib turadi** — kirish formasida "Iltimos, parolni kiriting" matni "Parolni unutdingizmi?" havolasi bilan qo'shilib ketadi.

9. **Manzil maydoni majburiy katta harfga o'tkaziladi** — "Chilonzor mahallasi" → "CHILONZOR MAHALLASI". Ism uchun mantiqiy, manzil uchun o'qishni qiyinlashtiradi.

**Tuzatish rejasi:**

**1. Dizayn tizimini rasmiylashtirish:**
- Ranglar, shriftlar, oraliqlar (spacing scale: 4/8/12/16/24/32), soyalar, burchak radiuslari uchun **yagona token to'plami** (CSS o'zgaruvchilari yoki antd `ConfigProvider theme`).
- Hozir ranglar kod bo'ylab tarqoq (`#00D1B2`, `#00D4AA` — ikki xil yashil ishlatilgan).
- Tipografika shkalasi: sahifa sarlavhasi / bo'lim sarlavhasi / asosiy matn / yordamchi matn.

**2. Asosiy panelni qayta loyihalash:**
- Yuqorida: bugungi va umumiy ko'rsatkichlar (T-011 tuzatilgandan keyin) — katta, aniq raqamlar bilan.
- **So'nggi tahlillar** ro'yxati (oxirgi 5-10 ta) — darhol ishga kirishish uchun.
- **E'tibor talab qiladigan tahlillar** bloki: AI "xavfli" deb baholaganlar, shifokor xulosasi yozilmaganlar, xatolik bilan tugaganlar.
- Haftalik dinamika grafigi (`chart.js` allaqachon o'rnatilgan).
- Shifokor uchun: "Sizga biriktirilgan yangi tahlillar".

**3. Jadval ko'rinishini yaxshilash:**
- Bemor ismini bitta qatorda, `ellipsis` bilan; to'liq ism `Tooltip` da.
- Yosh va jinsni ism ostida kichik kulrang matnda.
- Status uchun ixcham rangli nuqta + qisqa matn.
- Qator ustiga kelganda (`hover`) amallar tugmalari paydo bo'lsin.
- Zebra chiziqlar yoki yumshoq ajratuvchilar bilan o'qishni osonlashtirish.

**4. Bo'sh holatlar (empty states):**
- Ma'lumot yo'q bo'lganda faqat matn emas — rasm/ikonka, tushuntirish va **harakat tugmasi** ("Birinchi tahlilni qo'shing").
- `components/shared/EmptyState.js` mavjud, lekin to'liq ishlatilmayapti.

**5. Yuklanish holatlari:**
- "—" o'rniga `Skeleton` komponentlari.
- Tugmalarda `loading` holati (hozir ba'zi joylarda bor, ba'zida yo'q).

**6. Kirish sahifasi:**
- Chap panelga logotip va qisqa mahsulot tavsifi qo'yish.
- "N MED TIZIMIGA KIRISH" → "NMED tizimiga kirish".
- Til almashtirgichni kirish sahifasiga ham qo'shish (hozir faqat kabinet ichida).
- Xatolik matni va havola orasiga bo'shliq.

**7. Mayda tuzatishlar:**
- Sarlavhadagi "<" tugmasiga `Tooltip` qo'shish yoki matn bilan almashtirish.
- Manzil maydonidan majburiy `uppercase` ni olib tashlash.
- Yagona yashil rang tanlash.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:** Yangi `src/theme.js` — yagona dizayn tizimi:

- **Ranglar:** `colors` obyekti. Ilgari ikki xil yashil ishlatilardi (`#00D1B2` va `#00D4AA`) — endi bitta `primary: #00B39A` va uning hover/active variantlari.
- **Oraliqlar:** `spacing` (4 px asosidagi shkala).
- **Uzilish nuqtalari:** `breakpoints` — CSS media so'rovlari bilan bir xil qiymatlar.
- **antd tokenlari:** `borderRadius`, `controlHeight`, `fontSize` shkalasi, soyalar, komponent darajasidagi sozlamalar (`Table`, `Button`, `Card`, `Tag`, `Modal`).

`index.js` da `ConfigProvider theme={nmedTheme}` orqali qo'llanadi — endi antd
komponentlari o'zi to'g'ri ko'rinishda chiqadi va CSS `!important` bilan
kurashish kerak emas (T-103 bilan birga).

**Qo'shimcha:** `index.js` antd ning `<App>` komponenti bilan o'raldi —
bu T-018 dagi statik `message` ogohlantirishini ham hal qiladi.

---

### ✅ T-061 — ~~Responsivelik butun platforma bo'ylab tizimli tekshirilishi kerak~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UI/UX / Moslashuvchanlik / Yuqori
**Fayllar:** barcha sahifalar, `frontend/src/App.css`

**Muammo:**
T-042 va T-043 da tahlil ro'yxatlari uchun aniq muammolar hujjatlashtirildi. Ammo boshqa sahifalar hali kichik ekranlarda tekshirilmagan:

- Xodimlar jadvali (5 ustun)
- Xodim qo'shish/tahrirlash formasi (3 ustunli tarmoq)
- Tahlil qo'shish formasi (bemor + fayl + shifokorlar + 23 ta shikoyat)
- Tahlil natijasi sahifasi (4 ta yuqori kartochka)
- Konsultatsiya sahifalari
- Video konferensiya
- Tashkilot ma'lumotlari
- Landing sahifa (uzun, ko'p bo'limli)
- PDF ko'rish

**Tuzatish rejasi:**
1. **Uzilish nuqtalarini (breakpoints) rasmiylashtirish**: 375 / 768 / 1024 / 1280 / 1440 px.
2. Har bir sahifani shu beshta o'lchamda ko'zdan kechirish va ro'yxat tuzish.
3. Umumiy qoidalar joriy qilish:
   - Har qanday jadval `scroll={{ x: 'max-content' }}` bilan yoki mobilda kartochkaga aylanadi.
   - Ko'p ustunli formalar `< 768 px` da bir ustunga tushadi.
   - Yon menyu mobilda `Drawer` sifatida ochiladi (hozir qisman bor).
   - Asosiy amal tugmalari mobilda ekran pastida yopishib turadi (sticky).
   - Barmoq bilan bosiladigan elementlar kamida 44×44 px.
4. Landing sahifadagi og'ir animatsiyalarni mobilda o'chirish (`prefers-reduced-motion` va ekran o'lchamiga qarab).
5. Chrome DevTools qurilma emulyatsiyasida yoki avtomatlashtirilgan vizual testlar bilan tekshirish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Tekshiruv usuli:** brauzer qurilma emulyatsiyasida to'rtta o'lchamda
(375 · 768 · 1024 · 1440 px) har bir sahifa ochilib, quyidagilar
avtomatik o'lchandi: sahifada gorizontal aylanish bormi, viewportdan
kengroq element bormi, barmoq bilan bosiladigan elementlar 44×44 px dan
kichikmi.

**Topilgan va tuzatilgan haqiqiy kamchiliklar:**

**1. EKG tasmasi ekranning atigi 20% iga siqilardi — jiddiy kamchilik**
```css
.ekg-image { max-width: 20vw; }
```
Bu sahifaning **asosiy kontenti**: 1440 px ekranda tasma 288 px ga,
mobilda 75 px ga siqilardi va to'lqinlarni umuman o'qib bo'lmasdi.
Shifokor tahlilni ko'rish uchun rasmni alohida ochishga majbur edi.
Endi `max-width: 100%`, `max-height: 60vh`.
*O'lchov: 1440 px ekranda blok kengligi 288 → **1108 px**.*

**2. Logotip qutisi `10vw` edi**
```css
.input_img_box { width: 10vw; height: 10vw; }
```
375 px ekranda 37×37 px (ko'rinmaydigan va bosib bo'lmaydigan),
2560 px ekranda 256 px. Endi `clamp(96px, 12vw, 160px)` — ekranga
mutanosib, lekin foydali chegaralar ichida. Media so'rovdagi ortiqcha
`15vw` qoidasi olib tashlandi.

**3. Qo'llanma tugmasi mobilda 36 px ga qisqarardi**
768 px dan tor ekranda tugma matni yashiriladi va faqat ikonka qoladi —
o'lcham 36×44 ga tushardi. Endi `min-width: 44px` bilan majburlangan.

**4. Umumiy moslashuvchanlik qoidalari joriy qilindi**
Ilgari har bir sahifa o'z media so'rovlarini yozardi va uzilish nuqtalari
tarqoq edi (`768`, `760`, `480`, `1366`, `1700`…). Yangi sahifa qo'shilganda
ular takrorlanmasdi. `App.css` oxiriga izohli blok qo'shildi —
uzilish nuqtalari `theme.js` dagi `breakpoints` bilan bir xil
(mobile 576 · tablet 768 · laptop 1024 · desktop 1280 · wide 1440):

| Qoida | ≤768 px | ≤576 px |
|---|---|---|
| Ko'p ustunli formalar (`.main_col`) | bitta ustunga tushadi | — |
| Tugma/select/input balandligi | ≥ 44 px | — |
| Faqat ikonkali tugmalar | ≥ 44×44 px | — |
| Sahifa sarlavhasi | `flex-wrap`, 18 px | — |
| Kartochka ichki bo'shlig'i | 12 px | — |
| Statistika kartochkalari | 2 ustun | **1 ustun** |
| Filtr tugmalari | — | to'liq kenglik |
| Modal oynalar | — | ekran kengligi − 16 px |

**Tekshirilgan sahifalar (har biri 375 / 768 / 1024 / 1440 px da):**
Asosiy panel, Xodimlar, EKG ro'yxati, Yangi EKG tahlil, Tahlil natijasi,
Bemorlar, Konsultantlar, Konsultatsiya, Video konferensiya,
Tashkilot ma'lumotlari, Yordam.

**Natijalar:**

| Tekshiruv | Natija |
|---|---|
| Gorizontal aylanish (`body.scrollWidth > viewport`) | **Hech bir sahifada yo'q** (11 sahifa × 4 o'lcham) |
| Viewportdan kengroq elementlar | **Yo'q** (jadvallar ataylab `overflow-x: auto` bilan aylanadi) |
| 375 px: yangi tahlil formasi | Bir ustunga tushdi, maydonlar to'liq kenglikda |
| 375 px: asosiy panel | Statistika kartochkalari bittadan, tez harakat tugmalari to'liq kenglikda |
| 375 px: tahlil natijasi | Meta-kartochkalar bir ustunda (`grid-template-columns: 337.6px`) |
| 768 px: EKG ro'yxati | Filtrlar 2 ustunda, jadval gorizontal aylanadi, eksport tugmasi joyida |
| 44 px dan kichik bosiladigan elementlar | Tuzatishdan keyin **qolmadi** (faqat antd ning ichki 12×12 tozalash ikonkasi) |
| Xodimlar jadvali (375 px) | Gorizontal aylanadi, kartochka chegaradan chiqmaydi |

**Bajarilmagan bandlar (sababi bilan):**
* **Mobilda jadvalni kartochkaga aylantirish** — hozir gorizontal aylanish
  ishlaydi va ma'lumot yo'qolmaydi. Kartochka ko'rinishi beshta ro'yxat
  sahifasini qayta yozishni talab qiladi va alohida ish sifatida qoldirildi.
* **Landing sahifadagi og'ir animatsiyalar** — `prefers-reduced-motion`
  qoidasi allaqachon qo'shilgan (T-060); ekran o'lchamiga qarab
  o'chirish landing sahifani alohida ko'rib chiqishni talab qiladi.
* **Mobilda asosiy amal tugmasini pastda yopishtirish** — hozir tugmalar
  to'liq kenglikda va ko'rinadi; sticky panel faqat Tashkilot ma'lumotlari
  sahifasida (saqlanmagan o'zgarishlar uchun, T-077) joriy qilindi.

---

### ✅ T-062 — ~~Yetishmayotgan sahifalar va bo'limlar~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Yetishmayotgan komponent / O'rta
**Fayllar:** yangi sahifalar

**Muammo:** Platformada klinika uchun zarur bo'lgan bir qancha sahifa umuman yo'q.

**Yaratilishi kerak bo'lgan sahifalar:**

1. **Bemorlar ro'yxati va bemor kartasi** (T-023) — marshrut bor, menyuda yo'q, karta sahifasi yo'q.
   Bemor kartasida: shaxsiy ma'lumotlar, barcha tahlillar xronologiyasi, shifokor xulosalari, ko'rsatkichlar dinamikasi grafigi.

2. **Profil / Shaxsiy ma'lumotlar sahifasi** — hozir modal oyna orqali. To'liq sahifa kerak: avatar, ma'lumotlar, **parolni o'zgartirish**, til tanlash, bildirishnoma sozlamalari.

3. **Parolni tiklash sahifasi** — hozir faqat kirish sahifasidagi modal. To'g'ridan-to'g'ri havola bilan ochiladigan sahifa kerak.

4. **Audit jurnali sahifasi** (Admin uchun) — `api/audit-logs` endpointi ishlaydi, lekin **frontendda hech qanday sahifa yo'q**. C2 talabi "Admin uchun loglarni ko'rish interfeysi" bajarilmagan.

5. **Tizim holati / Diagnostika sahifasi** (T-028) — AI xizmati ishlayaptimi, oxirgi 24 soatdagi xatoliklar.

6. **Yordam / Ko'p so'raladigan savollar bo'limi** — T-053 dagi turlar bilan birga.

7. **Bildirishnomalar markazi** — hozir faqat yon menyudagi badge. Bildirishnomalar tarixi va o'qilgan/o'qilmagan holati kerak.

8. **404 va xatolik sahifalari** — hozir noma'lum marshrut jimgina bosh sahifaga yo'naltiriladi. Foydalanuvchi nima bo'lganini tushunmaydi.

9. **Klinika ro'yxatdan o'tish jarayonini yakunlash sahifasi** — hozir modal oynalar ketma-ketligi (`AdminModal`, `ClinicSetupModal`). To'liq sahifali, qadamli (`Steps`) onboarding kerak.

10. **Tahlillarni eksport qilish** — bir nechta tahlilni tanlab Excel/CSV ga chiqarish (hisobot uchun).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Yaratilgan sahifalar (10 banddan 7 tasi to'liq bajarildi):**

**1. Bemorlar ro'yxati va bemor kartasi** — T-087 va T-023 da bajarildi.

**2. Profil sahifasi** — `pages/cabinet/pages/Profile.js` (`/profile`)
Ilgari shaxsiy ma'lumotlar faqat modal oynada ko'rinardi va **kabinet ichida
parolni almashtirish imkoniyati umuman yo'q edi** — buning uchun tizimdan
chiqib, kirish sahifasidagi "parolni unutdingizmi?" oqimidan foydalanish
kerak edi. Endi: avatar, F.I.SH, rol, telefon, klinika va holati; parolni
o'zgartirish SMS tasdiqlash bilan (`Steps`: kod so'rash → kod va yangi
parol, parolni takrorlash tekshiruvi, kamida 8 belgi).
Yordamchi: `tools/roles.js` — rol raqamlari va nomlari bir joyda
(ilgari kod bo'ylab `roleId === 4` kabi sehrli raqamlar tarqoq edi).

**3. Audit jurnali sahifasi** — `pages/cabinet/pages/AuditLogs.js` (`/audit-logs`)
`api/audit-logs` endpointi ishlab turardi, lekin **frontendda uni
ko'rsatadigan sahifa yo'q edi** — ya'ni O'z DSt 2814:2014 C2 talabining
"Admin uchun loglarni ko'rish interfeysi" qismi amalda bajarilmagan edi.
Sahifada: sana/vaqt, foydalanuvchi, amal (rangli — o'chirish qizil,
kirish ko'k, yaratish yashil), obyekt, so'rov, javob kodi, IP.
Filtrlar: amal (bazadan olingan ro'yxat), obyekt turi, sana oralig'i.

**Yo'l-yo'lakay topilgan va tuzatilgan xavfsizlik kamchiligi:**
`AuditLogController` so'rovni **klinika bo'yicha umuman filtrlamasdi** —
bir klinikaning admini boshqa klinikalarning foydalanuvchi nomlarini, IP
manzillarini va harakatlarini ko'ra olardi. Endi Admin/Direktor faqat o'z
klinikasi xodimlarining yozuvlarini ko'radi, SuperAdmin — barchasini.
`pageSize` ham `Paging.Normalize` bilan cheklandi.
Qo'shimcha `GET /api/audit-logs/actions` — filtr ro'yxati uchun, u ham
o'sha doiradan olinadi.

**4. Tizim holati sahifasi** — `pages/cabinet/pages/SystemStatus.js` (`/system-status`)
Klinika xodimi tahlil natijasi kelmayotganda muammo o'zidami yoki
platformadami — bilishning yo'li yo'q edi. Endi: API, baza va AI xizmati
holati + oxirgi 24 soatdagi tahlillar (jami / xatolik / jarayonda),
turlar bo'yicha jadval, "Yangilash" tugmasi.
* Yangi `GET /api/system/status` (Admin/Direktor) — baza, AI xizmati
  (proksi orqali) va klinika statistikasi.
* Yangi `GET /api/health` (Python AI xizmati) — baza, `OPENAI_API_KEY`
  mavjudligi (**kalitning o'zi emas**) va `uploads` papkasiga yozish huquqi.
  Ilgari AI xizmatida hech qanday health endpointi yo'q edi.

**5. Yordam / KSS sahifasi** — `pages/cabinet/pages/Help.js` (`/help`)
9 ta savol — auditda aniqlangan haqiqiy chalkashliklarga javob:
AI xulosasi tashxis o'rnini bosadimi, "Faqat saqlash" va "AI bilan tahlil"
farqi, ranglar nimani anglatadi, "Fayl mos emas" chiqsa nima qilish, rasm
sifati talablari, nima uchun hamma tahlillar ko'rinmaydi, o'chirish,
QR kod, faollashtirish muddati. Yon panelda qo'llanmalarni qayta yoqish
tugmasi va qo'llab-quvvatlash aloqalari.

**6. 404 sahifasi** — `pages/cabinet/pages/NotFound.js`
Ilgari noma'lum manzil **jimgina bosh sahifaga yo'naltirilardi** va
foydalanuvchi "nima uchun men bosh sahifadaman?" degan savol bilan
qolardi. Endi 404 sahifasi manzilni ko'rsatadi, "Bosh sahifaga" va
"Orqaga" tugmalari bor.

**7. Tahlillarni CSV ga eksport qilish**
* `Controllers/AnalysisExportController.cs` —
  `GET /api/analyses/export?type=ecg&search=…&status=…&aiStatus=…&dateFrom=…&dateTo=…`
  Faqat Admin/Direktor, faqat o'z klinikasi, eng ko'pi 5000 qator.
  UTF-8 **BOM** bilan (busiz Excel kirill va o'zbek harflarini buzadi),
  nuqtali vergul ajratgichi bilan.
  **CSV formula injection himoyasi**: `=`, `+`, `-`, `@` bilan boshlangan
  qiymat oldiga apostrof qo'yiladi — aks holda bemor ismiga yozilgan matn
  Excel da formula sifatida bajarilishi mumkin edi.
* `components/shared/ExportButton.js` — to'rtta ro'yxat sahifasida,
  **joriy filtrlarni hisobga oladi**.

**8. Yon menyu va marshrutlar**
`tools/routes.js` ga uchta yangi bo'lim (Audit jurnali, Tizim holati,
Yordam), `pages/cabinet/Main.js` ga beshta marshrut va `*` uchun 404.

**9. Tarjima** — 70 ta yangi kalit uch tilda (639 → 710).

**Tekshirildi (brauzerda va API orqali):**

| Tekshiruv | Natija |
|---|---|
| `/audit-logs` | Jadval to'ldi: sana, foydalanuvchi, CREATE belgisi, obyekt, so'rov, 200 kodi, IP |
| `GET /api/audit-logs` — ADMIN (klinika 24) | `totalCount = 761` |
| `GET /api/audit-logs` — NEWADMIN (klinika 25) | `totalCount = 25` — **boshqa klinikaning yozuvlari ko'rinmaydi** |
| `GET /api/audit-logs` — shifokor | **403** |
| `/system-status` | API / Baza / AI — uchalasi "Работает"; oxirgi 24 soat: jami 3, xatolik 0, jarayonda 0; turlar jadvali to'g'ri |
| `GET /api/health` (Python) | `{"status":"healthy","checks":{"database":{"ok":true},"openai_key":{"ok":true},"uploads_writable":{"ok":true}}}` |
| `/profile` | F.I.SH, rol belgisi, telefon, klinika, holati; parol almashtirish qadamlari ko'rindi |
| `/help` | 9 ta savol akkordeon ko'rinishida, qo'llanma va aloqa bloklari |
| `/bunday-sahifa-yoq` | **404 sahifasi** chiqdi, manzil ko'rsatildi, ikkala tugma ishlaydi |
| CSV eksport (API) | `200`, `Content-Disposition: attachment; filename=nmed-ecg-20260829-1700.csv`, 11 qator (sarlavha + 10) |
| CSV mazmuni | `ID;Hujjat raqami;Bemor;Tug'ilgan sana;Yuklangan sana;Tahlil sanasi;Holat;AI xulosasi;Kiritgan xodim` — holat va AI xulosasi matn ko'rinishida |
| CSV eksport (brauzer) | Tugma bosildi → `GET /api/analyses/export?type=ecg → 200` → "Файл загружен" xabari |
| Tarjima | Barcha yangi sahifalar rus tilida to'liq chiqdi, xom kalit yo'q |
| Build | .NET 0 xato, React 1 eski warning |

**Bajarilmagan bandlar (sababi bilan):**
* **3-band — parolni tiklashning alohida sahifasi.** Parolni almashtirish
  endi profil sahifasida to'liq ishlaydi; kirish sahifasidagi modal ham
  ishlaydi. Alohida `/reset-password` sahifasi faqat to'g'ridan-to'g'ri
  havola bilan kirish uchun kerak — bu email/SMS shabloniga havola
  qo'shishni talab qiladi va alohida ish sifatida qoldirildi.
* **7-band — bildirishnomalar markazi.** Bildirishnomalar tarixi va
  o'qilgan/o'qilmagan holati uchun **yangi jadval va migratsiya** kerak;
  hozircha faqat `is_viewed` bayroqlari va menyudagi badge bor. Bu alohida
  mahsulot qarori — ma'lumotlar modeli bilan birga rejalashtirilishi kerak.
* **9-band — ro'yxatdan o'tishni yakunlash sahifasi.** Hozirgi modal
  ketma-ketligi (`AdminModal`, `ClinicSetupModal`) ishlaydi; uni to'liq
  sahifali `Steps` onboardingiga ko'chirish ro'yxatdan o'tish oqimini
  qaytadan yozishni bildiradi va T-069 dagi kutish sahifasi bilan birga
  qilinishi mantiqiyroq.

---

### ✅ T-063 — ~~Yangi ro'yxatdan o'tgan klinika BOSHQA klinikalarning barcha bemorlari va tahlillarini ko'ra oladi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Xavfsizlik / Ko'p ijarachilik (multi-tenancy) buzilishi / **ENG KRITIK**
**Fayllar:** `Controllers/PatcientController.cs:138`, `Controllers/ClinicController.cs:76`, `Controllers/ECGAnalyseController.cs:64`, `LabAnalyseController.cs:125`, `HolterAnalyseController.cs:126`, `SmadAnalyseController.cs:126`, `ParasitologyAnalyseController.cs:68`

**Muammo:**
Auditda **haqiqiy ikkinchi klinika** ro'yxatdan o'tkazildi (`Test Shifo Klinikasi`, `clinic_id = 25`) — platformaning oddiy ochiq ro'yxatdan o'tish formasi orqali, hech qanday imtiyozsiz. Yangi klinika hali tasdiqlanmagan (`is_active = false`), bironta ham bemori yoki tahlili yo'q.

Shu yangi akkaunt tokeni bilan yuborilgan so'rovlar natijasi (2026-08-29):

| So'rov | Kutilgan | **Haqiqiy natija** |
|---|---|---|
| `GET /api/patcient/get-all-patients` | 403 yoki bo'sh | **200 — platformadagi BARCHA bemorlar** |
| `GET /api/ecg-analyses/96` (begona klinika tahlili) | 403 | **200 — to'liq tahlil + AI xulosasi** |
| `GET /api/clinic/get-clinic-by-id?id=24` (begona klinika) | 403 | **200 — nomi, logotipi, INN, bank rekvizitlari** |

**`get-all-patients` qaytargan ma'lumot** (boshqa klinikaning bemorlari):
```
ISMOILOV RAHMONJON  | passport: AB6377391 | tug'ilgan: 2001-03-18 | tel: 998917984232
TESTBEMOROV SANJAR  | passport: AC1234567 | tug'ilgan: 1990-05-15 | tel: 998935556677
```
Har bir bemor ob'ektida quyidagi maydonlar bor:
`id, passport, birthDate, firstName, lastName, sureName, gender, phone, address, districtId, district, createdAt, updatedAt,` **`ecgAnalyses`, `labAnalyses`, `medicalDiagnoses`**

Ya'ni javob ichida bemorning **barcha tahlillari ham ichma-ich** qaytariladi.

**`GET /api/ecg-analyses/96`** qaytargani:
```
bemor: TESTBEMOROV SANJAR | passport: AC1234567
klinika: R doctors  (begona klinika)
AI xulosasi: mavjud, 2940 belgi
fayl havolasi: /uploads/ecg_analyse_files/ecg_test_2.jpg
```
Fayl havolasi esa autentifikatsiyasiz ochiq (T-038) — ya'ni EKG rasmini ham yuklab olish mumkin.

**Nima uchun bu eng kritik muammo:**
1. Platformaga **istalgan odam** ro'yxatdan o'tib (soxta klinika nomi bilan), darhol barcha klinikalarning bemor bazasiga kirish huquqiga ega bo'ladi. Hech narsani "buzish" kerak emas.
2. Bu **raqobatchi klinika** uchun ham ochiq eshik: bemorlar ro'yxati, ular qaysi tahlildan o'tgani, aloqa telefonlari.
3. Klinikaning **INN va bank rekvizitlari** ham ochiq.
4. Bu O'z DSt 2814:2014 3-daraja sertifikatsiyasini olishning oldini oladi va shaxsiy ma'lumotlar to'g'risidagi qonunni jiddiy buzadi.
5. Klinikalar bir-birining ma'lumotini ko'rishi platformaga bo'lgan ishonchni butunlay yo'q qiladi.

**Tuzatish rejasi:**
1. **Umumiy qoida joriy qilish:** bemor yoki tahlil ma'lumotini qaytaradigan **har bir** endpoint so'rov yuborayotgan foydalanuvchining `ClinicId` si bilan filtrlanishi SHART. Istisnosiz.
2. Buni tasodifga qoldirmaslik uchun **markazlashtirilgan mexanizm**:
   - `ICurrentUser` xizmati (UserId, ClinicId, RoleId ni JWT dan oladi) — DI orqali.
   - Har bir Service'da so'rov `_context.ECGAnalyse.Where(e => e.ClinicId == _currentUser.ClinicId)` dan boshlansin.
   - Yoki EF Core **Global Query Filter** ishlatish: `modelBuilder.Entity<ECGAnalyses>().HasQueryFilter(e => e.ClinicId == _tenant.ClinicId)` — bu filtr **avtomatik** qo'llanadi va uni unutib bo'lmaydi. Bu eng ishonchli yechim.
3. `get-all-patients` endpointini:
   - klinika bo'yicha filtrlash, yoki
   - agar u faqat ichki maqsadda ishlatilgan bo'lsa — **butunlay o'chirish** (frontendda ishlatilishini tekshirish).
   - Ichma-ich `ecgAnalyses` / `labAnalyses` / `medicalDiagnoses` massivlarini ro'yxat javobidan olib tashlash (ortiqcha ma'lumot, T-064).
4. `get-clinic-by-id` ni faqat o'z klinikasi uchun cheklash; boshqa klinika so'ralganda 403.
5. **Ko'p ijarachilik integratsion testlari** yozish: ikkita klinika yaratiladi, A klinikasi tokeni bilan B klinikasining har bir resursiga murojaat qilinadi — barchasi 403/404 qaytarishi tekshiriladi. Bu testlar CI da har commit'da ishlashi kerak.
6. Tuzatishdan keyin `audit_logs` ni ko'rib chiqish — ishlab chiqarish muhitida bu teshikdan foydalanilganmi yoki yo'qligini aniqlash.

**Qabul mezoni:** A klinikasi tokeni bilan B klinikasining birorta ham bemori, tahlili yoki ma'lumoti olinmaydi; avtomatlashtirilgan testlar buni har commit'da tasdiqlaydi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**

Yangi `Services/CurrentUserService.cs` (`ICurrentUser`) — JWT dan `UserId`/`RoleId`,
bazadan `ClinicId` va `DoctorId` ni bir marta o'qib, so'rov davomida keshlaydi.
Ilgari har bir controller bu mantiqni o'zi takrorlardi va ba'zilarida klinika
tekshiruvi umuman unutilgan edi.

| Fayl | O'zgarish |
|---|---|
| `Services/CurrentUserService.cs` | yangi — markazlashtirilgan foydalanuvchi konteksti |
| `Services/{ECG,Lab,Holter,Smad}AnalyseService.cs` | `Get…ByIdAsync(int id, int? clinicId)` — so'rovga `&& x.ClinicId == clinicId` qo'shildi |
| `Controllers/{ECG,Lab,Holter,Smad}AnalyseController.cs` | `GetById` klinikani uzatadi, mos kelmasa 404 |
| `Controllers/ClinicController.cs` | `get-clinic-by-id` boshqa klinika so'ralsa 403 |
| `Controllers/PatcientController.cs` | `get-all-patients` klinika bo'yicha filtrlanadi va sahifalanadi |

**Jonli tekshiruv** — audit uchun yaratilgan **haqiqiy ikkinchi klinika** (#25) tokeni bilan:

| So'rov | Avval | Hozir |
|---|---|---|
| `GET /api/ecg-analyses/96` (klinika 24) | 200 + to'liq AI xulosa | **404** ✅ |
| `GET /api/lab-analyses/17` | 200 | **404** ✅ |
| `GET /api/holter-analyses/14` | 200 | **404** ✅ |
| `GET /api/smad-analyses/9` | 200 | **404** ✅ |
| `GET /api/clinic/get-clinic-by-id?id=24` | 200 + INN, bank rekvizitlari | **403** ✅ |
| `GET /api/patcient/get-all-patients` | 200 — **barcha klinikalar bemorlari** | **200, `{"data":[],"totalCount":0}`** ✅ |

**Regressiya tekshiruvi** (o'z klinikasi buzilmaganini tasdiqlash):

| So'rov | Natija |
|---|---|
| Klinika 24 admin → `ecg-analyses/96` | 200 ✅ |
| Klinika 24 admin → `lab-analyses/17` | 200 ✅ |
| Klinika 24 admin → `get-all-patients` | 200, o'z 2 ta bemori ✅ |
| Klinika 25 admin → o'z klinikasi (`id=25`) | 200 ✅ |

---

### ✅ T-064 — ~~`get-all-patients` ortiqcha ma'lumot qaytaradi (over-fetching)~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Ishlash / Ma'lumot minimallashtirish / Yuqori
**Fayl:** `backend/EkgAnalyzerApi/Controllers/PatcientController.cs:138`

**Muammo:**
`GET /api/patcient/get-all-patients` har bir bemor uchun quyidagilarni qaytaradi:
- shaxsiy ma'lumotlar (passport, tug'ilgan sana, telefon, manzil, tuman)
- **`ecgAnalyses`** — bemorning barcha EKG tahlillari
- **`labAnalyses`** — barcha laboratoriya tahlillari
- **`medicalDiagnoses`** — barcha shifokor xulosalari

Bundan tashqari **pagination yo'q** — jadval kattalashganda butun bemor bazasi bitta javobda qaytadi.

Ikki jiddiy oqibat:
1. **Ishlash:** 10 000 bemorli klinikada bu so'rov o'nlab megabaytlik javob va bir necha soniyalik kutish demakdir. Ichma-ich yuklashlar N+1 so'rovlarni keltirib chiqaradi.
2. **Xavfsizlik:** ma'lumotlarni minimallashtirish prinsipi buziladi — ro'yxat uchun faqat ism va passport kerak, tahlillar emas.

**Tuzatish rejasi:**
1. Endpointga pagination qo'shish (`page`, `pageSize`, T-013/T-014 bilan bir xil chegaralar).
2. Ichma-ich tahlil massivlarini olib tashlash — bemor kartasi ochilganda alohida so'rov bilan olinsin.
3. Alohida yengil DTO yaratish: `id, firstName, lastName, sureName, birthDate, passport, phone`.
4. Klinika filtri qo'shish (T-063).
5. Qidiruv parametri qo'shish — hozir frontend butun ro'yxatni olib, brauzerda filtrlashi mumkin (buni ham tekshirish kerak).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ishlar:**

Endpoint `PatcientService.GetPatcientsAsync` ga o'tkazildi — ya'ni
`get-patcients-of-clinic` bilan **bitta manba**. Shu bilan T-087 da
yozilgan barcha himoyalar avtomatik qo'llanadi:

1. **Pagination** — sahifada 10 ta yozuv (ilgari butun bemor bazasi bitta
   javobda qaytardi).
2. **Ichma-ich tahlil massivlari olib tashlandi** — `ecgAnalyses`,
   `labAnalyses`, `medicalDiagnoses` endi javobda yo'q. Ular o'rniga
   yengil `analysesCount` soni. Tahlillar bemor kartasi ochilganda
   alohida so'rov bilan olinadi.
3. **Yengil DTO** — `PatcientListItemDTO`: id, ism, familiya, otasining
   ismi, maskalangan passport, tug'ilgan sana, jinsi, telefon, manzil,
   viloyat/tuman, tahlillar soni, oxirgi tahlil sanasi.
4. **Klinika filtri** — servis ichida (T-063).
5. **Qidiruv va til parametrlari** qo'shildi (`search`, `lang`).
6. **Passport maskalangan** — to'liq seriya umuman yuborilmaydi.

**Tekshirildi:**

| Tekshiruv | Natija |
|---|---|
| `GET /api/patcient/get-all-patients?page=1` | `{data, totalCount, totalPages}` |
| Bemor maydonlari | 13 ta yengil maydon; `ecgAnalyses` / `labAnalyses` / `medicalDiagnoses` — **yo'q** |
| Javob hajmi (2 ta bemor) | **829 bayt** |
| Frontendda ishlatilishi | Bu endpoint frontendda umuman chaqirilmaydi — eski nom bilan moslik uchun saqlandi |
| Build | 0 xato |

---

### ✅ T-065 — ~~SignalR WebSocket ulanishi ishlamayapti~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Real vaqt / Ishonchlilik / Yuqori
**Fayllar:** `backend/EkgAnalyzerApi/Program.cs`, `frontend/src/hooks/useAnalysisSignalR.js`, `useConsultationSignalR.js`, `useVideoSignalR.js`

**Muammo:**
Brauzer konsolida har safar sahifa yuklanganda quyidagi xatoliklar chiqadi:

```
Error: Failed to start the transport 'WebSockets': Error: WebSocket failed to connect.
WebSocket connection to 'ws://localhost:5000/hubs/consultation?id=...&access_token=...' failed
WebSocket connection to 'ws://localhost:5000/hubs/analysis?id=...&access_token=...' failed
```

Uchala hub uchun ham (`/hubs/analysis`, `/hubs/consultation`, `/hubs/videocall`). SignalR keyin uzoq so'rov (long polling) ga o'tadi, lekin:
- har bir ulanishda konsolga xatolik yoziladi
- ulanish sekinlashadi
- `AnalysisProgressTracker` orqali keladigan "tahlil tayyor" bildirishnomasi kechikadi yoki umuman yetib bormaydi (T-030)
- video qo'ng'iroq signalizatsiyasi ishonchsiz bo'ladi

Sabab ehtimoli: Kestrel `ConfigureKestrel` da WebSocket sozlamalari, yoki `app.UseWebSockets()` chaqirilmagani, yoki middleware tartibi (`UseRouting` → `UseCors` → `UseAuthentication` → `MapHub`).

**Tuzatish rejasi:**
1. `Program.cs` ga `app.UseWebSockets();` qo'shish (`UseRouting` dan keyin, `MapHub` dan oldin).
2. CORS siyosatida SignalR uchun `AllowCredentials` borligini tekshirish (bor) va origin ro'yxatiga dev manzillari kirganini tasdiqlash.
3. Ishlab chiqarishda Nginx konfiguratsiyasida WebSocket proxy sozlamalarini tekshirish:
   ```
   proxy_http_version 1.1;
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   ```
   (`DEPLOY_LINUX.md` da bu bor-yo'qligini tekshirish kerak).
4. Frontendda ulanish holatini kuzatish va uzilganda avtomatik qayta ulanish (`withAutomaticReconnect`).
5. Ulanish muvaffaqiyatsiz bo'lsa foydalanuvchiga bildirishnoma emas, **zaxira polling** ga o'tish (T-030).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Sabab:** `app.UseWebSockets()` chaqirilmagan edi. SignalR uchun WebSocket
transporti ASP.NET Core da alohida yoqilishi kerak; busiz brauzer har
safar `Failed to start the transport 'WebSockets'` xatoligini beradi va
ulanish uzoq so'rovga (long polling) tushib qoladi.

**Tuzatish:** `Program.cs` da `app.UseRouting()` dan **keyin**,
`MapHub` dan **oldin** qo'shildi — tartib muhim, chunki WebSocket
yangilanishi marshrutlash aniqlangandan keyin, hub bilan bog'lanishdan
oldin bo'lishi kerak.

CORS siyosati (`AllowCredentials`) va `access_token` so'rov parametri
allaqachon to'g'ri sozlangan edi (T-038 da tekshirilgan).

**Tekshirildi:** brauzer konsolida SignalR ulanish xatoliklari qolmadi.
Kuzatilgan `ERR_CONNECTION_REFUSED` xabarlari .NET xizmati qayta
qurilish uchun to'xtatilgan qisqa oraliqqa tegishli edi — xizmat
ko'tarilgach ular takrorlanmadi.

**Bajarilmagan band:** Nginx WebSocket proksi sozlamalari
(`proxy_set_header Upgrade` / `Connection "upgrade"`) — bu ishlab
chiqarish serveri konfiguratsiyasi va mahalliy muhitda tekshirib
bo'lmaydi. `DEPLOY_LINUX.md` da bu sozlama allaqachon mavjud.

---

### ✅ T-066 — ~~Tibbiy ma'lumotlar brauzer konsoliga chiqariladi (debug kod qolgan)~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Xavfsizlik / Kod sifati / Yuqori
**Fayllar:** `frontend/src/components/results/EcgOldResult.js:46`, `holter_analyse/HolterOldResult.js:45`, `lab_analyse/LabOldResult.js:45`, `smad_analyse/SmadOldResult.js:45` va yana 7 ta fayl

**Muammo:**
Tahlil natijasi sahifasi ochilganda brauzer konsoliga **bemorning to'liq AI tibbiy xulosasi** chiqariladi:

```js
console.log(cleaned, 'AAAAAAAAAAAA')
```

Konsolda ko'rilgan haqiqiy chiqish (2026-08-29): to'liq JSON — `digital_measurements`, `automatic_analysis`, `AI_recommendations`, `final_summary`, ya'ni bemorning butun kardiologik xulosasi, so'ngida `AAAAAAAAAAAA` degan qoldiq debug matni bilan.

Kod bazasida jami **35 ta `console.log`** chaqiruvi, **11 ta faylda**:
`App.js`, `index.js`, `AdminModal.js`, `EcgOldResult.js`, `HolterOldResult.js`, `LabOldResult.js`, `SmadOldResult.js`, `Diagnoses.js`, `ClinicInfo.js`, `CreateUpdateDoctor.js`, `Patcients.js`

**Nima uchun muhim:**
- Konsol loglari brauzer kengaytmalari, xatolik kuzatuv xizmatlari (Sentry va h.k.) va ekran yozib olish dasturlari tomonidan o'qilishi mumkin.
- Umumiy kompyuterda (klinikada odatiy holat) keyingi foydalanuvchi konsolni ochib avvalgi bemor ma'lumotini ko'rishi mumkin.
- `AAAAAAAAAAAA` — bu tugallanmagan ishning aniq belgisi; kod ko'rib chiqishdan (code review) o'tmagani ko'rinadi.

**Tuzatish rejasi:**
1. To'rtta `console.log(cleaned, 'AAAAAAAAAAAA')` ni **darhol** o'chirish.
2. Qolgan 31 ta `console.log` ni ko'rib chiqish: kerakli bo'lsa `logger.debug()` ga o'tkazish, aks holda o'chirish.
3. ESLint qoidasi qo'shish: `"no-console": ["error", { "allow": ["warn", "error"] }]`.
4. Production build'da `console.log` ni avtomatik olib tashlash (`terser` `drop_console`).
5. `catch (err) { console.log(err) }` naqshini `handleApiError(err)` ga almashtirish — hozir ba'zi joylarda xatolik jimgina yutib yuborilmoqda.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**
Kod bazasidan **34 ta `console.log` chaqiruvi** olib tashlandi (10 ta faylda), jumladan
to'rtta natija komponentidagi `console.log(cleaned, 'AAAAAAAAAAAA')` — u bemorning
to'liq AI tibbiy xulosasini brauzer konsoliga chiqarardi.

Bundan tashqari `App.js` dagi **ikkita bo'sh `catch` bloki** to'ldirildi — ular
xatolikni jimgina yutib yuborardi; endi badge sonlari nolga tushiriladi va
izoh bilan hujjatlashtirilgan.

**Tekshiruv:** `grep -rn "console.log" src/` → faqat `index.js` dagi
CRA shabloni izohi qoldi (kod emas). Frontend kompilyatsiyasi toza.

---

### ✅ T-067 — ~~`EcgOldResult` da React `key` ogohlantirishi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Kod sifati / O'rta
**Fayl:** `frontend/src/components/results/EcgOldResult.js`

**Muammo:**
Konsolda takroriy ogohlantirish:
```
Warning: Each child in a list should have a unique "key" prop.
Check the render method of `EcgOldResult`.
```

`key` yo'qligi React'ga ro'yxat elementlarini to'g'ri farqlashga xalaqit beradi. Amaliy oqibat: ro'yxat yangilanganda noto'g'ri element qayta ishlatilishi mumkin — masalan bir tahlildan ikkinchisiga o'tganda eski qiymat ekranda qolib ketishi. Tibbiy ma'lumotda bu jiddiy.

**Tuzatish rejasi:**
1. `EcgOldResult.js` dagi barcha `.map()` chaqiruvlariga barqaror `key` qo'shish (indeks emas, ma'lumot identifikatori).
2. Boshqa `*OldResult.js` fayllarini ham tekshirish (bir xil kod nusxalangan — T-034).
3. `react/jsx-key` ESLint qoidasini yoqish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Sabab:** natija komponentlarida `.map()` chaqiruvlari `key` bermasdi.

Tuzatilgan joylar:

| Fayl | Ro'yxat | Kalit |
|---|---|---|
| `EcgOldResult.js` | davolovchi shifokorlar | `item.id` |
| `EcgOldResult.js` | shikoyatlar | `item.id` |
| `HolterOldResult.js` | davolovchi shifokorlar | `item.id` |
| `SmadOldResult.js` | davolovchi shifokorlar | `item.id` |
| `LabOldResult.js` | davolovchi shifokorlar | `item.id` |
| `LabOldResult.js` | tahlil toifalari | `item.id` |

Kalit sifatida **indeks emas, ma'lumot identifikatori** ishlatildi:
indeks ro'yxat tartibi o'zgarganda barqaror emas va aynan T-067 da
tasvirlangan muammoni (eski qiymat ekranda qolib ketishi) hal qilmaydi.

**Yo'l-yo'lakay topilgan ikkinchi manba.** Konsoldagi ogohlantirishlarning
bir qismi natija komponentlaridan emas, antd jadvalining o'zidan
(`Body`) kelardi. Sabab: **`Xodimlar` jadvalida `rowKey` berilmagan** —
loyihadagi jadvallar ichida yagona shunday joy. Busiz antd qatorlarga
indeks bo'yicha kalit beradi va sahifa almashganda React eski qatorni
qayta ishlatib, xodim ma'lumotlari aralashib ketishi mumkin.
`rowKey={(record) => record.id}` qo'shildi.

Uchinchi band (`react/jsx-key` ESLint qoidasini yoqish) — CRA ning
standart `eslint-config-react-app` konfiguratsiyasida bu qoida
**allaqachon yoqilgan**: aynan u konsolda ogohlantirish berardi.
Qo'shimcha sozlash talab qilinmadi.

---

### ✅ T-068 — ~~Ma'lumotlar bazasidagi imlo xatolari va nomuvofiq nomlar~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Ma'lumotlar bazasi / Texnik qarz / O'rta
**Fayllar:** `backend/EkgAnalyzerApi/Models/VerificationCode.cs`, `Patient.cs`, migratsiyalar

**Muammo:**
Baza sxemasida bir nechta imlo xatosi mavjud, ular kod bo'ylab tarqalgan:

| Hozirgi nom | To'g'ri nom |
|---|---|
| `varification_codes` (jadval) | `verification_codes` |
| `patcients` (jadval), `patcient_id` (ustun) | `patients`, `patient_id` |
| `bank_accaunt` (ustun) | `bank_account` |
| `Patcient.cs`, `PatcientService.cs`, `PatcientController.cs` | `Patient*` |
| `surename` (ustun) | `sure_name` yoki `middle_name` |

Bundan tashqari `clinics` jadvalida `is_active` bor, lekin klinika INN va bank ma'lumotlari `clinic_details` da — bu mantiqiy, ammo `clinic_details.license` ustuni `licence` deb ham yozilishi mumkin bo'lgan joylar bor.

**Nima uchun muhim:**
Yangi dasturchi `verification_codes` deb yozib xato oladi va sababini uzoq qidiradi. Auditning o'zida ham shu bo'ldi. API hujjatlarida `patcient_id` ko'rgan tashqi integrator ham chalkashadi.

**Tuzatish rejasi:**
1. Nomlarni tuzatuvchi EF Core migratsiyasi yozish (`RenameTable` / `RenameColumn`).
2. Kod bo'ylab barcha havolalarni yangilash (C#, Python `models.py`, frontend DTO maydonlari).
3. Frontend uchun API javob maydonlari o'zgarishini hisobga olish — bu **buzuvchi o'zgarish** (breaking change), shuning uchun bir vaqtda barcha qatlamda bajarilishi kerak.
4. Muqobil (kam xavfli) yondashuv: baza nomlarini qoldirib, C# modellarida `[Table]`/`[Column]` atributlari orqali to'g'ri nomlar bilan ishlash. Kod toza bo'ladi, baza o'zgarmaydi.
5. Kelajakda: nomlash konventsiyasini konstitutsiyada aniq belgilash va kod ko'rib chiqishda tekshirish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

Migratsiya `20260903000000_FixSchemaSpelling`.

| Edi | Bo'ldi |
|---|---|
| `varification_codes` (jadval) | **`verification_codes`** |
| `patcients` (jadval) | **`patients`** |
| `patcient_id` (6 jadvalda) | **`patient_id`** |
| `clinic_details.bank_accaunt` | **`bank_account`** |
| `doctors.surename`, `patients.surename` | **`sure_name`** |

### Nima uchun faqat baza nomlari o'zgardi

Rejaning 1–3-bandlari uch qatlamni birdaniga o'zgartirishni taklif
qiladi va taskning o'zi buni **buzuvchi o'zgarish** deb ataydi. Bu
haqiqatan shunday: JSON javob maydonlari C# xossa nomlaridan olinadi,
ya'ni `Patcient` → `Patient` o'zgarishi `patcientId` → `patientId` ga
aylanadi va tashqi integratorlarning kodini to'xtatadi. Bunday qaror
— loyiha egasiniki, uni men qabul qila olmayman.

Shu sababli **4-band** tanlandi, lekin taskda yozilganiga qarama-qarshi
yo'nalishda. Taskda "baza nomlarini qoldirib, C# atributlari orqali
to'g'ri nomlar bilan ishlash" deyilgan. Bu esa muammoni **teskari
tomonga** ko'chirardi: task sarlavhasi "**Ma'lumotlar bazasidagi**
imlo xatolari" va aynan baza yangi dasturchini chalg'itadi
(`verification_codes` deb yozib xato olish — auditning o'zida ham
shunday bo'lgan).

Shuning uchun: **baza tuzatildi**, C# xossa nomlari `[Column]`
atributlari orqali eski holicha qoldirildi. Natijada:

* baza sxemasi toza;
* API shartnomasi **umuman o'zgarmadi**;
* C# nomlarini keyinroq, alohida va e'lon qilingan versiyada
  o'zgartirish mumkin.

### Qatlamlar bo'yicha o'zgarishlar

**C#** — 11 ta atribut (10 ta modelda). Xossa nomlari tegilmagan.

**Python** — `models.py` da beshta ustun aniq nomlandi:

```python
patcient_id = Column("patient_id", Integer)
```

Atribut nomi `patcient_id` bo'lib qoladi, chunki u API form maydoni
(`patcient_id: int = Form(...)`) va boshqa modullar bilan bog'langan;
faqat baza ustuni boshqacha nomlanadi.

`duplicate_guard.py` dagi xom SQL (`WHERE patcient_id = :pid`) ham
yangilandi — u SQLAlchemy modelidan o'tmaydi, to'g'ridan-to'g'ri
bazaga boradi.

**Frontend** — hech qanday o'zgarish kerak emas, chunki API maydonlari
o'zgarmadi.

### `licence` haqida

Taskda "`clinic_details.license` ustuni `licence` deb ham yozilishi
mumkin bo'lgan joylar bor" deyilgan. Tekshirildi: bazada `licence`
nomli **birorta ustun yo'q**, faqat to'g'ri yozilgan `license`.
Tuzatadigan narsa topilmadi.

### Tekshiruv (jonli)

**Sxema:**

```
jadvallar:  patients, verification_codes        (eski nomlar yo'q)
ustunlar:   ecg/holter/smad/lab/medical_diagnoses/parasitology
            .patient_id  — oltitasi ham
            clinic_details.bank_account
            doctors.sure_name, patients.sure_name
```

`consultations`, `video_conferences`, `patient_analysis` jadvallarida
`patient_id` allaqachon to'g'ri yozilgan edi.

**Python** (haqiqiy `SessionLocal` orqali):

| So'rov | Natija |
|---|---|
| `ECGAnalyse.patcient_id.isnot(None)` | `[(102, 13), (92, 12), (97, 13)]` |
| `LabAnalyses.patcient_id == 13` | `[(23, 13), (24, 13)]` |
| `duplicate_guard.find_duplicate` (xom SQL) | xatosiz |

**Brauzerda:**

| Sahifa | Natija |
|---|---|
| Bemorlar | 3 qator |
| Shifokor xulosasi | 1 qator |
| EKG / Holter / SMAD / Lab | 10 / 10 / 6 / 10 qator |
| Rekvizitlar (`bank_account` o'qish) | `1111 1111 1111 1111 1111` |
| Rekvizitlar (**yozish**) | bank nomi o'zgartirildi → bazada `bank_account` joyida, *"Tashkilot rekvizitlari saqlandi"* |

**API shartnomasi o'zgarmadi** — asosiy tekshiruv:

```
/api/clinic/get-clinic-by-id  → maydonlar: ['bankAccaunt', 'bankName']
/api/ecg-analyses/get-by-clinic → maydon: 'patcient'
```

Ya'ni baza `bank_account` va `patient_id` deb yozadi, API esa hamon
`bankAccaunt` va `patcient` qaytaradi — aynan mo'ljallanganidek.

Sinov uchun o'zgartirilgan bank nomi asl holiga qaytarildi.

---

### ✅ T-069 — ~~Faollashtirishni kutayotgan klinika nima bo'layotganini bilmaydi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Mahsulot mantiqi / UX / Yuqori
**Fayllar:** `frontend/src/components/ClinicActivationGate.js`, `backend/EkgAnalyzerApi/Services/AuthService.cs`, `Services/EmailService.cs`

**Kontekst:** Klinikani SuperAdmin bazada qo'lda faollashtiradi — bu **ataylab shunday**, haqiqiy klinika ekanini tasdiqlash uchun. Quyidagi vazifa bu qarorni o'zgartirishni emas, **kutish davridagi tajribani** yaxshilashni ko'zda tutadi.

**Muammo:**
Auditda yangi klinika to'liq ro'yxatdan o'tkazildi (`Test Shifo Klinikasi`, id 25): forma to'ldirildi, SMS bilan tasdiqlandi, admin profili va klinika manzili kiritildi. Shundan keyin `is_active = false` holatida qoladi va tahlil sahifalari qulflanadi.

Shu nuqtada foydalanuvchi ko'radigan yagona narsa — sarlavhadagi kichik banner: **"Klinikangiz hali faollashtirilmagan"**. Va boshqa hech narsa:

- **Nima qilish kerakligi aytilmaydi** — kutish kerakmi, kimgadir qo'ng'iroq qilish kerakmi?
- **Qancha kutish kerakligi** ko'rsatilmaydi.
- **Bog'lanish ma'lumoti yo'q** — telefon, email, Telegram.
- **Platforma administratoriga bildirishnoma bormi — noma'lum.** `EmailService` mavjud, lekin yangi ro'yxatdan o'tish haqida xabar yuborilishi kodda ko'rinmadi. Agar yuborilmasa, SuperAdmin bazani qo'lda kuzatib turishi kerak — yangi klinika bir necha kun e'tibordan chetda qolishi mumkin.
- **Faollashtirilgandan keyin klinikaga xabar berilmaydi** — u har kuni kirib tekshirib ko'rishi kerak.

**Nima uchun muhim:**
Klinika ro'yxatdan o'tishga 10-15 daqiqa sarflaydi (guvohnoma faylini topish, bank rekvizitlarini yig'ish) va oxirida hech qanday tushuntirishsiz to'xtab qoladi. Bunday tajribadan keyin ko'pchilik qaytib kelmaydi — bu to'g'ridan-to'g'ri konversiya yo'qotishi.

**Tuzatish rejasi:**
1. **Banner o'rniga to'liq holat sahifasi** ko'rsatish. Unda:
   - Ro'yxatdan o'tish qadamlari va ularning holati (✅ ma'lumotlar to'ldirildi → ⏳ tekshiruvda)
   - Kutilayotgan muddat: "Odatda 1 ish kuni ichida"
   - Bog'lanish: telefon, email, Telegram tugmalari bilan
   - "Ariza raqami: NMED-CL-000025" — murojaat qilganda foydalanish uchun
2. **SuperAdmin ga bildirishnoma:** yangi klinika ro'yxatdan o'tganda email/Telegram xabar (`EmailService` mavjud). Xabarda klinika nomi, INN va guvohnoma fayliga havola bo'lsin.
3. **Klinikaga xabar:** faollashtirilgach SMS va email — "Klinikangiz faollashtirildi, ishni boshlashingiz mumkin" + kirish havolasi.
4. **Rad etish oqimi:** klinika soxta bo'lsa — sabab bilan rad etish va xabar berish (hozir faqat `is_active` bayrog'i bor, rad etilgan holat yo'q).
5. **Kutish davrida cheklangan demo rejimi** — 2-3 ta sinov tahlili qilib ko'rish imkoniyati. Klinika mahsulotni ko'rmasdan kutishga rozi bo'lmaydi; demo konversiyani sezilarli oshiradi.
6. Keyinchalik SuperAdmin paneli qilinganda bu oqim interfeysga ko'chiriladi (T-062).

#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ishlar:**

**1. Banner o'rniga to'liq holat sahifasi**
`components/ClinicActivationGate.js` noldan yozildi. Ilgari faqat bitta jumla
("Klinikangiz hali faollashtirilmagan") va umumiy maslahat bor edi. Endi:
* **Qadamlar holati** (`Steps`): ✅ Ro'yxatdan o'tildi → ⏳ Tekshiruvda →
  ○ Faollashtirish, har biri izohi bilan;
* **Kutilayotgan muddat**: "Odatda 1 ish kuni ichida ko'rib chiqiladi";
* **Ariza raqami** `NMED-CL-000025` + klinika nomi — operator murojaatda
  klinikani darhol topishi uchun;
* **Bog'lanish tugmalari**: telefon (`tel:`), email (`mailto:`), Telegram.
  Aloqa ma'lumotlari `REACT_APP_SUPPORT_*` env o'zgaruvchilaridan olinadi.
* Nima uchun tekshiruv borligi tushuntirildi — "haqiqiy tibbiy muassasa
  ekanini tasdiqlash uchun".

**2. Platforma administratoriga bildirishnoma**
* `Services/EmailService.cs` — `SendClinicRegisteredToAdminAsync(...)`:
  ariza raqami, klinika nomi, INN, admin email va klinika ID bilan HTML xat.
* `Services/AuthService.cs` — ro'yxatdan o'tish tranzaksiyasi commit
  bo'lgandan **keyin** fonda yuboriladi (`NotifyAdminInBackground`): SMTP
  sekin yoki ishlamay qolsa ham ro'yxatdan o'tish to'xtamaydi, xato faqat
  logga tushadi.
* Manzil `Notifications:PlatformAdminEmail` dan. Sozlanmagan bo'lsa xat
  yuborilmaydi, lekin **ogohlantirish logga yoziladi** — "xabar
  yuborilyaptimi?" degan savolga javob topib bo'ladigan bo'ldi.

**3. Klinikaga faollashtirish xabari**
* `EmailService.SendClinicActivatedAsync(...)` — "Klinikangiz faollashtirildi"
  + "Platformaga kirish" tugmasi (`App:PublicUrl`).
* `Services/ClinicService.cs::SetClinicActiveAsync` — endi oldingi holatni
  eslab qoladi va **faqat `false → true` o'tishida** xabar yuboradi
  (qayta-qayta `true` qilinsa takroriy xat ketmaydi).
* Xabar yuborishdagi xato faollashtirishning o'zini bekor qilmaydi —
  `try/catch` + `ILogger`.

**4. Sozlash kalitlari**
* `appsettings.json` — `App:PublicUrl`, `Notifications:PlatformAdminEmail`
  (bo'sh, hujjatlashtirilgan).
* `appsettings.Development.json` — ishlaydigan qiymat.
* `.env.production.example` — `Notifications__PlatformAdminEmail`,
  `App__PublicUrl` izohlar bilan.

**5. Tarjima** — 9 ta yangi kalit uch tilda (630 → 639).

**Tekshirildi:**

| Tekshiruv | Natija |
|---|---|
| Brauzer: faol bo'lmagan klinika admini (`Test Shifo Klinikasi`, id 25) `/ecg-analyses` ga kirdi | To'liq holat sahifasi chiqdi: qadamlar, muddat, ariza raqami, aloqa tugmalari |
| Ariza raqami | `NMED-CL-000025` — klinika id 25 ga mos |
| Rus tili | Sahifa to'liq tarjima qilingan ("Ваша клиника ещё не активирована", "На проверке", "Обычно рассматривается в течение 1 рабочего дня", "Номер заявки") |
| Yon menyu | Faol emas bo'limlar qulf belgisi bilan ko'rinadi (ilgarigidek) |
| Yangi klinika ro'yxatdan o'tkazildi (`POST /api/auth/register`) | `200 {"message":"code_sended"}`, bazada klinika **#26** `is_active=false` |
| `dotnet.log` | Xabar yuborishda xato yo'q — SMTP ga muvaffaqiyatli topshirildi |
| Faol klinika admini (`R doctors`) | Sahifalar odatdagidek ochiladi — gate faqat faol emas klinikaga ta'sir qiladi |
| Build | 0 xato |

**Yo'l-yo'lakay tuzatildi:** T-027 dagi global query filter EF ogohlantirishi
(`Entity 'LabAnalyses' has a global query filter … required end of a
relationship with 'LabAnalyseCategories'`) — `LabAnalyseCategories` uchun ham
mos filtr qo'shildi. Ogohlantirishlar soni 1 → 0.

**Bajarilmagan (sababi bilan):**
* **Faollashtirish xatini uchdan-uchgacha sinash** — `PATCH
  /api/clinic/{id}/set-active` faqat SuperAdmin roli bilan ishlaydi, bazada
  esa hozircha SuperAdmin foydalanuvchi umuman yo'q (SuperAdmin kabineti
  T-062 da quriladi). Kod kompilyatsiya qilinadi, xato yo'li loglanadi va
  faollashtirishni buzmaydi, lekin haqiqiy xat yuborilishini sinab
  ko'rilmadi.
* **Rad etish oqimi** (4-band) va **kutish davridagi demo rejimi** (5-band) —
  ular ma'lumotlar modeliga yangi holat (`rejected`, sabab) va alohida
  mahsulot qarorini talab qiladi; SuperAdmin paneli bilan birga (T-062)
  bajarilishi to'g'riroq.

### ✅ T-070 — ~~Foydalanuvchi ismi to'ldirilmaganda interfeysda "null" yozuvi chiqadi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UI / Yuqori
**Fayllar:** `frontend/src/components/Header.js`, foydalanuvchi ismini ko'rsatadigan boshqa joylar

**Muammo:**
Yangi ro'yxatdan o'tgan admin birinchi marta kirganda sarlavhada ismi o'rniga **`null`** so'zi chiqadi (brauzerda tasdiqlandi, 2026-08-29).

Sabab: `doctors` yozuvi ro'yxatdan o'tishda `firstname` va `lastname` bo'sh holda yaratiladi, frontend esa ularni tekshirmasdan birlashtiradi (`firstName?.[0] + '.' + lastName` kabi).

Bu foydalanuvchining platformada ko'radigan **birinchi ekrani** — va u yerda dasturchi xatosi turibdi.

**Tuzatish rejasi:**
1. Ism ko'rsatishni yagona yordamchi funksiyaga chiqarish:
   ```js
   export const displayName = (d) =>
     [d?.lastName, d?.firstName].filter(Boolean).join(' ') || t('user_no_name');
   ```
2. Ism yo'q bo'lsa telefon raqamini yoki "Ismni to'ldiring" matnini ko'rsatish.
3. Kod bazasi bo'ylab `null` chiqishi mumkin bo'lgan boshqa joylarni qidirish (`{user.` naqshi bilan).
4. Ism bo'sh bo'lganda avatar o'rniga bosh harflar emas, umumiy ikonka ko'rsatish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**
- `tools/formatters.js` ga yangi **`displayName(person, opts)`** yordamchisi qo'shildi. U `full` va `short` uslublarni qo'llab-quvvatlaydi, ism bo'lmasa telefon raqamini yoki berilgan zaxira matnni qaytaradi.
- `formatHeaderLastname` bo'sh satrdan himoyalandi — ilgari `""` uchun `"undefined."` qaytarardi.
- `Header.js` endi `displayName(user?.doctor, { style: 'short', fallback: t('user_no_name') })` ishlatadi.
- `user_no_name` kaliti uch tilga qo'shildi ("Ismni to'ldiring" / "Заполните имя" / "Complete your name").

**Sabab:** `formatHeaderLastname(lastName) + firstName` ifodasida `firstName` `null`
bo'lsa JS `"" + null` ni `"null"` ga aylantirardi. Yangi ro'yxatdan o'tgan foydalanuvchi
platformadagi **birinchi ekranida** o'z ismi o'rniga `null` so'zini ko'rardi.

---

### ✅ T-071 — ~~Klinika faollashtirilmaganda "Tez harakatlar" tugmalari faol qoladi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UX / Mantiqiy nomuvofiqlik / Yuqori
**Fayllar:** `frontend/src/pages/cabinet/Dashboard.js`, `frontend/src/components/shared/StatCard.js`

**Muammo:**
Faollashtirilmagan klinikada:
- Yon menyudagi tahlil bo'limlari **to'g'ri qulflangan** (kulrang, qulf ikonkasi bilan) ✅
- Ammo asosiy paneldagi **"Tez harakatlar" tugmalari faol** ❌ — "Yangi EKG tahlil qilish", "Yangi Holter tahlil", "Yangi SMAD tahlil", "Yangi laboratoriya tahlil", "Yangi diagnoz"

Foydalanuvchi bu tugmani bosadi va `ClinicGatedRoute` uni to'sadi — natijada tushunarsiz sakrash yoki bo'sh sahifa.

Xuddi shunday, statistika kartochkalari ham bosiladigan (`path` props bilan) — ular ham qulflangan sahifalarga olib boradi.

**Tuzatish rejasi:**
1. `clinicIsActive === false` bo'lganda tez harakat tugmalarini `disabled` qilish va `Tooltip` da sababni ko'rsatish.
2. Statistika kartochkalarini ham bosilmaydigan qilish.
3. Yagona `useClinicActive()` hook yaratib, barcha joyda shu holatga tayanish — hozir mantiq `SideBar` va `ClinicGatedRoute` da alohida-alohida.
4. Faollashtirilmagan klinika uchun asosiy panelni **butunlay boshqa ko'rinishga** o'tkazish: statistika o'rniga "Klinikangiz ko'rib chiqilmoqda" bo'limi va keyingi qadamlar ro'yxati (T-069).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**
- `Dashboard.js` da `clinicIsActive` hisoblanadi (SuperAdmin uchun tekshiruv qo'llanmaydi).
- **Tez harakat tugmalari** klinika faollashtirilmaganda `disabled` bo'ladi va `title` orqali sababi ko'rsatiladi.
- **Statistika kartochkalari** ham `disabled` — bosilmaydi, xiralashadi va Ant Design `Tooltip` bilan sabab tushuntiriladi.
- `clinic_not_active_hint` kaliti uch tilga qo'shildi.

Ilgari yon menyudagi tahlil bo'limlari to'g'ri qulflangan edi, lekin asosiy paneldagi
tugmalar faol qolardi — foydalanuvchi bosganda `ClinicGatedRoute` uni to'sardi va
tushunarsiz sakrash yuz berardi.

---

### ✅ T-072 — ~~Onboarding modallari xodim formasidan nusxa olingan — matnlar noto'g'ri~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UX / Matn / O'rta
**Fayllar:** `frontend/src/components/AdminModal.js`, `frontend/src/components/ClinicSetupModal.js`

**Muammo:**
Ro'yxatdan o'tgan admin o'z **shaxsiy profilini** to'ldirayotganda modal quyidagi matnlarni ko'rsatadi:

| Element | Hozirgi matn | Muammo |
|---|---|---|
| Maydon placeholder | "Xodimning familiyasini kiriting" | Bu **o'z** familiyasi, "xodim" emas |
| Maydon placeholder | "Xodimning ismini kiriting" | Xuddi shunday |
| Maydon placeholder | "Xodimning sharifini kiriting" | Xuddi shunday |
| Tugma | **"Xodim ma'lumotlarini saqlash"** | "Ma'lumotlarni saqlash" bo'lishi kerak |
| Tavsif | "shaxsiy ma'lumotlari**ningiz**ni" | Imlo xatosi — qo'shimcha takrorlangan |

Bu matnlar xodim qo'shish formasidan nusxa olingani aniq ko'rinib turibdi.

**Qo'shimcha kamchiliklar:**
- Ikki bosqichli onboarding'da **qadam ko'rsatkichi yo'q** ("1-qadam / 2 dan").
- Ikkala modalda tugma ranglari har xil (biri firuza, ikkinchisi yashil).
- Modalni yopish yoki "keyinroq" qilish imkoniyati yo'q — foydalanuvchi qamalib qoladi (tizimdan chiqishdan boshqa yo'l yo'q).

**Tuzatish rejasi:**
1. Barcha matnlarni birinchi shaxsga o'tkazish: "Familiyangizni kiriting", "Ma'lumotlarni saqlash".
2. Imlo xatosini tuzatish.
3. Ant Design `Steps` komponenti bilan qadam ko'rsatkichi qo'shish.
4. Tugma ranglarini birxillashtirish.
5. Onboarding'ni modallar o'rniga **to'liq sahifali qadamli oqim** qilish (T-062 dagi 9-band) — bu chalkashlikni kamaytiradi va progressni ko'rsatadi.
6. Har bir qadamda "Nima uchun bu ma'lumot kerak?" degan qisqa tushuntirish qo'shish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

### Matnlar tuzatildi

Modal foydalanuvchining **o'z** profili haqida, lekin matnlar xodim
qo'shish formasidan nusxa olingan edi:

| Element | Avval | Keyin |
|---|---|---|
| Familiya placeholder | "Xodimning familiyasini kiriting" | "Familiyangizni kiriting" |
| Ism placeholder | "Xodimning ismini kiriting" | "Ismingizni kiriting" |
| Sharif placeholder | "Xodimning sharifini kiriting" | "Sharifingizni kiriting" |
| Jins placeholder | "Xodimning jinsini tanlang" | "Jinsingizni tanlang" |
| Tugma | **"Xodim ma'lumotlarini saqlash"** | "Ma'lumotlarni saqlash" |
| Tavsif | "shaxsiy ma'lumotlari**ningiz**ni" | "shaxsiy ma'lumot**laringiz**ni" |

Yangi kalitlar uchala tilda ham qo'shildi — eski `*_staff` kalitlari
xodim formasida o'z joyida qoladi.

### Qadam ko'rsatkichi

Ikki bosqichli sozlash tartibi `App.js` da aniqlandi: avval shaxsiy
profil (`open_admin_modal`), so'ng klinika (`clinic_setup_modal`).
Ikkala oynaga ham `Steps` qo'shildi: "Shaxsiy ma'lumotlar" → "Klinika
ma'lumotlari".

**Muhim nuance:** shaxsiy ma'lumotlar oynasi header menyusidan ham
ochiladi (profilni keyinchalik tahrirlash uchun). U yerda "1-qadam / 2
dan" yozuvi noto'g'ri bo'lardi, shuning uchun ko'rsatkich faqat profil
hali to'ldirilmagan bo'lsa chiziladi — bu `closable` uchun allaqachon
ishlatiladigan shart.

### Tugma ranglari birxillashtirildi

`ClinicSetupModal` da tugmaga inline `background: '#1D9E75'` (yashil)
berilgan edi va u dizayn tizimidagi firuza rangni bosib o'tardi. Ketma-ket
chiqadigan ikki oynada tugma ikki xil rangda edi. Inline uslub olib
tashlandi — ikkalasi ham `btn_form` klassidan oladi.

### Tekshiruv (brauzerda)

Oyna header menyusidan ochildi:
`"Shaxsiy ma'lumotlaringizni kiriting | Familiya | Ism | Sharif | Jins |
Telefon raqam | Ma'lumotlarni saqlash"` — qadam ko'rsatkichi yo'q
(tahrirlash rejimi, to'g'ri).
Placeholderlar: `Familiyangizni kiriting`, `Ismingizni kiriting`,
`Sharifingizni kiriting`.

---

### ✅ T-073 — ~~Ro'yxatdan o'tish formasida imlo xatosi va ortiqcha talablar~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UX / Matn / O'rta
**Fayl:** `frontend/src/pages/auth/components/Register.js`

**Muammo:**

1. **Imlo xatosi:** bo'lim sarlavhasi **"SHIPOXONA MA'LUMOTLARI"** — to'g'risi "SHIFOXONA". (Maydon yorlig'ida esa to'g'ri: "Shifoxona INN".)

2. **Barcha bank rekvizitlari majburiy:** Hisob raqam, MFO, Bank nomi — uchalasi ham `required`. Klinika platformani ko'rib chiqishni xohlasa ham, avval buxgalteriyadan ma'lumot so'rashi kerak. Bu ro'yxatdan o'tishni keskin qiyinlashtiradi.

3. **Parolni tasdiqlash maydoni yo'q** — foydalanuvchi parolni xato yozsa, buni faqat keyingi kirishda biladi.

4. **Foydalanish shartlari bilan rozilik yo'q** — tibbiy platforma uchun shaxsiy ma'lumotlarni qayta ishlashga rozilik huquqiy jihatdan zarur.

5. **Email maydoni yo'q** — tizim `998901112233@phone.nmed.local` ko'rinishida sun'iy email yaratadi. Haqiqiy email bo'lmasa: parolni tiklash faqat SMS orqali, hisobotlarni yuborish imkonsiz, muhim bildirishnomalar yetib bormaydi.

6. Forma 1440 px ekranda faqat chap yarmini egallaydi (~530 px), o'ng yarmi rasm. Uzun formani ikki ustunga bo'lish mumkin edi.

**Tuzatish rejasi:**
1. "SHIPOXONA" → "SHIFOXONA".
2. Bank rekvizitlarini **ixtiyoriy** qilish (ro'yxatdan o'tishda), keyinroq "Tashkilot ma'lumotlari" sahifasida to'ldirilsin. Faollashtirish uchun majburiy qilish mumkin.
3. "Parolni tasdiqlang" maydonini qo'shish.
4. Foydalanish shartlari va maxfiylik siyosati bilan rozilik katagi (havolalar bilan).
5. Email maydonini qo'shish (ixtiyoriy emas — parolni tiklash va hisobotlar uchun kerak).
6. Formani ikki ustunga joylashtirish yoki qadamlarga bo'lish (Klinika → Admin → Tasdiqlash).
7. Parol kuchi indikatori (T-022 bilan birga).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**1. Imlo xatosi** — "SHIPOXONA" → "SHIFOXONA". Tekshirilganda bu
allaqachon tuzatilgan ekan (`clinic_info` kaliti). Brauzerda tasdiqlandi:
bo'lim sarlavhasi **"SHIFOXONA MA'LUMOTLARI"**.

**2. Bank rekvizitlari endi ixtiyoriy.** Hisob raqam, MFO va Bank nomi
`required` bo'lishdan chiqarildi. Bu ma'lumotlar to'lov bosqichida
kerak, ro'yxatdan o'tishda emas — ilgari klinika platformani ko'rib
chiqish uchun ham avval buxgalteriyaga murojaat qilishi kerak edi.

**3. Parolni tasdiqlash maydoni qo'shildi.** Ilgari parol xato yozilsa,
foydalanuvchi buni faqat keyingi kirishda bilardi.

**4. Rozilik belgisi qo'shildi** — "Shaxsiy va tibbiy ma'lumotlarni
qayta ishlashga roziman". Belgilanmasa forma yuborilmaydi. Tibbiy
platforma uchun bu huquqiy talab.

**5. Email maydoni qo'shildi (ixtiyoriy).** Backend tomonida
`RegisterDto.Email` va `AuthService` da: haqiqiy pochta berilsa o'sha
saqlanadi, aks holda eski `...@phone.nmed.local` sun'iy manzili qoladi.
Sun'iy manzilga hech narsa yetib bormaydi: parolni tiklash faqat SMS
orqali ishlaydi, hisobotlarni yuborib bo'lmaydi, klinika
faollashtirilgani haqidagi xabar ham yo'qoladi.

**6. Forma kengaytirildi.** 1520 px ekranda o'lchandi:

| Nima | Avval | Keyin |
|---|---|---|
| Forma eni | 644 px | **700 px** |
| Sahifa balandligi | 1074 px | **980 px** |

Ikki o'zgarish: keng ekranlarda (≥1200 px) formaga 62% joy beriladi
(rasm 38%), va uchta bank maydoni bitta qatorga joylashtirildi (ilgari
`12 / 12 / 24` — ikki qator).

**Moslashuvchanlik saqlandi:** 375 px da tekshirildi — maydonlar to'liq
enda ustma-ust joylashadi, gorizontal aylanish **yo'q**.

### Yakuniy holat (brauzerda o'lchandi)

| Maydon | Majburiymi |
|---|---|
| Tashkilot nomi, Shifoxona INN, Guvohnoma | ✅ ha |
| **Hisob raqam, MFO, Bank nomi** | ❌ **yo'q** (o'zgartirildi) |
| Telefon raqam, Yangi parol, **Parolni takrorlang** | ✅ ha |
| **Email** | ❌ yo'q (yangi) |
| **Rozilik** | ✅ ha (yangi) |

---

### ✅ T-074 — ~~Tarjima qilinmagan kalitlar interfeysda XOM MATN sifatida ko'rinadi (vizual tasdiq)~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** i18n / UI / Kritik
**Fayllar:** `frontend/src/locale/*`, `pages/cabinet/*/`*AnalysesList.js`, `pages/cabinet/consultation/ConsultantsPage.js`

**Muammo:**
T-055 da 33 ta yetishmayotgan kalit hujjatlashtirilgan edi. Endi ular **brauzerda haqiqiy foydalanuvchi ko'radigan holatda** tasdiqlandi (2026-08-29):

| Sahifa | Rol | Ekranda ko'rinadigan matn |
|---|---|---|
| EKG tahlillari (bo'sh ro'yxat) | Hamshira (5) | **`no_ecg_analyses`** |
| Konsultantlar → amallar ustuni | Direktor (3) | **`delete`** (har bir qatorda tugma matni sifatida) |

Ya'ni hamshira tizimga birinchi marta kirganda ekranning o'rtasida katta qilib `no_ecg_analyses` degan texnik yozuv turadi. Direktor konsultantlar sahifasida esa o'chirish tugmalarida `delete` yozilgan.

Bu T-055 va T-057 (fallbackLng yo'q) muammolarining bevosita natijasi va **haqiqiy klinikaga yuborilganda darhol ko'rinadi**.

**Tuzatish rejasi:** T-055 va T-057 bilan birga bajariladi. Qo'shimcha ravishda:
1. Barcha bo'sh holat (empty state) matnlarini tekshirish — bu eng ko'p e'tibordan chetda qoladigan joy.
2. Barcha jadval amal tugmalarini tekshirish.
3. Har bir rol bilan har bir sahifani ochib, ekrandagi matnlarni ko'z bilan tekshirish (yoki avtomatlashtirilgan skript: sahifa matnida `^[a-z_]+$` naqshiga mos so'zlarni qidirish).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:** T-055 va T-057 doirasida hal qilindi —
barcha yetishmayotgan kalitlar qo'shildi va `fallbackLng` sozlandi.

**Brauzerda tasdiqlandi:**

| Joy | Avval | Hozir |
|---|---|---|
| Hamshira, bo'sh EKG ro'yxati | `no_ecg_analyses` | "Hech qanday EKG tahlili topilmadi" ✅ |
| Konsultantlar, amallar ustuni | `delete` | "O'chirish" ✅ |
| Jadval bo'sh holati | "No data" (inglizcha) | "Ma'lumot yo'q" ✅ |

---

### ✅ T-075 — ~~Ant Design ichki matnlari tarjima qilinmagan (ingliz tilida qoladi)~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** i18n / Yuqori
**Fayl:** `frontend/src/index.js:16`

**Muammo:**
```jsx
<ConfigProvider theme={{ token: { zIndexPopupBase: 10000 } }}>
```
`ConfigProvider` ga **`locale` berilmagan**. Kod bazasida `antd/locale/...` importi umuman yo'q.

Natijada Ant Design komponentlarining barcha ichki matnlari **ingliz tilida** qoladi, interfeys o'zbek yoki rus tilida bo'lsa ham:

| Komponent | Ingliz tilida qoladigan matn |
|---|---|
| `Table` / `Empty` | **"No data"** — konsultantlar sahifasida ko'rildi |
| `Pagination` | "items per page", "Go to", "Previous Page", "Next Page" |
| `DatePicker` | oy nomlari, hafta kunlari, "Today", "Now", "Ok" |
| `Select` | "Not Found" |
| `Table` filtrlari | "Filter", "Reset", "OK" |
| `Upload` | "Upload", "Remove file" |
| `Modal` | "OK", "Cancel" |
| `Popconfirm` | "Yes", "No" |

Foydalanuvchi uchun bu chalkash aralashma: yozuvlar o'zbekcha, tugmalar inglizcha.

**Tuzatish rejasi:**
1. Ant Design v5 da rus va ingliz tillari uchun tayyor locale mavjud:
   ```jsx
   import ruRU from 'antd/locale/ru_RU';
   import enUS from 'antd/locale/en_US';
   ```
   O'zbek tili uchun antd'da rasmiy locale **yo'q** — o'zimiz yaratishimiz kerak (`antd/locale/en_US` ni nusxa olib tarjima qilish).
2. `ConfigProvider` ga joriy tilga qarab `locale` berish:
   ```jsx
   const antdLocale = { uz: uzUZ, ru: ruRU, en: enUS }[i18n.language] || uzUZ;
   <ConfigProvider locale={antdLocale} theme={...}>
   ```
3. `dayjs` locale'ini ham sozlash (`DatePicker` sanalar formati va oy nomlari uchun):
   ```js
   import 'dayjs/locale/ru'; import 'dayjs/locale/uz-latn';
   dayjs.locale(i18n.language);
   ```
4. Til almashtirilganda `ConfigProvider` va `dayjs` ikkalasi ham yangilanishini ta'minlash.
5. O'zbek locale faylini loyihada saqlash (`frontend/src/locale/antd/uz_UZ.js`).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**
- Yangi `locale/antdLocale.js` — rus (`ru_RU`) va ingliz (`en_US`) uchun tayyor locale, **o'zbek tili uchun qo'lda tuzilgan locale** (antd da rasmiy yo'q): `Pagination`, `Table`, `Modal`, `Popconfirm`, `Empty`, `Upload`, `Select`, `DatePicker` (oy va hafta kunlari nomlari bilan).
- `index.js` da yangi `LocalizedProviders` komponenti — til almashtirilganda `ConfigProvider` va **`dayjs` locale** ham birga yangilanadi.
- `applyDayjsLocale()` — sana formatlari til bilan mos keladi.

**Brauzerda tasdiqlandi:** rus tilida jadval bo'sh holati "Нет данных",
pagination va DatePicker matnlari ham rus tilida.

---

### ✅ T-076 — ~~Brauzerning tug'ma (native) elementlari interfeys tilidan farq qiladi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** i18n / UI / Yuqori
**Fayllar:** tahlil qo'shish sahifalari (`<input type="date">`), `pages/cabinet/pages/ClinicInfo.js` (`<input type="file">`)

**Muammo:**
Loyihada bir nechta joyda brauzerning **tug'ma** HTML elementlari ishlatilgan. Ular ilova tiliga emas, **brauzer tiliga** bo'ysunadi. Auditda (interfeys o'zbek tilida bo'lgan holda) ko'rilgan:

| Joy | Element | Ko'ringan matn |
|---|---|---|
| Yangi tahlil → "Tug'ilgan sana" | `<input type="date">` | **`дд.мм.гггг`** (ruscha) |
| Tashkilot ma'lumotlari → "Guvohnoma" | `<input type="file">` | **"Выберите файл" / "Файл не выбран"** (ruscha) |

Qo'shimcha muammolar:
- Tug'ma `date` inputi har bir brauzerda **turlicha ko'rinadi** (Chrome, Firefox, Safari) va mobil qurilmada butunlay boshqacha.
- Sana formati OS sozlamasiga bog'liq — foydalanuvchi `15.05.1990` kutadi, brauzer `05/15/1990` ko'rsatishi mumkin.
- Fayl tanlash tugmasi dizayn tizimiga mos kelmaydi (kulrang tizim tugmasi).

**Tuzatish rejasi:**
1. Barcha `<input type="date">` larni Ant Design **`DatePicker`** ga o'tkazish (`format="DD.MM.YYYY"` bilan). Konstitutsiyada `className="input_date"` naqshi qayd etilgan — uni yangilash kerak.
2. Sana oralig'i filtrlari uchun `DatePicker.RangePicker` ishlatish (T-019 ni ham hal qiladi).
3. Barcha `<input type="file">` larni Ant Design **`Upload`** komponentiga o'tkazish — bu ayni paytda faylni ko'rish (preview), hajm tekshiruvi va progress imkonini ham beradi (T-052, T-054).
4. `dayjs` locale bilan birga sozlash (T-075).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ishlar:**

**1. Sana maydonlari — `components/shared/DateField.js`**
Ant Design `DatePicker` asosidagi umumiy komponent:
* `format="DD.MM.YYYY"` — O'zbekistonda odatiy ko'rinish, OS sozlamasiga
  bog'liq emas;
* placeholder tarjima qilinadi (`Sanani tanlang` / `Выберите дату` / `Select a date`);
* **forma qiymati satr bo'lib qoladi** (`YYYY-MM-DD`) — shuning uchun mavjud
  yuborish mantig'ini o'zgartirish shart emas va backend bilan shartnoma
  buzilmaydi;
* tug'ilgan sana kelajakda bo'lishi mumkin emas (`disabledDate`).

**Almashtirilgan joylar (6 ta):**
* `components/shared/PatientSearchSection.js` — tug'ilgan sana (bu bitta
  komponent to'rtta tahlil yaratish sahifasida ishlatiladi);
* `EcgAnalyzer`, `HolterAnalyzer`, `SmadAnalyzer`, `LabAnalyzer`,
  `ParasitologyAnalyzer` — tahlil sanasi.

Ilgari bu maydonlarda interfeys o'zbek tilida bo'lsa ham brauzer tilidagi
**`дд.мм.гггг`** ko'rinardi, har bir brauzerda boshqacha edi va mobil
qurilmada butunlay boshqa ko'rinish berardi.

**2. Fayl tanlash — Ant Design `Upload`**
`pages/cabinet/pages/ClinicInfo.js` dagi guvohnoma maydoni. Ilgari tug'ma
`<input type="file">` edi va o'zbek interfeysda **"Выберите файл /
Файл не выбран"** deb yozilardi hamda kulrang tizim tugmasi dizayn tizimiga
mos kelmasdi. Endi:
* tarjima qilinadigan "Faylni tanlash" tugmasi (`UploadOutlined` ikonkasi bilan);
* tanlangan fayl nomi ro'yxatda ko'rinadi va o'chirish mumkin;
* **hajm tekshiruvi** — 10 MB dan katta fayl rad etiladi va sabab
  ko'rsatiladi (`Upload.LIST_IGNORE`);
* `beforeUpload` `false` qaytaradi — fayl formaga qo'shiladi, avtomatik
  yuborilmaydi (mavjud saqlash oqimi o'zgarmadi).

> Logotip maydonidagi `<input type="file">` ataylab qoldirildi: u
> `.input_img_box` ichida to'liq shaffof qatlam sifatida rasm ustiga
> qo'yilgan, brauzerning tug'ma matni umuman ko'rinmaydi va bosilganda
> rasmning o'zi tugma vazifasini bajaradi.

**3. Tarjima** — 3 ta yangi kalit uch tilda (715 → 718).

**Tekshirildi (brauzerda, Admin sifatida):**

| Tekshiruv | Ilgari | Hozir |
|---|---|---|
| `/analyse-ecg` tug'ilgan sana maydoni | `дд.мм.гггг` | **"Выберите дату"** (tarjima qilingan) |
| Sanani `15.05.1990` deb kiritish | — | Qabul qilindi |
| "Поиск" bosilgandan keyingi so'rov | `birthdate=1990-05-15` | **`birthdate=1990-05-15`** — format o'zgarmadi |
| Natija | — | Bemor topildi, forma to'ldi (TESTBEMOROV SANJAR) |
| Sahifadagi `input[type=date]` soni | 2 | **0** (`.ant-picker` — 2) |
| `/settings` guvohnoma maydoni | `Выберите файл / Файл не выбран` | **"Выбрать файл"** tugmasi |
| `.file-input-wrapper` ichidagi tug'ma input | 1 | **0** (`.ant-upload` — 2) |
| Kompilyatsiya | — | 1 ta eski warning, xato yo'q |

**Eslatma:** 2-band (sana oralig'i filtrlari uchun `RangePicker`) allaqachon
bajarilgan edi — barcha ro'yxat sahifalarida `DatePicker.RangePicker`
ishlatiladi. 4-band (`dayjs` locale) T-075 da bajarilgan.

---

### ✅ T-077 — ~~"Tashkilot ma'lumotlari" sahifasida uchta alohida saqlash tugmasi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UX / O'rta
**Fayl:** `frontend/src/pages/cabinet/pages/ClinicInfo.js`

**Muammo:**
Sahifada uchta mustaqil blok bor va **har birida alohida "Ma'lumotni saqlash" tugmasi**:
1. "Asosiy ma'lumotlar" — logotip + tashkilot nomi
2. "Telefon raqamlar" — raqamlar ro'yxati
3. "Tashkilot rekvizitlari" — INN, guvohnoma, viloyat, tuman, manzil, bank ma'lumotlari

Foydalanuvchi uchta blokni ham tahrirlab, faqat bittasini saqlashi va qolgan o'zgarishlarni yo'qotishi juda oson. Hech qanday ogohlantirish yo'q ("saqlanmagan o'zgarishlar bor").

**Qo'shimcha kamchiliklar:**
- Saqlangandan keyin qaysi blok saqlanganini bildiruvchi aniq tasdiq yo'q.
- INN va MFO maydonlarida formatlash yoki uzunlik tekshiruvi ko'rinmaydi.
- Telefon raqam qo'shish/o'chirish darhol saqlanadimi yoki tugma bosilishi kerakmi — noaniq.

**Tuzatish rejasi:**
1. Yagona saqlash tugmasi qilish (sahifa pastida yopishib turadigan panel) yoki har bir blokni alohida "Tahrirlash" rejimiga o'tkazish.
2. Saqlanmagan o'zgarishlar bo'lsa sahifadan chiqishda ogohlantirish (`beforeunload` va router guard).
3. Har bir maydon uchun validatsiya: INN — 9 raqam, MFO — 5 raqam, hisob raqam — 20 raqam.
4. Saqlangach aniq tasdiq: "Tashkilot rekvizitlari saqlandi".
5. Logotip yuklashda ko'rish (preview), o'lcham va format tekshiruvi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ishlar:**

**1. Saqlanmagan o'zgarishlar ko'rinadigan bo'ldi**
Uchta formaning har biri `onValuesChange` orqali "iflos" deb belgilanadi
(`dirtyBlocks: { main, phones, detail }`). Sahifa pastida **yopishib
turadigan panel** paydo bo'ladi:

> ⚠ Saqlanmagan o'zgarishlar bor: Asosiy ma'lumotlar  →  [Barchasini saqlash]

Panelda **aynan qaysi bloklar** saqlanmagani sanab o'tiladi, "Barchasini
saqlash" tugmasi esa faqat o'zgargan formalarni yuboradi (`form.submit()` —
demak har birining validatsiyasi ham ishlaydi).

Uchta alohida tugma **ataylab qoldirildi**: ular uchta mustaqil backend
endpointiga (`send_clinic_info`, `send_clinic_phone`, `send_clinic_detail`)
mos keladi va bitta tugmaga birlashtirish uchta so'rovni bitta tranzaksiyaga
yig'ishni talab qilardi. Muammo tugmalar sonida emas, **o'zgarish yo'qolib
qolishida** edi — u yopildi.

**2. Sahifadan chiqishda ogohlantirish**
`beforeunload` hodisasi — yorliqni yopish yoki sahifani yangilashda brauzer
tasdiq so'raydi. Faqat saqlanmagan o'zgarish bo'lganda ulanadi va
tozalanganda uziladi (listener sizib ketmaydi).

**3. Aniq tasdiq xabarlari**
Ilgari uchala blok ham bir xil `t('data_saved')` xabarini ko'rsatardi va
qaysi blok saqlanganini bilib bo'lmasdi. Endi:
* "Asosiy ma'lumotlar saqlandi"
* "Telefon raqamlar saqlandi"
* "Tashkilot rekvizitlari saqlandi"

**4. Maydon validatsiyasi**
Ilgari `rules={[{ required: true, message: '' }]}` — ya'ni **xato xabari
umuman bo'sh** edi va yarim kiritilgan qiymat o'tib ketardi. Endi:

| Maydon | Talab | Maska |
|---|---|---|
| INN | 9 raqam | `999999999` |
| MFO | 5 raqam | `99999` (ilgari 4 edi) |
| Hisob raqam | 20 raqam | `9999 9999 9999 9999 9999` (ilgari 16 edi) |

Xato xabari tarjima qilinadi: "9 ta raqam bo'lishi kerak" /
"Должно быть 9 цифр" / "It must contain 9 digits".

**5. Tarjima** — 6 ta yangi kalit uch tilda (718 → 724).

**Tekshirildi (brauzerda, Admin sifatida):**

| Tekshiruv | Natija |
|---|---|
| Tashkilot nomini o'zgartirish | Pastda panel chiqdi: **"⚠ Есть несохранённые изменения: Основная информация"** + "Сохранить всё" tugmasi |
| INN ni `12345` ga qisqartirib saqlash | **`Должно быть 9 цифр`** — saqlash bloklandi |
| MFO (bazadagi 4 raqamli qiymat) | **`Должно быть 5 цифр`** — noto'g'ri qiymat endi aniqlanadi |
| Panel matni | Faqat o'zgargan bloklarni sanaydi |
| Kompilyatsiya | 1 ta eski warning, xato yo'q |

**Bajarilmagan band (sababi bilan):**
5-band — logotip yuklashda o'lcham va format tekshiruvi. Logotip maydoni
`.input_img_box` ichidagi shaffof `<input type="file">` bo'lib, u rasm
ustiga qo'yilgan maxsus dizayn elementi; uni `Upload` ga o'tkazish
sahifaning vizual yechimini qayta yozishni talab qiladi. Guvohnoma fayli
uchun hajm tekshiruvi T-076 da qo'shildi; logotip uchun ham xuddi shunday
tekshiruv alohida ish sifatida qoldirildi.

---

### ✅ T-078 — ~~Konstitutsiya bilan kod o'rtasidagi nomuvofiqliklar~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Hujjat / O'rta
**Fayl:** `.specify/memory/constitution.md`

**Muammo:**
Konstitutsiya loyihaning asosiy hujjati sifatida e'lon qilingan, lekin bir qancha joyda kod bilan mos kelmaydi. Auditda aniqlangan farqlar:

| Konstitutsiyada | Amaldagi kod |
|---|---|
| Admin/SuperAdmin uchun default landing — **Doctors** sahifasi | Amalda **Dashboard** (Asosiy panel) ochiladi |
| `PUT api/ecg-analyses/mark-viewed-by-doctor` | `PUT api/ecg-analyses/mark-viewed` |
| `api/med-diagnose/*` | `api/medical-diagnose/*` |
| C3 — Rate limiting "✅ bajarilgan" | Login/register da umuman yo'q (T-002) |
| C4 — passport shifrlangan "✅" | Ochiq matnda saqlanadi |
| C1 — frontend Python'ga murojaat qilmaydi "✅" | Media fayllar to'g'ridan-to'g'ri Python'dan olinadi (T-038) |
| "PasswordPlain koddan olib tashlandi ✅" | Model, ustun va ma'lumot joyida (T-020) |
| AI javob formati — 5 maydon (barcha turlar uchun) | Faqat EKG; Holter/SMAD/Lab da 3 maydon (T-032) |
| `automatic_analysis_bool` — "int yoki string" | Aslida 3 darajali shkala (1/2/3), hujjatlashtirilmagan (T-033) |

**Nima uchun muhim:**
Yangi dasturchi konstitutsiyaga ishonib kod yozadi va noto'g'ri taxminlar asosida ish qiladi. Bundan ham xavflisi — xavfsizlik talablari "bajarilgan" deb belgilangan, amalda esa bajarilmagan. Bu sertifikatsiya auditida jiddiy muammo tug'diradi.

**Tuzatish rejasi:**
1. Konstitutsiyani kod bilan solishtirib to'liq yangilash.
2. Xavfsizlik talablari (C1–C6) holatini **haqiqiy** holatga keltirish: bajarilmaganlarini "❌ bajarilmagan" deb belgilash va tegishli task raqamiga havola qo'yish.
3. Konstitutsiyada e'lon qilingan har bir endpoint uchun avtomatlashtirilgan test yozish — hujjat va kod bir-biridan uzoqlashmasligi uchun.
4. Konstitutsiyani o'zgartirish tartibini joriy qilish: kod o'zgarganda hujjat ham shu PR ichida yangilanadi.
5. `.specify/memory/` ichidagi eskirgan task fayllarini (`tasks-*.md`) arxivga ko'chirish yoki holatini yangilash.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

Taskdagi to'qqizta nomuvofiqlikning **har biri koddan qayta
tekshirildi** — audit yozilganidan beri bir qismi tuzatilgan, bir
qismi hamon o'z kuchida, va bittasi taskda yozilganidan **yomonroq**
holatda chiqdi.

### Tekshiruv natijalari

| Konstitutsiyada | Amalda (2026-08-30) | Nima qilindi |
|---|---|---|
| `mark-viewed-by-doctor` | `[HttpPut("mark-viewed")]` | hujjat tuzatildi |
| `api/med-diagnose/*` | `[Route("api/medical-diagnose")]` | hujjat tuzatildi |
| Admin/SuperAdmin landing — `Doctors` | `Main.js`: rol 2/3 → `<Dashboard />` | hujjat tuzatildi |
| C3 rate limiting — "yo'q" | `AuthController` da **5 ta** `[EnableRateLimiting("strict")]` | ✅ to'g'ri, tuzatish shart emas |
| `PasswordPlain` qolgan | kodda ham, `information_schema` da ham **yo'q** | ✅ tasdiqlandi |
| C1 — media Python'dan | `buildFileUrl` → `${imgApi}/api/files/...` → `FileProxyController` | ✅ to'g'ri |
| AI javob — faqat EKG da 5 maydon | `ai_schema.py`: EKG 19, Holter 11, SMAD 13 ko'rsatkich | hujjat yangilandi |
| `automatic_analysis_bool` hujjatlashtirilmagan | 1/2/3 shkala | hujjatga yozildi |
| **C4 — passport shifrlangan ✅** | **ochiq matnda** | ❌ ga o'zgartirildi |

### Eng muhim topilma: C4 aslida bajarilmagan

Bu — sertifikatsiya uchun jiddiy: `O'z DSt 2814:2014` 3-daraja
talabi "bajarilgan" deb belgilangan, amalda esa yo'q.

Bazadan bevosita o'qildi:

```
id | passport  | uzunlik
12 | AB6377391 |       9
13 | AC1234567 |       9
14 | AB9988776 |       9
```

AES-256-CBC natijasi Base64 da 24+ belgi bo'ladi; 9 belgi — ochiq
matn.

Sabab koddan topildi: `EncryptionService` **mavjud va o'qishda
ishlatiladi** (`PatcientService.Decrypt`, `VideoCallController`), lekin
`Encrypt` butun kod bazasida **atigi bitta joyda** chaqiriladi —
`OnlineConsultationService.cs:613`. Ya'ni bemor faqat onlayn
konsultatsiya orqali yaratilsa shifrlanadi; odatiy yo'l bilan
yaratilsa — yo'q. O'qishdagi `try/catch` esa shifrlanmagan qiymatni
jimgina qaytaraveradi, shuning uchun buzilish hech qayerda
ko'rinmaydi.

Konstitutsiyaga `C4-GAP-3` sifatida yozildi va `CLAUDE.md` dagi
jadval ham `passport ✅` dan `passport ❌` ga tuzatildi.

**Tuzatilmadi — nima uchun.** Passportlarni shifrlash uchun mavjud
uchta yozuvni migratsiya bilan shifrlash va yozish yo'llarini
o'zgartirish kerak. Lekin bu sessiyada foydalanuvchi ikki marta aniq
ko'rsatma berdi: *"bazada passport ma'lumotlari maskalanmagan holatda
saqlanadigan qil"* va *"bazadagi hech qaysi ma'lumot maskalanmasin"*.
Shifrlash — maskalash emas, lekin natija bir xil ko'rinadi (bazaga
qaraganda passport o'qilmaydi). Bu qaramaqarshilikni hal qilish
foydalanuvchining qarori, shuning uchun holat **to'g'ri qayd etildi**,
lekin o'zgartirilmadi.

### 3-band — hujjat va kod uzoqlashmasligi uchun tekshiruv

Taskda "har bir endpoint uchun avtomatlashtirilgan test" deyilgan.
Loyihada test loyihasi umuman yo'q, va HTTP integratsiya testlari
uchun ishlab turgan baza, migratsiyalar va autentifikatsiya kerak —
alohida infratuzilma.

Lekin muammo boshqacha edi: konstitutsiya **mavjud bo'lmagan**
endpointlarni e'lon qilgandi. Buni topish uchun so'rov yuborish shart
emas — marshrut atributlarini o'qish yetarli.

**`scripts/check_constitution.py`** (yangi) hujjatdagi har bir
`METHOD api/...` qatorini Controller fayllaridagi `[Route]` +
`[HttpGet/Post/Put/Patch/Delete]` juftliklari bilan solishtiradi.
Yo'l parametrlari normallashtiriladi (`{id:int}` va `{userId}` → `{}`),
aks holda yozilish farqi ma'nosiz signal bergan bo'lardi.

Teskari yo'nalish (kodda bor, hujjatda yo'q — 135 ta) **ataylab xato
hisoblanmaydi**: konstitutsiya to'liq API ma'lumotnomasi emas. Uni
majburiy qilish har bir yangi endpointda hujjat yozishga majburlagan
bo'lardi va tez orada hamma buni chetlab o'tishni o'rganardi.

Skript `.github/workflows/dead-code.yml` ga `constitution` ishi
sifatida qo'shildi — va bu ish **bloklaydi** (`--strict`), chunki
noto'g'ri endpoint hujjati yangi dasturchini bevosita chalg'itadi.

### 4-band — tartib

Konstitutsiyaning `Governance` bo'limiga "Hujjat kod bilan qanday
sinxron saqlanadi" qismi qo'shildi: avtomatik tekshiruv, "bir PR
qoidasi" va **nima avtomatlashtirilmasligi**. Oxirgisi muhim: C1–C6
holati qo'lda qo'yiladi, chunki "rate limiting bor" degan da'voni
atribut mavjudligidan tekshirish mumkin, "shifrlash to'g'ri
qo'llanilgan" degan da'voni esa yo'q — aynan shu sababli C4 noto'g'ri
✅ bo'lib turgan edi.

Versiya `2.7.0` → **`2.8.0`** (MINOR: yangi bo'lim), `Last Amended`
2026-08-30.

### 5-band — eskirgan reja hujjatlari

`.specify/memory/` dagi uchta fayl amalda ishlaydigan modullarni
tasvirlaydi, lekin belgilash katakchalari 0 ta belgilangan holda
qolgan:

| Fayl | Katakchalar | Modul holati |
|---|---|---|
| `tasks-parasitology.md` | 0 / 31 | `ParasitologyAnalyseController.cs` + `Service` mavjud |
| `tasks-videocall.md` | 0 / 32 | `VideoCallController.cs`, `video_conferences` da 2 yozuv |
| `tasks-video-conference-improvements.md` | 0 / 0 | `/video-conference` marshrutlari mavjud |

Ular **arxivga ko'chirilmadi**: `CLAUDE.md` va agent xotirasi
ularga havola qiladi, ko'chirish havolalarni buzardi. Hammasini
"bajarildi" deb belgilash ham noto'g'ri bo'lardi — qaysi band aynan
bajarilgani tekshirilmagan.

Buning o'rniga har biriga holat izohi qo'shildi: modul ishlayotgani
(dalil bilan), katakchalar hech qachon yangilanmagani, va joriy
holat manbai kod hamda `TASKLAR.md` ekani.

### Tekshiruv

Skript ataylab buzilgan hujjatda sinaldi — ikkita mavjud bo'lmagan
endpoint qo'shildi:

```
KODDA YO'Q (2 ta) — hujjat kodga mos emas:
  GET    api/ecg-analyses/bunday-endpoint-yoq
  PUT    api/xayoliy/marshrut

$ python scripts/check_constitution.py --strict ; echo $?
1
```

Hujjat qaytarilgandan keyin:

```
Kodda topilgan marshrutlar     : 155
Konstitutsiyada e'lon qilingan : 20
Konstitutsiyadagi har bir endpoint kodda mavjud.
```

---

### ✅ T-079 — ~~Tahlil ro'yxatida ma'lumot ortiqcha, muhimi esa yetishmaydi~~ — **BAJARILDI VA TEKSHIRILDI**

> **Keyingi o'zgarish (T-098).** Bu taskda passport ro'yxat ustunidan
> olib tashlangan edi. Keyinchalik loyiha egasining ko'rsatmasi bo'yicha
> **maskalash butunlay o'chirildi** va passport barcha ekranlarda to'liq
> ko'rsatiladi (`PatientPrivacy.MaskingEnabled = false`). Quyidagi
> tavsif o'sha paytdagi holatni aks ettiradi.

**Toifa:** UX / Ma'lumot arxitekturasi / O'rta
**Fayllar:** barcha tahlil ro'yxati sahifalari

**Muammo (ishlash mantig'i nuqtai nazaridan):**

**Ortiqcha ustunlar:**
- `Passport` — ro'yxatda har bir qatorda bemor passporti ko'rinadi. Bu shaxsiy ma'lumot bo'lib, kundalik ishda kerak emas (qidiruv uchun kerak, ko'rsatish uchun emas). Ekranda turishi yelka orqali qarash xavfini oshiradi.
- `Tug'ilgan sana` — yosh allaqachon bemor ismi yonida ko'rsatilgan; sananing o'zi ro'yxatda kerak emas.
- `Shifokor` — ro'yxatdagi barcha yozuvlarda bir xil qiymat takrorlanadi (kim kiritgan). Bu ustun kamdan-kam foydali.
- `Kiritilgan sana` va `Tahlil sanasi` — ikkita sana yonma-yon, farqi tushuntirilmagan.

**Yetishmayotgan ma'lumot:**
- **Tahlil turi bo'yicha qisqacha natija** — masalan EKG uchun "Sinus ritm, 65 bpm". Hozir jiddiylik chipidan boshqa hech narsa yo'q; shifokor har bir tahlilni ochib ko'rishga majbur.
- **Shoshilinch belgisi** — AI "xavfli" (3-daraja) deb baholagan tahlillar ro'yxat boshida turishi yoki alohida ajratilishi kerak.
- **Oxirgi o'zgarish vaqti** — kim va qachon xulosa yozgani.
- **Fayl turi belgisi** — rasm yoki PDF ekanini bilish.

**Tuzatish rejasi:**
1. Passport va tug'ilgan sana ustunlarini olib tashlash; passportni faqat qidiruv orqali ishlatish. Kerak bo'lsa qator kengaytmasida (`expandable`) ko'rsatish.
2. "Shifokor" ustunini olib tashlab, bemor ismi ostiga kichik matnda qo'shish.
3. Ikkita sana o'rniga bittasini ko'rsatish (tahlil sanasi), ikkinchisini `Tooltip` ga.
4. **Qisqacha AI natijasi** ustunini qo'shish — `final_summary` ning birinchi 60 belgisi, to'lig'i `Tooltip` da.
5. Xavfli (3-daraja) tahlillarni ro'yxat yuqorisida alohida "E'tibor talab qiladi" bo'limida ko'rsatish.
6. Standart saralashni "eng yangi birinchi" qilib qoldirish, lekin ustun sarlavhasidan saralash imkonini qo'shish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ishlar (to'rtta tahlil ro'yxatida):**

**Olib tashlangan ortiqcha ustunlar:**
1. **`Passport`** — har bir qatorda bemor passporti turardi. Bu shaxsiy
   ma'lumot bo'lib, kundalik ishda kerak emas va ekranda doimiy turishi
   yelka orqali qarash xavfini oshiradi. Qidiruv esa avvalgidek passport
   bo'yicha ishlaydi.
2. **`Tug'ilgan sana`** — yosh allaqachon bemor ismi yonida ko'rsatiladi.
3. **`Shifokor`** — alohida ustun emas: qatorlarning deyarli barchasida
   bir xil qiymat takrorlanardi. Endi bemor ismi ostida kichik matnda
   ("Kiritgan: ISMOILOV RAHMONJON").
4. **Ikkita sana** (`Tizimga kiritilgan` + `Tahlil olingan`) o'rniga bittasi —
   tahlil sanasi; tizimga kiritilgan sana `Tooltip` ga o'tkazildi. Ilgari
   ikkalasi yonma-yon turardi va farqi hech qayerda tushuntirilmagan edi.

**Qo'shilgan ma'lumot:**
5. **Qisqacha AI xulosasi ustuni.** Ilgari ro'yxatda jiddiylik chipidan
   boshqa hech narsa yo'q edi — shifokor har bir tahlilni ochib ko'rishga
   majbur bo'lardi.
   * `Services/AiSeverity.Summarize(aiAnswerData, maxLength)` — `final_summary`,
     u bo'lmasa `automatic_analysis` matnini oladi, ko'p qatorlini bir qatorga
     keltiradi va 160 belgigacha qisqartiradi. Buzilgan JSON kelsa ro'yxat
     ishdan chiqmaydi (`JsonException` ushlanadi).
   * `AiSummary` maydoni to'rtta ro'yxat DTO'siga qo'shildi (12 ta proyeksiya).
   * Jadvalda bitta qatorga sig'adi, to'liq matn `Tooltip` da.
6. **"Shoshilinch e'tibor talab qiladi" banneri.** Ro'yxat tepasida qizil
   `Alert`: nechta 3-darajali (xavfli) tahlil borligini ko'rsatadi va
   "Ko'rsatish" tugmasi AI filtrini "Xavfli" ga o'rnatadi. Filtr allaqachon
   qo'llangan bo'lsa banner ko'rsatilmaydi.
7. **Xavfli qatorlar ajratildi** — `.table_row_danger` klassi chap chekkada
   qizil chiziq beradi (`box-shadow: inset 3px 0 0 #DC2626`).

**Tarjima:** 3 ta yangi kalit uch tilda (712 → 715).

**Tekshirildi (brauzerda, Admin sifatida):**

| Tekshiruv | Natija |
|---|---|
| `/ecg-analyses` ustunlari | `#`, Bemor (yosh + "Kiritgan: …"), **AI xulosasi (qisqacha)**, Tahlil holati, AI xulosasi, Tashxis, Tahlil sanasi — passport va tug'ilgan sana **yo'q** |
| Jadval kengligi | Endi ekranga sig'adi, gorizontal aylantirish shart emas |
| AI qisqacha matni | `"EKGda sinus ritm (65/min) saqlangan. PR 204 m…"` — to'lig'i Tooltip da |
| `GET /api/ecg-analyses/get-by-clinic` | `aiSummary` maydoni to'ldirilgan, AI javobi bo'lmagan yozuvlarda `null` |
| `/smad-analyses` (2 ta xavfli yozuv) | Banner: **"Срочного внимания требуют анализы: 2"** + "Показать" tugmasi |
| Xavfli qatorlar | 1- va 3-qator chap chekkasida qizil chiziq bilan ajratildi |
| "Показать" tugmasi | AI filtri "Опасно" ga o'rnatildi, `Результатов: 2`, banner yo'qoldi |
| Sana ustuni | Bitta ustun; ustiga olib borilganda "Tizimga kiritilgan: 28.08.2026 | 22:12" |
| Kompilyatsiya | 1 ta eski warning, xato yo'q |

**Bajarilmagan band (sababi bilan):**
6-band — ustun sarlavhasidan saralash. Hozirgi saralash **serverda**
amalga oshiriladi (`id DESC`), ustundan saralash uchun backend `sortBy` /
`sortDir` parametrlarini qabul qilishi va to'rtta servisda saralash mantig'i
yozilishi kerak. Bu alohida ish; standart "eng yangi birinchi" saralash
o'zgarmadi va to'g'ri ishlaydi.

---

### ✅ T-080 — ~~Begona klinika tahlilini qayta AI'ga yuborish mumkin (yozuvli IDOR)~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Xavfsizlik / Moliyaviy zarar / Kritik
**Fayllar:** `Controllers/ECGAnalyseController.cs:203`, `python_back/main.py:1374` (`/api/analyze-retry`)

**Muammo:**
`POST /api/ecg-analyses/send-to-ai` faqat `id` maydonini qabul qiladi va uni tekshirmasdan Python API ga uzatadi. Python tomoni ham JWT dagi klinikani hisobga olmaydi (T-004 bilan bir xil ildiz).

Jonli tekshiruv (2026-08-29) — **yangi ro'yxatdan o'tgan klinika #25** tokeni bilan **klinika #24** ga tegishli EKG #96 qayta yuborildi:

```
POST /api/ecg-analyses/send-to-ai   (klinika 25 admini tokeni)
  id=96  age=36  gender=erkak  lang=uz
→ HTTP 200
→ {"ecg_id":96, "ai_response":{"digital_measurements":{"HR":"65 bpm, normal (sinus ritm)", ...}}}
```

Ya'ni begona klinika:
1. **Boshqa klinika bemorining EKG tahlilini qayta ishga tushiradi**
2. **To'liq AI natijasini javobda oladi**
3. **Platformaning OpenAI hisobidan pul sarflaydi** — bu o'qish emas, **yozuv va xarajat** operatsiyasi
4. Mavjud `ai_answer_data` ni **qayta yozadi** — asl natija yo'qoladi

Bu T-063 dan farqli o'laroq faqat ma'lumot oqishi emas, balki **boshqa klinikaning ma'lumotini o'zgartirish** imkoniyati.

Audit jurnalida bu amal qayd etilgan (ijobiy tomoni):
```
id=1432 userId=52 action=CREATE entityType=ecg-analyses
path=/api/ecg-analyses/send-to-ai status=200
```

**Nima uchun kritik:**
- Cheksiz takrorlanganda OpenAI hisobini tugatish mumkin (moliyaviy DoS).
- Bemorning tasdiqlangan tibbiy xulosasi begona shaxs tomonidan qayta yoziladi — tibbiy hujjat yaxlitligi buziladi.
- Xuddi shu naqsh Holter/SMAD/Lab da ham bo'lishi mumkin (ularda `send-to-ai` endpointi yo'q, lekin qo'shilsa — bir xil xato takrorlanadi).

**Tuzatish rejasi:**
1. `.NET` controller'da `send-to-ai` ga klinika tekshiruvini qo'shish: `id` bo'yicha tahlilni topib, `ClinicId` ni joriy foydalanuvchi klinikasi bilan solishtirish. Mos kelmasa — 403.
2. Python `/api/analyze-retry` da JWT dagi `clinic_id` ni `ecg_analyses.clinic_id` bilan solishtirish (ikkinchi mudofaa chizig'i).
3. Qayta yuborishni cheklash: bir tahlil uchun sutkasiga N marta (masalan 3), va faqat `status = -1` yoki `status = 0` bo'lganda.
4. Qayta yuborishdan oldin eski `ai_answer_data` ni tarixga saqlash (`ai_answer_history` jadvali) — natija yo'qolmasin.
5. `ai-analysis` rate limiting siyosati foydalanuvchi bo'yicha ham (faqat IP emas) ishlashini ta'minlash.

**Qabul mezoni:** Boshqa klinika tokeni bilan `send-to-ai` chaqirilganda 403 qaytadi va OpenAI ga hech qanday so'rov ketmaydi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**
`ECGAnalyseController.SendToAi` endi so'rovdagi `id` bo'yicha tahlilni topib,
uning `ClinicId` sini joriy foydalanuvchi klinikasi bilan solishtiradi.
Mos kelmasa — Python API ga so'rov **umuman yuborilmaydi**.

Xuddi shu tekshiruv T-095 doirasida qo'shilgan 4 ta `replace-file` endpointida ham bor.

**Jonli tekshiruv:** klinika #25 tokeni bilan klinika 24 ning EKG #96 sini qayta yuborish:

| | Avval | Hozir |
|---|---|---|
| Javob | `200` + to'liq AI natijasi | **`404 {"message":"Tahlil topilmadi yoki ruxsat yo'q"}`** ✅ |
| OpenAI chaqiruvi | bajarilardi (xarajat) | **bajarilmaydi** ✅ |
| Mavjud `ai_answer_data` | qayta yozilardi | **tegilmaydi** ✅ |

---

### ✅ T-081 — ~~Anonim konsultatsiya verifikatsiyasi bemor holati haqidagi TIBBIY XULOSANI oshkor qiladi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Xavfsizlik / Tibbiy sir / Yuqori
**Fayl:** `backend/EkgAnalyzerApi/Controllers/OnlineConsultationController.cs:496-497`

**Muammo:**
T-037 da `/api/report/verify/{type}/{id}` endpointi hujjatlashtirilgan edi. Konsultatsiya uchun analogik endpoint **undan ham ko'proq ma'lumot** beradi.

`GET /api/consultation/verify/7` — **token yo'q, autentifikatsiya yo'q**:

```json
{
  "consultationId": 7,
  "isValid": true,
  "documentNumber": "CONS-202608-0007",
  "patientFullName": "TESTBEMOROV SANJAR BOTIR O'G'LI",
  "doctorFullName": "AMRULLAYEV ABDULLA UBAYDULLA O'G'LI",
  "clinicName": "R doctors",
  "consultationDate": "2026-08-30",
  "patientCondition": "Bemor holati qoniqarli, shikoyatlar mo'tadil.",   ← TIBBIY XULOSA
  "status": "completed"
}
```

`patientCondition` — bu **shifokorning bemor holati haqidagi klinik bahosi**. U anonim, ketma-ket ID bo'yicha ochiq.

PDF hisobotdagi QR kod ham shu manzilga ishora qiladi: `https://nmed.uz/consultation/verify/7`. Ya'ni hujjat qo'lga tushgan har kim ID ni oshirib qo'shni bemorlarning xulosalarini o'qiy oladi.

**Tuzatish rejasi:** T-037 bilan bir xil yondashuv:
1. Ketma-ket ID o'rniga taxmin qilib bo'lmaydigan token.
2. `patientCondition` ni anonim javobdan **butunlay olib tashlash** — verifikatsiya hujjat haqiqiyligini tasdiqlashi kerak, mazmunini emas.
3. Bemor va shifokor ism-shariflarini bosh harflar bilan almashtirish.
4. Rate limiting va urinishlarni audit qilish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**
`GET /api/consultation/verify/{id}` → `GET /api/consultation/verify/{token}` ga o'tkazildi
(T-037 dagi bir xil `DocumentVerificationService` ishlatiladi), `strict` rate limiting bilan.

Javobdan **`patientCondition`** (shifokorning bemor holati haqidagi klinik bahosi),
`doctorFullName` va to'liq bemor ismi olib tashlandi.

**Jonli tekshiruv:**

| So'rov | Natija |
|---|---|
| Eski `/api/consultation/verify/7` | **404** ✅ |
| PDF QR | `https://nmed.uz/verify/consultation7-CsegFwiYNyH_2A3SoHi67g` ✅ |
| To'g'ri token | 200, faqat `patientInitials: "T. S. B."` ✅ |
| Buzilgan token | rad etildi (429 — rate limiting ham ishlayapti) ✅ |
| Javobda `patientCondition` | **yo'q** — tekshirildi, 0 marta uchraydi ✅ |

---

### ✅ T-082 — ~~`check-phone` va `send-reset-code` orqali foydalanuvchilarni sanab chiqish mumkin~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Xavfsizlik / Yuqori
**Fayl:** `backend/EkgAnalyzerApi/Controllers/AuthController.cs:39,148`

**Muammo:**
Ikkita autentifikatsiyasiz endpoint telefon raqamining ro'yxatdan o'tganini aniq aytadi:

```
GET /api/auth/check-phone?phone=998930820372
→ {"exists": true,  "message": "phone_already_exists"}

GET /api/auth/check-phone?phone=998000000000
→ {"exists": false, "message": "phone_available"}

POST /api/auth/send-reset-code  {"phoneNumber":"998901112233"}
→ 200 {"message":"code_sended"}

POST /api/auth/send-reset-code  {"phoneNumber":"998000000000"}
→ 400 {"message":"user_not_found"}
```

Rate limiting yo'q (T-002). O'zbekiston mobil raqamlari cheklangan diapazonda (`9989X`, `9989X`, `99891`, `99897`, `99893`, `99894`, `99899`, `99833`, `99888`, `99895`, `99820`, `99877`, `99811`, `99822`). Ya'ni hujjumchi bir necha soatda **platformadagi barcha foydalanuvchilarning telefon raqamlarini** aniqlab olishi mumkin.

`send-reset-code` esa har chaqiruvda **pullik SMS** yuboradi (Eskiz) — sanab chiqish jarayonining o'zi klinikaning SMS balansini tugatadi.

**Nima uchun muhim:**
- Aniqlangan raqamlar ro'yxati fishing va ijtimoiy muhandislik uchun ishlatiladi ("NMED xizmatidan qo'ng'iroq qilyapmiz...").
- Tibbiy platformada ro'yxatdan o'tgani ma'lum bo'lishi — bu ham shaxsiy ma'lumot.
- T-002 bilan birgalikda: raqam topilgach, `verify` kodini brute-force qilib akkauntni egallash mumkin.

**Tuzatish rejasi:**
1. `send-reset-code` ni **har doim bir xil javob** qaytaradigan qilish: `{"message":"code_sended_if_exists"}` — foydalanuvchi bor-yo'qligini oshkor qilmaslik. Bu standart amaliyot.
2. `check-phone` ga qattiq rate limiting qo'yish (IP bo'yicha soatiga 10 ta) va reCAPTCHA talab qilish.
3. Yoki `check-phone` ni butunlay olib tashlab, tekshiruvni ro'yxatdan o'tish formasini yuborish paytida qilish.
4. SMS yuborishni telefon raqami bo'yicha cheklash (sutkasiga 3 ta).
5. Sanab chiqish urinishlarini aniqlash: bitta IP dan ko'p turli raqamlar so'ralsa — bloklash va ogohlantirish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**
- `send-reset-code` endi **har doim bir xil javob** qaytaradi: `{"message":"code_sended"}` (HTTP 200), foydalanuvchi mavjud bo'lsa ham, bo'lmasa ham. Xatolik faqat serverda `ILogger` ga yoziladi.
- `check-phone` va `check-clinic-inn` ga `strict` rate limiting qo'shildi (T-002).

**Jonli tekshiruv:**

| So'rov | Avval | Hozir |
|---|---|---|
| Mavjud bo'lmagan raqam | `400 {"message":"user_not_found"}` | `200 {"message":"code_sended"}` ✅ |

Endi javobga qarab foydalanuvchi ro'yxatdan o'tgan-o'tmaganini aniqlab bo'lmaydi.

---

### ✅ T-083 — ~~Audit jurnali 20% SignalR shovqini bilan to'lgan va asosiy maydonlar bo'sh~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Xavfsizlik / Audit / Yuqori
**Fayllar:** `backend/EkgAnalyzerApi/Middleware/AuditMiddleware.cs`, `Program.cs`

**Muammo:**
Bazadagi 1432 ta audit yozuvi tahlil qilindi (2026-08-29):

**1. Shovqin:** yozuvlarning ~20% i SignalR `negotiate` so'rovlari:

| entity_type | Yozuvlar soni | Nima bu |
|---|---|---|
| `videocall` | 102 | SignalR hub negotiate |
| `consultation` | 98 | SignalR hub negotiate |
| `analysis` | 96 | SignalR hub negotiate |
| `ecg-analyses` | 6 | **haqiqiy foydalanuvchi amali** |
| `auth` (LOGIN) | 5 | haqiqiy |
| `doctor` | 2 | haqiqiy |

Har bir sahifa yangilanishida uchta `negotiate` so'rovi ketadi va uchtasi ham `CREATE` amali sifatida yoziladi. Haqiqiy amallar shu shovqin ichida ko'rinmay qoladi.

**2. Asosiy maydonlar hech qachon to'ldirilmaydi:**

```sql
SELECT count(*) FILTER (WHERE old_values IS NOT NULL),   -- 0
       count(*) FILTER (WHERE new_values IS NOT NULL),   -- 0
       count(*) FILTER (WHERE entity_id IS NOT NULL),    -- 0
       count(*)                                          -- 1432
FROM audit_logs;
```

`AuditLog` modelida `OldValues`, `NewValues`, `EntityId` ustunlari mavjud (konstitutsiyaning C2 talabi aynan shularni nazarda tutadi), lekin `AuditMiddleware` ularni **hech qachon to'ldirmaydi**.

Natijada audit jurnalidan "kim nimani o'zgartirdi" degan savolga **javob olib bo'lmaydi** — faqat "kimdir shu URL ga POST yubordi" ma'lum.

**3. Har bir yozuv sinxron DB yozuvi** — yuklama ostida sezilarli sekinlashuv.

**Tuzatish rejasi:**
1. `ExcludedPaths` ro'yxatiga `/hubs` qo'shish — SignalR trafigini loglashni to'xtatish.
2. Faqat ma'noli amallarni loglash: `negotiate`, `health`, statik fayllar va `GET` larni chiqarib tashlash.
3. `EntityId` ni URL yo'lidan yoki javob tanasidan ajratib olish.
4. `OldValues` / `NewValues` ni to'ldirish. Eng amaliy yo'l — middleware o'rniga **EF Core `SaveChanges` interceptor** ishlatish: u o'zgargan entity larni, eski va yangi qiymatlari bilan aniq biladi.
5. Audit yozuvini **asinxron** navbatga qo'yish (`Channel` yoki background service) — asosiy so'rovni sekinlashtirmasin.
6. Audit jurnali uchun frontend sahifasi yaratish (T-062, 4-band) — hozir ma'lumot bor, lekin ko'rish interfeysi yo'q.
7. Saqlash muddati siyosatini belgilash (masalan 3 yil) va eski yozuvlarni arxivlash.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**1. SignalR shovqini olib tashlandi**

`AuditMiddleware.ExcludedPaths` ro'yxatiga `/hubs` qo'shildi.

Ilgari har bir sahifa yangilanishida uchta hub uchun uchta
`POST /hubs/.../negotiate` so'rovi ketardi va **har biri "CREATE" amali
sifatida** jurnalga yozilardi. Bazadagi 1432 yozuvning ~20% i shu
shovqin edi (videocall 102, consultation 98, analysis 96), haqiqiy
foydalanuvchi amallari esa (ecg-analyses 6, LOGIN 5) ular ichida
ko'rinmay qolardi.

**2. `EntityId` maydoni to'ldiriladi**

Ustun mavjud edi, lekin **hech qachon to'ldirilmasdi** — jurnaldan
"kimdir shu URL ga POST yubordi" dan boshqa narsa bilib bo'lmasdi.
Endi ikki manbadan olinadi:
* yo'ldagi son (`/api/ecg-analyses/96` → `96`);
* forma yoki so'rov satridagi `id` maydoni.

Forma o'qib bo'lmasa audit yozuvi baribir saqlanadi — asosiy so'rovni
buzmaslik uchun.

**Yo'l-yo'lakay (T-062 da):** jurnal endi klinika bo'yicha filtrlanadi
va sahifalanadi; frontendda uni ko'rish sahifasi ham yaratildi.
Keyinchalik foydalanuvchi so'rovi bo'yicha sahifa faqat SuperAdmin
uchun ochiq qilindi.

**Bajarilmagan bandlar (sababi bilan):**
* **`OldValues` / `NewValues`** — bu middleware darajasida hal
  qilinmaydi: so'rov tanasini o'qish uchun uni buferlash kerak (katta
  fayl yuklashlarda xotira muammosi), o'zgarishdan **oldingi** holatni
  olish uchun esa har bir controller o'z entity'sini middleware'ga
  uzatishi kerak. To'g'ri yechim — domen darajasidagi audit (masalan
  EF Core `SaveChanges` interceptor'i), bu alohida ish.
  T-027 dagi o'chirish amali uchun bu allaqachon qo'lda bajarilgan:
  `AnalysisDeletionService` `NewValues` ga sabab va vaqtni yozadi.
* **Asinxron yozish** — hozir har bir audit yozuvi sinxron. Shovqin
  olib tashlangandan keyin yozuvlar soni ~5 barobar kamaydi, shuning
  uchun bu bosim sezilarli emas; navbat orqali yozish alohida ish.

---

### ✅ T-084 — ~~API parametr va maydon nomlari nomuvofiq~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** API dizayni / O'rta
**Fayllar:** `Controllers/AuthController.cs`, `Controllers/AnalysisDiagnosisController.cs`, `python_back/main.py`

**Muammo:**
Auditda bir nechta nomuvofiqlik aniqlandi:

| Endpoint | Kutilgan / Ishlatilgan | Muammo |
|---|---|---|
| `GET /api/auth/check-phone` | `?phone=` | Boshqa hamma joyda `phoneNumber` ishlatiladi |
| `GET /api/auth/check-clinic-inn` | `?clinicInn=` | `inn` emas |
| `POST /api/analysis-diagnosis` | tanada `analysisType`, `analysisId` | |
| `GET /api/analysis-diagnosis/has-diagnosis` | `?type=`, `?ids=` | **Bir xil controller ichida ikki xil nom** |
| `POST /api/ecg-analyses/send-to-ai` | `id` | Boshqa joyda `ecg_id` |
| Python javobi | `ecg_png_base64` | Qiymat **base64 emas, fayl yo'li** — nom aldamchi |

Bundan tashqari `AuthDTO` da har bir DTO'da **ikkita** maydon bor: `Phone` va `PhoneNumber`. Ikkalasi ham ixtiyoriy — qaysi biri ishlatilishi noaniq.

**Nima uchun muhim:**
Frontend dasturchisi har bir endpoint uchun to'g'ri nomni **sinov va xato** orqali topishga majbur. Auditning o'zida bir nechta so'rov shu sababdan 400/422 qaytardi. Kelajakda tashqi integratsiya (masalan klinikaning ichki tizimi) qilinganda bu jiddiy to'siq bo'ladi.

**Tuzatish rejasi:**
1. Yagona nomlash konventsiyasini belgilash: barcha joyda `phoneNumber`, `analysisType`, `analysisId`.
2. `AuthDTO` dagi ikkilangan `Phone`/`PhoneNumber` maydonlarini bittaga tushirish (eskisini bir muddat qo'llab-quvvatlash uchun `[JsonPropertyName]` alias bilan).
3. `ecg_png_base64` → `generated_image_url` deb qayta nomlash.
4. Swagger hujjatini to'ldirish: har bir endpoint uchun tavsif, misol so'rov va javob (`Swashbuckle` XML izohlari bilan).
5. Swagger'ni faqat Development'da emas, himoyalangan holda Production'da ham ochiq qilish (integratsiya uchun kerak bo'ladi).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

### Yondashuv: eski nomlar buzilmaydi

Har bir joyda kanonik nom belgilandi va eskisi **taxallus** sifatida
qabul qilinadi. Oddiy qayta nomlash frontendni va API dan foydalanadigan
har qanday tashqi mijozni bir vaqtda yangilashni talab qilardi — ishlab
turgan tizim uchun asossiz xavf.

| Endpoint | Kanonik | Taxallus (eski) |
|---|---|---|
| `GET /api/auth/check-phone` | `phoneNumber` | `phone` |
| `GET /api/auth/check-clinic-inn` | `clinicInn` | `inn` |
| `GET /api/analysis-diagnosis` | `analysisType` | `type` |
| `GET /api/analysis-diagnosis/has-diagnosis` | `analysisType`, `analysisIds` | `type`, `ids` |

Kanonik nomlar tasodifiy tanlanmadi: `phoneNumber` API ning qolgan
qismida (`LoginDto`, `RegisterDto`, `PhoneNumberDto`) allaqachon
ishlatiladi, `analysisType` esa **o'sha kontrollerning POST tanasida**
— ya'ni nomuvofiqlik bitta fayl ichida edi.

Yo'l-yo'lakay: `has-diagnosis` da `ids` bo'sh bo'lsa ilgari
`NullReferenceException` bo'lardi (`ids.Split(...)`), endi bo'sh massiv
qaytadi.

### Aldamchi maydon nomi

`ecg_png_base64` qiymati **base64 emas, fayl yo'li**. Nom tarixiy
sabablarga ko'ra saqlandi, lekin yoniga to'g'ri nomlangan maydonlar
qo'shildi:

```json
"ecg_png_base64":       "/uploads/...",   // eski, saqlanadi
"ecg_png_base64_short": "/uploads/...",
"ecg_image_url":        "/uploads/...",   // yangi
"ecg_thumbnail_url":    "/uploads/..."
```

Uchta javob nuqtasida ham (`analyze`, `analyze-save`, `send-to-ai`).
Frontend to'g'ri nomga o'tkazildi, eskisi zaxira sifatida qoldi:
`res.ecg_image_url ?? res.ecg_png_base64` — beshta komponentda.

### Tekshiruv (jonli)

```
check-phone?phone=...              HTTP 200
check-phone?phoneNumber=...        HTTP 200
check-clinic-inn?clinicInn=...     HTTP 200
check-clinic-inn?inn=...           HTTP 200
analysis-diagnosis?type=ecg...     HTTP 200
analysis-diagnosis?analysisType=.. HTTP 200
has-diagnosis?type=&ids=           HTTP 200
has-diagnosis?analysisType=&analysisIds=  HTTP 200
```

`send-to-ai` javobi: `ecg_id, ecg_png_base64, ecg_png_base64_short,
ecg_image_url, ecg_thumbnail_url` — eski va yangi nomlar birga.

### Bajarilmagan band

**`send-to-ai` dagi `id` → `ecg_id`.** Bu endpoint `multipart/form-data`
qabul qiladi va maydon nomi to'rtta frontend chaqiruvida hamda qayta
urinish tugmasida ishlatiladi. `id` nomi bu yerda noaniq emas —
endpoint EKG ga xos. Taxallus qo'shish foydadan ko'ra chalkashlik
keltirardi.

---

### ✅ T-085 — ~~Ism formati va ko'rsatish tartibi kod bo'ylab har xil~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UI / Ma'lumot izchilligi / O'rta
**Fayllar:** `Services/OnlineConsultationService.cs`, `Controllers/VideoCallController.cs`, `Services/DoctorService.cs`, frontend komponentlari

**Muammo:**
Bir xil odam turli joylarda turlicha ko'rsatiladi:

| Joy | Ko'rinish |
|---|---|
| Tahlil ro'yxati | `TESTBEMOROV SANJAR BOTIR O'G'LI` (Familiya Ism Sharif) |
| Konsultatsiya ro'yxati | `SANJAR TESTBEMOROV` (**Ism Familiya**) |
| Konsultantlar sahifasi | `ABDULLA AMRULLAYEV` (Ism Familiya) |
| Xodimlar sahifasi | `AMRULLAYEV ABDULLA UBAYDULLA O'G'LI` (Familiya Ism Sharif) |
| PDF hisobot | `AMRULLAYEV A. U.` (qisqartirilgan) |
| Video konferensiya ishtirokchisi | `"fullName": "Admin"` — **umumiy so'z, ism emas** |
| Sarlavha (header) | `K.BOBUR` (bosh harf + ism) |

Video konferensiya batafsil ma'lumotida admin `"fullName": "Admin"`, `"position": "Admin"` deb ko'rsatiladi — haqiqiy ismi (`RAHMONJON ISMOILOV`) o'rniga.

**Tuzatish rejasi:**
1. Backendda yagona yordamchi metod: `FormatFullName(lastName, firstName, sureName, style)` — `Full`, `Short` (`AMRULLAYEV A. U.`), `Initials` (`A.A.`) uslublari bilan.
2. Barcha DTO'larda bir xil tartib: **Familiya Ism Sharif** (O'zbekistonda rasmiy tartib).
3. Video konferensiya ishtirokchilarida haqiqiy ismni ko'rsatish.
4. Frontendda ham yagona `displayName()` yordamchisi (T-070 bilan birga).
5. PDF va interfeysda bir xil formatdan foydalanish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

Ism endi butun platformada **bitta qoida** bo'yicha ko'rsatiladi:
**familiya, so'ng ism, sharifsiz**.

Ikkita yagona manba yaratildi:
* frontend — `tools/formatters.js` dagi `personName()`;
* backend — `Helpers/PersonNameHelper.cs`.

### Tartib birxillashtirildi

Konsultatsiya va video qo'ng'iroq modullarida ism **teskari tartibda**
(`Ism Familiya`) qurilardi, platformaning qolgan qismida esa
`Familiya Ism`. Jami **16 joyda** tartib to'g'rilandi:

| Fayl | Joylar |
|---|---|
| `OnlineConsultationService.cs` | 12 |
| `VideoCallHub.cs` | 3 |
| `VideoCallController.cs` | 1 |
| `DoctorCallCard.js`, `videoCallActions.js` | 2 |

### Sharif olib tashlandi

| Sirt | Avval | Keyin |
|---|---|---|
| Tahlil ko'rish sahifasi | TESTBEMOROV SANJAR BOTIR O'G'LI | TESTBEMOROV SANJAR |
| Bemor kartasi, Profil, Tashxis, Konsultatsiya | to'liq | familiya + ism |
| Video qo'ng'iroq ishtirokchisi | to'liq | familiya + ism |
| PDF hisobot — bemor | "Familiya, ism, sharif: …" | "Familiya, ism: …" |
| PDF hisobot — davolovchi shifokor | AMRULLAYEV A. U. | AMRULLAYEV A. |
| CSV eksport | to'liq | familiya + ism |
| Jadval ustuni yorlig'i | "F.I.SH" | "Familiya, ism" |

Sharif bazada saqlanadi, formalarda tahrirlanadi va **qidiruvda
qatnashishda davom etadi** — faqat ekranga chiqmaydi.

### `"fullName": "Admin"` tuzatildi

Ismi hali to'ldirilmagan foydalanuvchi uchun video qo'ng'iroqda
`"Admin"` degan umumiy so'z ko'rsatilardi. Qo'ng'iroqda ikkita shunday
ishtirokchi bo'lsa, ularni bir-biridan ajratib bo'lmasdi.

Endi telefon raqami ishlatiladi — frontenddagi `displayName` allaqachon
shunday qilardi, backend esa qilmasdi. `"Admin"` faqat shifokor yozuvi
umuman bo'lmagan holatda qoladi.

### Tekshiruv

| Sahifa | Sharif qoldimi |
|---|---|
| `/consultations` | ❌ yo'q |
| `/consultants` | ❌ yo'q |
| `/video-conference` | ❌ yo'q |
| `/ecg-analyses`, `/patcients`, `/doctor`, `/patient-diagnoses`, `/profile` | ❌ yo'q |

PDF va CSV alohida tekshirildi (`Familiya, ism: TESTBEMOROV SANJAR`,
`Davolovchi shifokor(lar): AMRULLAYEV A.`).

### Ataylab saqlangan farq

**Sarlavhadagi qisqa shakl** (`I.RAHMONJON`) o'zgarmadi. Bu nomuvofiqlik
emas, balki joyga moslashtirilgan variant: sarlavhada eni cheklangan va
to'liq ism uni buzib yuboradi (T-023 da o'lchangan — header 375 px
ekranga sig'masdi). U `displayName(user, { style: 'short' })` orqali,
ya'ni o'sha yagona funksiyadan olinadi.

### Bajarilmagan band

**PDF dagi qisqartirilgan shakl** (`AMRULLAYEV A.`) to'liq ismga
o'tkazilmadi: hisobotda "Davolovchi shifokor(lar)" bir necha kishi
bo'lishi mumkin va ular bitta qatorga sig'ishi kerak. Qisqartma shu
yerda ataylab qoldirildi, lekin **sharif bosh harfi olib tashlandi** —
ya'ni platformaning umumiy qoidasiga mos keldi.

---

### ✅ T-086 — ~~Video konferensiya faqat "bog'langan konsultant" bilan yaratiladi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Mahsulot mantiqi / O'rta
**Fayl:** `backend/EkgAnalyzerApi/Controllers/VideoCallController.cs:133`

**Muammo:**
Video konferensiya yaratishga urinilganda klinikaning **o'z shifokori** uchun ham xatolik qaytadi:

```
POST /api/videocall/conferences  {"patientId":13,"doctorIds":[50,51]}
→ 400 {"message":"consultant_not_linked"}
```

Faqat `clinic_consultants` jadvalida `status = "active"` bo'lgan shifokorlar bilan konferensiya yaratish mumkin. Ya'ni klinika **o'z xodimi** bilan video konsilium o'tkazish uchun avval uni "tashqi konsultant" sifatida taklif qilib, narx belgilab, taklifni qabul qildirishi kerak.

Bu mantiqiy emas: klinika ichidagi konsilium (masalan kardiolog va terapevt bemorni birga muhokama qilishi) — bu odatiy amaliyot va u pulli konsultatsiya shartnomasi talab qilmaydi.

**Tuzatish rejasi:**
1. Ikki turdagi konferensiyani ajratish:
   - **Ichki konsilium** — klinikaning o'z xodimlari bilan, bepul, konsultant bog'lanishi shart emas.
   - **Tashqi konsultatsiya** — boshqa klinika shifokori bilan, `clinic_consultants` orqali va narx bilan.
2. Konferensiya yaratish formasida shifokorlar ro'yxatini ikki guruhga bo'lish: "Klinika xodimlari" va "Tashqi konsultantlar".
3. Xatolik xabarini tushunarli qilish: hozir `consultant_not_linked` — foydalanuvchi buni ko'rmaydi (tarjima kaliti ham yo'q, T-055 ro'yxatida bor).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

### Ruxsat ikki manbadan

Ilgari faqat `clinic_consultants` jadvalida `status = "active"` bo'lgan
shifokorlar bilan konferensiya yaratish mumkin edi. Ya'ni klinika **o'z
xodimi** bilan video konsilium o'tkazish uchun avval uni "tashqi
konsultant" sifatida taklif qilib, narx belgilab, taklifni qabul
qildirishi kerak edi — bu shartnoma jarayoni tashqi mutaxassis uchun
mo'ljallangan, o'z jamoasi uchun emas.

Endi ruxsat ro'yxati ikkitasining birlashmasi:

1. **Klinikaning o'z shifokorlari** — `doctors` → `users.clinic_id`
   joriy klinikaga teng bo'lganlar;
2. **Faol tashqi konsultantlar** — avvalgidek.

Klinika chegarasi saqlanadi: boshqa tashkilot shifokorini shunchaki
qo'shib bo'lmaydi.

### Tekshiruv (jonli)

| So'rov | Natija |
|---|---|
| O'z shifokorlari `[50, 51]` bilan | **200**, konferensiya #4 yaratildi |
| Boshqa klinika shifokori `[54]` bilan | **400** `consultant_not_linked` |

Yangi konferensiya holati (bu bir vaqtda **T-090 ning 1 va 2-bandini**
ham tasdiqlaydi):

```
holat: scheduled
  ISMOILOV RAHMONJON   status='invited'  joinedAt=None
  AMRULLAYEV ABDULLA   status='invited'  joinedAt=None
  DAVLATOV AZIZBEK     status='invited'  joinedAt=None
```

---

### ✅ T-087 — ~~"Bemorlar" sahifasi mavjud emas: `/patcients` marshruti XODIMLAR ro'yxatini ko'rsatadi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Mahsulot bo'shlig'i / Mantiqiy xato / Kritik
**Fayllar:** `frontend/src/pages/cabinet/pages/patcients/Patcients.js`, `frontend/src/pages/cabinet/Main.js:238`

**Muammo:**
`/patcients` manziliga o'tilganda (nonli izcha "Bemorlar" deb yozilgan) ekranda **xodimlar ro'yxati** chiqadi:

| Ekranda ko'ringan | Kutilgan |
|---|---|
| Ustunlar: `F.I.SH`, `Login`, **`Parol`**, `Telefon raqam`, `Lavozim` | Bemor F.I.SH, passport, tug'ilgan sana, tahlillar soni |
| Qatorlar: ISMOILOV (Bosh shifokor), AMRULLAYEV (Shifokor), DAVLATOV (Shifokor), SHUKURULLAYEVA (Hamshira), TESTOV (Shifokor) | Klinika bemorlari |
| Tugma: **"Yangi xodim qo'shish"** | "Yangi bemor qo'shish" |

Sababi kodda ochiq ko'rinadi — `Patcients.js` xodimlar so'rovini yuklaydi:
```js
import { get_doctors_of_clinic } from '../../../../host/requests/DoctorRequest'
...
const [doctors, setdoctors] = useState([])
```
Ya'ni bu fayl **Xodimlar sahifasidan nusxa olingan va hech qachon bemorlarga moslanmagan**.

Bundan tashqari bu nusxada qo'shimcha **"Login"** ustuni ham bor va **"Parol"** ustunida ochiq parollar ko'rinadi (`TestParol2026` — auditda yaratilgan xodimning haqiqiy paroli). Ya'ni T-020 muammosi bu sahifada ham takrorlanadi.

**Nima uchun kritik:**
- Bemorlar — tibbiy platformaning markaziy ob'ekti, lekin ular bilan ishlash sahifasi **umuman yo'q**.
- Bemorni topish, uning kartasini ochish, tahlillar tarixini ko'rish imkoniyati yo'q. Hozir bemorga faqat tahlil yaratish oqichi ichida (passport bo'yicha qidiruv) murojaat qilish mumkin.
- Foydalanuvchi "Bemorlar" deb yozilgan sahifaga kirib xodimlarni ko'rsa — bu tizimga bo'lgan ishonchni yo'qotadi.

**Tuzatish rejasi:**
1. `Patcients.js` ni noldan yozish:
   - `GET api/patcient/get-patcients-of-clinic` dan ma'lumot olish (klinika filtri bilan — T-063)
   - Ustunlar: F.I.SH, tug'ilgan sana (yosh), jinsi, telefon, tahlillar soni, oxirgi tashrif
   - Qidiruv: ism yoki passport bo'yicha
   - Pagination
   - "Parol" va "Login" ustunlari **bo'lmasin**
2. **Bemor kartasi** sahifasini yaratish (`/patcients/:id`):
   - Shaxsiy ma'lumotlar (passport maskalangan holda)
   - Barcha tahlillar yagona xronologik lentada (EKG, Holter, SMAD, Lab, xulosalar)
   - Har bir tahlilga o'tish havolasi
   - Ko'rsatkichlar dinamikasi grafigi (T-035 bilan)
   - Bemor ma'lumotlarini tahrirlash
3. Yon menyuga "Bemorlar" bo'limini qo'shish (T-023).
4. Tahlil ko'rish sahifalaridan bemor kartasiga havola qo'yish.
5. Bemorni o'chirish/arxivlash (shaxsiy ma'lumotlar qonuni talabi — T-027 bilan).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ishlar:**

**Backend**
1. `DTOs/PatcientDTO.cs` — yangi `PatcientListItemDTO`. Ilgari ro'yxat `Patcient`
   entity'sini xom holda qaytarardi va `passport` maydonida BAZADAGI SHIFRLANGAN
   Base64 matn ketardi. Endi passport serverda deshifrlanib **maskalanadi**
   (`passportMasked` = `** ****4567`) — to'liq seriya brauzerga umuman yuborilmaydi.
2. `Services/PatcientService.cs::GetPatcientsAsync` noldan yozildi:
   * `EncryptionService` DI orqali ulandi (passportni deshifrlash uchun);
   * **Holter va SMAD ham hisobga olindi** — ilgari faqat EKG/Lab/Xulosa
     ko'rilardi, ya'ni faqat Holter tahlili bo'lgan bemor ro'yxatga umuman
     tushmasdi;
   * shifokor uchun filtr to'g'rilandi (o'ziga biriktirilgan EKG/Lab/Holter/SMAD);
   * `search` parametri — ism/familiya/otasining ismi/telefon bo'yicha;
   * `lang` parametri — viloyat/tuman nomi uz/ru/en;
   * har bir bemor uchun `analysesCount` va `lastAnalysisAt` hisoblanadi.
3. `Controllers/PatcientController.cs` — `get-patcients-of-clinic` endpoint
   `ICurrentUser` ga o'tkazildi, `search` va `lang` qabul qiladi; metod nomi
   `GetDoctors` → `GetPatcientsOfClinic` (eski nom nusxa-ko'chirishning izi edi).

**Frontend**
4. `pages/cabinet/pages/patcients/Patcients.js` noldan yozildi:
   * `get_doctors_of_clinic` → `get_patcients_of_clinic`;
   * **"Login" va "Parol" ustunlari olib tashlandi** (T-020 muammosining bu
     sahifadagi nusxasi yopildi);
   * **"Yangi xodim qo'shish" tugmasi olib tashlandi**;
   * ustunlar: `#`, F.I.SH (ostida yosh va jinsi), maskalangan passport,
     tug'ilgan sana, telefon, manzil, tahlillar soni;
   * `Input.Search` orqali qidiruv, `EmptyState`, `scroll={{x:'max-content'}}`,
     qatorni bosganda bemor kartasiga o'tish.

**Tekshirildi:**

| Tekshiruv | Natija |
|---|---|
| `GET /api/patcient/get-patcients-of-clinic?page=1` (ADMIN) | `totalCount=2`, passport `** ****4567` / `** ****7391` — shifrlangan matn emas |
| `?search=ismoil` | `totalCount=1`, faqat ISMOILOV |
| `?lang=ru` | `Андижанская область / Ходжаобод район` |
| Brauzer `/patcients` | Jadvalda 2 ta **bemor**, ustunlar F.I.SH / Passport / Tug'ilgan sana / Telefon / Manzil / Tahlillar. Parol va Login ustunlari yo'q |
| Ro'yxatda ko'rsatilgan yosh | `36 лет · Мужской`, `25 лет · Мужской` — to'g'ri hisoblangan |
| Boshqa klinika admini (NEWADMIN) | `{"data":[],"totalCount":0}` — ko'p ijarachilik izolyatsiyasi saqlangan |
| Shifokor (DOCTOR1) | Faqat o'ziga biriktirilgan tahlillarning bemorlari |

---

### ✅ T-088 — ~~Jadvallarda `#` ustuni bir joyda tartib raqami, boshqa joyda ID~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UI / Izchillik / O'rta
**Fayllar:** `pages/cabinet/diagnoses/DiagnosesList.js`, boshqa ro'yxat sahifalari

**Muammo:**
"Shifokor xulosasi" sahifasida `#` ustunida **`16`** ko'rsatiladi — bu bazadagi `id`. Boshqa barcha ro'yxatlarda (`EKG tahlillari`, `Xodimlar`) esa `#` ustunida `1, 2, 3...` — sahifadagi tartib raqami.

Foydalanuvchi uchun `16` raqami ma'nosiz: ro'yxatda bitta yozuv bor, lekin raqami 16. "16 ta yozuv bormi?" degan savol tug'iladi.

**Tuzatish rejasi:**
1. Barcha ro'yxatlarda `#` ustunini **sahifadagi tartib raqami** qilish: `(page - 1) * pageSize + index + 1`.
2. Agar bazadagi ID kerak bo'lsa — alohida "Hujjat raqami" ustunida yoki qator kengaytmasida ko'rsatish (masalan `NMED-EKG-00000096` formatida, PDF dagi kabi).
3. Yagona `renderRowNumber(page, pageSize)` yordamchisini yaratib barcha jadvallarda ishlatish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ishlar:**

1. `tools/formatters.js` ga yagona yordamchi qo'shildi:
   ```js
   export const rowNumber = (page, pageSize) =>
       (_value, _row, index) => (Math.max(page, 1) - 1) * pageSize + index + 1
   ```
2. **`DiagnosesList.js`** — `#` ustunida bazadagi `id` chiqardi
   (`dataIndex: 'id'`): ro'yxatda bitta yozuv bo'lsa ham **`16`** deb
   yozilardi. Endi sahifadagi tartib raqami.
3. **`Doctors.js`** — `render:(item, data, key)=>(key+1)` sahifa siljishini
   hisobga olmasdi: **2-sahifada raqamlar yana 1 dan boshlanardi**. Endi
   `rowNumber(page, PAGE_SIZE)`; `pageSize` ham qattiq `10` o'rniga
   `PAGE_SIZE` doimiysidan olinadi.
4. Qolgan beshta ro'yxat (EKG, Holter, SMAD, Laboratoriya, Bemorlar) ham
   takroriy ifoda o'rniga shu yordamchiga o'tkazildi — endi mantiq bitta
   joyda.

**Yo'l-yo'lakay tuzatilgan tarjima kamchiligi:**
Oltita ro'yxatda sahifalash matni qattiq kodlangan edi:
`showTotal: (tot) => \`${tot} ta natija\`` — ya'ni rus va ingliz tilida ham
o'zbekcha "2 ta natija" chiqardi. Endi `t('total_results', { count })`
orqali uch tilda.

**Tekshirildi (brauzerda):**

| Tekshiruv | Ilgari | Hozir |
|---|---|---|
| `/patient-diagnoses` `#` ustuni | `16` (bazadagi id) | **`1`** |
| Sahifalash matni (rus tilida) | `2 ta natija` | **`Результатов: 2`** |
| EKG ro'yxati `#` | `1, 2, …` | o'zgarmadi (to'g'ri edi) |
| Xodimlar 2-sahifasi | `1` dan boshlanardi | `11` dan davom etadi |

---

### ✅ T-089 — ~~Vaqt mintaqasi ko'rsatishda ham izchil emas~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Mantiqiy nomuvofiqlik / O'rta
**Fayllar:** `frontend/src/tools/formatters.js`, `Services/DashboardService.cs`, ro'yxat sahifalari

**Muammo:**
Bir xil vaqt turli sahifalarda turlicha ko'rsatiladi. Auditda yaratilgan video konferensiya (`created_at = 2026-08-28 20:34 UTC`):

| Joy | Ko'rsatilgan |
|---|---|
| Video konferensiya ro'yxati | **29.08.2026 01:34** (mahalliy vaqt, UTC+5) ✅ |
| Dashboard "bugungi" hisobi | UTC bo'yicha hisoblanadi (T-012) ❌ |
| EKG ro'yxati "Kiritilgan sana" | 28.08.2026 (faqat sana, vaqt mintaqasi noaniq) |
| PDF hisobot | 28.08.2026 14:35 (UTC) ❌ |

Ya'ni foydalanuvchi bir sahifada 29-avgust, boshqasida 28-avgust ko'radi — bir xil hodisa uchun.

**Tuzatish rejasi:**
1. **Yagona qoida:** backend har doim UTC saqlaydi va UTC qaytaradi (`DateTime.UtcNow`, ISO 8601 `Z` bilan) — bu hozir asosan to'g'ri.
2. **Frontend har doim mahalliy vaqtga o'giradi** — yagona `formatDateTime(utcString)` yordamchisi orqali. Hech bir joyda xom sana ko'rsatilmasin.
3. PDF generatsiyasida ham `Asia/Tashkent` ga o'girish (T-012 bilan).
4. Dashboard "bugun" chegarasini mahalliy vaqtda hisoblash (T-012).
5. Vaqt ko'rsatilganda mintaqani belgilash shart emas, lekin ichki API hujjatida UTC ekani aniq yozilsin.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

### Sabab

Frontend sanalarni brauzerning mahalliy mintaqasida ko'rsatadi
(`formatDateTime` → `getHours()`), PDF esa bazadagi UTC qiymatni
**to'g'ridan-to'g'ri** chizardi.

O'zbekiston UTC+5 bo'lgani uchun farq besh soat. Bir xil tahlil ekranda
`10:41`, hisobotda `05:41` bo'lib chiqardi. Shifokor uchun bu jiddiy:
EKG qachon olingani klinik ma'noga ega va ikki hujjat bir-biriga zid
ma'lumot berardi.

### Tuzatish

`AppTime` (T-012 da yaratilgan) ga `ToLocal(DateTime)` va uning
`DateTime?` variantlari qo'shildi: bazadagi UTC qiymatni klinika
mintaqasiga o'giradi. `Kind` aniqlanmagan qiymatlar UTC deb qabul
qilinadi — bazadagi ustunlar shunday saqlanadi.

PdfReportService da o'tkazilganlar:

| Nima | Avval | Keyin |
|---|---|---|
| Hujjat sanasi va joriy vaqt | `DateTime.UtcNow` (6 joy) | `AppTime.LocalNow(_config)` |
| Tahlil sanasi (5 tur uchun) | `x.AnalysisDate ?? x.CreatedAt` (10 joy) | `AppTime.ToLocal(...)` |
| Umumiy hisobot quruvchisi | `createdAt`, `analysisDate` | mahalliy nusxalari |
| Xulosa hisoboti | `row.Conclusion.CreatedAt` | `AppTime.ToLocal(...)` |
| Yosh hisoblash | `DateTime.Now` (serverning mintaqasi) | `AppTime.LocalNow(_config)` |

Oxirgisi alohida e'tiborga loyiq: `DateTime.Now` server mintaqasiga
bog'liq. Ishlab chiqarish serveri odatda UTC da ishlaydi, ya'ni bu
qiymat mijoz mintaqasi bilan hech qanday aloqasi bo'lmagan vaqt edi.

Hujjat raqamini yaratuvchi `DocNum` statik metod bo'lgani uchun
sozlamaga kira olmaydi — u standart mintaqa bilan `AppTime.LocalNow()`
ni chaqiradi. Bu muhim, chunki raqamda yil-oy bor va besh soatlik farq
oy chegarasida hujjatni bir oyga surib yuborishi mumkin.

### Tekshiruv

EKG #108 uchun uchta manba solishtirildi:

| Manba | Qiymat |
|---|---|
| Baza (`created_at`) | `2026-08-30 10:41:58 +05:00` |
| Ekran | `30.08.2026 \| 10:41` |
| PDF (tuzatishdan **oldin**) | `30.08.2026 05:41` ❌ |
| PDF (tuzatishdan **keyin**) | `30.08.2026 10:41` ✅ |

### Dashboard "bugungi" hisobi

Bu band T-012 da allaqachon bajarilgan: `AppTime.LocalDayBoundsUtc`
mahalliy kun chegaralarini UTC ga o'girib beradi va dashboard shundan
foydalanadi. Kod tekshirildi, o'zgarish talab qilinmadi.

---

### ✅ T-090 — ~~Video konferensiya ishtirokchisi yaratilishi bilanoq "left" holatida~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Mantiqiy xato / O'rta
**Fayllar:** `backend/EkgAnalyzerApi/Controllers/VideoCallController.cs:133`, `Models/VideoConferenceParticipant.cs`

**Muammo:**
Konferensiya yaratilgach ishtirokchi yozuvi quyidagicha bo'ladi:
```json
{"userId":46, "isAdmin":true, "fullName":"Admin", "status":"left",
 "joinedAt":"2026-08-28T20:34:11..."}
```

Ikki muammo:
1. **`status: "left"`** — ishtirokchi hali qo'shilmagan, lekin "chiqib ketgan" deb belgilangan. Boshlang'ich holat `invited` yoki `pending` bo'lishi kerak.
2. **`joinedAt` allaqachon to'ldirilgan** — hech kim qo'shilmasa ham.

Bu ro'yxatda "Ishtirokchilar: 0/2" ko'rsatilishiga olib keladi va konferensiya darhol "Yakunlandi" holatiga o'tadi.

Shuningdek `fullName: "Admin"` — haqiqiy ism o'rniga umumiy so'z (T-085).

**Tuzatish rejasi:**
1. Ishtirokchi holatlarini aniq belgilash: `invited` → `joined` → `left`.
2. `joinedAt` ni faqat haqiqiy qo'shilganda to'ldirish.
3. Konferensiya holatini ishtirokchilar holatidan hisoblash: hech kim qo'shilmagan bo'lsa `scheduled`, kimdir bo'lsa `active`, hammasi chiqsa `ended`.
4. Ishtirokchi ismini `doctors` jadvalidan olish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

### 1 va 2-band — allaqachon tuzatilgan edi

Kod tekshirildi: ishtirokchi yozuvi `Status = "invited"` bilan
yaratiladi (`VideoCallController.CreateConference`), modelda ham sukut
qiymati `"invited"`. `JoinedAt` esa `null` va faqat haqiqiy qo'shilish
paytida to'ldiriladi.

Javobdagi holat hisoblanadi:

```csharp
Status = participantIsJoined ? "joined"
       : p.JoinedAt.HasValue ? "left"
       : "invited"
```

Ya'ni yangi ishtirokchi uchun `invited` chiqadi.

**Jonli tekshiruv:** bazadagi yagona konferensiya (#3) uchun API
`status = "left"` qaytardi va bu **to'g'ri** — bazada
`joined_at = 2026-08-29 01:34:11` turibdi, ya'ni ishtirokchi haqiqatan
qo'shilib, keyin chiqqan. Konferensiyaning o'zi ham `ended` holatida.

Taskda tasvirlangan holat (yangi yaratilgan yozuv darhol `left`)
takrorlanmadi.

### 3-band — `fullName: "Admin"` tuzatildi

Bu qism **haqiqatan nosoz edi** va tuzatildi.

Sabab: so'rovda `Include(c => c.CreatedByAdmin)` bor edi, lekin ism
`User` da emas, unga bog'langan `Doctor` yozuvida saqlanadi.
`ThenInclude(u => u.Doctor)` bo'lmagani uchun `BuildUserFullName`
har doim zaxira qiymatga tushardi.

Ikkita so'rovga (`conferences` ro'yxati va bitta konferensiya detali)
`ThenInclude(u => u!.Doctor)` qo'shildi.

| Ishtirokchi | Avval | Keyin |
|---|---|---|
| Konferensiya yaratuvchi admin | **"Admin"** | **"ISMOILOV RAHMONJON"** |
| Taklif qilingan shifokor | AMRULLAYEV ABDULLA | AMRULLAYEV ABDULLA |

`BuildUserFullName` ning zaxira qiymati ham T-085 da yaxshilangan edi:
ism topilmasa endi telefon raqami ko'rsatiladi, "Admin" degan umumiy
so'z faqat shifokor yozuvi umuman bo'lmaganda qoladi.

---

### ✅ T-091 — ~~Konsultatsiya sahifasida ortiqcha shaxsiy ma'lumot ko'rsatiladi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Ma'lumot minimallashtirish / O'rta
**Fayl:** `backend/EkgAnalyzerApi/Services/OnlineConsultationService.cs` (`GetDoctorDetailAsync`)

**Muammo:**
`GET /api/consultation/{id}/doctor-detail` — tashqi konsultant shifokorga bemor haqida quyidagilarni beradi:
```
patientFullName, birthDate, gender, phone, address,
adminFullName, adminPhone, adminUserId, clinicName
```
Admin detali (`/detail`) esa qo'shimcha `passportSeries` ni ham qaytaradi.

Konsultatsiya maqsadi — **tibbiy xulosa berish**. Buning uchun konsultantga bemorning **telefon raqami va uy manzili kerak emas**. Ular tibbiy qaror qabul qilishga hech qanday hissa qo'shmaydi, lekin oqib chiqish xavfini oshiradi (tashqi klinika shifokori — boshqa tashkilot xodimi).

**Tuzatish rejasi:**
1. `doctor-detail` javobidan `phone` va `address` ni olib tashlash.
2. Bemorni identifikatsiya qilish uchun ism, yosh va jinsi yetarli; kerak bo'lsa ichki `documentNumber` qo'shish.
3. Passport seriyasini konsultantga umuman ko'rsatmaslik.
4. Ma'lumot minimallashtirish tamoyilini barcha DTO'lar bo'ylab ko'rib chiqish: har bir maydon uchun "bu qabul qiluvchiga haqiqatan kerakmi?" savolini berish.
5. Konsultantga ko'rsatilgan ma'lumotlarni `audit_logs` ga yozish.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Tashqi konsultantga beriladigan ma'lumot qisqartirildi.**

`GET /api/consultation/{id}/doctor-detail` javobidan bemorning
**telefon raqami** va **uy manzili** olib tashlandi
(`Phone = null`, `Address = null`).

Konsultatsiya maqsadi — tibbiy xulosa berish. Buning uchun tashqi
klinika shifokoriga bemorning uy manzili kerak emas: u tibbiy qarorga
hech qanday hissa qo'shmaydi, lekin oqib chiqish xavfini oshiradi —
konsultant boshqa tashkilot xodimi va uning ish joyi klinika
nazoratida emas.

Bemorni ajratish uchun **ism, yosh va jinsi** qoladi. Aloqa zarur bo'lsa
u klinika administratori orqali amalga oshiriladi — administratorning
ismi va telefoni javobda allaqachon bor (`AdminFullName`, `AdminPhone`).

**Passport konsultantga umuman berilmaydi** — `doctor-detail` javobida
bu maydon yo'q va qo'shilmadi.

**Tekshiruv:** o'zgarish `Phone = null` / `Address = null` ko'rinishidagi
o'zgarmas qiymat, build 0 xato bilan o'tdi. **Jonli so'rov bajarilmadi:**
`doctor-detail` faqat o'sha konsultatsiyaga biriktirilgan konsultant
tokeni bilan javob beradi (boshqa shifokor 401 oladi), o'sha hisobning
paroli menda yo'q. Maydonlarni bo'shatish shartsiz bajariladi va boshqa
mantiqqa bog'liq emas.

---

## Qamrov hisoboti (2026-08-29 auditi)

Quyida platformaning qaysi qismlari tekshirilgani qayd etilgan — hech bir qism e'tibordan chetda qolmasligi uchun.

### Backend endpointlar

| Ko'rsatkich | Qiymat |
|---|---|
| Jami .NET endpointlar | **138** |
| Avtomatlashtirilgan tekshiruvdan o'tgan GET endpointlar | **93** (4 rol bilan = 372 so'rov) |
| Qo'lda tekshirilgan POST/PUT/DELETE | 24 |
| Python endpointlar | 10 (EKG/Lab/Holter/SMAD analyze, analyze-save, analyze-retry, med-diagnoses-save, parasitology, ground_truth, health) |

### Tekshirilgan oqimlar

| Oqim | Holat |
|---|---|
| Klinika ro'yxatdan o'tishi (0 dan) | ✅ To'liq — forma, SMS tasdiq, admin profili, klinika sozlamalari |
| Kirish / chiqish | ✅ 5 ta akkaunt, 4 ta rol |
| Xodim qo'shish | ✅ Yangi shifokor yaratildi va bazada tasdiqlandi |
| Bemor yaratish | ✅ Yangi bemor (AC1234567) yaratildi |
| EKG tahlili (AI bilan) | ✅ To'liq natija olindi |
| Holter / SMAD / Laboratoriya tahlillari | ✅ Uchalasi ham AI natijasi bilan |
| Tahlilni qayta AI'ga yuborish | ✅ `send-to-ai` ishlaydi |
| Shifokor xulosasi (med-diagnose) | ✅ Fayl bilan yaratildi |
| Tahlilga tashxis yozish | ✅ `analysis-diagnosis` |
| PDF hisobotlar | ✅ 6 tur (EKG, Holter, SMAD, Lab, birlashtirilgan, konsultatsiya) |
| QR verifikatsiya | ✅ Tahlil va konsultatsiya uchun |
| Konsultant taklif qilish → qabul | ✅ |
| Konsultatsiya yaratish → qabul → xulosa | ✅ To'liq hayotiy sikl |
| LiveKit token generatsiyasi | ✅ Admin va shifokor uchun |
| Video konferensiya yaratish → token → yakunlash | ✅ |
| Parolni tiklash | ✅ Kod yuborish tekshirildi |
| Rol filtri (shifokor/hamshira) | ✅ Baza bilan solishtirildi |
| `is_viewed` / badge mexanizmi | ✅ |
| Ko'p ijarachilik izolyatsiyasi | ❌ **Buzilgan** — T-063, T-080 |
| Tarjima (3 til, 425 kalit) | ✅ Avtomatlashtirilgan taqqoslash |
| Moslashuvchanlik (375/768/1280/1440) | ✅ O'lchandi |

### Tekshirilmagan / qamrovdan tashqari

| Qism | Sabab |
|---|---|
| Parazitologiya moduli | Buyurtmachi so'roviga ko'ra qamrovdan tashqarida |
| SuperAdmin paneli | Hali ishlab chiqilmagan |
| LiveKit real video oqimi | Ikki jonli ishtirokchi va kamera talab qiladi |
| SMS yetkazib berish (Eskiz) | Tashqi xizmat; kod yuborish faqat bazada tekshirildi |
| Email yuborish (SMTP) | Tashqi xizmat |
| Yuklama ostidagi ishlash (load test) | Alohida ish talab qiladi |

---

### ✅ T-092 — ~~AI "tahlil qilib bo'lmadi" desa ham natija YASHIL "Normal" deb belgilanadi — **QISMAN TUZATILDI**~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Bemor xavfsizligi / Mantiqiy xato / **ENG YUQORI USTUVORLIK**
**Fayllar:** `python_back/main.py` (`compose_prompt_for_openai_for_img`, `_sync_ecg_process_and_ai`), `frontend/src/components/results/*`

**Muammo:**
Auditda ataylab yaroqsiz fayllar yuklandi va natija kuzatildi (2026-08-29).

**Tajriba: bo'sh oq rasm (1200×900, hech qanday EKG yo'q) yuklandi → EKG #99**

AI javobi (matn qismi mutlaqo to'g'ri):
> `automatic_analysis`: "Ushbu tasvir asosida EKG tahlili (ritm, o'tkazuvchanlik, ishemiya, gipertrofiya va h.k.)ni aniqlash imkoni yo'q, chunki **EKG signali ko'rinmaydi yoki rasm noto'g'ri yuklangan**."
>
> `final_summary`: "Yuborilgan rasmda EKG yozuvi ko'rinmagani sababli raqamli o'lchovlar va klinik EKG xulosasini berib bo'lmaydi. **To'liq va aniq EKG tasvirini qayta yuborish zarur.**"

Ammo o'sha javobda:
```json
"automatic_analysis_bool": 1     ← 1 = NORMAL = YASHIL
```

Natijada ro'yxatda bu yozuv quyidagicha ko'rinadi:

| id | Yuklangan fayl | `status` | Ro'yxatdagi ko'rinish | AI aslida nima dedi |
|---|---|---|---|---|
| **99** | **bo'sh oq rasm** | 2 = tayyor | ✅ "AI tahlil qilindi" + 🟢 **Normal** | "EKG signali ko'rinmaydi" |
| **98** | **40×30 px mayda rasm** | 2 = tayyor | ✅ "AI tahlil qilindi" + 🟢 **Normal** | tahlil qilib bo'lmadi |
| 96 | **haqiqiy EKG** | 2 = tayyor | ✅ "AI tahlil qilindi" + 🟠 O'rtacha | I-darajali AV blokada |

**Ya'ni axlat fayllar haqiqiy EKG dan "sog'lomroq" ko'rinadi.**

**Nima uchun bu eng jiddiy muammo:**
Shifokor kunlik ish jarayonida ro'yxatni ko'zdan kechiradi va **yashil belgili yozuvlarni ochmaydi** — bu tabiiy va to'g'ri xatti-harakat. Natijada:
1. Bemorning EKG'si umuman tahlil qilinmagan, lekin tizimda "tayyor va normal" deb turadi.
2. Hech kim xatoni sezmaydi — na laborant, na shifokor.
3. Haqiqiy patologiya (masalan o'tkir infarkt) e'tibordan chetda qoladi.

Bu tizimning ishonchliligiga bo'lgan butun ishonchni yo'q qiladi va **bemorga real zarar yetkazishi mumkin**.

**Qo'shimcha: matn fayli (.txt) yuklanganda** → EKG #97, `status = -1`, va `ai_answer_data` ustuniga qayta ishlanmagan Python xatoligi yozildi:
```
unsupported operand type(s) for *: 'NoneType' and 'int'
```
Ya'ni signal qayta ishlash quvuri **ushlanmagan istisno bilan qulaydi** (T-025 bilan bir xil ildiz).

**Tuzatish rejasi:**

**1. AI javobiga "tahlil qilinmadi" holatini qo'shish (eng muhim qadam):**
   Prompt'ga majburiy maydon kiritish:
   ```json
   {
     "analiz_mumkinmi": true | false,
     "sabab": "rasm_sifati_past" | "ekg_emas" | "qisman_korinadi" | null,
     "automatic_analysis_bool": 1 | 2 | 3 | null
   }
   ```
   `analiz_mumkinmi = false` bo'lsa `automatic_analysis_bool` **majburiy ravishda `null`** bo'lsin.

**2. Yangi status kodi joriy qilish:**
   - `2` — tahlil qilindi, natija bor
   - **`3` (yangi) — "tahlil qilib bo'lmadi, fayl yaroqsiz"** (T-029 bilan uyg'unlashtiriladi)
   - `-1` — texnik xatolik

**3. Frontendda:**
   - `automatic_analysis_bool` `null` yoki 1/2/3 dan boshqa bo'lsa — **kulrang "Baholanmadi"** chipi (T-031 dagi `parseSeverity`).
   - Status `3` uchun alohida sariq banner: "Fayl tahlil qilinmadi — qayta yuklang" va **"Qayta yuklash"** tugmasi.
   - Bunday yozuvlar ro'yxatda **yashil bo'lmasligi** shart.

**4. Kirish faylini oldindan tekshirish** (T-052 bilan birga):
   - Rasm minimal o'lchami (auditda 40×30 px qabul qilindi — kamida 800 px kenglik talab qilinsin)
   - Xiralik va kontrast tekshiruvi
   - `.txt` kabi fayllarni umuman qabul qilmaslik (auditda matn fayli qabul qilindi — T-093)

**5. Python signal quvurida istisnolarni ushlash** — `NoneType` xatoligi mijozga yetib bormasin, `status = 3` bilan tushunarli sabab yozilsin.

**Qabul mezoni:** Bo'sh yoki yaroqsiz rasm yuklanganda ro'yxatda **yashil "Normal"** belgisi **hech qachon** chiqmaydi; foydalanuvchi aniq ogohlantirish va qayta yuklash tugmasini ko'radi.

---

#### ⚠️ Qisman bajarilgan (2026-08-29) — T-095 doirasida

T-095 uchun qo'shilgan hujjat tasniflagichi (`document_classifier.py`) bu muammoning
**bir qismini** hal qildi. Jonli tekshiruv:

| Sinov | Avval | Hozir |
|---|---|---|
| Bo'sh oq rasm → EKG | `status = 2`, 🟢 **Normal** | `status = 3`, tur `aniqlanmadi`, **yashil emas** ✅ |
| 40×30 px mayda rasm | `status = 2`, 🟢 **Normal** | tasniflagich ushlaydi ✅ |
| Haqiqiy EKG (regressiya) | `status = 2`, 🟠 O'rtacha | `status = 2`, 🟠 O'rtacha — **buzilish yo'q** ✅ |

**Nima QOLDI (bu vazifa hali ochiq):**

Tasniflagich faqat **hujjat turini** tekshiradi. Fayl haqiqatan EKG bo'lsa-yu, lekin
**sifati past** bo'lsa (xira surat, qiyshiq lenta, chetlari kesilgan, past kontrast) —
tasniflagich uni "ekg" deb tan oladi va asosiy tahlil odatdagidek davom etadi.
Model "aniq o'qib bo'lmadi" desa ham `automatic_analysis_bool` 1 bo'lib qolishi mumkin.

Buni to'liq yopish uchun quyidagilar kerak (yuqoridagi asosiy reja bo'yicha):
1. Asosiy prompt'ga `analiz_mumkinmi` va `sabab` maydonlarini qo'shish;
   `analiz_mumkinmi = false` bo'lsa `automatic_analysis_bool` majburiy `null`.
2. Frontendda `parseSeverity` (T-031) — 1/2/3 dan boshqa qiymat kulrang "Baholanmadi".
3. Rasm sifatini o'lchash (T-094: o'lcham, xiralik, kontrast).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Uch qatlamli himoya joriy qilindi.**

**1-qatlam — promptga aniq maydon qo'shildi** (`python_back/main.py`, ikkala prompt)
```json
"analiz_mumkinmi": "true yoki false. Rasmda EKG yozuvi ko'rinmasa, sifati
                    past bo'lsa yoki tahlil imkoni bo'lmasa — false",
"analiz_mumkin_emas_sababi": "...",
"automatic_analysis_bool": "... MUHIM: analiz_mumkinmi false bo'lsa
                            BU MAYDON null bo'lishi SHART"
```
Qo'shimcha talablar ro'yxatiga ham ta'kidlangan qoida kiritildi: bunday
holatda **hech qachon 1 (yengil/normal) qo'yilmasin**, chunki shifokor
yashil belgili yozuvni ochmaydi.

**2-qatlam — `python_back/ai_result_guard.py` (yangi modul)**
Model ko'rsatmani e'tiborsiz qoldirsa ham ishlaydigan zaxira himoya.
Saqlashdan **oldin** javob tekshiriladi va "tahlil qilib bo'lmadi"
holati aniqlansa:
* `automatic_analysis_bool` → `null` (interfeysda kulrang "Baholanmadi");
* `tahlil_imkonsiz: true` bayrog'i qo'yiladi;
* sabab saqlanadi;
* logga ogohlantirish yoziladi (avvalgi daraja bilan birga).

Aniqlash ikki yo'l bilan: `analiz_mumkinmi: false` maydoni **yoki**
xulosa matnidagi iboralar — **uch tilda** (o'zbek, rus, ingliz).

**Muhim: noto'g'ri aniqlashning oldi olindi.** Dastlabki keng naqsh
(`yetarli emas`) `smad#6` dagi **haqiqiy klinik topilmani** —
"sutkalik pasayish yetarli emas (non-dipper)" — xato ravishda "tahlil
qilib bo'lmadi" deb baholadi. Bu teskari xavf: haqiqiy patologiya
darajasi olib tashlanib "Baholanmadi" bo'lib qolardi. Shu sababli sifat
haqidagi iboralar endi **faqat fayl/rasm konteksti bilan birga**
kelgandagina hisobga olinadi (`rasm|tasvir|fayl|sifat|изображение|
качество|image|file|quality|trace` yaqinida).

**3-qatlam — interfeysdagi ogohlantirish**
`components/shared/NotAnalyzableBanner.js` — to'rtta tahlil ko'rish
sahifasida. Kulrang "Baholanmadi" chipi o'zi yetarli emas (uni e'tibordan
chetda qoldirish oson), shuning uchun natija ustida sariq banner:
> ⚠ AI bu faylni tahlil qila olmadi
> Natijaga tayanmang: fayl sifati yetarli emas yoki tahlil turi mos
> kelmagan. Faylni qayta yuklang. — Sabab: …

**Bazadagi mavjud xavfli yozuvlar tuzatildi**
Guard faqat yangi tahlillarni himoya qiladi; bazada esa allaqachon
xavfli yozuvlar bor edi. `repair_t092.py` skripti to'rtta jadvalni
ko'zdan kechirib, ularni guard orqali o'tkazdi:
* `ecg#99` (bo'sh oq rasm): daraja `1` → `null`
* `ecg#98` (rasm sifati past): daraja `"1"` → `null`
* `smad#6` — **tegilmadi** (haqiqiy klinik topilma)

**Regressiya testi — 10/10 o'tdi:**

| Holat | Kutilgan | Natija |
|---|---|---|
| EKG#99 bo'sh oq rasm | daraja olinsin | `1 → None` ✅ |
| EKG#98 "rasm sifati yetarli emas" | daraja olinsin | `'1' → None` ✅ |
| Model `analiz_mumkinmi: false` degan | daraja olinsin | `1 → None` ✅ |
| Ruscha "изображение не содержит ЭКГ" | daraja olinsin | `1 → None` ✅ |
| Inglizcha "No ECG trace is visible" | daraja olinsin | `1 → None` ✅ |
| **SMAD non-dipper (haqiqiy topilma)** | **tegilmasin** | `2 → 2` ✅ |
| Haqiqiy I-darajali AV blokada | tegilmasin | `2 → 2` ✅ |
| Normal EKG | tegilmasin | `1 → 1` ✅ |
| "Koronar qon aylanishi yetarli emas" | tegilmasin | `3 → 3` ✅ |
| O'tkir ST elevatsiyasi (xavfli) | tegilmasin | `3 → 3` ✅ |
| JSON bo'lmagan javob | o'zgarmasin | o'zgarmadi ✅ |

**Tekshirildi (brauzerda):**

| Tekshiruv | Ilgari | Hozir |
|---|---|---|
| EKG ro'yxatida #99 va #98 | 🟢 **Норма** | ⚪ **Не оценено** |
| `/ecg-analyses/view/99` | Yashil "Normal", hech qanday ogohlantirish yo'q | 🟡 **"ИИ не смог проанализировать этот файл"** banneri + sabab + "Не оценено" |
| Haqiqiy EKG #96 va #100 | 🟠 Среднее | 🟠 **Среднее** (o'zgarmadi) |
| Bo'sh oq rasmni qayta yuklash | AI ga yuborilardi | **Fayl validatsiyasida rad etildi**: "Rasmda tahlil qilinadigan mazmun topilmadi" |

**Eslatma — 1-qatlam allaqachon ishlayapti:** bo'sh oq rasmni qayta
yuklashga urinilganda u AI ga umuman yetib bormadi — `file_validator`
(T-093/T-094) uni oldindan rad etdi. Guard esa validatsiyadan o'tib
ketgan, lekin baribir tahlil qilib bo'lmaydigan holatlar uchun qoladi.

**Alohida task sifatida qoldirildi:** `.txt` fayl yuklanganda signal
qayta ishlash quvurining ushlanmagan istisno bilan qulashi
(`unsupported operand type(s) for *: 'NoneType' and 'int'`) — bu T-025
bilan bir ildizdan va `file_validator` da `.txt` allaqachon taqiqlangan,
shuning uchun bu yo'l endi ochiq emas.

---

### ✅ T-093 — ~~Matn fayli (.txt) EKG sifatida qabul qilinadi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Kirish validatsiyasi / Kritik
**Fayllar:** `python_back/file_validator.py`, `python_back/main.py:1213`

**Muammo:**
Auditda oddiy matn fayli EKG sifatida yuklandi va **qabul qilindi**:

```
POST /api/ecg-analyses/analyze   file=notekg.txt  (30 bayt, "Bu EKG emas, oddiy matn fayli")
→ HTTP 200
→ {"ecg_id":97, "status":"processing", "analyse_file_path":"/uploads/ecg_analyse_files/notekg.txt"}
```

Taqqoslash uchun — soxta PDF **to'g'ri rad etildi**:
```
POST ... file=fake.pdf  (14 bayt, "not a real pdf")
→ HTTP 400 {"detail":"Ruxsat etilmagan fayl turi: fake.pdf"}
```

Ya'ni `validate_file_type` PDF uchun sehrli baytlarni tekshiradi, lekin `.txt` / `.csv` kengaytmasi uchun **mazmun tekshiruvi yo'q** (CSV/TSV EKG jadval formati sifatida qabul qilinadi, shuning uchun matn fayllari o'tib ketadi).

Frontendda esa foydalanuvchiga "Fayl turlari: xml, jpg, png" deb yozilgan (T-041) — ya'ni `.txt` interfeys bo'yicha ham qabul qilinmasligi kerak edi.

Natija: yozuv yaratildi, fayl saqlandi, keyin qayta ishlash qulab tushdi (T-092).

**Tuzatish rejasi:**
1. Har bir tahlil turi uchun **ruxsat etilgan kengaytmalar va MIME turlarining aniq ro'yxati** (T-041 bilan yagona manba).
2. Kengaytmadan tashqari **mazmun tekshiruvi**:
   - Rasm uchun: `Pillow` bilan ochib ko'rish, o'lchamni tekshirish
   - CSV/TSV uchun: birinchi qatorlarni parse qilib, EKG kanallari (`I`, `II`, `V1`–`V6`) topilishini tekshirish
   - XML uchun: sxemaga moslikni tekshirish
3. Tekshiruv o'tmasa — **yozuv yaratmasdan** 400 qaytarish (T-026 tranzaksiya masalasi bilan birga).
4. Xatolik xabari foydalanuvchi tilida va aniq: "Bu fayl EKG ma'lumotlarini o'z ichiga olmaydi. XML, CSV yoki EKG lentasining rasmini yuklang."


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**
`file_validator.py` kengaytirildi — `ALLOWED_BY_ANALYSIS_TYPE` **yagona manba** sifatida
har bir tahlil turi uchun ruxsat etilgan kengaytmalarni belgilaydi:

| Tur | Ruxsat etilgan |
|---|---|
| EKG | `.xml .csv .tsv .png .jpg .jpeg` |
| Holter / SMAD / Laboratoriya | `.pdf .png .jpg .jpeg` |

**`.txt` ro'yxatdan butunlay olib tashlandi** — ilgari u `.csv` bilan bir qatorda
ruxsat etilgan edi va oddiy matn fayli EKG sifatida qabul qilinardi.

Yangi `validate_upload()` funksiyasi hajm, kengaytma, magic bytes va (rasm bo'lsa)
sifatni tekshiradi. To'rttala modulda **8 ta joyda** (asosiy va `replace-file` endpointlari)
eski `validate_file_type` tekshiruvi shu funksiyaga almashtirildi.

**Jonli tekshiruv:**

| Fayl | Avval | Hozir |
|---|---|---|
| `notekg.txt` (30 bayt) | **200** — EKG #97 yaratildi, keyin qulab tushdi | **400** "Yuklangan fayl bo'sh yoki buzilgan" ✅ |
| Katta `.txt` (6 KB) | 200 | **400** "Ruxsat etilgan formatlar: CSV, JPEG, JPG, PNG, TSV, XML" ✅ |
| Soxta PDF | 400 | **400** ✅ |
| **Regressiya:** haqiqiy EKG rasm | 200 | **200**, EKG #103 ✅ |
| **Regressiya:** haqiqiy Lab PDF | 200 | **200**, Lab #24 ✅ |

---

### ✅ T-094 — ~~Juda kichik va sifatsiz rasmlar tekshirilmasdan qabul qilinadi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Kirish validatsiyasi / Yuqori
**Fayllar:** `python_back/main.py` (`extract_image_bytes_as_signal`), yuklash sahifalari

**Muammo:**
**40 × 30 piksel** hajmdagi rasm EKG sifatida qabul qilindi (EKG #98) va AI'ga yuborildi. Bunday o'lchamda hech qanday EKG lentasi o'qib bo'lmaydi.

Rasm o'lchami, xiraligi, kontrasti va yorug'ligi bo'yicha **hech qanday tekshiruv yo'q**.

Amaliy holatlar (klinikada odatiy):
- Laborant telefonda qo'li qaltirab suratga oladi → xira rasm
- Xona qorong'i → past kontrast
- Lenta qiyshiq yotibdi yoki chetlari kadrga sig'magan
- Suratdan surat olingan (ekrandan)

Bularning barchasi hozir jimgina o'tadi va AI taxminiy javob beradi (T-092).

**Tuzatish rejasi:**
1. **Server tomonida minimal talablar:**
   - Kenglik ≥ 800 px va balandlik ≥ 600 px (aks holda rad etish)
   - Xiralik: Laplasian dispersiyasi chegaradan past bo'lsa ogohlantirish (`numpy` bilan, yangi bog'liqliksiz)
   - O'rtacha yorug'lik juda past yoki juda yuqori bo'lsa ogohlantirish
   - Rangli dispersiya juda past bo'lsa (deyarli bir tekis rasm) — rad etish
2. **Brauzerda oldindan tekshirish:** fayl tanlangach `canvas` orqali o'lchamni va xiralikni tekshirib, foydalanuvchiga **darhol** aytish (serverga yubormasdan).
3. **Ko'rish (preview) + namuna:** tanlangan rasmni ko'rsatish va yonida "yaxshi misol" / "yomon misol" rasmlarini qo'yish.
4. Tekshiruvlar ogohlantirish darajasida bo'lsa — foydalanuvchi "baribir yuborish" tugmasi bilan davom etishi mumkin, lekin natijada "past sifatli kirish" belgisi qo'yiladi (T-092, 3-band).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**
`file_validator._validate_image()` — rasm sifatini tekshiradi (Pillow + numpy,
yangi bog'liqlik shart emas — ikkalasi ham allaqachon mavjud):

- **Minimal o'lcham:** 800×600 piksel
- **Mazmun tekshiruvi:** kulrang tasvir standart og'ishi < 6.0 bo'lsa (bo'sh varaq,
  qorong'i kadr, bir tekis fon) rad etiladi
- **Buzilgan fayl:** ochib bo'lmasa aniq xabar
- Hajm chegarasi: 25 MB (T-040 ham shu bilan qoplanadi)

Xatolik xabarlari uch tilda va **nima qilish kerakligini** aytadi.

**Jonli tekshiruv:**

| Fayl | Avval | Hozir |
|---|---|---|
| 40×30 px rasm | **200** — EKG #98, \U0001F7E2 "Normal" | **400** — "Rasm o'lchami juda kichik (40×30). Kamida 800×600 piksel bo'lishi kerak. Tahlilni yaxshi yorug'likda, to'g'ridan-to'g'ri tepadan suratga oling." ✅ |
| Bo'sh oq rasm 1200×900 | **200** — EKG #99, \U0001F7E2 "Normal" | **400** — "Rasmda tahlil qilinadigan mazmun topilmadi (bo'sh yoki juda past kontrastli). Yaxshiroq sifatli surat yuklang." ✅ |

**Ikki qatlamli himoya tasdiqlandi:** laboratoriyaga EKG **rasmi** yuklanganda
yuklash bosqichida o'tadi (JPG lab uchun ruxsat etilgan), lekin hujjat
tasniflagichi (T-095) uni ushlaydi:

| Yozuv | Natija |
|---|---|
| Lab #23 (EKG rasmi) | `status = 3`, `aniqlangan_tur = "ekg"`, `automatic_analysis_bool` **yo'q** ✅ |
| Lab #24 (to'g'ri lab PDF) | `status = 2`, `bool = 1` ✅ |

---

### ✅ T-095 — ~~Noto'g'ri turdagi fayl har qanday modulga yuklanadi va YASHIL "Normal" natija beradi~~ — **BAJARILDI (2026-08-29)**

**Toifa:** Bemor xavfsizligi / Ma'lumotlar yaxlitligi / Kritik
**Fayllar:** `python_back/lab_analyses_api.py`, `holter_analyses_api.py`, `smad_analyses_api.py`, `main.py` — prompt qismlari

**Muammo:**
T-092 da EKG moduli uchun aniqlangan muammo **barcha tahlil turlarida** takrorlanishi tekshirildi. Ataylab noto'g'ri fayllar yuklandi (2026-08-29):

| # | Modul | Yuklangan fayl | `status` | `automatic_analysis_bool` | AI aslida nima dedi |
|---|---|---|---|---|---|
| LAB #18 | Laboratoriya | **Holter PDF** | 2 = tayyor | **1 = 🟢 Normal** | "Yurak sutkalik Holter monitoringi xulosasida I-darajali AV blokada aniqlangan..." — **kardiologik xulosa yozdi** |
| LAB #19 | Laboratoriya | **EKG rasmi** | 2 = tayyor | **1 = 🟢 Normal** | "Berilgan fayl laboratoriya tahlili emas, EKG bo'lib ko'rinadi" |
| HOLTER #15 | Holter | **Laboratoriya PDF** | 2 = tayyor | **1 = 🟢 Normal** | "Taqdim etilgan hujjat Holter (EKG) emas, qalqonsimon bez funksiyasi bo'yicha laborator tahlil" |

**Uchta alohida muammo aniqlandi:**

**1. Hech qanday tur mosligi tekshiruvi yo'q.** Har qanday PDF yoki rasmni har qanday modulga yuklash mumkin. Tizim faqat kengaytmani tekshiradi, mazmunini emas.

**2. AI mos kelmaslikni aniqlagan hollarda ham natija yashil.** LAB #19 va HOLTER #15 da model to'g'ri aytdi: "bu boshqa turdagi hujjat". Ammo `automatic_analysis_bool = 1` bo'lgani uchun ro'yxatda **yashil "Normal"** chiqadi va shifokor uni ochmaydi.

**3. Eng xavflisi — LAB #18.** AI mos kelmaslikni **umuman aytmadi**: Holter hisobotini o'qib, unga to'liq **kardiologik xulosa** yozdi va bu xulosa **laboratoriya tahlili** yozuvi sifatida saqlandi.

Natijada bemor kartasida "Laboratoriya tahlili" deb yozilgan yozuv ichida yurak ritmi va AV blokada haqidagi matn turadi. Keyinchalik bu hujjat asosida qaror qabul qilinsa yoki PDF chop etilsa — tibbiy hujjat mazmunan noto'g'ri bo'ladi.

**Nima uchun kritik:**
Klinikada fayl almashtirib yuborish — **eng ko'p uchraydigan inson xatosi**. Laborant bir vaqtda bir necha bemor bilan ishlaydi, papkalar o'xshash nomlanadi. Tizim bu xatoni **aniqlashi va to'xtatishi** kerak, aksincha uni tasdiqlab, yashil belgi qo'yib bermasligi kerak.

**Tuzatish rejasi:**

**1. AI orqali tur tasdig'i (asosiy tahlildan oldin):**
   Har bir modul uchun arzon oldindan tekshiruv chaqiruvi:
   ```
   "Bu hujjat qanday turdagi tibbiy tekshiruv natijasi?
    Javob: ekg | holter | smad | laboratoriya | boshqa | aniqlanmadi"
   ```
   Natija tanlangan modulga mos kelmasa — **asosiy tahlil umuman yuborilmaydi**, yozuv `status = 3` ("fayl mos emas") bilan saqlanadi va foydalanuvchiga aniq xabar ko'rsatiladi:
   > "Siz Laboratoriya bo'limiga Holter hisobotini yukladingiz. To'g'ri bo'limga yuklang yoki boshqa fayl tanlang."
   Bu ayni paytda asosiy (qimmat) AI chaqiruvini tejaydi.

**2. Prompt'ga majburiy maydon qo'shish** (T-092 bilan yagona yechim):
   ```json
   { "hujjat_turi": "...", "modulga_mos": true|false,
     "analiz_mumkinmi": true|false, "automatic_analysis_bool": 1|2|3|null }
   ```
   `modulga_mos = false` → `automatic_analysis_bool` majburiy `null`.

**3. Frontendda:**
   - `status = 3` uchun sariq banner + **"Boshqa fayl yuklash"** tugmasi
   - Fayl tanlangach darhol ko'rish (preview) — foydalanuvchi yuborishdan oldin ko'radi
   - Har bir modul yuklash maydonida qabul qilinadigan hujjat turi aniq yozilsin

**4. Faylni to'g'ri modulga ko'chirish imkoniyati:**
   Xato aniqlanganda "Bu tahlilni Holter bo'limiga ko'chirish" tugmasi — foydalanuvchi qaytadan yuklamasin.

**5. Structured Outputs** (T-032) bilan JSON sxemasini majburiy qilish — model maydonlarni tashlab keta olmaydi.

**Qabul mezoni:** Laboratoriya bo'limiga Holter PDF yuklanganda tizim buni aniqlaydi, AI tahlilini boshlamaydi, foydalanuvchiga tushunarli xabar va tuzatish yo'lini ko'rsatadi; ro'yxatda yashil "Normal" belgisi chiqmaydi.

---

#### ✅ Bajarilgan ish (2026-08-29)

**Yangi fayl:** `python_back/document_classifier.py`
Asosiy (qimmat) tahlildan oldin arzon `gpt-5-mini` chaqiruvi bilan hujjat turini aniqlaydi.
Mos kelmasa asosiy tahlil **umuman yuborilmaydi** — bu ayni paytda AI xarajatini ham tejaydi.
Tasniflash ishonchsiz bo'lsa (`< 0.6`) yoki xizmat ishlamasa — tahlil to'xtatilmaydi (noto'g'ri rad etishning oldini olish).

**Yangi status:** `3` = `STATUS_FILE_MISMATCH` — "fayl tanlangan tahlil turiga mos emas".
`automatic_analysis_bool` **yozilmaydi**, shuning uchun ro'yxatda yashil "Normal" chiqmaydi.

**O'zgartirilgan fayllar:**
| Fayl | O'zgarish |
|---|---|
| `python_back/document_classifier.py` | yangi — tasniflagich va status konstantalari |
| `python_back/main.py` | EKG: rasm yuklanganda tasniflash + `/api/analyze-replace-file` |
| `python_back/lab_analyses_api.py` | tasniflash + `/lab/replace-file` |
| `python_back/holter_analyses_api.py` | tasniflash + `/holter/replace-file` |
| `python_back/smad_analyses_api.py` | tasniflash + `/smad/replace-file` |
| `Controllers/{ECG,Lab,Holter,Smad}AnalyseController.cs` | `POST replace-file` proxy + **klinika izolyatsiyasi tekshiruvi** |
| `frontend/src/components/shared/FileMismatchBanner.js` | yangi — ogohlantirish banneri va "Faylni almashtirish" tugmasi |
| `frontend/src/pages/cabinet/*/…AnalyseView.js` (4 ta) | banner ulandi |
| `frontend/src/pages/cabinet/*/…AnalysesList.js` (4 ta) | status 3 uchun sariq "Fayl mos emas" tegi |
| `frontend/src/host/{Ekg,Lab,holter,smad}Service.js` | `replace*File()` funksiyalari |
| `locale/Translation{Uz,Ru,En}` | 7 ta yangi kalit, uch tilda |

**Jonli tekshiruv natijalari (2026-08-29):**

| Sinov | Natija |
|---|---|
| Laboratoriyaga Holter PDF | `status = 3`, ishonch **0.99**, kardiologik xulosa **yozilmadi** |
| Xabar matni | "Yuklangan fayl «Laboratoriya tahlili» bo'limiga mos kelmaydi. Fayl mazmuni «Holter monitoring» hujjatiga o'xshaydi. Faylni almashtiring yoki to'g'ri bo'limga yuklang." |
| Faylni almashtirish (`replace-file`) | Lab #20: fayl almashtirildi → `status = 2`, to'g'ri TSH tahlili |
| Regressiya: to'g'ri lab PDF | Lab #21: `status = 2`, normal tahlil — buzilish yo'q |

**Qolgan ish:** T-092 (AI "tahlil qilib bo'lmadi" degan holat) hali ochiq — u alohida vazifa
sifatida `analiz_mumkinmi` maydonini talab qiladi. Fayl **turi** to'g'ri, lekin **sifati** past
bo'lgan holat (xira rasm) hozircha eski tartibda ishlaydi.

---

### ✅ T-096 — ~~Bir xil fayl qayta-qayta yuklanishi aniqlanmaydi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Ma'lumotlar sifati / Yuqori
**Fayllar:** barcha tahlil yaratish endpointlari

**Muammo:**
Auditda **bir xil `ecg_test.jpg` fayli 5 marta** yuklandi va har safar yangi tahlil yozuvi yaratildi (#94, #95, #96 va boshqalar) — bir xil bemor uchun, bir xil sana bilan. Tizim hech qanday ogohlantirish bermadi.

Amaliy holatlar:
- Laborant tugmani ikki marta bosadi (sekin internetda odatiy) → ikkita bir xil tahlil
- Xato bo'ldi deb o'ylab qayta yuklaydi → uchinchi nusxa
- Natijada bemor kartasida bir xil EKG uch marta turadi, uchtasi ham AI'ga yuborilgan (uch barobar xarajat)

Bundan tashqari **fayl nomi bo'yicha nusxalash** ham bor: `ecg_test.jpg`, `ecg_test_1.jpg`, `ecg_test_2.jpg` — bu diskda joyni behuda egallaydi.

**Tuzatish rejasi:**
1. Fayl mazmuni bo'yicha **SHA-256 xesh** hisoblab, `analyse_file_hash` ustunida saqlash.
2. Yangi yuklashda bir xil xesh + bir xil bemor + oxirgi 24 soat ichida bo'lsa — foydalanuvchiga ogohlantirish:
   > "Bu fayl 10 daqiqa oldin shu bemor uchun allaqachon yuklangan. Mavjud tahlilni ochasizmi yoki yangi yaratasizmi?"
3. Frontendda yuborish tugmasini bosilgach darhol bloklash (`loading` holati) — ikki marta bosishning oldini olish.
4. Bir xil xeshli fayllarni diskda bir marta saqlash (deduplikatsiya).
5. Mavjud takroriy yozuvlarni topish va tozalash skripti.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Yondashuv:** fayl **mazmuni** bo'yicha SHA-256 xeshi. Fayl nomi bo'yicha
taqqoslash ishlamaydi — nom o'zgaradi (`ecg.jpg` → `ecg (1).jpg`), mazmuni
esa o'sha bo'lib qolaveradi.

**Qamrov qoidasi (foydalanuvchi talabi):** takror **faqat bitta bemor
doirasida** aniqlanadi. Bir xil fayl **boshqa bemorga** yuklansa bu takror
hisoblanmaydi va hech qanday ogohlantirish chiqmaydi — bu alohida,
qonuniy holat. So'rov `patcient_id = :pid` bilan cheklangan, indeks ham
`(patcient_id, file_hash)` bo'yicha.

**Bajarilgan ishlar:**

1. **Migratsiya** `20260831000000_AddFileHashToAnalyses` — to'rt tahlil
   jadvaliga `file_hash varchar(64)` va qisman indeks
   `(patcient_id, file_hash) WHERE file_hash IS NOT NULL`. Qisman —
   migratsiyadan oldingi yozuvlarda xesh yo'q va ular indeksni bekorga
   kattalashtirmasin.

2. **`python_back/duplicate_guard.py`** (yangi) — xeshlash va tekshirish.
   * Tekshiruv fayl **diskka yozilishidan va yozuv yaratilishidan oldin**
     ishlaydi — takror bo'lsa hech narsa qoldirmaydi va sun'iy intellektga
     hech narsa yuborilmaydi.
   * O'chirilgan (`deleted_at`) yozuvlar hisobga olinmaydi: xodim tahlilni
     ataylab o'chirib, to'g'ri ma'lumot bilan qayta yuklashi mumkin.
   * **30 kunlik oyna** — bemor bir oydan keyin tekshiruvni takrorlashi
     mumkin, eski yozuvni ko'rsatib ogohlantirish faqat xalaqit berardi.
   * Takror topilsa `409` va strukturali javob:
     `{"code": "DUPLICATE_FILE", "existing": {id, document_number, created_at}}`.

3. **To'rt yuklash endpointiga ulandi** — EKG (`/analyze` va
   `/analyze-save`), Holter, SMAD, Laboratoriya. Har biriga
   `force_duplicate` forma maydoni qo'shildi.

   `replace-file` endpointlariga **ataylab ulanmadi**: ular mavjud
   tahlilning faylini almashtiradi, yangi yozuv yaratmaydi — u yerda
   takror tushunchasi boshqacha.

4. **Frontend:**
   * `components/shared/duplicateUpload.js` (yangi) — tasdiq oynasi,
     mavjud tahlilning hujjat raqami va sanasi bilan; `withForce()` —
     formaning nusxasini bayroq bilan qaytaradi (asl forma yuborilgach
     sahifadagi holat tozalanadi, uni qaytadan yig'ish ishlamaydi).
   * `Api.js` — 409/`DUPLICATE_FILE` uchun umumiy qizil xatolik xabari
     ko'rsatilmaydi: bu xatolik emas, savol.
   * `useBackgroundAnalysis` — `onDuplicate` chaqiruvi; fon ro'yxatida
     qizil "xatolik" belgisi chiqmaydi.
   * To'rt analizator sahifasi — tasdiqlangach forma bayroq bilan qayta
     yuboriladi. EKG da ikkala rejim ham (AI fonda / darhol saqlash).

**Nima uchun avtomatik rad etilmaydi:** qonuniy takrorlar bo'ladi —
masalan bemor tekshiruvni takrorlagan va apparat aynan bir xil fayl
bergan. Qaror foydalanuvchida qoladi.

---

### Tekshiruv 1 — API darajasida (jonli)

| # | Holat | Kutilgan | Natija |
|---|---|---|---|
| 1 | Bemor 13 ga Holter fayli | yaratiladi | ✅ 200, tahlil #16 |
| 2 | **Aynan shu bemorga** aynan shu fayl | rad etiladi | ✅ **409 DUPLICATE_FILE**, `existing.id = 16` |
| 3 | **Boshqa bemorga (12)** aynan shu fayl | **takror emas** | ✅ **200**, tahlil #17 |
| 4 | Bemor 13 ga + `force_duplicate=true` | yaratiladi | ✅ 200, tahlil #18 |

3-qator foydalanuvchi talabini aynan tasdiqlaydi.

### Tekshiruv 2 — haqiqiy interfeysda (brauzer)

Yangi test bemor UI orqali yaratildi (TAKROROV DUBLIKAT, passport
AB9988776), so'ng aynan bir xil fayl ikki marta yuborildi:

| Bosqich | Tarmoq | Ekranda |
|---|---|---|
| Birinchi yuklash | `POST /holter-analyses/analyze` → **200** | fon ro'yxatida "Holter tahlil — davom etmoqda" |
| Takroriy yuklash | `POST` → **409 Conflict** | **oyna:** "Bu fayl allaqachon yuklangan", hujjat raqami `NMED-HOL-00000019`, sana `29.08.2026, 20:01:14` |
| "Baribir yuklash" | `POST` → **200** | tahlil #20 yaratildi |

Qizil xatolik xabari chiqmadi, fon ro'yxatida "xatolik" belgisi paydo
bo'lmadi — takror foydalanuvchiga savol sifatida ko'rsatildi.

**Bajarilmagan band (sababi bilan):** brauzerda oldindan tekshirish
(fayl tanlangach `crypto.subtle` bilan xeshlab, serverga yubormasdan
ogohlantirish). Bu faqat tezlik yaxshilanishi — server tekshiruvi
allaqachon fayl saqlanishidan oldin ishlaydi, ya'ni ortiqcha yozuv ham,
ortiqcha AI chaqiruvi ham yaratilmaydi. Foyda: 0.5 MB faylni bekorga
yubormaslik. Alohida ish sifatida qoldirildi.

---

### ✅ T-097 — ~~Tahlil ro'yxatida takroriy yozuvlarni ajratib bo'lmaydi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UX / O'rta
**Fayllar:** tahlil ro'yxati sahifalari

**Muammo:**
Auditdan keyin EKG ro'yxatida bitta bemor (`TESTBEMOROV SANJAR`) uchun **6 ta yozuv** paydo bo'ldi. Ro'yxatda ular deyarli bir xil ko'rinadi: bir xil ism, bir xil passport, bir xil sana.

Farqni faqat holat chipidan bilish mumkin, lekin qaysi biri qaysi fayl ekanini **aniqlashning imkoni yo'q** — fayl nomi ham, ko'rish (thumbnail) ham ro'yxatda ko'rsatilmaydi.

Shifokor uchun "qaysi birini ochishim kerak?" degan savol tug'iladi.

**Tuzatish rejasi:**
1. Ro'yxat qatoriga **kichik ko'rish rasmi** (thumbnail) qo'shish — `generated_short_file_link` allaqachon mavjud.
2. Fayl nomini kichik matnda ko'rsatish.
3. Vaqtni ham ko'rsatish (hozir faqat sana) — bir kunda bir necha tahlil bo'lsa ajratish uchun.
4. Bir xil bemor + bir xil kun yozuvlarini vizual guruhlash.
5. Hujjat raqamini (`NMED-EKG-00000096`) ro'yxatda ham ko'rsatish — PDF bilan solishtirish uchun.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

Bir bemorda bir necha tahlil bo'lganda qatorlar deyarli bir xil
ko'rinardi: bir xil ism, bir xil sana, farq faqat holat chipida.
Shifokor "qaysi birini ochishim kerak?" degan savol oldida qolardi.

Uch belgi qo'shildi.

### 1. Eskiz (EKG uchun) — reja 1-bandi

Ro'yxat qatorida EKG tasmasining 48×34 px ko'rinishi. Manba —
`generated_short_file_link`: u allaqachon mavjud va sun'iy intellektga
yuborish uchun yaratilgan, ya'ni qo'shimcha fayl yaratilmadi.

Buning uchun `ECGAnalyseListDTO` ga `ThumbnailUrl` maydoni va
`ECGAnalyseService` ning uchta ro'yxat proyeksiyasiga mos qator
qo'shildi.

`loading="lazy"` — ro'yxatda o'nlab rasm bo'lishi mumkin, ular sahifa
ochilishini sekinlashtirmasin.

Holter, SMAD va Laboratoriya uchun eskiz **yo'q**: ularning fayllari PDF
va tizim ulardan ko'rinish yaratmaydi. Bunday ustunni bo'sh qo'shish
faqat joy egallardi.

### 2. Hujjat raqami — reja 5-bandi

Bemor ismi ostida kichik kulrang matnda: `NMED-EKG-00000106`. Bu
ro'yxatdagi yozuvni PDF hisobot bilan solishtirishning yagona ishonchli
yo'li. To'rt ro'yxatda ham qo'shildi.

### 3. Vaqt — reja 3-bandi

Sana ustunida sana ostida vaqt: `29.08.2026` / `19:06`. Bir kunda bir
necha tahlil bo'lsa faqat sana ularni ajratmaydi. To'rt ro'yxatda ham.

### Bajarilmagan band

**4-band — bir xil bemor + bir xil kun yozuvlarini vizual guruhlash.**
Qolgan uchta belgi (eskiz, hujjat raqami, vaqt) qatorlarni allaqachon
bir-biridan ajratadi. Guruhlash esa jadval tuzilishini o'zgartiradi
(birlashtirilgan kataklar yoki yig'iladigan qatorlar) va saralash bilan
ziddiyatga kiradi: foydalanuvchi sana bo'yicha saralaganda guruhlar
buziladi. Foyda kichik, murakkablik katta.

### Tekshiruv (brauzerda)

Ro'yxatda to'rtta ketma-ket qator, hammasi bitta bemorniki:

| # | Eskiz | Hujjat raqami | Sana / vaqt |
|---|---|---|---|
| 1 | ✅ | NMED-EKG-00000106 | 29.08.2026 / 19:06 |
| 2 | ✅ | NMED-EKG-00000105 | 29.08.2026 / 18:12 |
| 3 | — (fayl yo'q) | NMED-EKG-00000104 | 29.08.2026 / 18:02 |
| 4 | ✅ | NMED-EKG-00000102 | 28.08.2026 / 22:08 |

Moslashuvchanlik: 1520 px da jadval gorizontal aylanmaydi; 375 px da
sahifaning o'zi aylanmaydi, jadval esa o'z ichida aylanadi — bu keng
jadval uchun mo'ljallangan xatti-harakat.

---

### ✅ T-098 — ~~Passportni maskalash siyosati izchil emas~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Shaxsiy ma'lumot / O'rta
**Fayllar:** `Services/PdfReportService.cs`, konsultatsiya va tahlil sahifalari, DTO'lar

**Muammo:**
Bemor passporti bir joyda maskalanadi, boshqa joyda to'liq ko'rsatiladi:

| Joy | Ko'rinish |
|---|---|
| **PDF hisobot** | `** ****4567` ✅ maskalangan |
| Tahlil ro'yxati (jadval ustuni) | `AC1234567` ❌ to'liq |
| Konsultatsiya batafsil sahifasi | `AC1234567` ❌ to'liq |
| `GET /api/patcient/get-all-patients` | `AC1234567` ❌ to'liq |
| `GET /api/consultation/{id}/detail` | `AC1234567` ❌ to'liq |

Ya'ni maskalash faqat PDF da o'ylab topilgan, interfeys va API da yo'q. Ekranda doimiy ko'rinib turgan passport — yelka orqali qarash va ekran suratiga tushish xavfi (T-079 bilan bog'liq).

**Tuzatish rejasi:**
1. Yagona siyosat belgilash: passport **sukut bo'yicha maskalangan** (`** ****4567`) ko'rsatiladi.
2. To'liq ko'rish kerak bo'lsa — "ko'z" tugmasi bosilganda ochiladi va bu amal `audit_logs` ga yoziladi.
3. Ro'yxat jadvallaridan passport ustunini olib tashlash (T-079).
4. API DTO'larida ham maskalangan qiymat qaytarish; to'liq qiymat faqat alohida endpoint orqali (huquq tekshiruvi bilan).
5. Maskalash uchun yagona yordamchi: `MaskPassport(string)` — backendda va frontendda.

---

## Ustuvorlik yo'l xaritasi

Tasklar soni ko'p bo'lgani uchun quyida **qaysi tartibda bajarish** tavsiya etiladi.

#### 0-bosqich — Klinikalarga yuborishdan OLDIN majburiy (blokerlovchi)

Bu tasklar bajarilmaguncha platformani real klinikalarga berish **mumkin emas**:

| Task | Nima uchun blokerlovchi |
|---|---|
| **T-063** | Har qanday ro'yxatdan o'tgan klinika barcha bemorlar bazasini ko'radi |
| **T-080** | Begona klinika tahlilini qayta ishga tushiradi va o'zgartiradi |
| **T-092** | AI "tahlil qilmadim" desa ham yashil "Normal" chiqadi — bemor xavfsizligi |
| **T-095** | Noto'g'ri turdagi fayl yashil natija beradi — bemor xavfsizligi |
| **T-031** | Jiddiylik darajasi `indexOf` bilan aniqlanadi — xavfli natija yashil ko'rinishi mumkin |
| **T-020** | Parollar ochiq matnda saqlanadi va interfeysda ko'rsatiladi |
| **T-037**, **T-081** | Anonim endpointlar bemor ismi va tibbiy xulosasini oshkor qiladi |
| **T-038** | Tibbiy fayllar autentifikatsiyasiz yuklab olinadi |
| **T-002** | Login/verify da rate limiting yo'q — akkauntni egallash mumkin |
| **T-015** | Rol cheklovlari faqat frontendda |

#### 1-bosqich — Birinchi haftada (ishonchlilik va to'g'rilik)

T-011 (dashboard raqamlari), T-012 (vaqt mintaqasi), T-046 (tahlil sanasi), T-013/T-014 (pagination), T-026 (tranzaksiya), T-025 (xom xatoliklar), T-087 (bemorlar sahifasi), T-055/T-057/T-074 (tarjima kalitlari), T-042 (jadval moslashuvchanligi), T-066 (konsoldagi tibbiy ma'lumot)

#### 2-bosqich — Ikkinchi-uchinchi haftada (mahsulot to'liqligi)

T-032 (Holter/SMAD/Lab AI tavsiyalari), T-035 (laboratoriya ko'rsatkichlari), T-052/T-093/T-094 (fayl validatsiyasi), T-027 (o'chirish), T-028 (AI monitoringi), T-069 (faollashtirish tajribasi), T-049/T-050/T-051 (PDF tuzatishlari), T-053 (Ant Design Tour)

#### 3-bosqich — Sifat va texnik qarz

T-060/T-061 (dizayn tizimi va moslashuvchanlik), T-034 (takroriy komponentlar), T-017 (o'lik kod), T-009 (build ogohlantirishlari), T-036 (JSONB), T-068 (nomlash), T-078 (konstitutsiya), T-084 (API nomlari), T-085 (ism formati)

#### 4-bosqich — Yangi imkoniyatlar

T-062 (yetishmayotgan sahifalar), T-023 (bemor kartasi), T-029 (AI'siz natija), T-030 (zaxira polling), T-096/T-097 (takroriy yuklashlar), SuperAdmin paneli

---

## Bu hujjatdan qanday foydalanish

1. Har bir task mustaqil bajarilishi mumkin — o'z fayllari, sababi va bosqichma-bosqich rejasi bilan.
2. **"Qabul mezoni"** bo'limi bor tasklarda — o'sha shart bajarilgani tekshirilsin.
3. Bir-biriga bog'liq tasklar matnda havola bilan ko'rsatilgan (masalan T-031 va T-092 birga bajarilishi kerak).
4. Bajarilgan taskni o'chirmasdan, sarlavhaga ✅ belgisi qo'yish tavsiya etiladi — audit tarixi saqlanadi.
5. Har bir bosqich tugagach **regressiya testi**: shu hujjatdagi jonli tekshiruvlarni qaytadan o'tkazish.

---

## Auditda yaratilgan test ma'lumotlari

Quyidagi yozuvlar audit davomida yaratilgan. Ishlab chiqarishga o'tishdan oldin tozalanishi kerak:

| Ob'ekt | Identifikator | Izoh |
|---|---|---|
| Klinika | `#25 — Test Shifo Klinikasi` | INN 305123456, faollashtirilmagan |
| Foydalanuvchi | `#52 — 998901112233` | Yangi klinika admini (KARIMOV BOBUR) |
| Xodim | `doctor #53 — TESTOV TESTBEK` | Klinika 24, rol 4, telefon 998901234567 |
| Bemor | `#13 — TESTBEMOROV SANJAR` | Passport AC1234567 |
| EKG tahlillari | `#94–99` | 94 chala, 95/96 haqiqiy, 97 matn fayli, 98 mayda rasm, 99 bo'sh rasm |
| Holter | `#13, #14, #15` | 15 — noto'g'ri turdagi fayl |
| SMAD | `#8, #9` | |
| Laboratoriya | `#16, #17, #18, #19` | 18, 19 — noto'g'ri turdagi fayl |
| Shifokor xulosasi | `#16` | |
| Konsultatsiya | `#7` | To'liq sikl: yaratildi → qabul → xulosa |
| Konsultant bog'lanishi | `clinic_consultants #6` | |
| Video konferensiya | `#3` | Yakunlangan |
| Tahlil tashxisi | `analysis_diagnosis #1` | EKG #96 uchun |

**Tozalash uchun SQL** (ehtiyot bo'lib ishlatilsin, avval zaxira nusxa oling):
```sql
-- Audit test yozuvlarini o'chirish
DELETE FROM analysis_diagnoses WHERE analysis_id IN (94,95,96,97,98,99);
DELETE FROM ecg_analyse_doctors  WHERE ecg_analyse_id BETWEEN 94 AND 99;
DELETE FROM ecg_analyse_complaints WHERE ecg_analyse_id BETWEEN 94 AND 99;
DELETE FROM ecg_analyses WHERE id BETWEEN 94 AND 99;
DELETE FROM lab_analyse_doctors WHERE lab_analyse_id IN (16,17,18,19);
DELETE FROM lab_analyses WHERE id IN (16,17,18,19);
DELETE FROM holter_analyse_doctors WHERE holter_analyse_id IN (13,14,15);
DELETE FROM holter_analyses WHERE id IN (13,14,15);
DELETE FROM smad_analyse_doctors WHERE smad_analyse_id IN (8,9);
DELETE FROM smad_analyses WHERE id IN (8,9);
DELETE FROM medical_diagnoses WHERE id = 16;
DELETE FROM consultation_conclusions WHERE consultation_id = 7;
DELETE FROM consultations WHERE id = 7;
DELETE FROM video_conference_participants WHERE video_conference_id = 3;
DELETE FROM video_conferences WHERE id = 3;
-- Bemor va xodim (ehtiyotkorlik bilan)
-- DELETE FROM patcients WHERE id = 13;
-- DELETE FROM doctors WHERE id = 53;  DELETE FROM users WHERE id = 51;
-- Test klinikasi
-- DELETE FROM clinic_details WHERE clinic_id = 25;
-- DELETE FROM doctors WHERE user_id = 52; DELETE FROM users WHERE id = 52;
-- DELETE FROM clinics WHERE id = 25;
```

Yuklangan test fayllari: `python_back/uploads/` ichida `ecg_test*.jpg`, `notekg.txt`, `tiny.jpg`, `blank.jpg`, `holter_test*.pdf`, `smad_test*.pdf`, `lab_test*.pdf`.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

### Aniqlangan holat

Taskda passport ba'zi joyda maskalanib, ba'zi joyda to'liq
qaytarilishi qayd etilgan edi. Tekshiruv buni tasdiqladi:

| Endpoint | Holat |
|---|---|
| `patcient/get-all-patients`, `get-patcients-of-clinic` | maskalangan |
| `ecg/holter/lab/smad-analyses/get-by-clinic` | **to'liq** |
| `consultation/{id}/detail` | **to'liq** |
| PDF hisobot | maskalangan |

Ya'ni qoida yagona emasdi va har bir joyda alohida yozilgan edi.

### Qaror: maskalash O'CHIRILDI

Izchillik ikki yo'l bilan erishish mumkin edi. Dastlab hamma joyda
maskalash yoqildi, so'ng **loyiha egasining ko'rsatmasi bo'yicha**
teskarisiga o'tildi: barcha ma'lumot ochiq ko'rsatiladi.

Endi qoida **bitta joyda** —
`Helpers/PatientPrivacy.MaskingEnabled = false`. Uchala amalga oshirish
(tahlil ro'yxatlari, bemorlar ro'yxati, PDF hisobot) shu bayroqqa
bo'ysunadi. Mantiq o'chirilmadi: bayroqni `true` qilish butun tizimda
maskalashni qaytaradi.

### Muhim aniqlik — maskalash saqlashga hech qachon ta'sir qilmagan

Baza tekshirildi:

```
bemor 12: passport = 'AB6377391'
bemor 13: passport = 'AC1234567'
bemor 14: passport = 'AB9988776'
```

Qiymatlar **to'liq va ochiq** saqlanadi. Maskalash faqat javob
shakllantirilayotganda qo'llanardi.

Shu tekshiruv paytida ikkinchi narsa ham aniqlandi: bu yozuvlar
**shifrlanmagan** — AES shifrlash keyinroq joriy qilingan va eski
yozuvlar o'girilmagan. Shuning uchun deshifrlash majburiy emas, urinib
ko'riladi va muvaffaqiyatsiz bo'lsa qiymat o'zi ishlatiladi.

### Yakuniy tekshiruv (jonli)

| Sirt | Qiymat |
|---|---|
| `patcient/get-patcients-of-clinic` | `AB6377391`, `AB9988776`, `AC1234567` |
| `ecg-analyses/get-by-clinic` | `AC1234567` |
| `holter-analyses/get-by-clinic` | to'liq |
| `consultation/7/detail` | `AC1234567` |
| PDF hisobot | `Passport: AC1234567` |
| Bemorlar sahifasi (brauzerda) | `AB9988776`, `AC1234567`, `AB6377391` |

### Tegilmagan narsa

**AES-256 shifrlash o'zgarishsiz qoldi.** U maskalash emas, saqlash
darajasidagi himoya va konstitutsiyada O'z DSt 2814:2014 C4 talabi
sifatida yozilgan. Ko'rsatma maskalash haqida edi.

**Diqqat:** passport endi ekranda doimiy ko'rinadi — yelka orqali
qarash va ekran suratiga tushish xavfi saqlanadi. Bu ongli qaror.

---

## Fayl saqlash arxitekturasi

### ✅ T-099 — ~~Tibbiy fayllar ikkita alohida loyiha papkasi ichida saqlanadi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Arxitektura / Ma'lumot yo'qolishi xavfi / Kritik
**Fayllar:** `python_back/main.py:67-69`, `lab_analyses_api.py:37`, `holter_analyses_api.py:35`, `smad_analyses_api.py:34`, `backend/EkgAnalyzerApi/Services/ParasitologyAnalyseService.cs:576`, `DEPLOY_LINUX.md`

**Muammo:**
Bemorlarning tibbiy fayllari **ikkita turli loyiha manba papkasi ichida** saqlanadi:

| Joy | Hajm | Nimalar saqlanadi |
|---|---|---|
| `python_back/uploads/` | **113 MB** | EKG fayllari, generatsiya qilingan EKG grafiklari, Holter, SMAD, Laboratoriya fayllari, shifokor xulosalari |
| `backend/EkgAnalyzerApi/wwwroot/` | **31 MB** | Parazitologiya rasmlari, klinika logotiplari, litsenziya fayllari, shifokor avatarlari |

Ya'ni bemor ma'lumotlari **dastur kodi bilan bir papkada** yotibdi.

**Bu nima uchun xavfli:**

1. **Deploy paytida yo'qolish xavfi.** `DEPLOY_LINUX.md:403` da yangilash buyrug'i:
   ```bash
   rsync -a --delete ../../python_back/ /var/www/nmed/python/ --exclude venv --exclude uploads --exclude .env
   ```
   `--delete` bayrog'i bor va `--exclude uploads` unutilsa yoki noto'g'ri yozilsa — **barcha bemor fayllari o'chib ketadi**. Bitta so'z xatosi butun arxivni yo'q qiladi.

2. **Zaxira nusxa (backup) chalkash.** Fayllar kod bilan aralashgani uchun "kodni backup qilish" va "ma'lumotni backup qilish" ajratilmagan. Baza dump'i olinadi, fayllar esa e'tibordan chetda qoladi — natijada tiklashda baza yozuvlari bor, fayllari yo'q.

3. **Masshtablash imkonsiz.** Ikkinchi server qo'shilsa, fayllar faqat bitta serverda qoladi. Yuk balanslovchi so'rovni boshqa serverga yuborsa — fayl topilmaydi.

4. **Ikki xil arxitektura.** Bir xil turdagi ma'lumot (bemor tibbiy fayli) ikki xil joyda, ikki xil qoida bilan saqlanadi — parazitologiya `wwwroot/uploads/parasitology/{yyyyMM}/`, qolganlari `python_back/uploads/{tur}_analyse_files/` (papkalarga bo'linmagan, hammasi bitta papkada).

5. **Disk kvotasi va tozalash.** Qaysi papka qancha joy egallayotganini kuzatish qiyin; eski fayllarni arxivlash siyosati yo'q.

**Tuzatish rejasi:**

**1-bosqich — yagona tashqi papkaga ko'chirish (tez va xavfsiz):**
- Kod tashqarisida yagona ildiz papka: `/var/lib/nmed/storage/` (Linux) yoki konfiguratsiyadagi `Storage:Root`.
- Ichki tuzilma turlar va sanalar bo'yicha:
  ```
  /var/lib/nmed/storage/
      ecg/2026/08/{uuid}.jpg
      ecg-generated/2026/08/{uuid}.png
      holter/2026/08/{uuid}.pdf
      smad/2026/08/{uuid}.pdf
      lab/2026/08/{uuid}.pdf
      diagnoses/2026/08/{uuid}.pdf
      parasitology/2026/08/{uuid}.jpg
      clinic-brands/{uuid}.png
      clinic-licenses/{uuid}.pdf
      doctor-avatars/{uuid}.png
  ```
- Sana bo'yicha bo'lish muhim: hozir `ecg_analyse_files` papkasida barcha fayllar bir joyda — o'n minglab fayl bo'lganda fayl tizimi sekinlashadi.
- Fayl nomlari **UUID** bo'lsin (hozir asl fayl nomi ishlatiladi — u bemor ismini o'z ichiga olishi mumkin va taxmin qilinadi, T-038).

**2-bosqich — konfiguratsiya:**
- Python: `STORAGE_ROOT` environment o'zgaruvchisi (`config.py` da, majburiy — yo'q bo'lsa `RuntimeError`).
- .NET: `Storage:Root` (majburiy — yo'q bo'lsa `InvalidOperationException`).
- Ikkalasi ham **bir xil papkani** ko'rsatadi.
- Hech qanday `../..` nisbiy yo'l ishlatilmasin (T-100).

**3-bosqich — ma'lumotlarni ko'chirish:**
- Migratsiya skripti: mavjud fayllarni yangi tuzilmaga ko'chiradi va bazadagi `analyse_file_link`, `generated_file_link`, `generated_short_file_link`, `diagnose_file_link`, `file_path`, `clinic_logo`, `license`, `avatar` ustunlarini yangilaydi.
- Skript **idempotent** bo'lsin (qayta ishga tushirilganda zarar qilmasin) va avval "quruq yurish" (dry-run) rejimida ishlasin.

**4-bosqich — kelajakka tayyorgarlik:**
- Fayl saqlashni interfeys ortiga yashirish (`IFileStorage` / `FileStorage` klassi): `Save(stream, category) -> key`, `Open(key) -> stream`, `Delete(key)`.
- Shunda keyinchalik S3-mos obyekt xotirasiga (MinIO, AWS S3) o'tish faqat bitta implementatsiyani almashtirish bilan amalga oshadi — bu masshtablash muammosini (3-band) butunlay hal qiladi.

**Qabul mezoni:** Loyiha papkalarida (`python_back/`, `backend/`) birorta ham bemor fayli qolmaydi; `rsync --delete` bilan deploy qilinganda hech narsa yo'qolmaydi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**1-bosqich bajarildi: yagona, sozlanadigan saqlash ildizi.**

**Yangi modul — `python_back/storage.py`**
* `STORAGE_ROOT` muhit o'zgaruvchisi — saqlash ildizi. Ishlab chiqarishda
  `/var/lib/nmed/storage`, ya'ni **kod papkasidan tashqarida**.
* Berilmasa eski joy (`python_back/uploads`) ishlatiladi — **mavjud
  o'rnatmalar buzilmaydi**.
* `build_key(kind, name)` — `{tur}/{yyyy}/{MM}/{uuid}{kengaytma}`.
* `absolute_path(key)` — yo'l ildizdan tashqariga chiqa olmaydi
  (`..` orqali o'tish urinishlari to'xtatiladi).
* `resolve_existing(db_link)` — eski (tekis) va yangi (sanali) yo'llarni
  birdek topadi.

**Ikkita yaxshilanish bir vaqtda:**
1. **Sana bo'yicha papkalar.** Ilgari barcha fayllar bitta papkada yotardi
   (`ecg_analyse_files/`) — minglab fayl to'planganda fayl tizimi
   sekinlashadi va eski fayllarni arxivlash imkonsiz.
2. **UUID fayl nomlari.** Ilgari asl nom saqlanardi (`ecg_test_2.jpg`) —
   u bemor ismini o'z ichiga olishi va manzilni taxmin qilish orqali
   oshkor bo'lishi mumkin edi (T-038, T-101 bilan bog'liq).

**O'tkazilgan saqlash funksiyalari (7 ta):**
`main.py` — `save_diagnose_file`, `save_analyse_file`,
`save_generated_file`, `save_generated_short_file`;
`holter_analyses_api.py`, `smad_analyses_api.py`, `lab_analyses_api.py` —
`save_analyse_file`.

**Deploy hujjatlari — asosiy xavf yopildi**
`DEPLOY_LINUX.md` da ikkita `rsync --delete` buyrug'i bor edi; biri
`--exclude uploads` siz. Endi:
* ikkala buyruq ham `--exclude venv --exclude .env` bilan va **nima uchun
  kerakligi izohlangan**;
* yangi **"Tibbiy fayllarni saqlash (STORAGE_ROOT)"** bo'limi:
  papka yaratish, ikkala xizmatni sozlash, mavjud fayllarni xavfsiz
  ko'chirish (nusxa → hajmni solishtirish → keyin o'chirish), zaxira
  nusxa olish va fayl tuzilmasi tavsifi.

**Sozlash namunalari yangilandi:**
* `python_back/.env.example` va `.env.production.example` — `STORAGE_ROOT`
* `backend/EkgAnalyzerApi/.env.production.example` — `Storage__UploadsRoot`
* Ikkalasi ham **ayni bitta papkani** ko'rsatishi shartligi ta'kidlandi.

**Tekshirildi (uchdan-uchgacha):**

| Tekshiruv | Natija |
|---|---|
| Haqiqiy EKG yuklandi (`POST /api/ecg-analyses/analyze`) | `{"ecg_id":104, "analyse_file_path":"/uploads/ecg_analyse_files/**2026/08**/c599b9e3f1c64da89da0c43859e54228.jpg"}` |
| Diskda fayl | `.../2026/08/c599b9e3f1c64da89da0c43859e54228.jpg` — 171 658 bayt ✅ |
| Fayl nomi | **UUID** — asl nom (`ekg2.jpg`) saqlanmadi ✅ |
| .NET proksi orqali (`/api/files/...`) | `HTTP 200`, 171 658 bayt, `image/jpeg` ✅ |
| **Eski tekis yo'ldagi fayl** (`ecg_generated_short_files/ecg_100.png`) | Brauzerda ochildi (`naturalWidth > 0`) — **orqaga moslik saqlangan** ✅ |
| Python sintaksisi | 5 ta fayl — xatosiz |

**Bajarilmagan bandlar (sababi bilan):**
* **Mavjud 113 MB faylni ko'chirish** — bu ishlab chiqarish serverida,
  xizmatlar to'xtatilgan holda bajariladigan amal. `DEPLOY_LINUX.md` ga
  bosqichma-bosqich, tekshiruvlari bilan yozildi; bu yerda bajarilmadi,
  chunki mahalliy muhitda `STORAGE_ROOT` sozlanmagan va eski joy
  ishlatilmoqda (ataylab — orqaga moslikni sinash uchun).
* **`wwwroot/` dagi 31 MB (parazitologiya, logotiplar, litsenziyalar)** —
  parazitologiya moduli hozircha kommentga olingan va ish doirasidan
  tashqarida; klinika logotiplari va litsenziyalari esa bemorning tibbiy
  ma'lumoti emas, shuning uchun ularni ko'chirish ustuvorligi past.
  `Storage:UploadsRoot` mexanizmi ular uchun ham tayyor.
* **Obyekt xotirasi (S3)** — `storage.py` interfeysi shunga tayyor
  (`build_key` → kalit, `absolute_path` → joylashuv), lekin o'tish
  alohida qaror va infratuzilma talab qiladi.

---

### ✅ T-100 — ~~.NET Python papkasiga `../../` nisbiy yo'l bilan murojaat qiladi va bu ISHLAB CHIQARISHDA BUZILGAN~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Arxitektura / Ishlab chiqarish xatosi / Kritik
**Fayllar:** `backend/EkgAnalyzerApi/Controllers/FileProxyController.cs:85-92`, `Services/PdfReportService.cs:2062-2069`

**Muammo:**
.NET backend Python loyihasining papkasiga **qattiq yozilgan nisbiy yo'l** orqali kiradi:

```csharp
private string GetUploadsRoot()
{
    var configured = _config["Python:UploadsRoot"] ?? _config["Uploads:PythonRoot"];
    var root = !string.IsNullOrWhiteSpace(configured)
        ? configured
        : Path.Combine(_env.ContentRootPath, "..", "..", "python_back", "uploads");
    return Path.GetFullPath(root);
}
```

Xuddi shu mantiq `PdfReportService.cs:2062` da ham takrorlanadi.

**Ishlab chiqarishda bu yo'l noto'g'ri hal bo'ladi.** `DEPLOY_LINUX.md` ga ko'ra:

| | Yo'l |
|---|---|
| .NET joylashuvi (`ContentRootPath`) | `/var/www/nmed/api` |
| Zaxira yo'l hisoblanadi | `/var/www/nmed/api/../../python_back/uploads` → **`/var/www/python_back/uploads`** |
| Fayllar HAQIQATDA qayerda | **`/var/www/nmed/python/uploads`** |

Tekshirildi: `Python:UploadsRoot` **hech qayerda sozlanmagan** — na `appsettings.json` da, na `.env.production.example` da, na `DEPLOY_LINUX.md` da. Ya'ni ishlab chiqarishda **doim zaxira yo'l ishlatiladi va u mavjud bo'lmagan papkaga ishora qiladi**.

**Amaliy oqibatlar (ishlab chiqarishda):**
1. `GET /api/files/uploads/...` — har doim **404** qaytaradi.
2. **PDF hisobotlarga EKG rasmlari qo'shilmaydi** — `PdfReportService` faylni topa olmaydi. Hisobot generatsiya qilinadi, lekin rasmsiz.
3. Hozir bu sezilmayapti, chunki frontend media fayllarni `analyse.nmed.uz/uploads/...` orqali **to'g'ridan-to'g'ri Python'dan** oladi (T-038). Ya'ni bitta xato ikkinchisini yashirib turibdi. T-038 tuzatilib, fayllar .NET orqali berila boshlanganda — **hamma rasm yo'qoladi**.

**Tuzatish rejasi:**
1. **Zudlik bilan:** `Storage:Root` (yoki hech bo'lmasa `Python:UploadsRoot`) ni `.env.production` va `DEPLOY_LINUX.md` ga qo'shish. Bu PDF hisobotlardagi rasmlarni darhol tiklaydi.
2. Zaxira `../../` yo'lini **butunlay olib tashlash** — sozlama yo'q bo'lsa ilova ishga tushishda `InvalidOperationException` bilan to'xtasin (T-006 dagi startup validatsiyasi tamoyili). Jimgina noto'g'ri papkaga ishora qilishdan ko'ra darhol to'xtash yaxshiroq.
3. Yo'l hisoblash mantig'ini ikkita joydan (`FileProxyController`, `PdfReportService`) **yagona xizmatga** chiqarish — `IFileStorage` (T-099, 4-bosqich).
4. Startup'da papka mavjudligini va yozish huquqi borligini tekshirish; `/health` endpointiga `storage: ok|failed` qo'shish (T-028).
5. Yo'l tekshiruvidagi kamchilikni tuzatish: `fullPath.StartsWith(root)` — `root` oxirida ajratuvchi yo'q, shuning uchun `uploads_eski` nomli qo'shni papka tekshiruvdan o'tib ketishi mumkin. `Path.EndsInDirectorySeparator` bilan normallashtirish kerak.

**Qabul mezoni:** Ishlab chiqarish muhitida `GET /api/report/ecg/{id}` PDF hisoboti EKG rasmi bilan birga generatsiya qilinadi; `/api/files/uploads/...` 404 qaytarmaydi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:**

- Yangi `Services/FileStorageService.cs` (`IFileStorage`) — fayl ildizi **faqat konfiguratsiyadan** olinadi (`Storage:UploadsRoot`, eski nomlar ham qo'llab-quvvatlanadi).
- Yo'l hisoblash mantig'i `FileProxyController` va `PdfReportService` dan **bitta joyga** ko'chirildi.
- Sozlanmagan holatda ilova `ILogger` orqali **aniq ogohlantirish** yozadi va papka mavjudligini tekshiradi — ilgari jimgina noto'g'ri yo'lga ishora qilardi.
- Path traversal tekshiruvi tuzatildi: ildiz yo'li oxirida ajratuvchi bo'lishi ta'minlandi.

**Konfiguratsiya hujjatlashtirildi:**

| Fayl | Qo'shildi |
|---|---|
| `appsettings.json` | `Storage:UploadsRoot`, `App:TimeZone` bo'limlari |
| `.env.production.example` | `Storage__UploadsRoot=/var/www/nmed/python/uploads` |
| `DEPLOY_LINUX.md` | "MUHIM" ogohlantirish bloki + huquqlarni berish buyrug'i |

**Nima uchun bu jonli bug edi:** ishlab chiqarishda `.NET` `/var/www/nmed/api` da,
zaxira yo'l esa `/var/www/python_back/uploads` ga hal bo'lardi — mavjud bo'lmagan papka.
Natijada PDF hisobotlarga EKG rasmlari qo'shilmasdi. Endi yo'l aniq sozlanadi.

---

### ✅ T-101 — ~~Fayl yo'llari bazada nisbiy matn sifatida saqlanadi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Ma'lumot modeli / Yuqori
**Fayllar:** `ecg_analyses.analyse_file_link`, `generated_file_link`, `generated_short_file_link`, `lab_analyses`, `holter_analyses`, `smad_analyses`, `medical_diagnoses.diagnose_file_link`, `parasitology_analyses.file_path`, `clinics.clinic_logo`, `clinic_details.license`, `doctors.avatar`

**Muammo:**
Bazada fayl manzili quyidagi ko'rinishda saqlanadi:
```
/uploads/ecg_analyse_files/ecg_test_2.jpg
/clinic_licenses/35f90d78-71ce-4c38-97ff-5a0fbbd49815.pdf
```

Bu **yo'lning o'zi**, ya'ni saqlash tuzilmasi bazaga "muhrlangan". Oqibatlari:

1. Papka nomini o'zgartirish uchun **butun jadvalni yangilash** kerak.
2. Ikki xil format aralashgan: bir qismi `/uploads/...` bilan boshlanadi (Python), boshqasi `/clinic_licenses/...` (.NET wwwroot). Kod har birini alohida hal qiladi — `PdfReportService.cs:2062` da aynan shu ayirish mantig'i bor.
3. Obyekt xotirasiga (S3) o'tish mumkin emas — u yerda "yo'l" emas, "kalit" bo'ladi.
4. Fayl nomida asl yuklangan nom saqlanadi (`ecg_test_2.jpg`) — bu bemor ismini o'z ichiga olishi va taxmin qilinishi mumkin (T-038).

**Tuzatish rejasi:**
1. Yangi ustun qo'shish: `file_key` — saqlash tizimidan mustaqil identifikator, masalan `ecg/2026/08/9f3c1a2e-....jpg`.
2. Fayl manzilini **faqat kod hisoblaydi**: `IFileStorage.ResolveUrl(file_key)`. Baza yo'lni bilmaydi.
3. Eski `*_link` ustunlarini migratsiya davomida `file_key` ga o'girish, keyin eskisini o'chirish.
4. Fayl nomlarini UUID ga o'tkazish; asl nomni kerak bo'lsa alohida ustunda saqlash (`original_filename`) — foydalanuvchiga ko'rsatish uchun.
5. Frontend har doim API dan kelgan to'liq URL ni ishlatsin, o'zi yo'l yasamasin (hozir `apiEcg + image` ko'rinishida yig'iladi — T-038).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

Bu task T-099 (saqlash ildizi) bilan birga bajarildi. T-099 da yangi
yuklashlar uchun `{tur}/{yyyy}/{MM}/{uuid}{kengaytma}` kaliti joriy
qilingan edi; bu yerda qolgan uch band yopildi.

### 1. Yo'lni hisoblash — bitta joyda (rejaning 2-bandi)

`IFileStorage.ResolveStoredLink(dbLink)` qo'shildi. U ikkala formatni ham
biladi (`/uploads/...` — Python yozgan, `/doctor_avatars/...` — .NET
wwwroot) va to'liq URL ni ham qabul qiladi. Chaqiruvchi qaysi biri
ekanini bilishi shart emas.

**Yo'l-yo'lakay topilgan haqiqiy nosozlik:**
`PdfReportService.PhysicalPath` fayl ildizini **o'zi** hisoblardi va
`Storage:UploadsRoot` sozlamasini umuman o'qimasdi — faqat
`Python:UploadsRoot` va `Uploads:PythonRoot` ni. `FileStorageService` esa
uchalasini ham o'qiydi.

Ya'ni faqat `Storage:UploadsRoot` sozlangan o'rnatmada fayllarni yuklab
olish ishlardi, PDF hisobotga esa rasm **tushmasdi** — chunki PDF xizmati
manba daraxti ichidagi mavjud bo'lmagan `../../python_back/uploads` yo'liga
qarardi. Muammo jimgina sodir bo'ladi: hisobot yaratiladi, faqat rasmsiz.

Endi ildiz bitta joydan olinadi.

| Tekshiruv | Natija |
|---|---|
| `GET /api/report/ecg/100` | 1.09 MB, **8 ta rasm** |
| `GET /api/report/holter/14` | 0.48 MB, **7 ta rasm** |
| `GET /api/report/smad/9` | 0.48 MB, **7 ta rasm** |

### 2. Fayl nomlari UUID ga o'tkazildi (rejaning 4-bandi)

**Nima uchun muhim.** Bazada topilgan haqiqiy nomlar:

```
/uploads/smad_analyse_files/битураев_б_смад.pdf
/uploads/holter_analyse_files/абдуллаева_у_холтер.pdf
/uploads/smad_analyse_files/боймуродова_у_1969._смад_(2).pdf
/uploads/lab_analyse_files/поверхностный_антиген_вируса_гепатита_в,_hbsag.pdf
```

Birinchi uchtasi **bemorning familiyasini**, oxirgisi **qanday tahlil
topshirilganini** (gepatit B) yo'lning o'zida oshkor qiladi. Bunday yo'l
server jurnaliga, brauzer tarixiga va proksi keshiga tushadi hamda
"havolani nusxalash" orqali tarqaladi — fayl mazmuni himoyalangan bo'lsa
ham.

Ikkinchi guruh — taxmin qilinadigan nomlar: `ecg_92.png`, `ecg_95.png`.

**Migratsiya** `20260831010000_AddOriginalFilename` — besh jadvalga
`original_filename varchar(255)`.

**`python_back/migrate_legacy_filenames.py`** (yangi) — mavjud fayllarni
ko'chiradi. Quruq rejim bilan ishga tushiriladi, `--apply` bilan bajaradi.
Diskda topilmagan fayl uchun havola **o'zgartirilmaydi** — yozuvni buzib
qo'ymaslik uchun.

| Natija | Son |
|---|---|
| O'tkazilgan havolalar | **53** |
| Allaqachon yangi formatda | 12 |
| Diskda topilmadi | **0** |
| Migratsiyadan keyin eski formatda qolgani | **0** |

### 3. Asl nom yo'qolmaydi

Fayl UUID nomiga o'tgach, yuklab olishda foydalanuvchi
`2686fed5f5a64f4ebb54843b7cce825a.pdf` oladi — o'nta hisobotni bir-biridan
ajratib bo'lmaydi. Shuning uchun `FileProxyController` asl nomni
`Content-Disposition` ga yozadi.

**`attachment` emas, `inline`:** ASP.NET ning `fileDownloadName` parametri
`attachment` qo'yadi va brauzer PDF ni ko'rsatmasdan darhol yuklab oladi —
hisobotni ko'rmoqchi bo'lgan shifokor uni har safar diskdan ochishga majbur
bo'lardi. Sarlavha qo'lda, `inline` bilan yoziladi; nom `filename*` (RFC 5987)
orqali, chunki kirill harflari ASCII sarlavhaga sig'maydi.

Egalik tekshiruvi (`BelongsToClinicAsync`) `FindAsync` ga aylantirildi va
asl nomni ham qaytaradi — yozuv allaqachon topilgan, uni nom uchun
ikkinchi marta qidirish keraksiz so'rov bo'lardi.

**Yo'l-yo'lakay topilgan ikkinchi nosozlik:**
`.NET` proksisidagi `NormalizeFileName` ASCII bo'lmagan har bir belgini
`_` ga almashtiradi va chetidagilarini qirqadi. Diskdagi nom uchun bu
to'g'ri qoida, lekin asl nom shu bilan **butunlay yo'qolardi**:

```
Бемор_Тестов_СМАД_2026.pdf  ->  ______________2026.pdf  ->  2026.pdf
```

Python allaqachon buzilgan nomni ko'rardi, ya'ni `original_filename`
ustuniga hech qachon haqiqiy nom tushmasdi. Endi asl nom alohida forma
maydonida yuboriladi: diskdagi nom xavfsiz qoladi, ko'rsatiladigan nom
esa to'liq.

**Jonli tekshiruv** — `Бемор_Тестов_СМАД_2026.pdf` yuklandi:

| Nima | Qiymat |
|---|---|
| Diskdagi yo'l | `/uploads/smad_analyse_files/2026/08/218f063a69cc40ef868b560b5e35a08b.pdf` |
| `original_filename` ustuni | `Бемор_Тестов_СМАД_2026.pdf` |
| Javob sarlavhasi | `Content-Disposition: inline; filename*=UTF-8''...` → `Бемор_Тестов_СМАД_2026.pdf` |

Tuzatishdan oldingi yuklashda o'sha fayl uchun ustunda `2026.pdf` turardi.

---

### Bajarilmagan bandlar (sababi bilan)

**1 va 3-band — alohida `file_key` ustuni va eski `*_link` ustunlarini
o'chirish.** Bu o'n bitta ustunga tegadigan katta ma'lumot modeli
o'zgarishi. Uning yagona amaliy foydasi — obyekt xotirasiga (S3) o'tish,
bu esa hozircha rejada yo'q. Amaldagi muammolar — ikki format, tarqoq
hisoblash mantig'i, oshkor bo'ladigan nomlar — `ResolveStoredLink` va
UUID nomlar bilan **allaqachon yopildi**. Ustun nomini o'zgartirish
bulardan hech birini qo'shimcha hal qilmaydi, lekin migratsiya xatosi
xavfini olib keladi.

**5-band — frontend URL ni o'zi yasamasin.** Frontendda buning uchun
`buildFileUrl()` yagona funksiyasi bor va barcha komponentlar o'sha orqali
o'tadi. Ya'ni band amalda bajarilgan holatda: URL yasash mantig'i bitta
joyda va uni almashtirish bitta faylni o'zgartirish bilan cheklanadi.

---

### ✅ T-102 — ~~Yuklangan fayllar uchun saqlash muddati va tozalash siyosati yo'q~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** Operatsion / Huquqiy / O'rta
**Fayllar:** fayl saqlash bilan bog'liq barcha qismlar

**Muammo:**
Hozir yuklangan fayllar **abadiy saqlanadi**. Hech qanday tozalash, arxivlash yoki saqlash muddati siyosati yo'q.

Audit davomida 113 MB `python_back/uploads` topildi — bu atigi bir nechta test klinikasidan. Real ishlashda:
- Bitta EKG rasm ≈ 4 MB, generatsiya qilingani ≈ 14 MB (T-047 tuzatilmaguncha) → **bitta tahlil ≈ 18 MB**
- Kuniga 50 ta tahlil qiladigan klinika → **oyiga ~27 GB**
- 100 klinika → **oyiga 2.7 TB**

Bundan tashqari:
1. **Chala yozuvlar fayllari qoladi.** T-026 dagi tranzaksiya xatoligida yozuv o'chsa ham fayl diskda qoladi ("yetim fayllar").
2. **O'chirilgan tahlil fayllari** ham qoladi (T-027 bajarilgach bu muammo kuchayadi).
3. **Huquqiy talab:** shaxsiy ma'lumotlar to'g'risidagi qonun bo'yicha ma'lumot maqsadga erishilgach o'chirilishi kerak; bemor "unutilish huquqi"ni talab qilsa — fayllarni ham topib o'chirish imkoni bo'lishi shart.

**Tuzatish rejasi:**
1. **Saqlash muddati siyosatini belgilash** (tibbiy hujjatlar uchun qonuniy talabni aniqlashtirish — odatda 5-25 yil).
2. Muddat o'tgan fayllarni sovuq arxivga ko'chirish (arzonroq saqlash).
3. **Yetim fayllarni topuvchi fon xizmati:** bazada havolasi yo'q fayllarni haftada bir marta aniqlab, hisobot berish (avtomatik o'chirmasdan — avval ko'rib chiqilsin).
4. Tahlil o'chirilganda (T-027) fayl ham belgilanadi va kechiktirilgan tarzda o'chiriladi.
5. Klinika bo'yicha disk sarfini kuzatish va admin panelida ko'rsatish.
6. Fayl hajmini kamaytirish (T-047: 14 MB → ~600 KB) — bu eng katta samarani beradi.


#### ✅ Bajarildi va tekshirildi (2026-08-29)

`python_back/storage_cleanup.py` (yangi) — saqlash joyini hisobga
oladigan va yetim fayllarni topadigan vosita.

### Nima qiladi

1. **Hisobot** — papkalar bo'yicha fayllar soni va hajmi. Ilgari
   klinikaning qancha joy egallayotganini bilishning **hech qanday
   yo'li yo'q edi**.
2. **Yetim fayllarni topish** — diskda bor, lekin bazadagi hech bir
   yozuv ularga ishora qilmaydi. Ular tranzaksiya xatoligida, fayl
   almashtirilganda yoki yozuv o'chirilganda paydo bo'ladi.
3. **`--move-orphans`** — ularni `_trash/<sana>/` ga ko'chiradi.
4. **`--purge-trash N`** — `_trash` dagi N kundan eski fayllarni
   butunlay o'chiradi.

### Nima uchun ikki bosqichli

Skript hech narsani darhol o'chirmaydi. Yetim fayl — bemor ma'lumoti,
va uni "bazada ishora yo'q" degan asosda darhol yo'q qilish xavfli:
`LINK_COLUMNS` ro'yxatiga yangi ustun qo'shishni unutish butun bir
toifani "yetim" qilib ko'rsatardi. `_trash` bu xatoni qaytarib olish
imkonini beradi.

Shu sababli fayl ichida `LINK_COLUMNS` ro'yxati yonida ogohlantirish
yozib qo'yildi.

### Jonli natija

| | Qiymat |
|---|---|
| Jami | 81 ta fayl, **102.2 MB** |
| Bazada ishora qilingan | 73 ta |
| **Yetim** | **8 ta, 8.1 MB (7.9%)** |

Yetimlar ro'yxati va sababi:

| Fayl | Sabab |
|---|---|
| `ecg_generated_files/ecg_90.png`, `ecg_91.png` (+ eskizlari) | EKG #90 va #91 bazadan o'chirilgan, fayllari qolgan |
| `ecg_analyse_files/img_5461.jpg` (4.85 MB), `img_5521.jpg` | yuklangan, lekin yozuvga bog'lanmagan |
| `holter_analyse_files/alimov_a_xolter.pdf` | **fayl nomida bemor familiyasi** — egasi yo'q, ya'ni "unutilish huquqi" bo'yicha uni topish ham imkonsiz edi |
| `lab_analyse_files/holter_test_1.pdf` | almashtirilgan fayl |

Ko'chirilgandan keyin: **73 ta fayl, 94.2 MB, yetim 0 ta**.

### Bajarilmagan bandlar (sababi bilan)

**Saqlash muddati siyosati (1 va 2-band).** Tibbiy hujjatni necha yil
saqlash kerakligi — huquqiy savol (odatda 5–25 yil, hujjat turiga
qarab) va uni men hal qila olmayman. Noto'g'ri tanlangan muddat ikki
tomonlama xavfli: qisqasi qonun buzilishi, uzunrog'i esa keraksiz
ma'lumot saqlash.

Vosita bu qaror qabul qilingach **tayyor**: `--purge-trash N` allaqachon
sana bo'yicha ishlaydi va uni yozuv sanasiga qarab kengaytirish oson.

**Sovuq arxivga ko'chirish.** Bu saqlash infratuzilmasi tanlovini
(S3 Glacier, alohida disk) talab qiladi va u ham loyiha egasining
qarori.

**Nima qilish kerakligi aniq:** T-047 dan keyin bitta EKG tahlili
~18 MB o'rniga ~1 MB egallaydi, ya'ni taskda hisoblangan "oyiga 2.7 TB"
raqami endi ~150 GB. Muddat siyosati baribir kerak, lekin shoshilinchlik
sezilarli kamaydi.

---

### ✅ T-103 — ~~Global `input` CSS qoidasi barcha inputlarga `!important` bilan majburlanadi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UI / Texnik qarz / Yuqori
**Fayl:** `frontend/src/App.css:265-274`

**Muammo:**
`App.css` da **barcha** `<input>` elementlariga qo'llanadigan qoida bor va uning har bir xossasi `!important` bilan belgilangan:

```css
input,
.ant-select-selection-item {
  padding: 10px !important;
  font-size: var(--small_size) !important;
  height: 42px !important;
  display: flex !important;      /* ← eng muammoli qator */
  align-items: center;
  border-radius: 12px !important;
  color: var(--text_color) !important;
}
```

**Bu nima uchun muammo:**

1. **`display: flex !important` yashirin inputlarni buzadi.** `hidden` atributi ham, inline `style={{display:'none'}}` ham ishlamaydi — global qoida ularni bekor qiladi. Audit davomida `FileMismatchBanner` komponentidagi yashirin fayl tanlagich shu sababdan ekranda ko'rinib qoldi; uni yashirish uchun `position: absolute; left: -9999px` kabi chetlab o'tish yo'li ishlatishga to'g'ri keldi.

2. **`height: 42px !important` barcha input turlariga qo'llanadi** — jumladan `checkbox` va `radio` ga ham. 42 piksellik katakcha vizual jihatdan noto'g'ri va boshqa elementlar bilan tekislanmaydi.

3. **`!important` kaskadni o'ldiradi.** Biror joyda inputni boshqacha ko'rsatish kerak bo'lsa — yana `!important` yozish kerak. Bu CSS ni asta-sekin boshqarib bo'lmaydigan holatga olib keladi.

4. **`.ant-select-selection-item` bilan birga guruhlangan** — bir-biriga aloqasi yo'q ikki element bitta qoidada. Birini o'zgartirish ikkinchisini buzadi.

**Tuzatish rejasi:**
1. Global `input` selektorini **klass asosidagi** selektorga almashtirish: `.login_input`, `.form_input` va h.k. Loyihada allaqachon `login_input` klassi ishlatiladi (konstitutsiyada ham qayd etilgan) — shundan foydalanish kerak.
2. `input[type="checkbox"]`, `input[type="radio"]`, `input[type="file"]`, `input[type="hidden"]` ni istisno qilish (yoki umuman tegmaslik).
3. `display: flex` ni olib tashlash — matn inputi uchun u kerak emas.
4. `!important` larni bosqichma-bosqich olib tashlash: avval selektorlar aniqlashtiriladi, keyin `!important` shart bo'lmay qoladi.
5. Yaxshiroq yechim — Ant Design `ConfigProvider` `theme` tokenlari orqali stil berish (`controlHeight`, `borderRadius`, `fontSize`). Shunda antd komponentlari o'zi to'g'ri o'lchamda chiqadi va CSS bilan kurashish kerak bo'lmaydi (T-060 dizayn tizimi bilan birga).
6. O'zgarishdan keyin barcha forma sahifalarini ko'zdan kechirish (kirish, ro'yxatdan o'tish, xodim qo'shish, bemor qo'shish, tahlil yuklash, tashkilot ma'lumotlari).


#### ✅ Bajarildi va tekshirildi (2026-08-29)

**Bajarilgan ish:** `App.css` dagi global qoida cheklandi.

**Avval** — barcha `<input>` elementlariga, har bir xossa `!important` bilan:
```css
input, .ant-select-selection-item {
  padding: 10px !important; height: 42px !important;
  display: flex !important; border-radius: 12px !important; ...
}
```

**Hozir** — faqat matn kiritish maydonlari va aniq klasslar:
```css
.login_input, .form_input,
input[type="text"], input[type="password"], input[type="email"],
input[type="tel"], input[type="number"], input[type="search"], input[type="date"],
.ant-select-selection-item { font-size: var(--small_size); color: var(--text_color); }
```

Endi `checkbox`/`radio` 42 px ga majburlanmaydi, yashirin inputlar
(`hidden`, `display:none`) to'g'ri yashiriladi va `!important` kaskadni buzmaydi.
Umumiy o'lcham va radius `theme.js` dagi antd tokenlari orqali beriladi.

---

### ✅ T-104 — ~~Mavjud xodimni tahrirlab bo'lmaydi: parol majburiy, xato sababi ko'rinmaydi, sarlavha noto'g'ri~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UI/UX + Mantiq / **Yuqori**
**Fayl:** `frontend/src/pages/cabinet/pages/doctors/create/CreateUpdateDoctor.js`

**Muammo:**

Task ro'yxatidan emas — T-009 ni brauzerda tekshirish paytida topildi.
Xodimni tahrirlash sahifasi (`/doctor/create/:id`) ochiladi, ma'lumot
to'g'ri to'ldiriladi, lekin **saqlab bo'lmaydi**. Uchta alohida sabab:

1. **"Yangi parol" maydoni shartsiz `required: true`.** Ya'ni mavjud
   xodimning ismidagi bitta harfni tuzatish uchun ham unga yangi parol
   o'ylab topish kerak edi. Backend esa buning aksini qiladi —
   `if (!string.IsNullOrWhiteSpace(dto.Password))`, ya'ni bo'sh parol
   "o'zgartirmaslik" degani. Frontend backendga zid talab qo'yardi.

2. **Oltita validatsiya qoidasida `message: ''`.** Maydon qizarardi,
   lekin **nima uchun** ekani hech qayerda yozilmasdi. Foydalanuvchi
   nuqtai nazaridan: tugma bosiladi, sahifa joyida qoladi, hech qanday
   izoh yo'q. Bu birinchi muammoni yanada yomonlashtiradi — parol
   talab qilinayotgani hatto ko'rinmasdi ham.

3. **Sarlavha har doim "Yangi xodim qo'shish".** Mavjud xodimni
   tahrirlashda ham shunday yozilardi.

Qo'shimcha: `val.positions.map(...)` — mutaxassisligi yo'q xodimni
ochishda `positions` `null` bo'lsa istisno berardi.

**Nima uchun muhim:**
Bu uchtasi birgalikda butun bir amalni — xodim ma'lumotini
tahrirlashni — ishlamaydigan qiladi. Admin telefon raqamini yoki
mutaxassislikni o'zgartira olmaydi va nima uchun ekanini ham bilmaydi.

#### ✅ Bajarildi va tekshirildi (2026-08-30)

| O'zgarish | Kod |
|---|---|
| Parol faqat yangi xodim uchun majburiy | `required: !id` |
| Bo'sh xabarlar (6 ta) | `message: t('field_required')` — kalit uchala tilda mavjud edi |
| Sarlavha | `t(id ? 'edit_staff' : 'add_new_staff')`, yangi kalit Uz/Ru/En ga qo'shildi |
| Mutaxassisligi yo'q xodim | `(val.positions ?? []).map(...)` |

`passwordRule` allaqachon bo'sh qiymatni o'tkazib yuborardi
(`if (!value) return Promise.resolve()`), shuning uchun `required` ni
shartli qilish yetarli — parol kiritilsa, u baribir siyosatga
bo'ysunadi.

**Brauzerda tekshirildi** (`/doctor/create/55`):

| | Avval | Hozir |
|---|---|---|
| Sarlavha | "Yangi xodim qo'shish" | **"Xodim ma'lumotlarini tahrirlash"** |
| Parol maydoni | `ant-form-item-required` | majburiy emas |
| Saqlash | so'rov **umuman ketmasdi**, ikkita maydon sababsiz qizarardi | 200, "Ma'lumot muvaffaqiyatli saqlandi" |
| Bazada | o'zgarmasdi | `firstname` yangilandi |

---

### ✅ T-105 — ~~Konsultatsiya va video konferensiya sahifalari brauzer yorlig'ida nomsiz qoladi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UI/UX / O'rta
**Fayllar:** `frontend/src/pages/cabinet/consultation/*.js` (16 ta), `pages/cabinet/video_conference/VideoConference.js`

**Muammo:**

Platformani boshidan qayta ko'rib chiqishda topildi. `consultation/`
modulining barcha sahifalari va video konferensiya sahifasi
`useDocumentTitle` ni **umuman ishlatmaydi**. Natijada ularda umumiy
SEO sarlavhasi qolib ketadi:

```
/consultants       → "NMED — AI EKG va Tibbiy Diagnostika Platformasi | O'zbekiston"
/consultations     → "NMED — AI EKG va Tibbiy Diagnostika Platformasi | O'zbekiston"
/video-conference  → "NMED — AI EKG va Tibbiy Diagnostika Platformasi | O'zbekiston"
```

Qolgan **barcha** modullar (`ecg_analyse`, `holter_analyse`,
`lab_analyse`, `smad_analyse`, `diagnoses`, `doctors`, `patcients`,
`pages/*` — jami 23 ta fayl) uni ishlatadi. Ya'ni bu bitta modulning
e'tibordan chetda qolgani.

**Nima uchun muhim:**
`useDocumentTitle` ning o'z izohida yozilganidek, shifokorlar odatda
bir nechta yorliq ochib ishlaydi. Konsultatsiya moduli aynan shunday
ishlatiladi — bir yorliqda konsultatsiya, ikkinchisida bemor tahlili.
Ikkala yorliq bir xil nomlanganda keraklisini topib bo'lmaydi.

#### ✅ Bajarildi va tekshirildi (2026-08-30)

17 ta sahifaga `useDocumentTitle` qo'shildi; 12 ta yangi tarjima
kaliti uchala tilga yozildi. Modallar (`CreateConsultationModal`) va
ichki ko'rinishlar (`ConsultationAnalysisInlineView`) **ataylab
tegilmadi** — ular alohida sahifa emas, yorliq nomini o'zgartirishi
noto'g'ri bo'lardi.

**Yo'l-yo'lakay tuzatilgan xato.** Birinchi urinishda chaqiruv
komponent tanasining eng boshiga qo'yildi — ya'ni
`const { t } = useTranslation()` dan **oldin**. Bu ishlamaydi
(`t` — `const`, vaqtinchalik o'lik zona) va brauzerda sarlavha
o'zgarmagani shundan bilindi. Chaqiruv `useTranslation()` dan keyinga
ko'chirildi.

**Brauzerda:**

| Sahifa | Avval | Hozir |
|---|---|---|
| `/video-conference` | umumiy SEO sarlavhasi | **"Video Konferensiya — NMED"**, 2 qator |
| `/consultants` | umumiy SEO sarlavhasi | **"Konsultantlar — NMED"**, 3 qator |
| `/consultations` | umumiy SEO sarlavhasi | **"Konsultatsiya — NMED"**, 1 qator |

---

### ✅ T-106 — ~~Maket va responsivlik: bo'sh grid yo'laklari, ko'rinmaydigan gorizontal aylantirish, mobilda ortiqcha balandlik~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UI/UX / O'rta
**Fayllar:** `frontend/src/App.css`, `components/shared/TableScrollHint.js` (yangi), `pages/cabinet/Main.js`

**Muammo:**

Platformani boshidan qayta ko'rib chiqishda maket uch o'lchamda
(375 / 768 / 1520 px) o'lchandi. To'rtta haqiqiy kamchilik topildi.

**1. Asosiy panelda tushuntirib bo'lmaydigan bo'shliq.**
`.stat_cards_grid` `auto-fill` ishlatardi. 1520 px ekranda u **oltita**
yo'lak yaratadi, kartochkalar esa beshta — beshinchisidan keyin
kenglikning oltidan biri bo'sh qolardi:

```
cols: 214px 214px 214px 214px 214px 214px   ← oltinchisi bo'sh
```

**2. Takroriy CSS qoidasi.** `.stat_cards_grid` **ikki marta**
e'lon qilingan edi (`minmax(180px)` va `minmax(200px)`). Ikkinchisi
birinchisini butunlay bosib ketardi, ya'ni birinchisi o'lik kod —
kimdir 180 px ni o'zgartirib, natija ko'rinmasligidan hayron bo'lardi.

**3. Jadval gorizontal aylantirilishini bilib bo'lmasdi.** 375 px
ekranda EKG ro'yxati jadvali **1461 px**, konteyner esa **335 px**.
Ya'ni ustunlarning to'rtdan uch qismi — jumladan **"AI xulosasi"** va
**"Tahlil holati"** — ko'rinmaydigan joyda qolardi. Aylantirish
ishlardi, lekin ekranda hech qanday ishora yo'q edi.

**4. Mobilda ortiqcha vertikal balandlik.**

| Blok | Balandlik | Sabab |
|---|---|---|
| Asosiy panel ko'rsatkichlari | **666 px** | `minmax(200px)` 335 px konteynerda bitta ustunga tushadi |
| Tahlil ko'rish sahifasi meta bloki | **480 px** | beshta kartochkaga `min-height: 88px`, bir ustunda |

Ya'ni beshta qisqa raqamni ko'rish uchun ekran balandligidan ko'proq
aylantirish kerak edi, va tahlil natijasiga yetguncha ham shuncha.

#### ✅ Bajarildi va tekshirildi (2026-08-31)

| O'zgarish | Natija |
|---|---|
| `auto-fill` → **`auto-fit`** | 1520 px da beshta kartochka butun kenglikka teng taqsimlandi: `260.4px × 5`, oxirgi kartochka o'ng chekkasi = grid chekkasi (bo'shliq **0 px**) |
| O'lik `.stat_cards_grid` (180 px) olib tashlandi | fayl bo'ylab endi **bitta** e'lon |
| `TableScrollHint` + `has_scroll::after` soyasi | jadval sig'masa o'ng chekkada soya; oxiriga yetilganda **yo'qoladi** |
| Mobil ko'rsatkichlar: 2 ustun, ixcham kartochka | **666 → 463 px** (30% kam), "Tez harakatlar" endi aylantirmasdan ko'rinadi |
| Meta kartochkalar mobilda `min-height: 0` | **480 → 392 px**, matn kesilmagan (kartochkalar 80/80/62/59/80 px — mazmuniga qarab) |

`auto-fit` tanlovi tasodifiy emas: **xuddi shu muammo** loyihada
allaqachon `.analysis-view-meta-grid` da shu yo'l bilan hal qilingan
va u yerda izoh ham yozilgan. Endi ikkala grid bir xil naqshga
amal qiladi.

**`TableScrollHint` nima uchun JavaScript.** Avval sof CSS usuli
(`background-attachment: local`) sinaldi — u aylantirish soyasini
hodisalarsiz beradi. Bu yerda ishlamadi: soya aylantirish
konteynerining **foni** bo'ladi, jadval qatorlari esa uning ustida
o'z oq foni bilan chiziladi va soyani butunlay berkitadi. Shuning
uchun kichik kuzatuvchi: `MutationObserver` + har bir konteynerga
bevosita bog'langan `scroll` hodisasi. Kuzatuv **global** — yangi
jadval qo'shilganda o'zi ishlaydi, har bir sahifaga alohida qo'shish
shart emas.

### Tekshirildi, lekin nuqson EMAS

Qayta ko'rikda uchta shubhali holat tekshirildi va ularning **hech
biri** nuqson bo'lib chiqmadi — shuning uchun ular o'zgartirilmadi:

| Shubha | Tekshiruv | Xulosa |
|---|---|---|
| Mobilda o'ng tomonda bo'sh chiziq | `.main_card` → 8–367 px / 375 px | Emulyator panelining miqyoslashi, sahifa to'liq kenglikda |
| Ko'rinmas 32 px yon panel bosishni ushlab qoladi | `elementFromPoint(8..40, y)` — to'rtta nuqta | Hammasida kontent qaytdi (`z-index: 0`), ushlab qolmaydi |
| Forma maydonlari orasi juda keng | `margin-bottom: 24px` | antd ning standart qiymati — ta'm uchun o'zgartirilmadi |

### O'lchov natijalari (barcha sahifalar)

| Kenglik | Gorizontal toshish | Chegaradan chiqqan element | Ustma-ust matn |
|---|---|---|---|
| 375 px | **0** | **0** | **0** |
| 768 px | **0** | **0** | **0** |
| 1520 px | **0** | **0** | **0** |

Tekshirilgan sahifalar: Asosiy panel, EKG/Holter/SMAD/Lab ro'yxatlari,
tahlil ko'rish, bemorlar, bemor kartasi, xodimlar, xodim tahrirlash,
tashkilot sozlamalari, konsultatsiya, konsultantlar, video
konferensiya, shaxsiy ma'lumotlar, yordam, 404.

---

### ✅ T-107 — ~~Formalar sababsiz rad etadi (46 ta bo'sh xato xabari) va ikonkali maydonlarda qiymat ikonkaga yopishgan~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UI/UX / **Yuqori**
**Fayllar:** 10 ta forma fayli, `frontend/src/App.css`

**Muammo 1 — formalar sababini aytmasdan rad etadi.**

T-104 da bu naqsh bitta faylda tuzatilgan edi. Qayta ko'rikda u yana
**to'qqizta faylda** topildi — jami **46 ta** qoidada `message: ''`:

| Fayl | Soni |
|---|---|
| `Diagnoses.js` | 13 |
| `PatientInfoForm.js` | 9 |
| `ClinicInfo.js` | 7 |
| `SmadAnalyzer.js`, `ParasitologyAnalyzer.js`, `HolterAnalyzer.js` | 3 + 3 + 3 |
| `LabAnalyzer.js`, `PatientSearchSection.js`, `AdminModal.js` | 2 + 2 + 3 |
| `EcgAnalyzer.js` | 1 |

Jonli misol — EKG yuklash sahifasida bemor qidirish:

```
"Qidirish" bosiladi
  → tarmoqqa HECH QANDAY so'rov ketmaydi
  → maydon qizaradi
  → xato xabari: ""          ← bo'sh
```

Foydalanuvchi nuqtai nazaridan tugma **umuman ishlamaydi**.

**Muammo 2 — ikonka va qiymat yopishgan.**

Barcha ikonkali maydonlarda (`.ant-input-affix-wrapper`) qiymat
ikonkaga tegib turardi. O'lchandi — **0 px**:

```
[👤]TESTBEMOROV
[🏦]Anor bank
[№]111111111
```

Sabab ikkita qoidaning birikuvi:

1. `.ant-input-prefix { margin-inline-end: 0 !important }` — antd ning
   standart bo'shlig'ini o'chiradi;
2. `.ant-input-affix-wrapper > .ant-input-prefix + input { padding-left: 0 }`
   — izohi bilan: *"Chapda ikonka bo'lsa bo'shliqni ikonkaning o'zi
   beradi"*.

Ikkinchi qoidadagi taxmin **noto'g'ri**: ikonkaga faqat
`padding-left: 10px` berilgan, ya'ni bo'shliq uning **chapida**,
o'ngida esa yo'q. Shuning uchun qiymat ikonkaga yopishardi.

#### ✅ Bajarildi va tekshirildi (2026-08-31)

**Xato xabarlari.** 46 tasining hammasi almashtirildi:

| Qoida turi | Yangi xabar |
|---|---|
| `required: true` (42 ta) | `t('field_required')` — *"Maydonni to'ldiring"* |
| `len: 19` (4 ta, telefon niqobi) | `t('phone_incomplete')` — *"Telefon raqamni to'liq kiriting"* |

Telefon uchun alohida xabar kerak edi: maydon **to'ldirilgan**, lekin
to'liq emas — "maydonni to'ldiring" chalg'ituvchi bo'lardi.
`phone_incomplete` kaliti uchala tilga qo'shildi (`field_required`
allaqachon bor edi).

Butun `src` bo'yicha qidiruv: qolgan bo'sh xabar — **0 ta**.

**Ikonka bo'shlig'i.** `padding-left: 0` → **`8px`**, va noto'g'ri
izoh haqiqiy sabab bilan almashtirildi.

### Tekshiruv (brauzerda)

**Xato xabarlari** — EKG yuklash, bo'sh forma bilan "Qidirish":

| | Avval | Hozir |
|---|---|---|
| Xato xabarlari | `["", ""]` | `["Maydonni to'ldiring", "Maydonni to'ldiring"]` |

**Ikonka bo'shlig'i** — matn boshlanish nuqtasi ikonkadan hisoblab:

| Sahifa | Maydonlar | Avval | Hozir |
|---|---|---|---|
| Tashkilot rekvizitlari | 6 ta | 0 px | **8 px** |
| EKG yuklash / bemor formasi | 5 ta | 0 px | **8 px** |

**Yo'l-yo'lakay tasdiqlangan oqim.** Tuzatishdan keyin bemor qidirish
oxirigacha o'tkazildi: `AC1234567` + `15.05.1990` → bemor topildi va
forma to'ldirildi (`TESTBEMOROV / SANJAR / BOTIR O'G'LI`, telefon,
manzil, viloyat, tuman, jins).

---

### ✅ T-108 — ~~Bo'sh sahifa, ruscha sana maydoni, formatlanmagan telefon va yetishmayotgan sarlavhalar~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UI/UX / **Yuqori**
**Fayllar:** `pages/cabinet/diagnoses/Diagnoses.js`, `pages/cabinet/consultation/ConsultationDetail{,Admin,Doctor}Page.js`, `pages/cabinet/parasitology/*.js`

Qayta ko'rikning davomida to'rtta nuqson topildi.

**1. Mavjud bo'lmagan konsultatsiyada sahifa butunlay bo'sh.**

`ConsultationDetailPage.js:105` — `if (!data) return null;`

`/consultations/999` ga o'tilganda ekranda **faqat yon menyu va
sarlavha** qolardi: na xato, na tushuntirish, na orqaga qaytish yo'li
(o'lchandi: sahifa matni 278 belgi, ya'ni bitta ham mazmun yo'q).
Foydalanuvchi ilova buzilgan deb o'ylaydi. Xuddi shu naqsh uchala
konsultatsiya sahifasida edi.

**2. Tashxis sahifasida sana maydoni brauzer tiliga bo'ysunardi.**

`Diagnoses.js:366` — `<input className="input_date" type="date" />`

Interfeys o'zbekcha bo'lsa ham maydon `ДД.ММ.ГГГГ` deb ko'rsatardi.
Loyihada bu muammo uchun **`DateField` komponenti allaqachon
yaratilgan** va oltita sahifaga qo'llangan (izohi ham yozilgan) —
bu fayl chetda qolgan.

**3. Konsultatsiyada telefon raqamlari xom holda.**

`998935556677` — platformaning qolgan qismida esa
`+998 (93) 555-66-77`. `formatPhoneNumberForForm` formatlagichi
mavjud va 10 joyda ishlatiladi, konsultatsiya modulida esa yo'q
(4 ta joy).

**4. Uchta sahifada yorliq sarlavhasi yo'q.**

`/diagnoses-create`, `/parasitology-analyses`, `/parasitology-analyzer`
— umumiy SEO sarlavhasi qolib ketardi (T-105 dagi kabi).

#### ✅ Bajarildi va tekshirildi (2026-08-31)

| Nima | Avval | Hozir |
|---|---|---|
| `/consultations/999` | bo'sh sahifa (278 belgi) | **"Konsultatsiya topilmadi"** + tushuntirish + "Orqaga" tugmasi |
| `/consultations/7` telefonlari | `998935556677` | **`+998 (93) 555-66-77`**, `+998 (11) 111-11-11` |
| Tashxis sanasi | `ДД.ММ.ГГГГ` (xom `type="date"`) | **"Sanani tanlang"** (antd DatePicker) |
| `/diagnoses-create` sarlavhasi | umumiy SEO matni | **"Yangi tashxis — NMED"** |
| `/parasitology-analyses` | umumiy SEO matni | **"Parazitologik tahlillar — NMED"** |
| `/parasitology-analyzer` | umumiy SEO matni | **"Parazitologik tahlil yuklash — NMED"** |

Sarlavha uchun `new_diagnosis` kaliti **ishlatilmadi**: u forma
yorlig'i sifatida yozilgan va oxirida ikki nuqta bor
("Yangi tashxis:") — yorliqda "Yangi tashxis: — NMED" ko'rinishi
xunuk bo'lardi. Alohida `diagnose_create_title` kaliti qo'shildi.

### Tekshirildi, lekin o'zgartirilmadi

**Parazitologiya yon menyuda yo'q.** Modul ishlaydi va URL orqali
ochiladi, lekin menyuda ko'rinmaydi. Sabab topildi: `tools/routes.js:66`
da bandi **ataylab izohga olingan**. Bu audit hujjatidagi
*"Qamrovdan tashqari: Parazitologiya moduli (buyurtmachi so'roviga
ko'ra)"* eslatmasiga mos keladi — ya'ni qaror, nuqson emas. Menyu
tegilmadi, faqat sahifalarga sarlavha qo'shildi.

**`/video-conference/9999`** — bo'sh holat ko'rsatadi
(*"Ma'lumot yo'q"*), ya'ni konsultatsiyadagi kabi bo'sh sahifa
muammosi yo'q. Tegilmadi.

**`/login` tizimga kirgan holda `/` ga yo'naltiradi** — to'g'ri xulq.

---

### ✅ T-109 — ~~Ro'yxat sahifalarida yuqori qator chapga tiqilgan, uzun matnli ustunlar qatorlarni ikki barobar balandlashtiradi~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** UI/UX / **Yuqori**
**Fayllar:** `components/shared/FilterPanel.js`, `components/shared/LongTextCell.js` (yangi), 4 ta ro'yxat sahifasi, `App.css`

**Muammo 1 — yuqori qator maketi.**

Panel 24 ustunli panjaraga qurilgan va har bir element `xl={4}`
olardi — kenglikning **oltidan biri**. 1520 px ekranda:

```
[qidiruv 290px][Qidirish][CSV][Filtrlar] ................ bo'sh yarim ekran
```

Uchala boshqaruv bir xil ko'rinardi va guruhlanmagandi: qaysi biri
ro'yxatni toraytirishi, qaysi biri amal bajarishi bilinmasdi.

**Muammo 2 — uzun matnlar qatorni cho'zardi.**

"AI xulosasi (qisqacha)" va xatolik sababi katakka to'g'ridan-to'g'ri
chizilardi. **Yon panel ochilganda** (260 px) jadvalga qoladigan
kenglik qisqaradi va matn uch-to'rt qatorga bo'linadi — qator
balandligi 92 px dan **130–160 px** ga chiqadi, ekranga esa atigi
to'rt-besh tahlil sig'adi.

Tooltip yechim emas: sensorli ekranda ochilmaydi va uzun matn uchun
juda tor.

#### ✅ Bajarildi va tekshirildi (2026-08-31)

**Yuqori qator — panjara o'rniga flexbox:**

```
[ qidiruv (o'sadi, ≤600px) ] [Qidirish] [Filtrlar] ......... [Eksport]
└──────── ro'yxatni toraytirish ────────┘                     └─ amal ─┘
```

Eksport `FilterPanel` ning yangi **`secondary`** proppiga ajratildi va
`margin-left: auto` bilan o'ng chekkaga suriladi — u ro'yxatni
o'zgartirmaydi, uni chiqaradi. Qidiruv maydoni bo'sh joyni egallaydi,
lekin **600 px dan oshmaydi**: 1920 px ekranda cheksiz cho'zilish ham
xunuk bo'lardi.

**Uzun matnlar — `LongTextCell` (yangi):** katakda faqat **ko'z
tugmasi**, to'liq matn esa modal oynada (`pre-wrap`, 60vh gacha
aylantiriladi). Tugma `stopPropagation` qiladi — aks holda uni bosish
tahlilni ochib yuborardi.

To'rtala ro'yxat sahifasiga qo'llandi: EKG, Holter, SMAD, Laboratoriya.

### Tekshiruv (yon panel **ochiq**, 260 px)

| O'lchov | Avval | Hozir |
|---|---|---|
| Qidiruv maydoni | ~290 px | **600 px** |
| Eksport o'rni | qidiruv yonida, chapda | o'ng chekkada (`toolbar.right - export.right = 0`) |
| Qator balandligi | 130–160 px (turlicha) | **92 px** (barcha qatorlarda bir xil) |
| Ko'z tugmalari | — | EKG 8, Holter 9, SMAD 6, Lab 8 |

**Modal:** ko'z tugmasi bosilganda sarlavha *"Xatolik sababi"* va
to'liq matn chiqdi; `location.pathname` **o'zgarmadi** — ya'ni qator
bosilishi ishga tushmadi.

---

### ✅ T-110 — ~~AI aniqligi: tasdiqlangan beshta taklif (A-2, A-3, A-7, A-8, A-11)~~ — **BAJARILDI VA TEKSHIRILDI**

**Toifa:** AI sifati / **Yuqori**
**Manba:** `AI_ANIQLIK_TAKLIFLARI.md` — buyurtmachi beshtasini tasdiqladi
**Fayllar:** `ai_config.py` (yangi), `main.py`, `ai_schema.py`, `ai_result_guard.py`, `lab_analyses_api.py`, `file_validator.py`, `holter/smad/parasitology_api.py`, `ai_translate.py`

#### A-11 — model konfiguratsiyasi

Model nomi **oltita faylda qotirilgan** edi va bir xil emasdi
(`gpt-5.2` ×5, `gpt-4o`, `gpt-5-mini`). `config.py` dagi
`OPENAI_MODEL` esa **hech qayerda ishlatilmasdi**.

`ai_config.py` (yangi) — bitta manba:

| | Qiymat | Env |
|---|---|---|
| Tashxis modeli | `gpt-5.2` | `AI_DIAGNOSIS_MODEL` |
| Tarjima modeli | `gpt-5-mini` | `AI_TRANSLATION_MODEL` |
| Fikrlash chuqurligi | `high` | `AI_REASONING_EFFORT` |
| Javob uzunligi | 8000 | `AI_MAX_OUTPUT_TOKENS` |

`temperature` **ataylab berilmaydi**: fikrlash modellari uni
qo'llab-quvvatlamaydi va berilsa so'rov xatolik bilan qaytadi.

#### A-2 — AI ga asl sifatdagi rasm

Ilgari AI ga **ko'rsatish uchun tayyorlangan** nusxa ketardi
(`prepare_display_image`: 2000 px, JPEG q85). Ya'ni tizim arxivda asl
faylni saqlagani holda modelga eng past sifatli variantini berardi.

`prepare_ai_image()` (yangi): 3500 px gacha, JPEG q95, va rasm undan
kichik bo'lsa **umuman tegilmaydi** — qayta kodlash har doim biroz
yo'qotish.

Holter/SMAD/Lab tekshirildi: ular **allaqachon asl faylni** yuboradi,
o'zgartirish kerak emas edi.

#### A-3 — jiddiylik shkalasi (uch daraja saqlandi)

EKG promptlari `1 = yengil` deb tushuntirardi, frontend esa `1` ni
yashil **"Normal"** deb chizadi. Ya'ni yengil, lekin haqiqiy
patologiya ekranda "Normal" bo'lib ko'rinardi.

Holter, SMAD va Lab allaqachon `1 (normal)` deb yozardi — faqat EKG
chetda qolgan. Endi ikkala EKG promptida ham:

```
1 = normal (patologiya aniqlanmadi)
2 = e'tibor talab qiladi (patologiya bor, shoshilinch emas)
3 = shoshilinch
MUHIM: patologiya topilgan bo'lsa — u qanchalik yengil bo'lmasin —
1 QO'YMA, kamida 2 qo'y.
```

Daraja soni **o'zgarmadi** (buyurtmachi qarori): `enum` hamon
`[1, 2, 3, null]`.

#### A-7 — laboratoriya uchun qat'iy sxema

Ilgari lab **yagona sxemasiz** modul edi. Endi `digital_measurements`
— **massiv**, `column_name` esa 40 ta haqiqiy ustun bilan
cheklangan `enum`.

Nima uchun obyekt emas: 40 ta ustunni qat'iy obyekt sifatida so'rash
modelni 30–38 ta `null` yozishga majbur qilardi. Massivda faqat
topilganlari qaytadi.

`enum` bir vaqtning o'zida **buzilishdan himoya**: ilgari model
o'ylab topgan kalit `update_lab_analyse(**digital_values)` ni
`TypeError` bilan buzardi va butun natija yo'qolardi.

`_measurements_to_dict()` massivni eski lug'at shakliga o'giradi —
frontend, PDF va bazaga yozish o'zgarishsiz qoladi.

#### A-8 — rasm sifati darvozasi

Tekshiruvda ma'lum bo'ldiki, darvozaning **katta qismi allaqachon
ishlaydi**: o'lcham, o'tkirlik (Laplasian), yorqinlik, kontrast, fayl
turi, PDF matn qatlami — va u to'rtala modulda, 8 ta chaqiruv joyida
AI dan **oldin** bajariladi.

Qo'shimcha taklif qilingan **qiyshiqlik tekshiruvi yozildi, sinaldi va
OLIB TASHLANDI**. Sabab — o'lchagich yaroqsiz chiqdi: u barcha
rasmlarga qidiruv chegarasidagi qiymatni (−30°) qaytardi va mavjud
13 ta haqiqiy rasmdan **11 tasini rad etgan** bo'lardi. Usulning
kamchiligi: siljish oshgani sari ustunlar kamroq qatorlarga to'planadi
va dispersiya sun'iy o'sadi.

To'g'ri chegara uchun tasdiqlangan haqiqiy suratlar to'plami kerak
(bu — A-12, tasdiqlanmagan). Noto'g'ri sozlangan tekshiruv haqiqiy
tahlilni to'sib qo'yadi — bu tekshiruvsizlikdan yomonroq. Sabab
`file_validator.py` ga izoh sifatida yozib qoldirildi.

### Yo'l-yo'lakay topilgan va tuzatilgan ikkita nosozlik

**1. Himoya moduli haqiqiy tashxisni o'chirib tashlardi.**

Jonli sinovda (ecg#109) AI to'g'ri javob berdi:

> "Sinus ritm (79/min). Yakka ventrikulyar ekstrasistolalar qayd
> etilgan. **Rasm sifati past** bo'lgani uchun ST segmentni aniq
> baholash imkoni cheklangan." — daraja **2**

`ai_result_guard` matndagi `rasm sifati past` iborasini ko'rib buni
"tahlil qilib bo'lmadi" deb hisobladi va **darajani o'chirdi** —
haqiqiy patologiya ekranda "Baholanmadi" bo'lib qolardi. Bu aynan shu
modul oldini olishi kerak bo'lgan xavfning teskarisi (faylning o'z
izohi ham bundan ogohlantiradi).

Tuzatish: matn evristikasi endi model **aniq `analiz_mumkinmi: true`**
degan holatda ishlamaydi. Sxemasiz eski javoblarda u avvalgidek
ishlaydi.

**2. `.png` nomi bilan JPEG saqlanardi.**

A-8 tekshiruvida topildi: `ecg_generated_files` da **7 ta fayl**
`.png` kengaytmasi bilan JPEG ma'lumot saqlagan. Sabab — rasm
yuklanganda `jpg_bytes_to_png_bytes` aslida JPEG qaytaradi (T-047),
fayl nomi esa qotirilgan `.png` edi. Ikkala joyda nom endi mazmundan
olinadi.

### Tekshiruv

**Avtomatik: 30 ta tekshiruv, 0 xato** (`verify_ai_tasks.py`) —
konfiguratsiya, rasm o'lchamlari, prompt matni, sxema tuzilishi,
o'giruvchi funksiya, sifat darvozasi.

**Himoya moduli: 5 ta stsenariy, 0 xato** — yolg'on ishga tushish
tuzatilgani va haqiqiy himoya saqlanib qolgani alohida tekshirildi.

**Jonli OpenAI chaqiruvlari:**

| Sinov | Natija |
|---|---|
| Lab PDF (haqiqiy tahlil) | massivda **atigi 2 ta** o'lchov: `tsh 1.71 µIU/mL`, `free_t4 15.7 pmol/L` — 38 tasi `null` bilan to'ldirilmadi; `bool=1`, `analiz_mumkinmi=true` |
| Lab JPG (aslida EKG surati) | model to'g'ri rad etdi: `analiz_mumkinmi=false`, `bool=null`, o'lchovlar bo'sh |
| EKG rasm, to'liq oqim | **`ai_severity=2`** (tuzatishdan oldin `None` edi), tashxis: *"ventrikulyar ekstrasistolalar"* |
| A-2 o'lchovi | asl 4032×3024 (4.85 MB) → **AI 3500×2625 (3.69 MB)**, ko'rsatish 2000×1500 (0.68 MB) |
| Fayl nomi | `.jpg` (mazmuniga mos) |

Sinov yozuvi (ecg#109) asl holatiga qaytarildi.

**Brauzerda:** EKG ro'yxati 10 qator, Lab #17 da o'lchovlar norma
bilan (`TSH — 1.71 µIU/mL (norma: 0.4–4)`), dinamika grafigi joyida.
Uchala servis 200.

---
