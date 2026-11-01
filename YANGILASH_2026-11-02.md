# NMED — 2026-11-02 yangilanishini serverga chiqarish (WinSCP orqali)

Hammasi shu kompyuterda build qilingan. Serverga tayyor papkalar WinSCP
bilan ko'chiriladi. Serverda `npm` va `dotnet publish` KERAK EMAS.
Python uchun **bitta yangi kutubxona** bor (`openpyxl`) — u paketning
`wheels\` papkasida, internetsiz o'rnatiladi.

**Nima yangi** (2026-11-01 dan keyingi ikki commit: `9383ff53`, `9ebeec7a`):
- **Laboratoriya qiymatlari alohida jadvalda** (`lab_analysis_values`) —
  har bir ko'rsatkich alohida qator; 137 ta ko'rsatkich; laboratoriyaning
  o'z me'yori va sifat natijalari (manfiy/musbat/shubhali).
- **Excel (.xlsx) yuklash** — klinika shablonidagi lab natijalari.
- **Tahlil sanasi** — fayldagi sana (Excel «Дата:» katagi yoki AI PDF dan
  o'qiydi), yuklangan kun emas. Yuklash formasida sana endi ixtiyoriy.
- **Statistika sahifasi** (`/lab-statistics`, menyuda «Statistika» —
  faqat Admin/Direktor): ko'rsatkichlar statistikasi, grafiklar va
  bemor tahlillaridagi o'zgarishlar bo'yicha **xavf signallari**
  (24 klinik qoida; shifokor tasdiqlaydi/rad etadi).
- Katalog me'yorlari manbalar bilan solishtirilib tuzatilgan.
- Avtomatik kompleks tahlil standart holatda **o'chiq**
  (`AutoCombined:Enabled = false`) — lab arxivi yuklanguncha.

- **Baza sxemasi o'zgaradi:** HA — 5 ta migratsiya (backend ishga tushganda
  o'zi qo'llaydi):
  `20261101000000_LabAnalysisValues`, `20261102000000_LabValueReferenceAndKind`,
  `20261102010000_LabNormsReview`, `20261102020000_LabRuleSignals`,
  `20261103000000_LabAnalysisDateSource`.
  Oxirgisi `lab_analyses` dagi **eski 87 ta ko'rsatkich ustunini O'CHIRADI**
  (qiymatlar oldin yangi jadvalga ko'chiriladi va tekshiriladi; birorta
  qiymat ko'chmasa migratsiya xato bilan to'xtaydi, hech narsa
  o'chirilmaydi). **Baza zaxirasi MAJBURIY** — bu migratsiyadan keyin eski
  kodga faqat bazani zaxiradan tiklab qaytish mumkin.
- **Downtime:** ~2–3 daqiqa.

---

## Serverga o'tkaziladigan fayllar — `D:\git\ekg_tahlili_app\deploy_2026-11-02\`

| Papka | Ichida | Serverda qayerga |
|---|---|---|
| `frontend\` | 20 fayl: `index.html`, `asset-manifest.json`, `static\` (`main.f39e2ada.js`), rasmlar | `/projects/nmed/nmed.uz` |
| `api\` | 4 fayl: `EkgAnalyzerApi.dll`, `.pdb`, `.deps.json`, `.runtimeconfig.json` | `/projects/nmed/api.nmed.uz` |
| `python\` | 42 ta `.py` (to'liq nusxa) + `requirements.txt` | `/projects/nmed/analyse.nmed.uz` |
| `wheels\` | `openpyxl-3.1.5`, `et_xmlfile-2.0.0` (`.whl`) | faqat o'rnatish uchun |

Python'da 4 ta YANGI fayl: `excel_to_text.py`, `lab_catalog.py`,
`lab_dates.py`, `repair_lab_dates.py`.

Boshqa hech narsaga TEGILMAYDI: `appsettings*.json` (maxfiy sozlamalar),
`.env`, `venv`, `uploads`, `wwwroot` (klinika logotiplari), boshqa `.dll`
fayllar o'z joyida qoladi.

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
Python'ni ishlatishini ko'ring va 4- va 7-qadamda shu yo'lni qo'ying:
```bash
systemctl cat $UPY | grep -E "ExecStart|WorkingDirectory"
```
> SSH sessiyasi uzilsa, o'zgaruvchilarni qaytadan o'rnating.

### 2. Avtomatik kompleks tahlil o'chiqligini tekshirish (SSH)
Arxiv yuklanayotganda har bir yangi lab tahlil uchun AI kompleks xulosa
yaratilmasligi kerak (xarajat). Server sozlamasi kodni bosib o'tadi:
```bash
grep -n -A2 '"AutoCombined"' "$API"/appsettings*.json
```
- Hech narsa chiqmasa yoki `"Enabled": false` bo'lsa — hammasi joyida.
- `"Enabled": true` bo'lsa — `nano "$API/appsettings.Production.json"` bilan
  `false` qiling (arxiv yuklab bo'lingach yana `true` qilinadi).

### 3. Zaxira olish

**Baza** — serverda PostgreSQL yo'q, zaxirani **DataGrip** orqali oling:
`med_helper_data` → o'ng tugma → **Export with 'pg_dump'** (Format:
custom yoki plain, barcha jadvallar). Fayl hajmi 0 bo'lmasin.

Qaysi migratsiyalar qo'llanganini DataGrip'da yozib qo'ying:
```sql
SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY 1 DESC LIMIT 5;
```
Oxirgisi `20261031000000_PatientOptionalBirthDateGender` bo'lishi kutiladi.

**Kod** (SSH):
```bash
D=$(date +%F-%H%M)
sudo tar czf ~/nmed-code-$D.tar.gz --exclude='venv' --exclude='uploads' --exclude='wwwroot' "$API" "$PY" "$FE"
ls -lh ~/nmed-code-$D.tar.gz
```

### 4. Fayllarni yuklash va `openpyxl` ni o'rnatish

WinSCP'da avval: **Options → Preferences → Transfer → Transfer mode: Binary**.

1. Serverda home papkangizda yangi papka yarating: `nmed-yangi`.
2. Chap tomondan (`D:\git\ekg_tahlili_app\deploy_2026-11-02\`) **to'rttala
   papkani** — `frontend`, `api`, `python`, `wheels` — `nmed-yangi` ichiga torting.

So'ng SSH da (servislar hali ishlab turadi, bu ularga ta'sir qilmaydi):
```bash
sudo "$PY/venv/bin/python" -m pip install --no-index --no-deps ~/nmed-yangi/wheels/*.whl
sudo "$PY/venv/bin/python" -c "import openpyxl; print('openpyxl', openpyxl.__version__)"
```
`openpyxl 3.1.5` chiqishi kerak.

### 5. Joyiga ko'chirish va qayta ishga tushirish (SSH)
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
`cp` ustidan yozadi, lekin hech narsani o'chirmaydi.

### 6. Migratsiyani tekshirish

SSH:
```bash
journalctl -u $UAPI -n 200 --no-pager | grep -iE "migrat|error|fail|exception|ko'chmagan"
journalctl -u $UPY  -n 80  --no-pager | grep -iE "error|traceback"
```
DataGrip:
```sql
-- 1) Oxirgi migratsiya 20261103000000_LabAnalysisDateSource bo'lishi kerak
SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY 1 DESC LIMIT 6;

-- 2) lab_analyses da 20 ta ustun qolgan (avval ~106 ta edi)
SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'lab_analyses';

-- 3) Qiymatlar yangi jadvalda: tahlillar va qatorlar soni 0 emas
SELECT COUNT(DISTINCT lab_analysis_id) AS tahlillar, COUNT(*) AS qiymatlar FROM lab_analysis_values;
```
- Backend log'ida `ko'chmagan` so'zi chiqsa — migratsiya to'xtagan,
  ustunlar O'CHIRILMAGAN. Backend ishlamaydi: «Orqaga qaytarish» bo'limiga o'ting
  va menga log'ni yuboring.
- Python log'ida `Traceback` bo'lmasin.

### 7. Eski yozuvlarni tuzatish skriptlari (SSH)

Avval **faqat ko'rsatadi** (hech narsa o'zgartirmaydi):
```bash
cd "$PY"
sudo venv/bin/python repair_lab_units.py | tail -5
sudo venv/bin/python repair_lab_dates.py | tail -8
```
- `repair_lab_units.py` — eski natijalardagi birliklarni (mg/dL → µmol/L va
  h.k.) me'yor birligiga keltiradi.
- `repair_lab_dates.py` — eski **Excel** tahlillarga fayldagi sanani qo'yadi
  (PDF/rasm tahlillari uchun sana faqat AI orqali olinadi — kerak bo'lsa
  ularni «AI orqali tekshirish» bilan qayta yuboring).

Ro'yxat to'g'ri ko'rinsa — qo'llang:
```bash
sudo venv/bin/python repair_lab_units.py --apply | tail -3
sudo venv/bin/python repair_lab_dates.py --apply | tail -5
```
Ikkalasi ham qayta ishga tushirilsa hech narsani buzmaydi (ikkinchi marta
«O'zgaradigan yozuvlar: 0» chiqadi).

### 8. Brauzerda tekshirish (avval `Ctrl+F5`)
- **Lab yuklash** (`/analyse-lab`): «Tahlil sanasi» maydoni bo'sh, yonida
  «ixtiyoriy» va «Bo'sh qoldirilsa — fayldagi tahlil sanasi olinadi»
  izohi; o'ng tomonda «Tahlil sanasi — fayldan olinadi».
- **Excel yuklash**: klinika shablonidagi bitta `.xlsx` ni sanasiz yuboring →
  AI natijasi keladi, ro'yxatdagi «Tahlil sanasi» = fayldagi «Дата:» sanasi
  (bugungi kun emas).
- **PDF yuklash**: sanasiz yuboring → sana hujjatdagidek chiqadi.
- **Eski lab tahlilini oching** — kartochkalar, qiymatlar, dinamika grafigi
  va PDF avvalgidek ishlaydi.
- **Statistika** (admin/direktor hisobi bilan, menyuda «Statistika»):
  «Umumiy», «Ko'rsatkichlar» (biror ko'rsatkichni bosing — oyna ochiladi),
  «Xavf signallari». Signallar backend ishga tushgach 1–2 daqiqada
  hisoblanadi (bemorlar ko'p bo'lsa — bir necha daqiqa); «Qayta hisoblash»
  tugmasi ham bor.
- Frontend yangilanganini tekshirish (o'z kompyuteringizda):
  `curl -s https://nmed.uz/asset-manifest.json` dagi `main.js` nomi
  `/static/js/main.f39e2ada.js` bo'lishi kerak.

### 9. Tozalash
Hammasi ishlagach WinSCP'da `nmed-yangi` papkasini o'chiring. Zaxiralarni
(baza dump, `nmed-code-*`) bir necha kun saqlang.

---

## Biror narsa buzilsa — orqaga qaytarish

**Muhim:** `20261103000000_LabAnalysisDateSource` migratsiyasi eski 87 ta
ustunni o'chirgan bo'lsa, eski kod bazani o'qiy olmaydi. Shuning uchun
orqaga qaytish = **kod + baza** birga:

1. SSH:
   ```bash
   sudo systemctl stop $UAPI $UPY
   sudo tar xzf ~/nmed-code-YYYY-MM-DD-HHMM.tar.gz -C /
   ```
2. DataGrip: 3-qadamdagi dump'dan bazani tiklang (**Restore with 'pg_restore'**
   yoki plain SQL faylini ishga tushiring). Yangilanishdan keyin yuklangan
   tahlillar bazadan yo'qoladi (fayllari `uploads` da qoladi).
3. SSH:
   ```bash
   sudo systemctl start $UPY $UAPI
   ```

Agar migratsiya `ko'chmagan` xatosi bilan to'xtagan bo'lsa (6-qadam),
oxirgi migratsiya to'liq bekor qilinadi (har migratsiya o'z
tranzaksiyasida) — eski 87 ta ustun joyida qoladi, oldingi 4 tasi faqat
yangi jadval/ustun qo'shgan. Eski kod bunday bazada ishlaydi, shuning uchun
faqat 1- va 3-bandlar (kodni qaytarish) yetarli, bazani tiklash shart emas.
`openpyxl` o'rnatilgan holda qolishi zarar qilmaydi.
