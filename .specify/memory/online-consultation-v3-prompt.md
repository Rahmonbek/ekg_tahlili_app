# Online Konsultant V3 — AI Uchun To'liq Prompt

Sen NMED tibbiy tahlil platformasidagi Online Konsultant modulini soddalashtirib, hozirgi murakkab va tushunarsiz oqimni juda qulay, aniq va kam bosqichli oqimga almashtirishing kerak. Maqsad: klinika admini boshqa klinikalardagi shifokorlarni online konsultant sifatida taklif qiladi, qabul qilgan konsultantlarga bemor konsultatsiyasini yuboradi, shifokor qabul/rad qiladi, bemor tahlillarini ko'radi, video qo'ng'iroq qiladi va xulosa yozadi.

## Asosiy UX tamoyili

Modulda ortiqcha menyu, ortiqcha jarayon, marketing bloklari, izohli kartalar va foydalanuvchini chalg'itadigan ko'p qadamli oqimlar bo'lmasin. Admin uchun faqat 2 asosiy menu sahifa bo'ladi:

1. Konsultantlar
2. Konsultatsiyalar

Shifokor kabinetida ham faqat 2 asosiy menu sahifa bo'ladi:

1. Shifoxonalar
2. Konsultatsiyalar

Har bir sahifa platformaning mavjud admin panel UI uslubiga mos bo'lishi kerak: Ant Design, ixcham tablelar, toolbar, filterlar, modal oynalar, icon-only action buttonlar, aniq status badge'lar. Foydalanuvchi nima qilishini ko'z bilan darhol tushunsin.

## Admin: Konsultantlar sahifasi

Route: `/consultants`

Sahifa yuqori qismida:
- Sarlavha: "Konsultantlar"
- Primary button: "Konsultant qo'shish"
- Button `/consultants/add` sahifasiga olib o'tadi.

Sahifada 2 ta table bo'ladi.

### 1-table: Biriktirilgan konsultantlar

Faqat taklifni qabul qilgan va klinikaga active konsultant sifatida biriktirilgan shifokorlar chiqadi.

Ustunlar:
- F.I.SH
- Lavozim / position
- Telefon raqam
- Konsultatsiyalar soni
- Konsultatsiya narxi
- Narx o'zgartirish
- Tarix

"Narx o'zgartirish" tugmasi icon bilan bo'ladi. Bosilganda modal ochiladi:
- Yangi narx, `min=0`
- Kuchga kirish sanasi, `min=today`
- Saqlash tugmasi

Saqlangandan keyin:
- `ConsultantPriceHistory` ga yozuv qo'shiladi
- `ClinicConsultant.CurrentPrice` yangilanadi
- Shu sanadan keyingi konsultatsiyalar yangi narxda hisoblanadi
- Eski konsultatsiyalar narxi o'zgarmaydi

"Tarix" tugmasi eye icon bilan bo'ladi. Bosilganda `/consultants/:clinicConsultantId/history` sahifasiga o'tadi.

### 2-table: Yuborilgan takliflar

Admin yuborgan konsultantlik takliflari ko'rinadi.

Ustunlar:
- F.I.SH
- Klinika
- Lavozim
- Narx
- Yuborilgan sana
- Status: pending, accepted, rejected
- Javob berilgan sana

Status ranglari:
- pending: sariq
- accepted: yashil
- rejected: qizil

Bu table active konsultantlar table bilan aralashmasin. Pending takliflar `getMyConsultants()` dan emas, alohida `GET /api/consultation/my-sent-invitations` endpointidan olinadi.

## Admin: Konsultant qo'shish sahifasi

Route: `/consultants/add`

Bu sahifada shifokorni filter orqali qidirish bo'ladi. Kamida bitta filter kiritilishi shart.

Filterlar:
- Passport seriya yoki F.I.SH qidiruv inputi
- Telefon raqam inputi
- Viloyat select
- Tuman select
- Klinika select
- Qidirish tugmasi

