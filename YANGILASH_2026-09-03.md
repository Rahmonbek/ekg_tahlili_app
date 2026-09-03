# NMED — 2026-09-03 yangilanishini Linux serverga chiqarish

Bu yo'riqnoma **faqat shu kundagi** o'zgarishlar uchun. Umumiy yangilash
tartibi [YANGILASH_LINUX.md](YANGILASH_LINUX.md) da, birinchi marta
o'rnatish [DEPLOY_LINUX.md](DEPLOY_LINUX.md) da.

**Commit:** `5c16192` (`origin/main` ga push qilingan)
**Downtime:** ~1–2 daqiqa (xizmatlar restart bo'lganda)
**Baza sxemasi o'zgaradimi:** ✅ HA — yangi migratsiya bor, zaxira MAJBURIY

---

## 1. Nima o'zgardi (deploy nuqtai nazaridan)

| O'zgarish | Deploy uchun ahamiyati |
|---|---|
| **Kompleks AI xulosasi** — yangi modul | Yangi migratsiya: `combined_analyses` va `combined_analysis_items` jadvallari |
| **`/api/files` autentifikatsiyasiz ochildi** | ⚠️ Xavfsizlik o'zgarishi — nginx sozlamasini tekshiring (3-bo'lim) |
| **Token muddati 24 soat → 3 soat** | Ixtiyoriy env kaliti (4-bo'lim). Kodda standart 3 soat, ya'ni hech narsa qo'shmasangiz ham ishlaydi |
| **Rol filtrlari** (bemorlar ro'yxati) | Faqat kod — hech qanday sozlama kerak emas |
| **Passport bo'yicha qidiruv sahifasi** | Faqat kod |
| **Yangi sahifalar** (`/combined-analyses`, `/combined-analyzer`) | Faqat frontend build |

**Yangi paket YO'Q:** `requirements.txt` va `package.json` o'zgarmagan —
`pip install` / `npm ci` odatdagidek, yangi bog'liqlik yuklanmaydi.

---

## 2. Zaxira nusxa (MAJBURIY)

Yangi migratsiya bazaga ikkita jadval qo'shadi. Avval zaxira:

```bash
sudo -u postgres pg_dump med_helper_data | gzip > ~/nmed-db-$(date +%F-%H%M).sql.gz
tar czf ~/nmed-files-$(date +%F-%H%M).tar.gz -C /var/lib/nmed storage
ls -lh ~/nmed-db-*.sql.gz ~/nmed-files-*.tar.gz | tail -2
```

Fayl hajmi 0 bo'lmasligini ko'zdan kechiring.

---

## 3. ⚠️ Fayl endpointi ochiq bo'lgani — nginx tekshiruvi

`/api/files/...` endi **token talab qilmaydi** (loyiha egasining qarori,
`CLAUDE.md` da `C4-GAP-4` sifatida yozilgan). Deploydan oldin ikki narsani
tekshiring:

**a) Nginx `/api/files` uchun qo'shimcha cheklov qo'ymayaptimi?**

```bash
grep -n "api/files\|auth_request\|satisfy" /etc/nginx/sites-available/*nmed* 2>/dev/null
```

Agar `auth_request` yoki boshqa himoya bo'lsa — u endi ortiqcha, lekin
zarar qilmaydi. Hech narsa chiqmasa — hammasi joyida.

**b) Qidiruv tizimlari indekslamasin.**

Fayllar UUID yo'lda bo'lgani uchun taxmin qilib bo'lmaydi, lekin havola
biror joyga tushib qolsa indekslanishi mumkin. `nmed.uz` server blokiga
qo'shing (agar hali bo'lmasa):

```nginx
location /api/files/ {
    add_header X-Robots-Tag "noindex, nofollow" always;
    proxy_pass http://127.0.0.1:5000;
    # ... mavjud proxy sozlamalari
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 4. Env kalitlari (hammasi IXTIYORIY)

Serverda konfiguratsiya `appsettings.json` dan emas,
`EnvironmentFile=/var/www/nmed/api/.env.production` dan olinadi. Lokalda
`appsettings.json` ga qo'shilgan `Jwt:ExpiresHours` **serverga tushmaydi**
(u `.gitignore` da) — lekin kerak ham emas: `TokenService` da standart
qiymat **3 soat**.

Qiymatni boshqacha qilmoqchi bo'lsangiz:

```bash
sudo nano /var/www/nmed/api/.env.production
```

```ini
# Token necha soat amal qiladi (yozilmasa — 3)
Jwt__ExpiresHours=3
```

Python tomonda kompleks AI sozlamalari (yozilmasa standart ishlaydi):

```bash
sudo nano /var/www/nmed/python/.env
```

```ini
# Kompleks (ko'p tahlilli) xulosa uchun model va cheklovlar
AI_COMBINED_MODEL=gpt-5.6-sol
AI_COMBINED_MAX_OUTPUT_TOKENS=8000
AI_COMBINED_MAX_IMAGES=3
```

> **Muhim:** frontenddagi cookie muddati (`Host.js: TOKEN_TTL_HOURS = 3`)
> backenddagi qiymat bilan **bir xil** bo'lishi shart. `Jwt__ExpiresHours`
> ni o'zgartirsangiz, frontendda ham o'zgartirib qayta build qiling.

---

## 5. Yangilash

```bash
# 5.1 Kod
cd /var/www/nmed/source
git fetch origin
git reset --hard origin/main
git log -1 --oneline          # 5c16192 bo'lishi kerak

