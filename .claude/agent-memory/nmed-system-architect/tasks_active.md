---
name: Faol Vazifalar Ro'yxati
description: 2026-04-25 da boshlangan va hali tugallanmagan vazifalar
type: project
---

# Faol Vazifalar — 2026-04-25

**Why:** Foydalanuvchi bir suhbatda bir nechta muhim o'zgarishni so'radi. Tartibli bajarish uchun bu ro'yxat saqlanadi.

## TASK 1 ✅ — Parazitologiya AI `{"raw":""}` muammosi + Prompt kuchaytirish
**Fayl:** `python_back/parasitology_api.py`
**Sabab:** `resp.choices[0].message.content` ba'zan `None` qaytaradi (model refusal yoki policy), 
  → `raw = ""` → `json.loads("")` xato → `{"raw": ""}` fallback.
**Fix:**
- `temperature=0, seed=42` qo'shish (deterministik natija)
- Bo'sh/None content ni oldin tekshirib, early error return
- Prompt kuchaytirish: konkret morfologik belgilar, o'lchov diapazoni, taqqoslash algoritmi
**Status:** BAJARILDI

## TASK 2 ✅ — PDF Hujjat Raqamlari bazaga saqlash
**Jadvallar:** ecg_analyses, smad_analyses, holter_analyses, lab_analyses, parasitology_analyses
**Ustun:** `document_number TEXT UNIQUE NOT NULL`
**Format:** `NMED-{PREFIX}-{ID:D8}` (masalan: `NMED-EKG-00000042`)
**O'zgarishlar:** Migration + Model + Service (create paytida generate) + PdfReportService (bazadan olish)
**Status:** BAJARILDI

## TASK 3 ✅ — PDF da Region va District
**Muammo:** Header'da faqat klinika nomi, manzil, tel ko'rsatilmoqda; region/district yo'q
**Fix:** `ClinicDetail → District → Region` include chain yangilash; ComposeHeader'da region+district chiqarish
**Status:** BAJARILDI

## TASK 4 ✅ — Klinika `is_active` statusi + Admin Onboarding oqimi
**Qadamlar:**
- Backend: `clinics.is_active BOOLEAN DEFAULT FALSE` (migration)
- Backend: Admin bo'lmagan xodimlar login'da `clinic.is_active=false` bo'lsa bloklash
- Backend: `GET /user/get-user-by-token` → `clinic.isActive` qaytarish
- Backend: Admin profil to'ldirishni tekshirish endpoint (`GET /user/profile-status`)
- Frontend: `SetupWizard.js` — admin uchun 2 bosqichli onboarding (profil → klinika)
- Frontend: `Main.js` → wizard check; sahifalar ko'rinadi lekin `is_active=false` overlay
- Frontend: Non-admin login'da klinika faolmas bo'lsa xabar bilan chiqarish
**Status:** BAJARILDI

## TASK 5 ✅ — SideBar qulf belgisi (klinika faollashtrilmagan holatda)
**Fayllar:** `frontend/src/components/SideBar.js`, `frontend/src/tools/routes.js`, `frontend/src/App.css`
**Natija:**
- `routes.js` ga `requires_active: true/false` maydoni qo'shildi
- `SideBar.js` — `clinicIsActive` hisoblanadi; `requires_active=true` route'larda
  lock icon (`FaLock`) va tooltip ko'rsatiladi, `locked_sidebar_item` CSS class qo'shiladi
- `App.css` — `.locked_sidebar_item { opacity: 0.55 }` va icon/title greyout
- Klinika aktiv bo'lganda — hamma narsa odatdagidek ishlaydi
**Status:** BAJARILDI

## TASK 6 ✅ — SuperAdmin klinika aktivlashtirish endpoint
**Fayllar:** `backend/.../Services/ClinicService.cs`, `backend/.../Controllers/ClinicController.cs`, `frontend/.../requests/ClinicRequest.js`
**Natija:**
- `PATCH /api/clinic/{id}/set-active?isActive=true` endpoint (faqat roleId=1 uchun)
- `ClinicService.SetClinicActiveAsync(int clinicId, bool isActive)` metodi
- Frontend: `set_clinic_active(clinicId, isActive)` request funksiyasi
**Status:** BAJARILDI

## How to apply
Har vazifa bajarilganda `Status: BAJARILDI` deb belgilash.
