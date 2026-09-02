# NMED — serverdagi versiyani yangilash (qisqa yo'riqnoma)

Bu qo'llanma **allaqachon o'rnatilgan** serverni GitHub'dagi eng oxirgi
versiyaga yangilash uchun. Birinchi marta o'rnatish uchun
[DEPLOY_LINUX.md](DEPLOY_LINUX.md) dan foydalaning.

Sozlama (DEPLOY_LINUX.md dan):

- Kod: `/var/www/nmed/source`
- .NET publish: `/var/www/nmed/api`
- Frontend build: `/var/www/nmed/frontend`
- Python: `/var/www/nmed/python`
- Xizmatlar: `nmed-api`, `nmed-analysis`
- Migratsiyalar backend ishga tushganda **avtomatik** qo'llanadi.

Downtime: ~1–2 daqiqa (xizmatlar restart bo'lganda). Barcha buyruqlar serverda
SSH orqali bajariladi.

---

## 0. Zaxira nusxa (MAJBURIY — migratsiyadan oldin)

Bu oy sxema o'zgarishlari (yangi lab ustunlari va h.k.) bor, shuning uchun
avval baza va fayllarni zaxiralang:

```bash
sudo -u postgres pg_dump med_helper_data | gzip > ~/nmed-db-$(date +%F-%H%M).sql.gz
tar czf ~/nmed-files-$(date +%F-%H%M).tar.gz -C /var/lib/nmed storage
```

---

## 1. Eng oxirgi kodni olish

```bash
cd /var/www/nmed/source
git fetch origin
git reset --hard origin/main    # yoki: git pull
git log -1 --oneline            # oxirgi commit to'g'ri ekanini tekshiring
```

> `.env`, `.env.production` fayllar git'da yo'q — ular saqlanib qoladi,
> yangilash ularga tegmaydi.

---

## 2. Frontend'ni qayta qurish

```bash
cd /var/www/nmed/source/frontend
npm ci
npm run build
rsync -a --delete build/ /var/www/nmed/frontend/
```

---

## 3. .NET backend'ni qayta publish qilish

```bash
cd /var/www/nmed/source/backend/EkgAnalyzerApi
dotnet publish -c Release -o /var/www/nmed/api
```

> `.env.production` allaqachon `/var/www/nmed/api/` da bor — qayta nusxalash
> shart emas. (Yangi kalit qo'shilgan bo'lsa — 6-bo'limga qarang.)

---

## 4. Python backend'ni yangilash

```bash
rsync -a --delete /var/www/nmed/source/python_back/ /var/www/nmed/python/ \
      --exclude venv --exclude .env --exclude uploads
cd /var/www/nmed/python
venv/bin/pip install -r requirements.txt
```

---

## 5. Xizmatlarni qayta ishga tushirish

`.NET` ishga tushganda pending migratsiyalarni o'zi qo'llaydi (bu oydagi yangi
lab ustunlari va boshqalar shu payt yaratiladi).

```bash
sudo systemctl restart nmed-api
sudo systemctl restart nmed-analysis

# Holatni tekshirish
sudo systemctl status nmed-api --no-pager
sudo systemctl status nmed-analysis --no-pager
```

Frontend statik fayl — nginx reload odatda shart emas. Faqat nginx sozlamasini
o'zgartirgan bo'lsangiz:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 6. Yangi environment kalitlari (kerak bo'lsa)

Agar bu oy yangi majburiy kalit qo'shilgan bo'lsa, xizmat log'da xato beradi.
Namuna fayllarni o'zingizникi bilan solishtiring:

```bash
diff <(grep -oE '^[A-Za-z_]+' /var/www/nmed/source/backend/EkgAnalyzerApi/.env.production.example | sort) \
     <(grep -oE '^[A-Za-z_]+' /var/www/nmed/api/.env.production | sort)

diff <(grep -oE '^[A-Za-z_]+' /var/www/nmed/source/python_back/.env.production.example | sort) \
     <(grep -oE '^[A-Za-z_]+' /var/www/nmed/python/.env | sort)
```

Chapda ko'ringan (`<`) kalitlar sizda yo'q — mos faylga qo'shing va tegishli
xizmatni restart qiling.

---

## 7. Ishlayotganini tekshirish

```bash
# Migratsiya xatosiz o'tganini va boshqa xatolar yo'qligini ko'rish
journalctl -u nmed-api -n 50 --no-pager
journalctl -u nmed-analysis -n 50 --no-pager

# HTTP javoblar
curl -I https://api.nmed.uz/api/dashboard
curl -I https://analyse.nmed.uz/docs
curl -I https://nmed.uz
```

Brauzerda: login → EKG/Lab fayl yuklash → AI natija → PDF yuklab olish →
(yangi) laboratoriya qo'shimcha ko'rsatkichlari va dinamika grafigi.

---

## 8. Biror narsa buzilsa — orqaga qaytarish (rollback)

```bash
# Kodni oldingi commitga qaytarish
cd /var/www/nmed/source
git reset --hard <oldingi_commit_hash>
# so'ng 2–5 bosqichlarni qayta bajaring

# Bazani zaxiradan tiklash (faqat kerak bo'lsa — migratsiya buzsa)
sudo systemctl stop nmed-api nmed-analysis
gunzip -c ~/nmed-db-YYYY-MM-DD-HHMM.sql.gz | sudo -u postgres psql med_helper_data
sudo systemctl start nmed-api nmed-analysis
```

> Baza va fayllar **birga** tiklanadi — ikkovini bir sanadagi zaxiradan oling.

---

## Qisqa xotira (keyingi safar uchun bitta blok)

```bash
cd /var/www/nmed/source && git reset --hard origin/main
cd frontend && npm ci && npm run build && rsync -a --delete build/ /var/www/nmed/frontend/
cd ../backend/EkgAnalyzerApi && dotnet publish -c Release -o /var/www/nmed/api
rsync -a --delete ../../python_back/ /var/www/nmed/python/ --exclude venv --exclude .env --exclude uploads
cd /var/www/nmed/python && venv/bin/pip install -r requirements.txt
sudo systemctl restart nmed-api nmed-analysis
```
