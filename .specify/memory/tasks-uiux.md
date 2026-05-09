# Tasks: NMED AI — UI/UX va PDF Polish

**Yangilandi**: 2026-04-25  
**Loyiha**: `D:\git\ekg_tahlili_app`

---

## Yakunlangan bloklar

- [x] T042–T051 Phase 11 (Analizlar pariteti)
- [x] T052–T056 Phase 12 (EKG UI/PDF pariteti va view polish)

---

## Phase 13: View + PDF Qo‘shimcha Polish

**Maqsad**: View header action qismini tizim dizayniga moslash, PDF o‘qilishini yaxshilash, Parazitologiya AI blokini chiroyli chiqarish, va backend buildni toza holatga keltirish.

- [x] T057 [P1] `.NET` backend build xatolarini bartaraf etish (`backend/EkgAnalyzerApi`) va buildni yashil holatga keltirish
- [x] T058 [P1] `/view` sahifalardagi `.analysis-view-actions` dizaynini tizimga mos, chiroyli va aniq ko‘rinishga keltirish
- [x] T059 [P1] PDF font weightlarni yengillashtirish (qalin matnlarni o‘qilishi osonroq, ingichka stilga o‘tkazish)
- [x] T060 [P1] Parazitologiya PDF `SUN'IY INTELLEKT TAHLILI XULOSASI` blokida JSON fallback holatini structured ko‘rinishda chiqarish (raw JSON ko‘rinmasin)
- [x] T061 [P1] PDF header (logotiplar chiqadigan qism) dizaynini yaxshilash va klinika telefon raqamlarini aniq chiqarishni mustahkamlash
- [x] T062 [P1] Frontend+Backend build tekshiruvlarini qayta ishga tushirish va natijalarni validatsiya qilish

---

## Phase 14: View Actions + Responsive + Sidebar Memory

**Maqsad**: View sahifalardagi action panelni aniq joylashuvga keltirish, EKG PDF source image chiqishini mustahkamlash, platforma responsive qoidalarini to‘liq berish, desktop sidebar holatini localStorage’da saqlash va agent memory faylini tayyorlash.

- [x] T063 [P1] `analysis-view-actions` ichidagi tugma/elementlar joylashuvi va ko‘rinishini yaxshilash (desktop/tablet/mobile)
- [x] T064 [P1] EKG PDF: AI ga yuborilgan fayl image bo‘lsa albatta rasm preview chiqarishni mustahkamlash
- [x] T065 [P1] Global responsive media qoidalarini to‘liq yozish (desktop/tablet/mobile) va layout elementlar uchun tizimli breakpoints
- [x] T066 [P1] Desktop typography audit: asosiy yozuv o‘lchamlarini o‘qilishi yaxshi variantga keltirish
- [x] T067 [P1] Sidebar ochiq/yopiq holatini localStorage’da saqlash va user qayta kirganda desktop’da shu holatni tiklash
- [x] T068 [P2] Assistant uchun project quick-memory faylini yaratish (modullar, yo‘llar, muhim konventsiyalar)
- [x] T069 [P1] Frontend/backend build tekshiruvlari va task statuslarini yangilash

---

## Phase 15: Parasitology AI — OpenAI → Anthropic Claude Migration

**Maqsad**: `parasitology_api.py` ni OpenAI GPT-4o dan Anthropic Claude Vision API ga o'tkazish. DB struktura, endpoint, request/response formati o'zgarishsiz.

