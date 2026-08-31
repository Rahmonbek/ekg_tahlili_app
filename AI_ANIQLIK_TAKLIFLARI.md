# AI tahlil aniqligini oshirish — takliflar

> **Holat (2026-08-31 da yangilandi):**
>
> | Taklif | Holat |
> |---|---|
> | **A-2** AI ga asl sifatdagi rasm | ✅ **BAJARILDI** — `T-110` |
> | **A-3** jiddiylik shkalasi | ✅ **BAJARILDI** — `T-110` (uch daraja saqlandi) |
> | **A-7** laboratoriya sxemasi | ✅ **BAJARILDI** — `T-110` |
> | **A-8** rasm sifati darvozasi | ✅ **BAJARILDI** — `T-110` (qiyshiqlik qismi sababi bilan qoldirildi) |
> | **A-11** model konfiguratsiyasi | ✅ **BAJARILDI** — `T-110` |
> | A-1, A-4, A-5, A-6, A-9, A-10, A-12, A-13 | ⛔ **kutilmoqda** — tasdiqlanmagan |
>
> Batafsil natijalar va tekshiruv: `TASKLAR.md` → **T-110**.
>
> **Sana:** 2026-08-30
> **Qamrov:** EKG, Holter, SMAD, Laboratoriya AI oqimlari — kod bo'ylab
> to'liq o'qib chiqilgan (`python_back/main.py`, `*_analyses_api.py`,
> `ai_schema.py`, `ai_result_guard.py`, `document_classifier.py`)

---

## Qisqacha xulosa

Aniqlikka ta'sir qiladigan **13 ta** aniq nuqta topildi. Ular ta'sir
kuchi bo'yicha tartiblangan:

| # | Muammo | Ta'sir | Mehnat | Xavf |
|---|---|---|---|---|
| A-1 | Rasm yuklanganda o'lchovlar **umuman hisoblanmaydi** | 🔴 Juda yuqori | O'rta | Past |
| A-2 | AI ga **siqilgan va kichraytirilgan** rasm yuboriladi | 🔴 Juda yuqori | Past | Past |
| A-3 | `automatic_analysis_bool` shkalasi "norma" ni ifodalay olmaydi | 🔴 Juda yuqori | O'rta | **O'rta** |
| A-4 | AI qaytargan raqamlar hisoblangan raqamlar bilan solishtirilmaydi | 🟠 Yuqori | Past | Past |
| A-5 | Laboratoriya normalari AI ga berilmaydi | 🟠 Yuqori | Past | Past |
| A-6 | Bemorning oldingi tahlillari kontekstga kirmaydi | 🟠 Yuqori | O'rta | Past |
| A-7 | Laboratoriyada qat'iy sxema yo'q | 🟠 Yuqori | O'rta | Past |
| A-8 | Rasm sifati obyektiv tekshirilmaydi | 🟡 O'rta | Past | Past |
| A-9 | Xavfli xulosalar ikkinchi marta tekshirilmaydi | 🟡 O'rta | O'rta | Past |
| A-10 | Holter/SMAD/Lab ga shikoyatlar uzatilmaydi | 🟡 O'rta | Juda past | Past |
| A-11 | Model xulq parametrlari boshqarilmaydi | 🟡 O'rta | Juda past | Past |
| A-12 | Aniqlikni o'lchaydigan etalon to'plam yo'q | 🟡 O'rta | Yuqori | Past |
| A-13 | Bitta noto'g'ri o'lchov butun xulosani buzadi | 🟢 Past | Past | Past |

---

## A-1. Rasm yuklanganda o'lchovlar umuman hisoblanmaydi

### Hozir nima bo'lyapti

`main.py:1240-1247`:

```python
if is_image:
    png_bytes = jpg_bytes_to_png_bytes(content)
    digitals = None                                    # ← e'tibor bering
    prompt = compose_prompt_for_openai_for_img(age, gender, complaint, lang)
else:
    ...
    digitals = compute_full_ecg_v3(leads, fs)          # NeuroKit2 o'lchaydi
    prompt = compose_prompt_for_openai(digitals, age, gender, complaint, lang)
```

