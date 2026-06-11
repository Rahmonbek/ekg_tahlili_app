# Video Conference Improvements Tasks

## VC-001 Route Separation
- `/video-conference` faqat konferensiyalar ro'yxati va yaratish formasi bo'lsin.
- `/video-conference/:id` konferensiya o'tkazish/detail sahifasi bo'lsin.
- Ro'yxatdagi `details/start/join` tugmalari id'li route'ga o'tkazsin.

## VC-002 Access Control
- Backend token endpoint faqat konferensiyani yaratgan klinika admini yoki shu konferensiyaga taklif qilingan shifokorga token bersin.
- Konferensiyaga qo'shilmagan user detail/token orqali kira olmasin.

## VC-003 Join/Leave Presence
- Admin ham konferensiya a'zosi sifatida hisoblanadi, lekin faqat hozir ulangan bo'lsa `joined` ko'rsin.
- Shifokor sahifadan chiqsa yoki video oynadan chiqsa status `left` bo'lsin.
- Admin sahifadan chiqsa active admin statusi `left` bo'lsin.
- Joined count faqat hozir `joined` bo'lgan ishtirokchilarni hisoblasin.

## VC-004 Conference UI
- Video ko'rinadigan qism balandligi Zoomga yaqinroq, katta va boshqarishga qulay bo'lsin.
- Admin uchun yakunlash, refresh va join/leave boshqaruvlari aniq joylashsin.
- Default mikrofon mute holatda qolsin.

## VC-005 Patient Analyses Inline Preview
- Pastdagi bemor tahlillari konsultatsiya detail sahifasidek shu joyning o'zida ochilib ko'rilsin.
- Tahlil turi/id bo'yicha mavjud inline result component qayta ishlatilsin.

## VC-006 Verification
- Backend va frontend build tekshirilsin.
- Browserda `/video-conference` va `/video-conference/:id` route ishlashi, layout balandligi va overflow tekshirilsin.