- [x] T070 [P1] `parasitology_api.py`: `from openai import OpenAI` → `import anthropic`; `from config import ANTHROPIC_API_KEY`
- [x] T071 [P1] `config.py`: `ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")` qo'shish (OPENAI saqlanadi — boshqa modullar uchun)
- [x] T072 [P1] API key tekshiruvi: `OPENAI_API_KEY` → `ANTHROPIC_API_KEY`
- [x] T073 [P1] `data_url` o'chirildi — Anthropic base64 to'g'ridan-to'g'ri qabul qiladi
- [x] T074 [P1] `SYSTEM_PROMPT` modul darajasida konstanta sifatida ajratildi (system_content + morfologik etalon birlashtirildi); `_build_prompt` faqat bemor ma'lumotlari + JSON sxema qaytaradi
- [x] T075 [P1] API chaqiruv bloki: `client.messages.create(model="claude-sonnet-4-20250514", system=SYSTEM_PROMPT, ...)` + `resp.content[0].text`
- [x] T076 [P1] JSON parse: `re.search(r'\{[\s\S]*\}', raw)` — Anthropic response_format kafolatlamagani uchun regex fallback
- [x] T077 [P1] `requirements.txt`: `anthropic>=0.40.0` qo'shildi; `.env.example`: `ANTHROPIC_API_KEY=sk-ant-...` qo'shildi

---

## Phase 16: Parasitology AI — 2 bosqichli tahlil arxitekturasi (OpenAI)

**Maqsad**: `parasitology_api.py` ni Anthropic → OpenAI ga qaytarish va 2 bosqichli (vision + reasoning) arxitekturasiga o'tkazish. Endpoint, request/response, DB o'zgarishsiz.

- [x] T078 [P1] `VISION_SYSTEM_PROMPT`, `ANALYSIS_SYSTEM_PROMPT`, `JSON_SCHEMA` konstantalarini fayl boshiga ajratish
- [x] T079 [P1] `_build_prompt()`: `{vision_result}` placeholder + `{JSON_SCHEMA}` embed; `.format()` bilan to'ldiriladi
- [x] T080 [P1] `_describe_image(client, img_b64, mime)`: 1-bosqich — rasm tasvirlash, tashxis yo'q (gpt-4o vision)
- [x] T081 [P1] `_analyze_description(client, vision_text, ...)`: 2-bosqich — vision natija + morfologik etalon asosida tashxis (gpt-4o text-only)
- [x] T082 [P1] `analyze_parasitology()` endpoint: `_describe_image` → `vision_text` tekshirish → `_analyze_description` → parse
- [x] T083 [P1] Import va API key: `anthropic` → `from openai import OpenAI`; `ANTHROPIC_API_KEY` → `OPENAI_API_KEY`

---

## Phase 17: Parasitology AI — 2-bosqichli arxitektura OpenAI → Anthropic Claude

**Maqsad**: `parasitology_api.py` ni OpenAI dan Anthropic Claude ga o'tkazish. 2 bosqichli arxitektura saqlanadi. Endpoint, request/response, DB o'zgarishsiz.

- [x] T084 [P1] Import: `from openai import OpenAI` → `import anthropic`; `OPENAI_API_KEY` → `ANTHROPIC_API_KEY`
- [x] T085 [P1] API key tekshiruvi: `OPENAI_API_KEY` → `ANTHROPIC_API_KEY`
- [x] T086 [P1] `_describe_image()`: `OpenAI` → `anthropic.Anthropic`; `client.chat.completions.create` → `client.messages.create`; `model="claude-sonnet-4-20250514"`; Anthropic image source format
- [x] T087 [P1] `_analyze_description()`: `OpenAI` → `anthropic.Anthropic`; `client.messages.create`; `model="claude-sonnet-4-20250514"`; `response_format`/`temperature`/`seed` olib tashlandi
- [x] T088 [P1] `analyze_parasitology()`: `OpenAI(api_key=OPENAI_API_KEY)` → `anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)`
- [x] T089 [P1] JSON parse: `re.search(r'\{[\s\S]*\}', raw)` — Claude response_format kafolatlamagani uchun (mavjud kod saqlanadi)

---

## Phase 18: Parasitology AI — Variant C (GPT-4o Vision + Claude Text)

**Maqsad**: Gibrid arxitektura — 1-bosqich GPT-4o Vision (rasm tavsifi), 2-bosqich Claude Text (morfologik tashxis). Endpoint, response, DB o'zgarishsiz.