Qidiruv natijasi tableda chiqadi. Faqat quyidagi shifokorlar qaytsin:
- `User.RoleId == 4`
- shu admin klinikasiga hali active konsultant sifatida qo'shilmagan
- pending taklif yuborilgan bo'lsa natijadan yashiriladi
- admin/direktor/hamshira/superadmin chiqmasin

Natija ustunlari:
- Klinika nomi
- F.I.SH
- Lavozim
- Telefon raqam
- Amal

Amal: "Taklif yuborish" tugmasi. Bosilganda modal ochiladi:
- Konsultatsiya narxi, so'mda, `min=0`
- Yuborish tugmasi

Yuborilganda `ConsultantInvitation` yaratiladi:
- `clinic_id`
- `doctor_id`
- `price_per_session`
- `status = pending`
- `invited_at`

Taklif yuborilgandan so'ng table row action disabled yoki "Taklif yuborildi" holatiga o'tadi.

## Admin: Konsultant tarixi sahifasi

Route: `/consultants/:clinicConsultantId/history`

Sahifada filterlar:
- Bemor ismi bo'yicha qidirish
- Sana dan
- Sana gacha

Table ustunlari:
- Bemor F.I.SH
- Konsultatsiya sanasi
- Narx
- Holat
- Xulosa bor/yo'q

Table tepasida yoki pastida filter natijasidagi barcha konsultatsiyalarning umumiy summasi ko'rinsin.

## Admin: Konsultatsiyalar sahifasi

Route: `/consultations`

Sahifa yuqori qismida:
- Sarlavha: "Konsultatsiyalar"
- Primary button: "Konsultatsiya yaratish"
- Button `/consultations/create` sahifasiga olib o'tadi.

Table ustunlari:
- Bemor F.I.SH
- Konsultant F.I.SH
- Konsultatsiya narxi
- Sana
- Yaratildi
- Holati
- Batafsil

Statuslar:
- `created` -> "Yaratildi"
- `reviewing` -> "Ko'rib chiqilmoqda"
- `rejected` -> "Rad etildi"
- `completed` -> "Ko'rib chiqildi"

Batafsil tugmasi eye icon bilan bo'ladi va `/consultations/:id` sahifasiga o'tadi.

## Admin: Konsultatsiya yaratish sahifasi

Route: `/consultations/create`

Oqim 3 oddiy qismdan iborat bo'ladi:

1. Bemorni topish yoki yaratish
2. Konsultantlarni tanlash
3. Konsultatsiya sanasini tanlash

### 1-qism: Bemorni topish yoki yaratish

Avval passport seriya va tug'ilgan sana inputlari ko'rinadi. Qidirish tugmasi bosiladi.

Agar bemor bazada topilsa:
- F.I.SH
- tug'ilgan sana
- jins
- telefon
- manzil
inputlarda to'ldirilgan holda ko'rsatiladi.

Agar topilmasa:
- shu inputlar bo'sh ko'rinadi va admin yangi bemor ma'lumotlarini kiritadi.

Bu logika EKG/SMAD/Holter tahlil kiritish sahifalaridagi mavjud bemor qidirish komponenti yoki patternidan olinishi kerak. Passport AES bilan shifrlangani sababli backend qidiruvi mavjud in-memory decrypt patterniga mos bo'lishi kerak.

### 2-qism: Konsultantlarni tanlash

Admin klinikasiga active konsultant sifatida qo'shilgan shifokorlar ro'yxati checkbox bilan chiqadi.

Har bir row:
- checkbox
- F.I.SH
- lavozim
- telefon
- joriy narx

Bir vaqtda bir nechta konsultant tanlash mumkin. Kamida bitta konsultant tanlash majburiy.

### 3-qism: Sana tanlash

Konsultatsiya sanasi:
- `min=today`
- `max=today + 1 month`
- majburiy