# 5.2 Frontend
cd frontend
npm ci
npm run build
rsync -a --delete build/ /var/www/nmed/frontend/

# 5.3 .NET backend
cd ../backend/EkgAnalyzerApi
dotnet publish -c Release -o /var/www/nmed/api

# 5.4 Python backend
rsync -a --delete /var/www/nmed/source/python_back/ /var/www/nmed/python/ \
      --exclude venv --exclude .env --exclude uploads
cd /var/www/nmed/python
venv/bin/pip install -r requirements.txt

# 5.5 Xizmatlar (migratsiya shu payt avtomatik qo'llanadi)
sudo systemctl restart nmed-api
sudo systemctl restart nmed-analysis
```

---

## 6. Migratsiya qo'llanganini tasdiqlash

`.NET` ishga tushganda `Database.Migrate()` pending migratsiyalarni o'zi
bajaradi. Tekshiring:

```bash
# Xatosiz ko'tarilganini ko'rish
journalctl -u nmed-api -n 60 --no-pager | grep -iE "migrat|error|fail"

# Migratsiya yozuvi bazaga tushganmi
sudo -u postgres psql med_helper_data -c \
  "SELECT \"MigrationId\" FROM \"__EFMigrationsHistory\" ORDER BY 1 DESC LIMIT 3;"

# Ikkita yangi jadval yaratilganmi
sudo -u postgres psql med_helper_data -c "\dt combined*"
```

Kutilgan natija:

```
20260906000000_AddCombinedAnalyses     <- ro'yxatda bo'lishi kerak

 public | combined_analyses       | table | postgres
 public | combined_analysis_items | table | postgres
```

Agar migratsiya ro'yxatda **bo'lmasa** — 9-bo'limga qarang.

---

## 7. Ishlayotganini tekshirish

### Xizmatlar

```bash
sudo systemctl status nmed-api --no-pager
sudo systemctl status nmed-analysis --no-pager

curl -I https://api.nmed.uz/api/dashboard
curl -I https://analyse.nmed.uz/docs
curl -I https://nmed.uz
```

### Fayl endpointi (tokensiz ochilishi kerak)

Bazadan bitta havola oling va tekshiring:

```bash
LINK=$(sudo -u postgres psql -tA med_helper_data -c \
  "SELECT analyse_file_link FROM ecg_analyses WHERE analyse_file_link IS NOT NULL ORDER BY id DESC LIMIT 1;")
