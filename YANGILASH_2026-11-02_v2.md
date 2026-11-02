# NMED — laboratoriya yangilanishlarini serverga chiqarish (WinSCP orqali)

Bu paket **yig'ma**: serverda hozir qaysi versiya bo'lishidan qat'i nazar
(2026-11-01 yoki 2026-11-02 yangilanishi qilingan-qilinmaganidan qat'i
nazar), GitHub dagi `main` ning oxirgi holatini to'liq o'rnatadi:

| Commit | Sana | Nima |
|---|---|---|
| `e8d086b` | 2026-10-31 | Bemorni ism bo'yicha qidirish; faqat ism-familiya majburiy |
| `9383ff5` | 2026-11-02 | Lab qiymatlari alohida jadvalda; Excel yuklash; 137 ko'rsatkich |
| `9ebeec7` | 2026-11-02 | Lab statistikasi va xavf signallari; tahlil sanasi fayldan; eski 87 ustun o'chirildi |
| `9d4ff46` | 2026-11-02 | Lab moduli auditidagi 41 kamchilik tuzatildi (`TASKLAR_LAB_2026-11-02.md`) |

Hammasi shu kompyuterda build qilingan. Serverda `npm` va `dotnet publish`
KERAK EMAS. Python uchun bitta kutubxona (`openpyxl`) — paketning `wheels\`
papkasida, internetsiz o'rnatiladi (oldin o'rnatilgan bo'lsa zarari yo'q).

**Oxirgi tuzatishlarda (`9d4ff46`) foydalanuvchiga ko'rinadiganlari:**
- Shubhali birlik (kortizol < 40 "нмоль/л", prolaktin < 40 "мМЕ/л")
  aylantirilmaydi — "Baholanmagan (birlik tekshirilsin)" guruhida chiqadi.
- Shifokor bemor kartasida «Laboratoriya xavf signallari» blokini ko'radi va
  signalni tasdiqlaydi/rad etadi (ilgari faqat admin/direktor).
- Lab/Holter/SMAD ro'yxatlarida «AI xulosasi» filtri 500 bermaydi, sana
  filtri to'g'ri kunni ko'rsatadi; shifokor o'zi yuklagan tahlilni o'chira oladi.
- Jinsi noma'lum bemorda FSG/LG noto'g'ri "yuqori" chiqmaydi.
- Klinika va xodim formadan emas, tokendan olinadi; 50 MB dan katta yuklash
  brauzerning o'zida rad etiladi.
- AI ishlayotgan tahlilni qayta yuborib bo'lmaydi (409).

**Baza sxemasi o'zgaradi — HA.** Backend ishga tushganda kutilayotgan
migratsiyalarni o'zi qo'llaydi. Serverda nechtasi qo'llanishi hozirgi
holatga bog'liq (3-qadamda aniqlaysiz):

| Migratsiya | Nima qiladi |
|---|---|
| `20261031000000_PatientOptionalBirthDateGender` | tug'ilgan sana va jins NULL bo'lishi mumkin |
| `20261101000000_LabAnalysisValues` | yangi jadval `lab_analysis_values`, qiymatlar ko'chiriladi |
| `20261102000000_LabValueReferenceAndKind` | laboratoriya me'yori, sifat natijalari |
| `20261102010000_LabNormsReview` | katalog me'yorlari tuzatildi |
| `20261102020000_LabRuleSignals` | xavf signallari jadvallari |
| `20261103000000_LabAnalysisDateSource` | ⚠️ `lab_analyses` dagi **eski 87 ustunni O'CHIRADI** |
| `20261104001000_LabRuleEvidenceHash` | 2 ta yangi ustun (signallar) |
| `20261104002000_LabFlagsUnknownSexNorms` | jinsi noma'lum bemorlar baholari qayta hisoblanadi |
| `20261104003000_LabFixNonReactiveKind` | "Non-reactive" natijalar manfiyga tuzatiladi |

**Baza zaxirasi MAJBURIY.** `20261103000000` qo'llangandan keyin eski kodga
faqat bazani zaxiradan tiklab qaytish mumkin.

**Downtime:** ~2–3 daqiqa.

---

## Serverga o'tkaziladigan fayllar — `D:\git\ekg_tahlili_app\deploy_2026-11-02_v2\`

| Papka | Ichida | Serverda qayerga |
|---|---|---|
| `frontend\` | `index.html`, `asset-manifest.json`, `static\` (`main.586be63d.js`), rasmlar | `/projects/nmed/nmed.uz` |
| `api\` | 4 fayl: `EkgAnalyzerApi.dll`, `.pdb`, `.deps.json`, `.runtimeconfig.json` | `/projects/nmed/api.nmed.uz` |
| `python\` | 42 ta `.py` (to'liq nusxa) + `requirements.txt` | `/projects/nmed/analyse.nmed.uz` |
| `wheels\` | `openpyxl-3.1.5`, `et_xmlfile-2.0.0` (`.whl`) | faqat o'rnatish uchun |

Boshqa hech narsaga TEGILMAYDI: `appsettings*.json`, `.env`, `venv`,
`uploads`, `wwwroot` (klinika logotiplari), boshqa `.dll` fayllar.
**Yangi sozlama kerak emas** — yangi kalitlarning hammasi kodda standart
qiymatga ega (`AI_LAB_MAX_OUTPUT_TOKENS` = 16000, `LabRules:Enabled` = true).

---

## Tasklar

### 1. SSH da o'zgaruvchilar (PuTTY yoki WinSCP → "Open Terminal")
```bash
UAPI=api.nmed.uz ; UPY=analyse.nmed.uz
API=/projects/nmed/api.nmed.uz
PY=/projects/nmed/analyse.nmed.uz
FE=/projects/nmed/nmed.uz
ls "$API/EkgAnalyzerApi.dll" "$PY/main.py" "$FE/index.html" "$PY/venv/bin/python"
```
To'rttala fayl topilishi kerak. `venv/bin/python` topilmasa, servis qaysi
Python'ni ishlatishini ko'ring va 5- va 8-qadamda shu yo'lni qo'ying:
```bash
systemctl cat $UPY | grep -E "ExecStart|WorkingDirectory"
```
> SSH sessiyasi uzilsa, o'zgaruvchilarni qaytadan o'rnating.

### 2. Avtomatik kompleks tahlil o'chiqligini tekshirish (SSH)
```bash
grep -n -A2 '"AutoCombined"' "$API"/appsettings*.json
```
- Hech narsa chiqmasa yoki `"Enabled": false` bo'lsa — joyida.
- `"Enabled": true` bo'lsa — `nano "$API/appsettings.Production.json"` bilan
  `false` qiling (lab arxivi yuklab bo'lingach yana `true` qilinadi).

### 3. Serverning hozirgi holatini aniqlash va zaxira olish

**Baza** — DataGrip'da avval:
```sql
SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY 1 DESC LIMIT 3;
```
Natijani yozib qo'ying. Oxirgisi:
- `20261103000000_LabAnalysisDateSource` — 2026-11-02 yangilanishi
  allaqachon qilingan; faqat 3 ta yangi migratsiya qo'llanadi, eski ustunlar
  allaqachon o'chirilgan.
- `20261031000000_PatientOptionalBirthDateGender` — 2026-11-02 yangilanishi
  qilinmagan; 8 ta migratsiya qo'llanadi, jumladan 87 ustunni o'chiradigani.
- undan ham eskisi — 9 ta migratsiya qo'llanadi (2026-11-01 ham qilinmagan).
  Bu ham ishlaydi, lekin zaxira ayniqsa muhim.

So'ng zaxira: `med_helper_data` → o'ng tugma → **Export with 'pg_dump'**
(Format: custom yoki plain, barcha jadvallar). Fayl hajmi 0 bo'lmasin.

**Kod** (SSH):
```bash
D=$(date +%F-%H%M)
sudo tar czf ~/nmed-code-$D.tar.gz --exclude='venv' --exclude='uploads' --exclude='wwwroot' "$API" "$PY" "$FE"
ls -lh ~/nmed-code-$D.tar.gz
```

### 4. Fayllarni yuklash

WinSCP'da avval: **Options → Preferences → Transfer → Transfer mode: Binary**.

1. Serverda home papkangizda yangi papka yarating: `nmed-yangi`
   (oldingi yangilanishdan qolgan bo'lsa — avval o'chiring).
2. Chap tomondan (`D:\git\ekg_tahlili_app\deploy_2026-11-02_v2\`) **to'rttala
   papkani** — `frontend`, `api`, `python`, `wheels` — `nmed-yangi` ichiga torting.

### 5. `openpyxl` ni o'rnatish (SSH, servislar ishlab turadi)
```bash
sudo "$PY/venv/bin/python" -m pip install --no-index --no-deps ~/nmed-yangi/wheels/*.whl
sudo "$PY/venv/bin/python" -c "import openpyxl; print('openpyxl', openpyxl.__version__)"
```
`openpyxl 3.1.5` chiqishi kerak ("already satisfied" chiqsa ham joyida).

### 6. Joyiga ko'chirish va qayta ishga tushirish (SSH)
```bash
sudo systemctl stop $UAPI $UPY

sudo cp -r ~/nmed-yangi/frontend/. "$FE/"
sudo cp -r ~/nmed-yangi/api/.      "$API/"
sudo cp -r ~/nmed-yangi/python/.   "$PY/"
sudo chown -R --reference="$FE"  "$FE"
sudo chown -R --reference="$API" "$API"
sudo chown -R --reference="$PY"  "$PY"

sudo systemctl start $UPY $UAPI
sudo systemctl status $UAPI $UPY --no-pager
```
`cp` ustidan yozadi, hech narsani o'chirmaydi. Python ~20 soniyada ishga
tushadi (neurokit2 sekin yuklanadi) — bu nosozlik emas.

### 7. Migratsiyani tekshirish

SSH:
```bash
journalctl -u $UAPI -n 300 --no-pager | grep -iE "migrat|error|fail|exception|ko'chmagan"
journalctl -u $UPY  -n 80  --no-pager | grep -iE "error|traceback"
```
DataGrip:
```sql
-- 1) Oxirgi migratsiya 20261104003000_LabFixNonReactiveKind bo'lishi kerak
SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY 1 DESC LIMIT 4;

-- 2) lab_analyses da ~20 ta ustun qolgan (avval ~106 ta edi)
SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'lab_analyses';

-- 3) Qiymatlar yangi jadvalda: ikkala son 0 emas
SELECT COUNT(DISTINCT lab_analysis_id) AS tahlillar, COUNT(*) AS qiymatlar FROM lab_analysis_values;

-- 4) Yangi ustunlar bor: 2 qator chiqishi kerak
SELECT table_name, column_name FROM information_schema.columns
 WHERE (table_name, column_name) IN (('lab_rule_signals','evidence_hash'),
                                     ('lab_rule_patient_state','error_count'));
```
- Backend log'ida `ko'chmagan` so'zi chiqsa — migratsiya to'xtagan, ustunlar
  O'CHIRILMAGAN. Backend ishlamaydi: «Orqaga qaytarish» bo'limiga o'ting va
  menga log'ni yuboring.
- Python log'ida `Traceback` bo'lmasin.

### 8. Eski yozuvlarni tuzatish skriptlari (SSH)

Avval **faqat ko'rsatadi** (hech narsa o'zgartirmaydi):
```bash
cd "$PY"
sudo venv/bin/python repair_lab_units.py | tail -8
sudo venv/bin/python repair_lab_dates.py | tail -8
```
- `repair_lab_units.py` — eski natijalardagi birliklarni me'yor birligiga
  keltiradi. Yangi versiyasi eski qoida bilan aylantirilgan kortizol va
  prolaktinni asl ko'rinishiga qaytarib "birlik shubhali" deb belgilaydi.
  **2026-11-02 da allaqachon ishlatilgan bo'lsa ham qayta ishlating.**
- `repair_lab_dates.py` — eski **Excel** tahlillarga fayldagi sanani qo'yadi.

Ro'yxat to'g'ri ko'rinsa — qo'llang:
```bash
sudo venv/bin/python repair_lab_units.py --apply | tail -3
sudo venv/bin/python repair_lab_dates.py --apply | tail -5
```
Ikkalasi ham qayta ishlatilsa hech narsani buzmaydi (ikkinchi marta
«O'zgaradigan yozuvlar: 0» chiqadi).

### 9. Brauzerda tekshirish (avval `Ctrl+F5`)

Frontend yangilanganini o'z kompyuteringizda tekshiring:
```bash
curl -s https://nmed.uz/asset-manifest.json | grep main.js
```
`/static/js/main.586be63d.js` chiqishi kerak.

- **Lab yuklash** (`/analyse-lab`): «Tahlil sanasi» bo'sh va «ixtiyoriy».
  Klinika shablonidagi `.xlsx` ni sanasiz yuboring → AI natijasi keladi,
  ro'yxatdagi sana = fayldagi «Дата:» sanasi.
- **Lab ro'yxati**: «AI xulosasi» filtrini tanlang — xato chiqmasin; sana
  filtri tanlangan kunning tahlillarini ko'rsatsin.
- **Eski lab tahlilini oching** — kartochkalar, dinamika grafigi (nuqtalar
  baho bo'yicha rangli) va PDF ishlaydi.
- **Statistika** (admin/direktor, menyuda «Statistika»): «Umumiy»,
  «Ko'rsatkichlar», «Xavf signallari». Qoidalar versiyasi o'zgargani uchun
  backend ishga tushgach worker BARCHA bemorlarni qayta hisoblaydi —
  bemorlar ko'p bo'lsa bir necha daqiqa. Avval tasdiqlangan signallarning
  bahosi saqlanadi (faqat dalili o'zgarganlari «kutilmoqda» ga qaytadi).
- **Bemor kartasi** (shifokor hisobi bilan, lab tahlili bor bemor):
  «Laboratoriya xavf signallari» bloki chiqadi va signalni tasdiqlash ishlaydi.

### 10. Tozalash
Hammasi ishlagach WinSCP'da `nmed-yangi` papkasini o'chiring. Zaxiralarni
(baza dump, `nmed-code-*`) bir necha kun saqlang.

---

## Biror narsa buzilsa — orqaga qaytarish

1. SSH:
   ```bash
   sudo systemctl stop $UAPI $UPY
   sudo tar xzf ~/nmed-code-YYYY-MM-DD-HHMM.tar.gz -C /
   ```
2. **Baza** — 3-qadamda aniqlagan holatga qarab:
   - Oxirgi migratsiya `20261103000000` edi (eski ustunlar allaqachon
     o'chirilgan) — yangi 3 migratsiya faqat ustun qo'shadi va baholarni
     tuzatadi; eski kod bunday bazada ishlaydi. **Bazani tiklash shart emas.**
   - Oxirgi migratsiya eskiroq edi va 7-qadamda `20261103000000` qo'llangan —
     eski kod bazani o'qiy olmaydi. DataGrip'da 3-qadamdagi dump'dan bazani
     tiklang (**Restore with 'pg_restore'** yoki plain SQL faylini ishga
     tushiring). Yangilanishdan keyin yuklangan tahlillar bazadan yo'qoladi
     (fayllari `uploads` da qoladi).
   - Migratsiya `ko'chmagan` xatosi bilan to'xtagan bo'lsa — oxirgi
     migratsiya to'liq bekor qilingan, eski 87 ustun joyida. Bazani tiklash
     shart emas.
3. SSH:
   ```bash
   sudo systemctl start $UPY $UAPI
   ```

`openpyxl` o'rnatilgan holda qolishi zarar qilmaydi.