Saqlash bosilganda tanlangan har bir konsultant uchun alohida `Consultation` yaratiladi. Har bir konsultatsiyaning narxi konsultatsiya sanasiga qarab hisoblanadi:
- `ConsultantPriceHistory.EffectiveFrom <= ConsultationDate` bo'lgan eng oxirgi narx olinadi
- bo'lmasa `ClinicConsultant.CurrentPrice` olinadi
- qiymat `Consultation.PriceAtCreation` ga yoziladi

## Admin: Konsultatsiya batafsil sahifasi

Route: `/consultations/:id`

Sahifada quyidagilar bo'ladi:
- Konsultatsiyaning to'liq ma'lumotlari
- Bemorning to'liq ma'lumotlari, admin uchun passport ham ko'rinadi
- Konsultant shifokor ma'lumotlari
- Konsultant shifokorning real-time online/offline holati
- Online bo'lsa video qo'ng'iroq qilish imkoniyati
- Konsultant xulosasi
- Bemorning tizimdagi barcha tahlillari ro'yxati

Video qo'ng'iroq:
- Button bosilganda alohida modalda token ko'rsatish emas
- Shu sahifaning eng yuqori qismida full-width video blok ochiladi
- Video blok katta, lekin sahifadan chiqib ketmaydi
- Tugmalar faqat iconlardan iborat:
  - qo'ng'iroqni tugatish
  - mikrofon on/off
  - kamera on/off
  - ekran demonstratsiyasi
  - kamera almashtirish, faqat qurilmada 2+ kamera bo'lsa

Tahlillar:
- Bemorning EKG, SMAD, Holter, Lab, Parazitologiya tahlillari ko'rinsin
- Har bir tahlil shu sahifaning o'zida ochilib ko'rilsin
- Rasm/fayl/AI natija ko'rinishi mavjud tahlil viewer komponentlaridan qayta foydalanilsin
- Doktor sahifasida passport ko'rinmasin, admin sahifasida ko'rinishi mumkin

## Shifokor: Shifoxonalar sahifasi

Route: `/doctor/clinics`

2 table bo'ladi.

### 1-table: Takliflar

Konsultantlikka yuborilgan takliflar ko'rinadi.

Ustunlar:
- Klinika
- Narx
- Yuborilgan sana
- Amal

Pending takliflarda:
- Qabul qilish
- Rad qilish

Qabul qilinsa:
- `ConsultantInvitation.Status = accepted`
- `ClinicConsultant` yaratiladi yoki active qilinadi
- row pending listdan ketadi yoki accepted badge bilan ko'rinadi

Rad qilinsa:
- `ConsultantInvitation.Status = rejected`
- accepted listga qo'shilmaydi
- admin yuborgan takliflar sahifasida rejected status ko'rinadi

### 2-table: Biriktirilgan klinikalar

Ustunlar:
- Klinika nomi
- Biriktirilgan sana
- Jami konsultatsiyalar
- Joriy narx
- Tarix

Tarix tugmasi `/doctor/clinics/:clinicConsultantId/history` sahifasiga o'tadi.

## Shifokor: Klinika tarixi sahifasi

Route: `/doctor/clinics/:clinicConsultantId/history`

Table:
- Bemor
- Konsultatsiya sanasi
- Narx
- Holat

Filter:
- Bemor ismi
- Sana dan
- Sana gacha

## Shifokor: Konsultatsiyalar sahifasi

Route: `/doctor/consultations`

Shifokorga yuborilgan konsultatsiyalar tableda chiqadi. `created` statusdagilar birinchi turadi.

Ustunlar:
- Bemor F.I.SH
- Klinika
- Narx
- Konsultatsiya sanasi
- Yaratilgan sana
- Holat
- Amal

Created konsultatsiyalarda:
- Qabul qilish
- Rad qilish

Qabul qilinsa status `reviewing` bo'ladi.
Rad qilinsa status `rejected`, sabab majburiy.

Batafsil tugmasi eye icon bilan `/doctor/consultations/:id` sahifasiga o'tadi.

## Shifokor: Konsultatsiya batafsil sahifasi

Route: `/doctor/consultations/:id`

