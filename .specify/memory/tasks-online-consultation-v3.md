---
description: "Online Konsultatsiya V3 — soddalashtirilgan admin/shifokor oqimi"
---

# Tasks: Online Konsultatsiya V3 Soddalashtirish

**Prompt manbasi**: `.specify/memory/online-consultation-v3-prompt.md`

**Maqsad**: Online konsultant modulini murakkab oqimdan chiqarib, admin uchun 2 sahifa (`Konsultantlar`, `Konsultatsiyalar`) va shifokor uchun 2 sahifa (`Shifoxonalar`, `Konsultatsiyalar`) bilan ishlaydigan sodda, tushunarli va platforma UI/UXiga mos modulga aylantirish.

---

## Audit Natijasi

Hozirgi v2 kodda backend asosiy model/API logikasi mavjud, lekin V3 UX uchun quyidagi kamchiliklar bor:

- `AddConsultantPage.js` faqat telefon orqali qidiradi; passport/F.I.SH, viloyat, tuman, klinika filterlari yo'q.
- `CreateConsultationPage.js` Patient ID bilan ishlaydi; talab qilingan passport + tug'ilgan sana orqali bemor qidirish oqimi yo'q.
- Konsultant tanlash select/tag orqali; talab qilingan checkbox table emas.
- Konsultatsiya sanasida `min=today`, `max=today+1 month` validatsiyasi UI darajasida yo'q.
- Detail sahifalarda video token modalda ko'rsatiladi; talab qilingan real video blok sahifa yuqorisida ochilmayapti.
- Detail sahifalarda online/offline status UI ko'rinishi hali to'liq real-time emas.
- Tahlillar faqat ro'yxat sifatida ko'rinyapti; shu sahifada ichki viewer ochish yo'q.
- Eski online consultation sahifalari hali repo ichida bor va userni chalg'itishi mumkin.

---

## NC034 — AddConsultantPage filterlarini to'liq qilish

- [x] `frontend/src/pages/cabinet/consultation/AddConsultantPage.js`
  - Passport/F.I.SH input qo'shish
  - Telefon inputni saqlash
  - Viloyat select
  - Tuman select
  - Klinika select
  - Kamida 1 filter validation
  - Result table: Klinika, F.I.SH, Lavozim, Telefon, Amal
  - Taklif yuborilgandan keyin row action disabled yoki "Taklif yuborildi" holati

## NC035 — Doctor search backendni V3 filterlarga mos tekshirish

- [x] `SearchDoctorsAsync`
  - `User.RoleId == 4` majburiy
  - active konsultantlar chiqmasin
  - pending taklif yuborilganlar chiqmasin
  - admin/direktor/hamshira/superadmin chiqmasin
  - passport/F.I.SH, phone, region, district, clinic filterlari ishlasin

## NC036 — Patient qidirish endpointi

- [x] Backendda admin uchun bemorni passport seriya + birthDate orqali topish endpointi yaratish yoki mavjud endpointni moslashtirish
  - AES random IV sabab passport DB LIKE bilan qidirilmasin
  - Passportlar decrypt qilinib in-memory tekshirilsin
  - BirthDate ham tekshirilsin
  - Topilsa bemor DTO qaytsin
  - Topilmasa 404 emas, frontend yangi bemor formani ochishi uchun `found=false` qaytsin

## NC037 — CreateConsultationPage patient oqimini almashtirish

- [x] `frontend/src/pages/cabinet/consultation/CreateConsultationPage.js`
  - Patient ID radio/input olib tashlansin
  - Passport seriya + tug'ilgan sana + Qidirish
  - Topilgan bemor inputlarda ko'rsin
  - Topilmasa inputlar bo'sh bo'lib yangi bemor kiritilsin
  - Gender backend boolean talabiga mos yuborilsin

## NC038 — CreateConsultationPage konsultant tanlash UX

- [x] Select/tag o'rniga checkbox table
  - F.I.SH
  - Lavozim
  - Telefon
  - Joriy narx
  - Checkbox
  - Kamida 1 konsultant majburiy

## NC039 — Consultation date validation

- [x] UI va backend validatsiya:
  - `ConsultationDate >= today`
  - `ConsultationDate <= today + 1 month`
  - Backenddagi 30 kunlik cheklov UI bilan mos bo'lsin

## NC040 — Detail video UX

- [x] Admin detail va doctor detail sahifalarda token modalni olib tashlash
  - Video component sahifa yuqorisida full-width ochilsin
  - Raw token ko'rsatilmasin
  - Tugmalar icon-only: hangup, mic, camera, screen share, switch camera
  - Xulosa saqlangandan keyin ham video qo'ng'iroq mumkin bo'lsin

## NC041 — Online/offline status

- [x] Admin detail:
  - konsultant doctor online/offline ko'rinsin
  - online bo'lsa video call button enabled
- [x] Doctor detail:
  - admin online/offline ko'rinsin
  - online bo'lsa video call button enabled
- [x] SignalR event yoki polling orqali status yangilansin

## NC042 — Tahlillarni detail sahifada ochish

- [x] Admin va doctor detail sahifalarda bemorning barcha tahlillari ko'rinsin:
  - EKG
  - SMAD
  - Holter
  - Lab
  - Parazitologiya
- [x] Har bir tahlil shu sahifada drawer/modal/tabs ichida ochilsin
- [x] Mavjud result/viewer componentlar qayta ishlatilsin

## NC043 — Sidebar va route tozalash

- [x] Admin menu:
  - faqat `Konsultantlar`
  - faqat `Konsultatsiyalar`
- [x] Doctor menu:
  - faqat `Shifoxonalar`
  - faqat `Konsultatsiyalar`
- [x] Eski online consultation route/menu itemlar ko'rinmasin

## NC044 — Eski sahifalarni uzish

- [x] Quyidagi eski sahifalar route/import/menu oqimidan uzilsin yoki archived qilinsin:
  - `MyConsultantsPage`
  - `IncomingConsultationsPage`
  - `MySchedulePage`
  - `ConsultationWorkPage`
  - eski `ConsultationDetailPage`
  - eski `ConsultationListPage`

## NC045 — Status va i18n

- [x] Status label:
  - `created` = Yaratildi
  - `reviewing` = Ko'rib chiqilmoqda
  - `rejected` = Rad etildi
  - `completed` = Ko'rib chiqildi
- [x] `treatment` label = Davolash yo'riqnomasi
- [x] Uz/Ru/En locale kalitlari to'liq bo'lsin

## NC046 — Badge refresh sinxronizatsiya

- [x] CRUD actionlardan keyin badge count qayta fetch qilinsin:
  - taklif yuborish
  - taklif qabul/rad
  - konsultatsiya yaratish
  - konsultatsiya qabul/rad
  - xulosa saqlash
- [x] SignalR eventlar ham xuddi shu count fieldlarini yangilasin

## NC047 — Browser QA

- [x] Quyidagi sahifalar browserda runtime xatosiz ochilishi tekshirilsin:
  - `/consultants`
  - `/consultants/add`
  - `/consultants/:id/history`
  - `/consultations`
  - `/consultations/create`
  - `/consultations/:id`
  - `/doctor/clinics`
  - `/doctor/clinics/:id/history`
  - `/doctor/consultations`
  - `/doctor/consultations/:id`

## NC048 — Build

- [x] `dotnet build backend/EkgAnalyzerApi/EkgAnalyzerApi.csproj`
- [x] `npm.cmd run build` frontend
- [x] Yangi compile/runtime error bo'lmasin
