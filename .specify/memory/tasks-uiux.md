# Tasks: NMED AI — UI/UX Yaxshilash

**Input**: UI/UX Audit natijasi (2026-04-23)
**Loyiha**: `d:\git\ekg_tahlili_app\frontend\src\`
**Maqsad**: Audit hisobotidagi barcha muammolarni ustuvorlik bo'yicha bartaraf etish

## Format: `[ID] [P?] [Story] Tavsif`

- **[P]**: Parallel bajarish mumkin (turli fayllar, bog'liqlik yo'q)
- **[Story]**: Qaysi UI/UX user story ga tegishli

---

## Phase 1: Setup

**Maqsad**: Mavjud kod bazasini o'rganish va muhitni tayyorlash

- [x] T001 Mavjud CSS o'zgaruvchilarni va komponent strukturasini o'rganish
- [x] T002 UI/UX audit hisobotini tayyorlash va ustuvorlik matritsasini tuzish

---

## Phase 2: Foundational — Global CSS Tuzatishlar

**Maqsad**: Barcha sahifalarni qamrab oladigan asosiy CSS muammolarini tuzatish

**⚠️ KRITIK**: Bu phase tugamasdan keyingi user storylar boshlansa global muammolar saqlanib qoladi

- [ ] T003 `outline: none` global resetni olib tashlash va `:focus-visible` qo'shish `frontend/src/App.css` (WCAG 2.4.7)
- [ ] T004 Form validation xatolari ko'rinishini tiklash — `.ant-form-item-explain-error { display: none }` ni olib tashlash `frontend/src/App.css`
- [ ] T005 Majburiy maydon ko'rsatkichlarini tiklash — `::before` va `::after` yashirishni bekor qilish `frontend/src/App.css`
- [ ] T006 [P] `vw` asosidagi padding o'zgaruvchilarini `px` qiymatlarga almashtirish `frontend/src/App.css`
- [ ] T007 [P] Jadval sarlavhasi rangini teal gradientdan yengil kulrang ga almashtirish `frontend/src/App.css`

**Checkpoint**: Global CSS tuzatishlar tayyor — barcha sahifalar yaxshilangan

---

## Phase 3: US1 — Asosiy Mavjud Muammolarni Tuzatish (Priority: P1) 🎯 MVP

**Maqsad**: Eng kritik funksional va accessibility muammolarni bartaraf etish

**Independent Test**: Har bir input ga tab bosib focus ko'rinishini tekshirish; forma yuborishda inline xato xabarlarini ko'rish

### Implementation for User Story 1

- [ ] T008 [US1] EKG rasm paddingini tuzatish: `padding: 0px 30%` → `max-width: 800px; margin: auto` `frontend/src/App.css`
- [ ] T009 [US1] `EcgResult.js` dagi emoji (✅⚠️❌⭐) larni Ant Design `<Tag>` komponentlari bilan almashtirish `frontend/src/components/results/EcgResult.js`
- [ ] T010 [US1] `EcgResult.js` dagi hard-coded o'zbek matni i18n ga ko'chirish `frontend/src/components/results/EcgResult.js`
- [ ] T011 [US1] `EcgAnalyzer.js` dagi `alert()` chaqiruvini `dangerAlert()` ga almashtirish `frontend/src/pages/cabinet/ecg_analyse/EcgAnalyzer.js`
- [ ] T012 [P] [US1] Console.log larni production fayllardan olib tashlash (App.js, ClinicInfo.js)
- [ ] T013 [P] [US1] `ClinicInfo.js` dagi takroriy `sm={24}` prop xatolarini tuzatish `frontend/src/pages/cabinet/pages/ClinicInfo.js`

**Checkpoint**: Kritik muammolar bartaraf etildi — accessibility va funksional sifat yaxshilandi

---

## Phase 4: US2 — Sidebar va Navigatsiya Dizayni (Priority: P1)

**Maqsad**: Sidebar ko'rinishi va foydalanuvchi orientatsiyasini yaxshilash

**Independent Test**: Sidebar ko'rsatgandagi aktiv element aniq ko'rinishi; yopilganda icon-only rejim

### Implementation for User Story 2

- [ ] T014 [US2] Sidebar kengligini 350px → 260px ga kamaytirish `frontend/src/App.css`
- [ ] T015 [US2] Sidebarga oq fon va o'ng chegara qo'shish `frontend/src/App.css`
- [ ] T016 [US2] Aktiv bo'lmagan sidebar elementi kontrastini oshirish: `#A0AEC0` → `#64748B` `frontend/src/App.css`
- [ ] T017 [US2] Aktiv sidebar elementi stilini yaxshilash: chapdan rang chiziq + yengil teal fon `frontend/src/App.css`
- [ ] T018 [P] [US2] Sidebar icon qutisidagi notifikatsiya badge o'rnini sarlavha o'ngiga ko'chirish `frontend/src/components/SideBar.js`