- [x] T090 [P1] Import qo'shish: `from openai import OpenAI`; `from config import OPENAI_API_KEY` (anthropic saqlanadi)
- [x] T091 [P1] API key tekshiruvi: `OPENAI_API_KEY` tekshiruvi qo'shildi (ANTHROPIC tekshiruvi saqlanadi)
- [x] T092 [P1] `_describe_image(img_b64, mime)`: client parametri olib tashlandi — ichida `OpenAI(api_key=OPENAI_API_KEY)` yaratiladi; `gpt-4o` vision call
- [x] T093 [P1] `analyze_parasitology()`: `_describe_image(img_b64, mime)` chaqiruvi (client yo'q); `claude_client = anthropic.Anthropic(...)` yaratildi; `_analyze_description(claude_client, ...)` chaqiruvi

---

## Phase 19: Parasitology AI — To'g'ridan-to'g'ri GPT-4o tahlili (Single-stage)

**Maqsad**: 2-bosqichli pipeline (GPT-4o + Claude) ni olib tashlab, bitta GPT-4o call bilan to'g'ridan-to'g'ri JSON analiz. Kuchaytirish: har doim aniq tur, lotin_nomi majburiy, ishonch_darajasi min 0.40.

- [x] T094 [P1] `_describe_image`, `_analyze_description` o'chirildi; `_analyze_image_direct(client, img_b64, mime, ...)` yaratildi — GPT-4o to'g'ridan-to'g'ri JSON
- [x] T095 [P1] `anthropic` import va `ANTHROPIC_API_KEY` to'liq olib tashlandi
- [x] T096 [P1] System prompt yangilandi: majburiy lotin_nomi, "aniq emas" man etilgan, ishonch_darajasi min 0.40, Echinococcus/Toxocara taqiqi
- [x] T097 [P1] `response_format=json_object`, `temperature=0.1`, `max_tokens=2000` OpenAI parametrlari
- [x] T098 [P1] `rasm_sifati` tekshiruvi: `== "past"` → `in ["past", "yomon"]`
- [x] T099 [P2] Bonus logging: JSON parse xatosi, bo'sh `lotin_nomi`, `ishonch_darajasi == 0`

---

## Phase 20: Tahlil sahifalarida "shifokor yo'q" ogohlantiruvi

**Maqsad**: Admin yangi ro'yxatdan o'tganda tizimda hech qanday shifokor bo'lmaydi. Tahlil yuklash formalarida davolovchi shifokor tanlash majburiy bo'lgani uchun admin nima qilish kerakligini bilmay qoladi. EKG, Lab, Holter, SMAD tahlil sahifalarida shifokorlar ro'yxati bo'sh bo'lganda foydalanuvchiga aniq ogohlantirish ko'rsatish.

**Yechim**: `useDoctorPositions` hook ma'lumot yuklangandan keyin `doctorDatas.length === 0` bo'lsa Ant Design `Alert` (type="warning") chiqarish — "Xodimlarni boshqarish" tugmasi bilan `/doctor` sahifasiga yo'naltirish.

- [x] T100 [P1] `useDoctorPositions.js`: `doctorsLoaded` state qo'shildi — API javob kelgandan keyin `true` bo'ladi, sahifa render paytida yolg'on ogohlantirish ko'rsatmaslik uchun
- [x] T101 [P1] `EcgAnalyzer.js`: `Alert` + `useNavigate` import qo'shildi, `doctorsLoaded && doctorDatas.length === 0` holda ogohlantirish chiqariladi
- [x] T102 [P1] `LabAnalyzer.js`: bir xil o'zgarish
- [x] T103 [P1] `HolterAnalyzer.js`: bir xil o'zgarish
- [x] T104 [P1] `SmadAnalyzer.js`: bir xil o'zgarish
- [x] T105 [P1] `Uz.json` / `Ru.json` / `En.json`: `no_doctors_alert_title`, `no_doctors_alert_desc`, `go_to_staff` kalitlari qo'shildi

**Eslatma**: Parazitologiya sahifasiga qo'shilmadi (sidebar ham, alert ham) — modul hali to'liq tayyor emas.