curl -o /dev/null -s -w "kod=%{http_code} tur=%{content_type}\n" "https://api.nmed.uz/api/files${LINK}"
```

`kod=200` bo'lishi kerak (ilgari `401` edi).

### Brauzerda — shu kundagi yangiliklar

| Tekshiruv | Kutilgan natija |
|---|---|
| Login → EKG tahlilini ochish | Rasm ko'rinadi (tokensiz fayl ishlayapti) |
| Yon panel | **EKG, Holter, SMAD, Laboratoriya, Kompleks AI** — qisqa nomlar |
| Bemorlar → «Passport ma'lumotlari bilan qidirish» | Alohida sahifa ochiladi, passport + tug'ilgan sana bilan bemor topiladi |
| Bemor kartasi | Yuqorida «Kompleks AI xulosalari» paneli; qatorni `+` bilan ochib xulosani o'sha yerda o'qish mumkin |
| Bemor kartasi → tahlillarni checkbox bilan tanlash | «Birgalikda AI tahlil qilish» tugmasi faollashadi |
| «Kompleks AI» sahifasi → «Yangi kompleks tahlil» | Bemor qidiriladi → tahlillar tanlanadi → AI ga yuboriladi |
| Kompleks xulosa sahifasi | «PDF yuklab olish» ishlaydi, 3 sahifali hujjat |
| O'sha tahlillar to'plamini qayta yuborish | «Bu tahlillar allaqachon AI ga yuborilgan» ogohlantirishi, dublikat yaratilmaydi |
| Fon paneli («Tahlillar») | Tayyor bo'lgach «Ko'rish» aynan o'sha tahlilni ochadi |

### Rollar bo'yicha (muhim — ro'yxatlar o'zgardi)

| Rol | Bemorlar ro'yxatida ko'rishi kerak |
|---|---|
| Shifokor (4) | O'zi yuklagan **yoki** o'ziga biriktirilgan tahlillar bemorlari |
| Hamshira (5) | **Faqat o'zi yuklagan** tahlillar bemorlari (ilgari butun klinikani ko'rardi) |
| Admin / Direktor (2, 3) | Klinikaning barcha bemorlari |

Kamida bitta hamshira va bitta shifokor akkaunti bilan kirib tekshiring.

---

## 8. Foydalanuvchilarga aytib qo'yiladigan narsalar

* **Sessiya endi 3 soat.** Eski (24 soatlik) tokenlar o'z muddatigacha
  ishlashda davom etadi — deploy paytida hech kim majburan chiqarilmaydi.
  Keyingi kirishdan boshlab 3 soat amal qiladi. Muddati tugaganda
  foydalanuvchi avtomatik kirish sahifasiga o'tadi va sababini ko'radi.
* **Hamshiralar** endi faqat o'zi yuklagan tahlillar bemorlarini ko'radi.
  Boshqa bemor kerak bo'lsa — «Passport ma'lumotlari bilan qidirish».
* **Kompleks AI** har bir chaqiruvda pul sarflaydi (~5–8 ming token).
  Bir xil tahlillar to'plami ikkinchi marta yuborilsa yangi so'rov
  ketmaydi — mavjud xulosa ochiladi.

---

## 9. Muammolar va yechimlar

### Migratsiya qo'llanmadi

```bash
journalctl -u nmed-api -n 100 --no-pager | grep -iE "migrat|npgsql|relation"
```

Odatiy sabab — baza foydalanuvchisida `CREATE TABLE` huquqi yo'q.
Qo'lda qo'llash:

```bash
cd /var/www/nmed/source/backend/EkgAnalyzerApi
dotnet ef database update --connection "$(grep ConnectionStrings__DefaultConnection /var/www/nmed/api/.env.production | cut -d= -f2-)"
```

### Kompleks tahlil «AI tahlil qilmoqda» holatida qotib qoldi

```bash
journalctl -u nmed-analysis -n 100 --no-pager | grep -i "kompleks"
```

Tez-tez uchraydigan sabablar: `OPENAI_API_KEY` yo'q, model nomi noto'g'ri
(`AI_COMBINED_MODEL`), yoki `AI_REQUEST_TIMEOUT` dan oshib ketgan.

### Fayllar 404 qaytaryapti

Fayl saqlash ildizi sozlanmaganini bildiradi:

```bash
journalctl -u nmed-api -n 50 --no-pager | grep -i "UploadsRoot"
grep Storage__UploadsRoot /var/www/nmed/api/.env.production
```

---

## 10. Orqaga qaytarish (rollback)

```bash
# 10.1 Kodni oldingi commitga qaytarish
cd /var/www/nmed/source
git reset --hard 6e9fcc0        # shu kundan OLDINGI commit
# so'ng 5.2–5.5 bosqichlarni qayta bajaring
```

**Yangi jadvallar haqida:** `combined_analyses` va
`combined_analysis_items` eski kodga xalaqit bermaydi — ular shunchaki
ishlatilmay turadi. Ularni o'chirish SHART EMAS. Baribir kerak bo'lsa:

```bash
sudo -u postgres psql med_helper_data -c "DROP TABLE IF EXISTS combined_analysis_items, combined_analyses CASCADE;"
sudo -u postgres psql med_helper_data -c "DELETE FROM \"__EFMigrationsHistory\" WHERE \"MigrationId\" = '20260906000000_AddCombinedAnalyses';"
```

Bazani to'liq tiklash (faqat migratsiya bazani buzgan bo'lsa):

```bash
sudo systemctl stop nmed-api nmed-analysis
gunzip -c ~/nmed-db-YYYY-MM-DD-HHMM.sql.gz | sudo -u postgres psql med_helper_data
sudo systemctl start nmed-api nmed-analysis
```

> Baza va fayllar **bir sanadagi** zaxiradan birga tiklanadi.

---

## Qisqa xotira — bitta blok

```bash
# Zaxira
sudo -u postgres pg_dump med_helper_data | gzip > ~/nmed-db-$(date +%F-%H%M).sql.gz

# Yangilash
cd /var/www/nmed/source && git fetch origin && git reset --hard origin/main
cd frontend && npm ci && npm run build && rsync -a --delete build/ /var/www/nmed/frontend/
cd ../backend/EkgAnalyzerApi && dotnet publish -c Release -o /var/www/nmed/api
rsync -a --delete ../../python_back/ /var/www/nmed/python/ --exclude venv --exclude .env --exclude uploads
cd /var/www/nmed/python && venv/bin/pip install -r requirements.txt
sudo systemctl restart nmed-api nmed-analysis

# Tekshirish
sudo -u postgres psql med_helper_data -c "\dt combined*"
journalctl -u nmed-api -n 40 --no-pager | grep -iE "error|fail"
```