**Checkpoint**: Sidebar professional ko'rinishga ega, navigatsiya aniq

---

## Phase 5: US3 — Header va Umumiy Layout (Priority: P2)

**Maqsad**: Header vizual ajratish va sahifa sarlavhasini qo'shish

**Independent Test**: Header content dan vizual ajralgan; har bir sahifada sarlavha ko'rinadi

### Implementation for User Story 3

- [ ] T019 [US3] Headerga oq fon, pastki chegara va yengil soya qo'shish `frontend/src/App.css`
- [ ] T020 [US3] `.main_card h1` gradientini yengil stil bilan almashtirish (oq fon, chegara, to'q matn) `frontend/src/App.css`
- [ ] T021 [P] [US3] Login sahifasidagi gradient banner sarlavhani zamonaviy minimalist dizayn bilan almashtirish `frontend/src/App.css`

**Checkpoint**: Header va karta sarlavhalari zamonaviy ko'rinishda

---

## Phase 6: US4 — Analyzer Sahifalar UX (Priority: P2)

**Maqsad**: EKG/Lab/Holter/SMAD tahlil sahifalarida foydalanuvchi tajribasini yaxshilash

**Independent Test**: Fayl yuklash vizual va aniq; AI/save tugmalari farqli ko'rinadi

### Implementation for User Story 4

- [ ] T022 [US4] EkgAnalyzer faylni yuklash qismini Ant Design `Upload.Dragger` ga almashtirish `frontend/src/pages/cabinet/ecg_analyse/EcgAnalyzer.js`
- [ ] T023 [US4] "AI orqali tekshirish" checkbox ni ikkita alohida tugmaga ajratish `frontend/src/pages/cabinet/ecg_analyse/EcgAnalyzer.js`
- [ ] T024 [P] [US4] HolterAnalyzer uchun ham fayl yuklash va tugma UX ni yaxshilash `frontend/src/pages/cabinet/holter_analyse/HolterAnalyzer.js`
- [ ] T025 [P] [US4] SmadAnalyzer uchun ham fayl yuklash va tugma UX ni yaxshilash `frontend/src/pages/cabinet/smad_analyse/SmadAnalyzer.js`
- [ ] T026 [P] [US4] LabAnalyzer uchun ham fayl yuklash va tugma UX ni yaxshilash `frontend/src/pages/cabinet/lab_analyse/LabAnalyzer.js`

**Checkpoint**: Barcha analyzer sahifalar yaxshilangan fayl yuklash va aniq action tugmalariga ega

---

## Phase 7: US5 — Ro'yxat Sahifalar va Jadvallar (Priority: P2)

**Maqsad**: Jadval sahifalarida navigatsiya, filtr va bo'sh holat UX ni yaxshilash

**Independent Test**: Sahifada sarlavha va natija soni ko'rinadi; jadval bo'sh bo'lganda harakatga yo'naltiruvchi xabar ko'rinadi

### Implementation for User Story 5

- [ ] T027 [US5] EcgAnalysesList ga sahifa sarlavhasi va natija soni qo'shish `frontend/src/pages/cabinet/ecg_analyse/EcgAnalysesList.js`
- [ ] T028 [US5] EcgAnalysesList da ko'rilmagan qator uchun alohida ustun o'rniga qator highlight qo'shish `frontend/src/pages/cabinet/ecg_analyse/EcgAnalysesList.js`
- [ ] T029 [US5] EcgAnalysesList ga "Filtrlarni tozalash" tugmasi qo'shish `frontend/src/pages/cabinet/ecg_analyse/EcgAnalysesList.js`
- [ ] T030 [P] [US5] SmadAnalysesList, HolterAnalysesList, LabAnalysesList, DiagnosesList uchun sarlavha va filtr tozalash qo'shish
- [ ] T031 [P] [US5] Barcha ro'yxat sahifalar uchun bo'sh holat (EmptyState) komponenti yaratish `frontend/src/components/shared/EmptyState.js`

**Checkpoint**: Ro'yxat sahifalar sarlavha, bo'sh holat va qulay filtr boshqaruviga ega

---

## Phase 8: US6 — Dashboard Bosh Sahifa (Priority: P3)

**Maqsad**: Tizimga kirgan foydalanuvchi uchun ma'lumotli bosh sahifa yaratish

**Independent Test**: Bosh sahifada bugungi tahlillar soni va oxirgi yozuvlar ko'rinadi

### Implementation for User Story 6

- [ ] T032 [US6] Dashboard komponenti yaratish `frontend/src/pages/cabinet/Dashboard.js`
- [ ] T033 [US6] Statistika kartochkalari komponenti yaratish (bugungi EKG, Lab, Holter, SMAD soni) `frontend/src/components/shared/StatCard.js`
- [ ] T034 [US6] Dashboard ga tez harakat tugmalari qo'shish (Yangi EKG, Yangi Lab, Yangi Diagnoz) `frontend/src/pages/cabinet/Dashboard.js`
- [ ] T035 [US6] Routerni yangilash — default route `/` ni Dashboard ga yo'naltirish `frontend/src/pages/cabinet/Main.js`

**Checkpoint**: Foydalanuvchi tizimga kirganda ma'lumotli bosh sahifani ko'radi

---

## Phase 9: US7 — Natija Ko'rsatish va Export (Priority: P3)

**Maqsad**: Tahlil natijasini chop etish va eksport qilish imkonini berish

**Independent Test**: EKG natija sahifasida "Chop etish" tugmasi ishlaydi

### Implementation for User Story 7

- [ ] T036 [US7] EcgResult ga Print tugmasi qo'shish `frontend/src/components/results/EcgResult.js`
- [ ] T037 [P] [US7] Chop etish uchun print-specific CSS qo'shish `frontend/src/App.css`
- [ ] T038 [P] [US7] Raqamli o'lchovlar uchun tablo ko'rinishi yaxshilash `frontend/src/components/results/EcgResult.js`

**Checkpoint**: Natijalarni chop etish ishlaydi

---

## Phase 10: Polish — Yozuv Xatolari va Tozalash

**Maqsad**: Kod sifati va professional ko'rinishni oshirish

- [ ] T039 [P] ClinicInfo.js dagi `console.log` va debug yozuvlarni tozalash `frontend/src/pages/cabinet/pages/ClinicInfo.js`
- [ ] T040 [P] App.js dagi `console.log(res)` ni olib tashlash `frontend/src/App.js`
- [ ] T041 [P] i18n tarjima fayllariga yangi kalitlar qo'shish (EcgResult uchun)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Bajarildi
- **Phase 2 (Foundational CSS)**: Birinchi bajariladi — barcha sahifalarni qamraydi
- **Phase 3 (US1 Kritik)**: Phase 2 dan keyin — funksional muammolar
- **Phase 4 (US2 Sidebar)**: Phase 2 dan keyin — parallel bajarish mumkin
- **Phase 5 (US3 Header)**: Phase 2 dan keyin — parallel bajarish mumkin
- **Phase 6 (US4 Analyzer)**: Phase 3 dan keyin
- **Phase 7 (US5 Ro'yxat)**: Phase 3 dan keyin
- **Phase 8 (US6 Dashboard)**: Phase 5 dan keyin
- **Phase 9 (US7 Export)**: Phase 3 dan keyin
- **Phase 10 (Polish)**: Istalgan vaqtda parallel

### Parallel Opportunities

```
Phase 2 tugagach bir vaqtda:
├── US1 (Kritik tuzatishlar) — T008-T013
├── US2 (Sidebar)           — T014-T018
└── US3 (Header)            — T019-T021

Phase 3-5 tugagach bir vaqtda:
├── US4 (Analyzer)          — T022-T026
├── US5 (Ro'yxat)           — T027-T031
└── US7 (Export)            — T036-T038
```

---

## Implementation Strategy

### MVP (Birinchi deliverable)

1. Phase 2: Global CSS tuzatishlar ✓
2. Phase 3 US1: Kritik muammolar ✓
3. Phase 4 US2: Sidebar ✓
4. **Validate**: Vizual ko'rinish va accessibility tekshirish
5. Deploy

### Incremental Delivery

1. Phase 2 + US1 → Accessibility va funksional muammolar bartaraf etildi
2. US2 + US3 → Sidebar va header zamonaviy ko'rinishda
3. US4 + US5 → Analyzer va ro'yxat sahifalar yaxshilandi
4. US6 → Dashboard bosh sahifa
5. US7 + Polish → Export va tozalash

---

**Yaratildi**: 2026-04-23 | **Manbai**: UI/UX Audit Hisoboti
