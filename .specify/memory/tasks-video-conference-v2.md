# Tasks: Video Konferensiya V2

## Maqsad
Klinika admini bemorni passport seriyasi va tug'ilgan sanasi orqali tanlab, bir yoki bir nechta online konsultant shifokorni video konferensiyaga taklif qiladi. Shifokorlar o'z kabinetidagi Video Konferensiya sahifasida konferensiyani ko'radi va qo'shiladi. Konferensiya xonasida video, bemor ma'lumotlari va bemorning barcha tahlillari bir sahifada ko'rinadi.

## Backend
- [x] VC2-001 `VideoConference` modelini yaratish.
- [x] VC2-002 `VideoConferenceParticipant` modelini yaratish.
- [x] VC2-003 `MedDataDB`ga `VideoConferences` va `VideoConferenceParticipants` DbSetlarini qo'shish.
- [x] VC2-004 EF migration: `video_conferences`, `video_conference_participants` jadvallarini yaratish.
- [x] VC2-005 `VideoCallDTO.cs`ga konferensiya request/response DTOlarini qo'shish.
- [x] VC2-006 `VideoCallController`ga admin uchun konferensiya yaratish/list/detail/token/end endpointlarini qo'shish.
- [x] VC2-007 `VideoCallController`ga shifokor uchun list/detail/join token endpointlarini qo'shish.
- [x] VC2-008 Detail javobida bemor ma'lumotlari, tanlangan konsultantlar, status va tahlillar ro'yxatini qaytarish.

## Frontend
- [x] VC2-009 `VideoCallRequest.js`ga konferensiya API funksiyalarini qo'shish.
- [x] VC2-010 `VideoConference.js`ni admin yaratish/list/detail va doctor join workflowga almashtirish.
- [x] VC2-011 Konferensiya xonasida embedded LiveKit + bemor ma'lumotlari + tahlillar panelini ko'rsatish.
- [x] VC2-012 `LiveKitRoom` komponentiga konferensiyada chiqib ketish butun qo'ng'iroqni majburan yakunlamasligi uchun prop qo'shish.
- [x] VC2-013 CSS: responsive, karta/table va video-room layoutlarini platforma uslubiga moslash.
- [x] VC2-014 i18n kalitlarini Uz/En fayllariga qo'shish; Ru faylida mavjud encoding buzilmasligi uchun majburiy rewrite qilinmadi.

## Tekshiruv
- [x] VC2-015 Backend build.
- [x] VC2-016 Frontend build.
- [ ] VC2-017 Browser orqali admin/doctor UI screenshot tekshiruv: build tekshiruvlari o'tdi, ammo joriy localhost serveri direct SPA route fallback bermay `404` qaytardi.
- [x] VC2-018 Konferensiya roomini Zoom uslubidagi barcha foydalanuvchilar video-gridiga o'tkazish.
- [x] VC2-019 Konferensiyaga kirganda mikrofon default mute bo'lishini ta'minlash.
- [x] VC2-020 Screen-share trekini kamera treki o'rniga alohida featured video sifatida ko'rsatish.
- [x] VC2-021 Oddiy konsultatsiya video qo'ng'irog'ida ham remote screen-share ko'rinishini ustuvor qilish.
- [x] VC2-022 Header active call navigatsiyasi konferensiya uchun `/video-conference`ga qaytishini tekshirish.