Ya'ni **signal fayli** (XML/CSV/DAT) yuklansa, tizim NeuroKit2 bilan
16 ta parametrni **o'lchaydi** va ularni AI ga tayyor raqam sifatida
beradi. **Rasm** yuklansa — hech narsa o'lchanmaydi, AI ularni
ko'zdan chamalaydi.

### Nima uchun bu jiddiy

Amaliyotda foydalanuvchilarning aksariyati **rasm** yuklaydi (bazadagi
17 ta EKG dan ko'pchiligi telefon surati). Ya'ni tizim eng ko'p
ishlatiladigan yo'lda eng kam aniqlikka ega.

Ko'z bilan chamalash aynan raqamli o'lchovlarda yomon ishlaydi:
PR intervalni 4 mm (200 ms) yoki 5 mm (250 ms) deb ajratish uchun
katakchani sanash kerak — bu til modeli uchun eng qiyin vazifa
turlaridan.

### Muhim: imkoniyat allaqachon kodda bor

`main.py:1219` — PDF uchun:

```python
leads, fs = extract_image_bytes_as_signal(img_bytes.read())
```

Ya'ni **rasmdan signal ajratish funksiyasi yozilgan va ishlatilyapti**
— faqat PDF uchun. Yuklangan JPG/PNG uchun esa chaqirilmaydi.

### Taklif

1. Rasm yuklanganda ham `extract_image_bytes_as_signal` ni sinab
   ko'rish; muvaffaqiyatli bo'lsa `compute_full_ecg_v3` ni ishga
   tushirish va o'lchovlarni AI ga uzatish.
2. Ajratib bo'lmasa (masalan qiyshiq surat, panjara ko'rinmaydi) —
   hozirgi yo'l bilan davom etish, lekin natijada
   **`measurement_source: "vizual_baho"`** deb belgilash.
3. Frontendda bu farqni ko'rsatish: o'lchangan qiymat va chamalangan
   qiymat bir xil ishonchga ega emas, shifokor buni bilishi kerak.

**Kutilayotgan natija:** rasm yo'lida raqamli o'lchovlar aniqligi
sezilarli oshadi; shifokor qaysi raqamga ishonish mumkinligini biladi.

---

## A-2. AI ga siqilgan va kichraytirilgan rasm yuboriladi

### Hozir nima bo'lyapti

`main.py:1240` → `prepare_display_image` (`main.py:1140`):

```python
DISPLAY_IMAGE_MAX_WIDTH = 2000
DISPLAY_IMAGE_QUALITY = 85
...
img = img.resize((DISPLAY_IMAGE_MAX_WIDTH, new_height), Image.LANCZOS)
img.save(buf, format="JPEG", quality=DISPLAY_IMAGE_QUALITY, optimize=True)
```

So'ng **aynan shu siqilgan rasm** OpenAI ga yuboriladi
(`main.py:1265-1270`):

```python
fobj = io.BytesIO(png_bytes)      # png_bytes = siqilgan JPEG
uploaded = client.files.create(file=fobj, purpose="vision")
```

### Nima uchun bu jiddiy

`prepare_display_image` **ko'rsatish va PDF uchun** yozilgan (T-047) —
u yerda 2000 px va JPEG q85 to'g'ri tanlov. Lekin AI uchun bu
noto'g'ri:

* 4032 px suratni 2000 px ga kichraytirish EKG ning eng nozik
  detallarini — ST segment siljishi (0.05–0.1 mV, ya'ni 0.5–1 mm) va
  P to'lqin morfologiyasini — yo'qotadi;
* JPEG q85 ingichka chiziqlar atrofida artefaktlar hosil qiladi, va
  ular aynan nozik siljishlarga o'xshab ko'rinadi.

Ya'ni tizim **arxivda asl faylni saqlaydi** (`analyse_file_link`),
lekin AI ga uning eng past sifatli nusxasini beradi.

### Taklif

AI uchun alohida tayyorlash yo'li:

| Maqsad | Kenglik | Format |
|---|---|---|
| Ko'rsatish / PDF (hozirgidek) | 2000 px | JPEG q85 |
| **AI (yangi)** | asl (yoki ≤ 3500 px) | PNG yoki JPEG q95 |

OpenAI vision uchun rasm baribir ichki chegaralarga keltiriladi,
shuning uchun cheksiz katta yuborishning ma'nosi yo'q — lekin q85
JPEG dan yuqoriroq sifat bepul yaxshilanish.

**Mehnat:** kichik — bitta qo'shimcha funksiya va bitta o'zgaruvchi.

---

## A-3. `automatic_analysis_bool` shkalasi "norma" ni ifodalay olmaydi

### Hozir nima bo'lyapti

Promptda (`main.py:435`):

```
"automatic_analysis_bool": "Holat jiddiyligi darajasi:
                            1 = yengil, 2 = o'rtacha, 3 = og'ir"
```

Frontendda (`tools/severity.js` → `AnalysisResultBody.js`):

```
1 → yashil "Normal"
2 → sariq "O'rtacha"
3 → qizil "Xavfli"
```

### Muammo

Model uchun `1` — **"yengil patologiya"**, foydalanuvchi uchun `1` —
**"Normal"**. Bu ikki xil narsa.

Natijada:

* **Butunlay sog'lom EKG** → model `1` beradi → yashil "Normal" ✅
* **Yengil patologiya** (masalan I-darajali AV blok) → model ham `1`
  beradi → yashil **"Normal"** ❌

Ya'ni yengil, lekin haqiqiy patologiya ekranda "Normal" deb
ko'rsatiladi. Bu shunchaki noaniqlik emas — bu **shifokorni
tinchlantiruvchi noto'g'ri signal**.

### Taklif

> **QAROR (2026-08-31):** buyurtmachi to'rtinchi darajani rad etdi —
> shkala **uch darajali** bo'lib qoladi. Buning o'rniga har bir
> darajaning ma'nosi promptda aniq belgilandi va modelga
> *"patologiya topilgan bo'lsa 1 QO'YMA, kamida 2 qo'y"* qoidasi
> berildi. Bajarildi: `TASKLAR.md` → **T-110**.
>
> Quyidagi to'rt darajali variant tarixiy taklif sifatida qoldirildi.

To'rt darajali shkalaga o'tish:

| Qiymat | Ma'no | Rang |
|---|---|---|
| `0` | Patologiya aniqlanmadi | yashil "Norma" |
| `1` | Yengil o'zgarish | ko'k "Yengil" |
| `2` | O'rtacha | sariq "O'rtacha" |
| `3` | Xavfli | qizil "Xavfli" |

**Diqqat — bu buzuvchi o'zgarish.** Bazada allaqachon `1/2/3`
qiymatlari bor va ularni qayta talqin qilish kerak. Ehtiyotkor yo'l:

1. Yangi maydon `severity_v2` qo'shish, eskisini teginmaslik;
2. Yangi tahlillarda ikkalasini ham yozish;
3. Frontendda `severity_v2` bor bo'lsa uni, yo'q bo'lsa eskisini
   ishlatish;
4. Bir necha oydan keyin eskisini olib tashlash.

---

## A-4. AI qaytargan raqamlar hisoblangan raqamlar bilan solishtirilmaydi

### Hozir nima bo'lyapti

Signal faylida `compute_full_ecg_v3` HR, PR, QRS, QT ni **o'lchaydi**
va promptga qo'yadi. AI javobida esa **o'zining** `digital_measurements`
qiymatlarini qaytaradi. Bu ikki to'plam hech qayerda solishtirilmaydi.

Ya'ni model o'lchangan `HR = 95` ni ko'rib turib, javobda `HR = 72`
deb yozishi mumkin — va buni hech kim sezmaydi.

### Taklif

Javob saqlanishidan oldin tekshiruv:

```
Agar |AI_qiymat − hisoblangan_qiymat| > ruxsat etilgan chegara:
    → hisoblangan qiymat ustun (u o'lchov, taxmin emas)
    → farq `measurement_conflicts` maydoniga yoziladi
    → tahlil "shifokor ko'rigi tavsiya etiladi" deb belgilanadi
```

Chegara har parametr uchun alohida (HR ±5 bpm, PR ±20 ms, QRS ±15 ms,
QT ±30 ms).

Bu `ai_result_guard.py` ga tabiiy joylashadi — u allaqachon shunga
o'xshash himoya qiladi (T-092).

---

## A-5. Laboratoriya normalari AI ga berilmaydi

### Hozir nima bo'lyapti

`lab_analyses_api.py:78` — promptga faqat yosh va jins uzatiladi.
Referens diapazonlari uzatilmaydi.

Lekin ular **bazada bor**: `lab_value_types` jadvalida 35 ta
ko'rsatkich uchun jinsga bog'liq chegaralar (T-035 da to'ldirildi).

### Muammo

AI o'z bilganicha norma chegaralarini ishlatadi. Ular klinikaning
chegaralaridan farq qilishi mumkin, va natijada:

* AI matnida "gemoglobin normada" deyiladi,
* ekranda esa o'sha qiymat **"Normadan past"** deb qizil belgilanadi.

Foydalanuvchi ikki qarama-qarshi javobni ko'radi.

### Taklif

Promptga bemor jinsiga mos chegaralarni qo'shish:

```
Ushbu laboratoriya uchun referens diapazonlari (erkak, 36 yosh):
  Gemoglobin (Hb): 130–170 g/L
  TSH: 0.4–4.0 µIU/mL
  ...
Baholashda FAQAT shu chegaralardan foydalaning.
```

**Mehnat:** kichik — chegaralar allaqachon bazada, faqat promptga
qo'shish kerak.

---

## A-6. Bemorning oldingi tahlillari kontekstga kirmaydi

### Hozir nima bo'lyapti

Har bir tahlil **mutlaqo mustaqil** ko'rib chiqiladi. AI bemorning
oldingi EKG si, oldingi laboratoriya natijalari yoki shifokor
qo'ygan tashxisdan bexabar.

### Nima uchun bu muhim

Tibbiyotda ko'p xulosa **o'zgarishga** tayanadi:

* "QTc 470 ms" — chegara holat. Lekin oldingi tahlilda 400 ms bo'lsa,
  bu **jiddiy dinamika**;
* Yangi paydo bo'lgan Q tishcha — infarkt belgisi; eskisi esa
  o'tgan infarkt izi;
* Gemoglobin 125 g/L — chegarada. Uch oy oldin 150 bo'lgan bo'lsa,
  bu qon yo'qotish signali.

Tizimda bu ma'lumot **bor** (T-035 da dinamika endpointi ham
qo'shildi), lekin AI ga berilmaydi.

### Taklif

Promptga oxirgi 2–3 ta oldingi natijaning qisqacha xulosasini
qo'shish:

```
Shu bemorning oldingi tahlillari:
  2026-05-12 EKG: sinus ritm, QTc 402 ms, patologiya yo'q
  2026-07-01 EKG: sinus ritm, QTc 448 ms, I-darajali AV blok
```

**Ehtiyot chorasi:** oldingi xulosa **AI tomonidan** yozilgan bo'lishi
mumkin, ya'ni xato takrorlanib, kuchayib borishi xavfi bor. Shuning
uchun faqat **o'lchangan raqamlar** va **shifokor tasdiqlagan
tashxislar** uzatilishi kerak, AI ning erkin matni emas.

---

## A-7. Laboratoriyada qat'iy sxema yo'q

### Hozir nima bo'lyapti

`ai_schema.py` da `ecg`, `holter`, `smad` uchun Structured Outputs
sxemalari bor. **Laboratoriya ataylab chiqarib tashlangan** — sabab:
40 ta ustun bor va qat'iy sxema modelni ularning hammasini `null`
bilan to'ldirishga majburlaydi.

Bu asos o'rinli edi, lekin yechim boshqacha bo'lishi mumkin.

### Taklif

Qat'iy massiv sxemasi — barcha ustunlarni emas, **faqat topilganlarini**:

```json
{
  "measurements": [
    { "column_name": "hb",  "value": 142, "unit": "g/L" },
    { "column_name": "tsh", "value": 1.71, "unit": "µIU/mL" }
  ]
}
```

`column_name` uchun `enum` sifatida `lab_value_types` dagi 40 ta
qiymat beriladi. Shunda:

* model mavjud bo'lmagan ko'rsatkich nomini o'ylab topa olmaydi;
* `null` bilan to'ldirish muammosi yo'q — massiv bo'sh bo'lishi mumkin;
* ustunga yozish **aniq** bo'ladi, hozirgi kalit moslashtirish emas.

---

## A-8. Rasm sifati obyektiv tekshirilmaydi

### Hozir nima bo'lyapti

Sifat faqat modelning o'z bahosiga tayanadi (`analiz_mumkinmi`).
Ya'ni sifatsiz rasm uchun ham to'liq AI chaqiruvi qilinadi (pul va
vaqt sarflanadi), va model "tahlil qilib bo'ladi" deb xato aytsa —
natija ishonchsiz bo'ladi.

### Taklif

AI chaqiruvidan **oldin** obyektiv tekshiruvlar:

| Tekshiruv | Usul | Rad etish sharti |
|---|---|---|
| Xiralik | Laplasian dispersiyasi | < chegara |
| O'lcham | piksel kengligi | < 1000 px |
| EKG panjarasi | Furye/Hough bilan panjara chastotasi | topilmadi |
| Qiyshiqlik | panjara burchagi | > 10° |

Rad etilganda foydalanuvchiga **aniq nima qilish kerakligi**
aytiladi: "Rasm xira — telefonni qog'ozga parallel tuting va
qayta suratga oling".

**Qo'shimcha foyda:** har bir rad etilgan rasm — tejalgan AI
chaqiruvi.

---

## A-9. Xavfli xulosalar ikkinchi marta tekshirilmaydi

### Hozir nima bo'lyapti

Har bir tahlil **bir marta** so'raladi. Model qanchalik ishonchli
bo'lmasin, javob shundayligicha saqlanadi.

### Taklif

`automatic_analysis_bool = 3` (xavfli) bo'lganda **ikkinchi mustaqil
so'rov** yuborish va natijalarni solishtirish:

* Ikkalasi ham "xavfli" desa — ishonch yuqori, shunday belgilanadi;
* Farq qilsa — tahlil **"shifokor ko'rigi shart"** deb belgilanadi va
  ikkala xulosa ham saqlanadi.

Faqat xavfli holatlar uchun qilinadi, ya'ni qo'shimcha xarajat
kichik (bazadagi 17 ta EKG dan atigi 1 tasi 3-darajali).

---

## A-10. Holter/SMAD/Lab ga shikoyatlar uzatilmaydi

### Hozir nima bo'lyapti

| Modul | Yosh | Jins | Shikoyatlar |
|---|---|---|---|
| EKG | ✅ | ✅ | ✅ |
| Holter | ✅ | ✅ | ❌ |
| SMAD | ✅ | ✅ | ❌ |
| Laboratoriya | ✅ | ✅ | ❌ |

`holter_analyses_api.py:77` va `lab_analyses_api.py:78`:
`compose_prompt_for_openai(age, gender, lang)` — shikoyat parametri
umuman yo'q.

### Nima uchun bu muhim

Holter uchun shikoyat ayniqsa muhim: "yurak to'xtab qolgandek
tuyuladi" degan shikoyat modelni pauzalarga qaratadi; "hushdan
ketish" — AV blokadaga.

**Mehnat:** juda kichik — EKG dagi kod aynan takrorlanadi.

---

## A-11. Model xulq parametrlari boshqarilmaydi

### Hozir nima bo'lyapti

```python
resp = client.responses.create(
    model="gpt-5.2",
    input=[...],
    text=ai_schema.response_format("ecg"),
)
```

Hech qanday `reasoning`, `temperature` yoki `max_output_tokens`
ko'rsatilmagan — hammasi standart qiymatda.

### Taklif

1. **Fikrlash chuqurligi** — tibbiy tashxis uchun standart emas,
   yuqoriroq daraja belgilash.
2. **Determinizm** — bir xil rasm har safar bir xil javob berishi
   kerak. Hozir yo'q, va bu shifokorning ishonchini yo'qotadi
   ("kecha boshqacha yozgan edi").
3. **Model versiyasini qotirish** — `gpt-5.2` kelajakda yangilanishi
   mumkin va natijalar sababsiz o'zgaradi. Aniq versiya
   konfiguratsiyada saqlanishi kerak.

---

## A-12. Aniqlikni o'lchaydigan etalon to'plam yo'q

### Muammo

Yuqoridagi barcha takliflar **taxmin** bo'lib qoladi, chunki
"aniqlik oshdi" degan gapni tekshirish imkoni yo'q. Hozir hech qanday
o'lchov yo'q: na aniqlik foizi, na xato turlari statistikasi.

### Taklif

1. **Etalon to'plam** — kardiolog tomonidan tasdiqlangan 50–100 ta
   EKG (turli patologiyalar bilan), har biriga to'g'ri o'lchovlar va
   tashxis biriktirilgan.
2. **Baholash skripti** — to'plamni AI dan o'tkazib, quyidagilarni
   o'lchaydi:
   * o'lchovlar xatosi (o'rtacha absolyut farq);
   * jiddiylik darajasi mosligi;
   * **eng muhimi:** xavfli holatni "normal" deb baholash soni
     (bu eng qimmat xato turi).
3. Har bir o'zgarishdan oldin va keyin ishga tushiriladi.

**Mehnat:** yuqori — asosiy qiyinchilik kod emas, tasdiqlangan
ma'lumot to'plash. Lekin busiz qolgan 12 ta taklifning ta'sirini
bilib bo'lmaydi.

**Tavsiya:** avval A-12 ni qilish, keyin qolganlarini — shunda har
bir o'zgarishning foydasi raqam bilan ko'rinadi.

---

## A-13. Bitta noto'g'ri o'lchov butun xulosani buzadi

### Hozir nima bo'lyapti

`compute_full_ecg_v3` qaytargan barcha qiymatlar promptga
**tekshirilmasdan** qo'yiladi. Signal shovqinli bo'lsa NeuroKit2
noreal qiymat qaytarishi mumkin (masalan HR = 300 yoki QT = 900 ms),
va AI shu raqamga tayanib xulosa yozadi.

### Taklif

Promptga qo'shishdan oldin fiziologik chegaralar tekshiruvi:

| Parametr | Ishonarli oraliq |
|---|---|
| HR | 20–250 bpm |
| PR | 80–400 ms |
| QRS | 40–200 ms |
| QT | 200–700 ms |

Chegaradan tashqaridagi qiymat promptga **qo'shilmaydi** va
"o'lchab bo'lmadi" deb belgilanadi — noto'g'ri raqamdan ko'ra
raqamsizlik yaxshiroq.

---

## Tavsiya etilgan tartib

**1-bosqich — o'lchash imkoniyatini yaratish**
- A-12 (etalon to'plam)

**2-bosqich — arzon va xavfsiz yaxshilanishlar**
- A-2 (AI ga sifatli rasm)
- A-5 (lab normalari)
- A-10 (shikoyatlar)
- A-11 (model parametrlari)
- A-13 (fiziologik chegaralar)

**3-bosqich — sezilarli ish talab qiladiganlar**
- A-1 (rasmdan o'lchash)
- A-4 (raqamlarni solishtirish)
- A-7 (lab sxemasi)
- A-8 (sifat darvozasi)

**4-bosqich — arxitektura o'zgarishi**
- A-3 (shkala — buzuvchi o'zgarish)
- A-6 (oldingi tahlillar konteksti)
- A-9 (ikkinchi fikr)

---

## Nima ATAYLAB taklif qilinmadi

**Boshqa modelga o'tish.** `gpt-5.2` o'rniga maxsus tibbiy modelni
taklif qilish oson, lekin asossiz bo'lardi: hozirgi modelning
aniqligi o'lchanmagan (A-12), ya'ni taqqoslash uchun boshlang'ich
nuqta yo'q.

**Barcha tahlillarni AI ga ikki marta yuborish.** Xarajatni ikki
barobar oshiradi, lekin foydasi faqat chegaraviy holatlarda
ko'rinadi. Shuning uchun A-9 da faqat xavfli xulosalar uchun
taklif qilindi.

**Promptni butunlay qayta yozish.** Hozirgi promptlar yomon emas —
ular bemor konteksti, professional terminlar va aniq JSON talabini
o'z ichiga oladi. Muammo promptning matnida emas, unga **berilmagan
ma'lumotda** (o'lchovlar, normalar, tarix).