Admin sahifasiga o'xshaydi, lekin farqlar:
- Konsultant ma'lumoti o'rniga konsultatsiyani yuborgan admin/klinika ma'lumoti ko'rinadi
- Passport ko'rinmaydi
- Admin online/offline real-time ko'rinadi
- Admin bilan video qo'ng'iroq qilish mumkin
- Xulosa kiritish componenti bo'ladi

Xulosa form:
- Bemor holati: good / moderate / bad
- Tashxis textarea
- Davolash yo'riqnomasi textarea
- Saqlash tugmasi

Xulosa saqlanganda:
- `ConsultationConclusion` insert/update bo'ladi
- birinchi saqlashda `Consultation.Status = completed`
- xulosa saqlangandan keyin ham video qo'ng'iroq qilish mumkin

## Backend talablar

Route: `/api/consultation`

Kerakli endpointlar:
- `GET /search-doctors`
- `POST /invite`
- `GET /my-sent-invitations`
- `GET /my-consultants`
- `PUT /consultants/{id}/update-price`
- `GET /consultants/{id}/history`
- `POST /create`
- `GET /list`
- `GET /{id}/detail`
- `GET /{id}/livekit-token`
- `GET /invitations`
- `PUT /invitations/{id}/accept`
- `PUT /invitations/{id}/reject`
- `GET /my-clinics`
- `GET /my-clinics/{id}/history`
- `GET /my-consultations`
- `PUT /{id}/accept`
- `PUT /{id}/reject`
- `GET /{id}/doctor-detail`
- `POST /{id}/conclude`
- `GET /{id}/livekit-token-doctor`
- `GET /badge-counts`
- `GET /api/user/{userId}/online-status`

## Realtime talablar

SignalR `ConsultationHub` orqali:
- `NewInvitation`
- `NewConsultation`
- `ConsultationReviewing`
- `ConsultationRejected`
- `ConsultationCompleted`
- online/offline status refresh

Sidebar badge:
- Admin konsultatsiyalar menu badge: `created` konsultatsiyalar soni
- Shifokor shifoxonalar menu badge: pending invitation soni
- Shifokor konsultatsiyalar menu badge: created konsultatsiyalar soni

## Qat'iy cheklovlar

- Frontend Python API ga bevosita chiqmasin; hamma so'rov .NET API orqali bo'lsin
- RoleId 4 bo'lmagan user konsultant qidiruv natijasida chiqmasin
- Admin o'z klinikasiga allaqachon qo'shilgan active/pending shifokorni qayta taklif qila olmasin
- Shifokor passport ma'lumotini ko'rmasin
- Narx tarixiy bo'lishi shart: eski konsultatsiya narxi keyinchalik o'zgarmasin
- UI oddiy bo'lsin: ortiqcha dashboard kartalari, flow explainers, marketing matnlari bo'lmasin
- Video token modalda ko'rsatilmasin; real video component sahifaning o'zida chiqsin
- Tugmalar icon-only bo'lsin, hover tooltip bilan
- Bo'sh catch blok bo'lmasin, backendda `ILogger` bilan log qilinsin

## Yakuniy qabul mezonlari

1. Admin 3 daqiqadan kam vaqt ichida konsultant qidirib taklif yubora oladi.
2. Shifokor kelgan taklifni 1 sahifada qabul/rad qila oladi.
3. Admin konsultatsiyani yaratishda bemorni topish/yangi kiritish, bir nechta konsultant tanlash va sanani tanlashni bitta sodda sahifada bajaradi.
4. Admin va shifokor konsultatsiya batafsil sahifasida barcha muhim ma'lumotlarni bitta joyda ko'radi.
5. Xulosa saqlangandan keyin ham video qo'ng'iroq qilish tugmasi ishlaydi.
6. Buildlar xatosiz o'tadi: backend `.NET build`, frontend `npm build`.
7. `/consultants`, `/consultants/add`, `/consultations`, `/consultations/create`, `/consultations/:id`, `/doctor/clinics`, `/doctor/consultations`, `/doctor/consultations/:id` sahifalari browserda runtime xatosiz ochiladi.
