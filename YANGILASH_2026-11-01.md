# NMED — 2026-11-01 yangilanishini serverga chiqarish (WinSCP orqali)

Hammasi shu kompyuterda build qilingan. Serverga faqat tayyor papkalar
WinSCP bilan ko'chiriladi. Serverda `npm`, `dotnet publish`, `pip install`
KERAK EMAS (bog'liqliklar 2026-09-03 dan beri o'zgarmagan).

**Nima yangi:**
- Tahlil yuklash sahifalarida bemor **ism / familiya / otasining ismi**
  bo'yicha qidiriladi (passport + tug'ilgan sana o'rniga). Yangi bemor
  uchun faqat familiya va ism majburiy, hammasi faqat lotin harflarida.
- **Vipiska** (statsionardan chiqarish epikrizi) — bemor kartasida, PDF, QR.
- Shikoyatlar spravochnigi yo'nalishlar bo'yicha; EKG da faqat kardiologik.
- 2026-10-12 dagi barcha o'zgarishlar ham shu paket ichida (agar o'sha
  yangilanish serverga chiqmagan bo'lsa ham shu paket yetarli).

- **Baza sxemasi o'zgaradi:** HA — 2 ta yangi migratsiya (backend ishga
  tushganda o'zi qo'llaydi): `AddDischargeSummaries`,
  `PatientOptionalBirthDateGender` (`patients.birthdate`, `gender` → NULL
  bo'lishi mumkin). **Zaxira MAJBURIY.**
- **Downtime:** ~1–2 daqiqa.

---

## Serverga o'tkaziladigan fayllar — `D:\git\ekg_tahlili_app\deploy_2026-11-01\`

| Papka | Ichida | Serverda qayerga |
|---|---|---|
| `frontend\` | 20 fayl: `index.html`, `asset-manifest.json`, `static\`, rasmlar | frontend papkasi (nginx `root`) |
| `api\` | 4 fayl: `EkgAnalyzerApi.dll`, `.pdb`, `.deps.json`, `.runtimeconfig.json` | .NET papkasi |
| `python\` | 38 ta `.py` (to'liq nusxa) | Python papkasi |

Boshqa hech narsaga TEGILMAYDI: `appsettings*.json` (maxfiy sozlamalar —
baza, JWT — shu yerda), `.env`, `.env.production`, `venv`, `uploads`,
`wwwroot` (klinika logotiplari), boshqa `.dll` fayllar o'z joyida qoladi.

---

## Tasklar

### 1. Server yo'llarini aniqlash (SSH — PuTTY yoki WinSCP → "Open Terminal")

Serverda ikki xil nomlash uchragan — qaysi biri ishlayotganini ko'ring:
```bash
systemctl list-units --type=service --all | grep -iE "nmed"
```
- `api.nmed.uz.service` va `analyse.nmed.uz.service` chiqsa — **A variant**
  (yo'llar `/projects/nmed/...`);
- `nmed-api.service` va `nmed-analysis.service` chiqsa — **B variant**
  (yo'llar `/var/www/nmed/...`).

Haqiqiy papkalarni tekshirish:
```bash
systemctl cat api.nmed.uz analyse.nmed.uz nmed-api nmed-analysis 2>/dev/null | grep -E "^# /|WorkingDirectory|ExecStart"
grep -rn "root " /etc/nginx/sites-enabled/ | grep -i nmed
```

Keyingi buyruqlar uchun o'zgaruvchilarni o'rnating (o'zingizdagi
qiymatlar bilan; quyida A variant):
```bash
UAPI=api.nmed.uz      ; UPY=analyse.nmed.uz
API=/projects/nmed/api.nmed.uz
PY=/projects/nmed/analyse.nmed.uz
FE=<nginx root dagi frontend papkasi>
```
B variantda: `UAPI=nmed-api; UPY=nmed-analysis; API=/var/www/nmed/api;
PY=/var/www/nmed/python; FE=/var/www/nmed/frontend`.

> SSH sessiyasi uzilsa, o'zgaruvchilarni qaytadan o'rnating.

### 2. Zaxira olish (SSH)
```bash
D=$(date +%F-%H%M)
sudo -u postgres pg_dump med_helper_data | gzip > ~/nmed-db-$D.sql.gz
sudo tar czf ~/nmed-code-$D.tar.gz --exclude='venv' --exclude='uploads' --exclude='wwwroot' "$API" "$PY" "$FE"
ls -lh ~/nmed-*-$D.*
```
Hajmlar 0 bo'lmasin. Qaysi migratsiyalar qo'llanganini yozib qo'ying:
```bash
sudo -u postgres psql med_helper_data -c "SELECT \"MigrationId\" FROM \"__EFMigrationsHistory\" ORDER BY 1 DESC LIMIT 5;"
```

### 3. Fayllarni WinSCP bilan serverga yuklash

WinSCP'da avval: **Options → Preferences → Transfer → Transfer mode: Binary**.

1. Serverda home papkangizda yangi papka yarating: `nmed-yangi`.
2. Chap tomondan (`D:\git\ekg_tahlili_app\deploy_2026-11-01\`) **uchala
   papkani** — `frontend`, `api`, `python` — `nmed-yangi` ichiga torting.

### 4. Joyiga ko'chirish va qayta ishga tushirish (SSH)
```bash
sudo systemctl stop $UAPI $UPY

sudo cp -r ~/nmed-yangi/frontend/. "$FE/"
sudo cp -r ~/nmed-yangi/api/.      "$API/"
sudo cp -r ~/nmed-yangi/python/.   "$PY/"
# Egasi o'z papkasinikidek qoladi (root yoki www-data — qaysi bo'lsa)
sudo chown -R --reference="$FE"  "$FE"
sudo chown -R --reference="$API" "$API"
sudo chown -R --reference="$PY"  "$PY"

sudo systemctl start $UAPI $UPY
sudo systemctl status $UAPI $UPY --no-pager
```
`cp` ustidan yozadi, lekin hech narsani o'chirmaydi — `appsettings`, `.env`,
`venv`, `uploads` joyida qoladi.

### 5. Migratsiyani tekshirish (SSH)
```bash
journalctl -u $UAPI -n 150 --no-pager | grep -iE "migrat|error|fail|exception"
sudo -u postgres psql med_helper_data -c "SELECT \"MigrationId\" FROM \"__EFMigrationsHistory\" ORDER BY 1 DESC LIMIT 3;"
sudo -u postgres psql med_helper_data -c "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='patients' AND column_name IN ('birthdate','gender');"
journalctl -u $UPY -n 50 --no-pager | grep -iE "error|traceback" 
```
- Oxirgi migratsiyalar: `20261031000000_PatientOptionalBirthDateGender`,
  `20261016000000_AddDischargeSummaries`, `20260909000000_AddCombinedAiTranslations`.
- `birthdate` va `gender` — `is_nullable = YES`.
- Python log'ida `Traceback` bo'lmasin.

### 6. Brauzerda tekshirish (avval `Ctrl+F5`)
- **`/analyse-lab`** (yoki EKG): «Bemor» qadamida bitta maydon — familiya
  yozib «Qidirish» → ro'yxat chiqadi → «Tanlash».
- **Kirill harflari** («Иванов») — «Faqat lotin harflarida kiriting» chiqadi.
- **«Yangi bemor qo'shish»** — faqat familiya va ism bilan saqlanadi;
  shu bemorga tahlil yuboring → AI natija keladi.
- **Tutuqsiz qidiruv:** «gofurova» → «G'OFUROVA» topiladi.
- **Bemor kartasi** — tug'ilgan sanasi yo'q bemorda yosh/jins o'rnida bo'sh,
  «Ayol» deb chiqmaydi; PDF yuklab olinadi.
- **Vipiska** — shifokor hisobi bilan, o'ziga yo'naltirilgan bemor kartasida
  «Vipiska chiqarish» → saqlash → PDF.

### 7. Tozalash
Hammasi ishlagach WinSCP'da `nmed-yangi` papkasini o'chiring. Zaxiralarni
(`nmed-db-*`, `nmed-code-*`) bir necha kun saqlang.

---

## Biror narsa buzilsa — orqaga qaytarish (SSH)
```bash
sudo systemctl stop $UAPI $UPY
sudo tar xzf ~/nmed-code-YYYY-MM-DD-HHMM.tar.gz -C /
sudo systemctl start $UAPI $UPY
```
**Diqqat:** eski kod tug'ilgan sanasi/jinsi BO'SH bemorni o'qiy olmaydi.
Yangilanishdan keyin shunday bemor yaratilgan bo'lsa, eski kodga
qaytishdan OLDIN ularga shartli qiymat yozing:
```bash
sudo -u postgres psql med_helper_data -c "UPDATE patients SET birthdate = DATE '1900-01-01' WHERE birthdate IS NULL; UPDATE patients SET gender = TRUE WHERE gender IS NULL;"
```
Bazani to'liq tiklash faqat migratsiya xato bersa kerak:
```bash
gunzip -c ~/nmed-db-YYYY-MM-DD-HHMM.sql.gz | sudo -u postgres psql med_helper_data
```
