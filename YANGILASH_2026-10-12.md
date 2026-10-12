# NMED — 2026-10-12 yangilanishini serverga chiqarish (WinSCP orqali)

Hammasi shu kompyuterda build qilingan. Serverga faqat tayyor papkalar
WinSCP bilan ko'chiriladi. Serverda `npm`, `dotnet publish`, `pip install`
KERAK EMAS.

- **Baza sxemasi o'zgaradi:** HA — 3 ta yangi migratsiya (backend ishga
  tushganda o'zi qo'llaydi). Zaxira MAJBURIY.
- **Kompleks AI (qo'lda + avtomatik) standart holatda YOQILGAN.**
- **Downtime:** ~1–2 daqiqa.

---

## Serverga o'tkaziladigan fayllar — `D:\git\ekg_tahlili_app\deploy_2026-10-12\`

Serverdagi versiya 2026-09-03 (`5c16192`) deb hisoblangan. O'shandan beri
paketlar o'zgarmagan, shuning uchun faqat O'ZGARGAN fayllar o'tkaziladi.

**`frontend\` → `/var/www/nmed/frontend/`** (ustidan yoziladi)
- `index.html`
- `asset-manifest.json`
- `static\` papkasi (butunligicha: `css`, `js`, `media`)

**`api\` → `/var/www/nmed/api/`** (faqat 2 fayl, ustidan yoziladi)
- `EkgAnalyzerApi.dll` — barcha backend o'zgarishlari va 3 ta migratsiya shu ichida
- `EkgAnalyzerApi.pdb`

**`python\` → `/var/www/nmed/python/`** (12 fayl, ustidan yoziladi)
- yangi: `lab_units.py`, `repair_lab_units.py`
- o'zgargan: `ai_schema.py`, `ai_translate.py`, `combined_analyses_api.py`,
  `duplicate_guard.py`, `holter_analyses_api.py`, `lab_analyse.py`,
  `lab_analyses_api.py`, `main.py`, `models.py`, `smad_analyses_api.py`

Boshqa hech narsaga TEGILMAYDI: `.env`, `.env.production`, `appsettings*.json`,
`venv`, `uploads`, boshqa `.dll` va `.py` fayllar o'z joyida qoladi.

> Server 2026-09-03 dan ESKI bo'lsa yoki ishonchingiz komil bo'lmasa —
> `deploy_2026-10-12\_toliq_nusxa\` dagi to'liq papkalarni xuddi shu tarzda
> o'tkazing (frontend 17, api 36, python 39 fayl; maxfiy fayllar ularda ham yo'q).

> Serverdagi yo'llar `DEPLOY_LINUX.md` bo'yicha yozilgan. Sizda boshqacha
> bo'lsa, 1-taskdagi buyruq haqiqiy yo'lni ko'rsatadi.

---

## Tasklar

### 1. Server yo'llarini aniqlash (SSH — PuTTY yoki WinSCP → "Open Terminal")
```bash
systemctl cat nmed-api nmed-analysis | grep -E "WorkingDirectory|EnvironmentFile"
grep -n "root " /etc/nginx/sites-available/nmed
```
`WorkingDirectory` — api va python papkasi, nginx `root` — frontend papkasi.

### 2. Zaxira olish (SSH)
```bash
D=$(date +%F-%H%M)
sudo -u postgres pg_dump med_helper_data | gzip > ~/nmed-db-$D.sql.gz
sudo tar czf ~/nmed-code-$D.tar.gz --exclude=python/venv --exclude=python/uploads -C /var/www/nmed api frontend python
ls -lh ~/nmed-*-$D.*
```
Hajmlar 0 bo'lmasin. (Bu zaxira serverda qoladi — yuklab olish shart emas.)

### 3. Kompleks AI sozlamasini tekshirish (SSH, faqat ko'rish)
```bash
grep -i AutoCombined /var/www/nmed/api/.env.production   # hech narsa chiqmasligi kerak
grep -c JWT_SECRET /var/www/nmed/python/.env             # 1 chiqishi kerak
```
`JWT_SECRET` (Python) va `Jwt__Key` (.NET) bir xil bo'lishi SHART —
avtomatik kompleks xizmati Python ga shu kalit bilan murojaat qiladi.

### 4. Nginx fayl hajmi (SSH)
```bash
grep -n client_max_body_size /etc/nginx/sites-available/nmed
```
Kamida `60M` bo'lsin — lab endi 10 tagacha faylni birdan yuboradi.

### 5. Fayllarni WinSCP bilan serverga yuklash

WinSCP'da avval: **Options → Preferences → Transfer → Transfer mode: Binary**
(matn fayllari o'zgartirilmasin).

1. Serverda home papkangizda yangi papka yarating: `nmed-yangi`
   (`/home/<siz>/nmed-yangi`).
2. Chap tomondan (`D:\git\ekg_tahlili_app\deploy_2026-10-12\`) **uchala
   papkani** — `frontend`, `api`, `python` — `nmed-yangi` ichiga torting.

> Nega to'g'ridan-to'g'ri `/var/www/nmed` ga emas: u papkalar `www-data`
> egaligida, WinSCP foydalanuvchingizda yozish huquqi bo'lmasligi mumkin.
> Joyiga 6-taskda `sudo` bilan ko'chiriladi.

### 6. Joyiga ko'chirish va qayta ishga tushirish (SSH)
```bash
sudo systemctl stop nmed-api nmed-analysis

sudo cp -r ~/nmed-yangi/frontend/. /var/www/nmed/frontend/
sudo cp -r ~/nmed-yangi/api/.      /var/www/nmed/api/
sudo cp -r ~/nmed-yangi/python/.   /var/www/nmed/python/
sudo chown -R www-data:www-data /var/www/nmed/frontend /var/www/nmed/api /var/www/nmed/python

sudo systemctl start nmed-api nmed-analysis
sudo systemctl status nmed-api nmed-analysis --no-pager
```
`cp` ustidan yozadi, lekin hech narsani o'chirmaydi — `.env.production`,
`appsettings`, `venv`, `uploads` joyida qoladi.

### 7. Migratsiya va kompleks xizmatini tekshirish (SSH)
```bash
journalctl -u nmed-api -n 100 --no-pager | grep -iE "migrat|error|fail"
sudo -u postgres psql med_helper_data -c "SELECT \"MigrationId\" FROM \"__EFMigrationsHistory\" ORDER BY 1 DESC LIMIT 3;"
journalctl -u nmed-api --since "10 min ago" --no-pager | grep -i kompleks
```
- Oxirgi 3 migratsiya: `20260909000000_AddCombinedAiTranslations`,
  `20260908000000_AddCombinedIsAuto`, `20260907000000_AddLabAnalysisFiles`.
- Log'da: `Avtomatik kompleks tahlil ishga tushdi: har 60 s, kutish 3 daq, oyna 24 soat`.
- Birinchi ishga tushishda oxirgi 24 soatda tugagan tahlillar uchun ham
  avtomatik xulosa yaratiladi (`Avto-kompleks yaratildi: #…`) — bu kutilgan.

### 8. Eski lab birliklarini tuzatish (ixtiyoriy, SSH)
```bash
cd /var/www/nmed/python
sudo -u www-data venv/bin/python repair_lab_units.py           # faqat ko'rsatadi
sudo -u www-data venv/bin/python repair_lab_units.py --apply   # natija to'g'ri bo'lsa
```

### 9. Brauzerda tekshirish (avval `Ctrl+F5`)
- `/analyse-lab` — 2–3 ta fayl biriktirib yuborish → AI natija;
- Holter/SMAD natijasi — patologik epizodlar alohida qatorlarda;
- bemor kartasi (`/patcients/:id`) va `/settings` — yangi dizayn;
- **kompleks AI (qo'lda):** bemor kartasida 2 ta tahlilni belgilab
  "Kompleks tahlil" → natija, tarjima paneli, PDF;
- **kompleks AI (avtomatik):** yangi tahlil yuklang, AI natijasi chiqqach
  3–5 daqiqa kuting → "Avtomatik" belgili yangi kompleks xulosa;
- **eskirgan xulosa:** manba qayta tahlil qilinsa — ogohlantirish va
  "Qayta tahlil qilish" tugmasi;
- **o'chirish huquqi:** boshqa shifokorning kompleks xulosasini o'chirib
  bo'lmaydi.

### 10. Tozalash
Hammasi ishlagach WinSCP'da `nmed-yangi` papkasini o'chiring. Zaxiralarni
(`nmed-db-*`, `nmed-code-*`) bir necha kun saqlang.

---

## Biror narsa buzilsa — orqaga qaytarish (SSH)
```bash
sudo systemctl stop nmed-api nmed-analysis
sudo tar xzf ~/nmed-code-YYYY-MM-DD-HHMM.tar.gz -C /var/www/nmed
sudo systemctl start nmed-api nmed-analysis
```
Bazani tiklash odatda shart emas (eski kod yangi ustunlar bilan ham
ishlaydi). Faqat migratsiya xato bersa:
```bash
gunzip -c ~/nmed-db-YYYY-MM-DD-HHMM.sql.gz | sudo -u postgres psql med_helper_data
```
