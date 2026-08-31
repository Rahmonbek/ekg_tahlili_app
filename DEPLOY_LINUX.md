# NMED platformasini Linux production serverga joylash

Bu qo'llanma NMED platformasini quyidagi domenlar bilan ishga tushirish uchun:

- `https://nmed.uz` — React frontend
- `https://api.nmed.uz` — .NET 8 backend API va SignalR hub'lar
- `https://analyse.nmed.uz` — Python FastAPI analysis backend

Development sozlamalari buzilmaydi: lokalda frontend `localhost:3000`, .NET `localhost:5000`, Python `127.0.0.1:8000` bo'lib ishlashda davom etadi.

## 1. Server talablari

Tavsiya etiladi:

- Ubuntu 22.04 LTS yoki 24.04 LTS
- 4 CPU, 8 GB RAM yoki undan yuqori
- PostgreSQL 14+
- Nginx
- .NET SDK/Runtime 8
- Node.js 20 LTS
- Python 3.10+
- Certbot

DNS yozuvlari:

```text
nmed.uz          A    SERVER_IP
www.nmed.uz      A    SERVER_IP
api.nmed.uz      A    SERVER_IP
analyse.nmed.uz  A    SERVER_IP
```

## 2. Paketlarni o'rnatish

```bash
sudo apt update
sudo apt install -y nginx postgresql postgresql-contrib python3 python3-venv python3-pip nodejs npm certbot python3-certbot-nginx unzip
```

.NET 8 o'rnatish Microsoft rasmiy reposi orqali qilinadi:

```bash
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt update
sudo apt install -y dotnet-sdk-8.0 aspnetcore-runtime-8.0
```

## 3. PostgreSQL baza yaratish

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE med_helper_data;
CREATE USER nmed_user WITH PASSWORD 'CHANGE_ME_DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE med_helper_data TO nmed_user;
\c med_helper_data
GRANT ALL ON SCHEMA public TO nmed_user;
ALTER SCHEMA public OWNER TO nmed_user;
\q
```

## 4. Loyiha papkasi

Serverda tavsiya qilingan tuzilma:

```text
/var/www/nmed/
  api/        # .NET publish output
  frontend/   # React build
  python/     # FastAPI app
```

```bash
sudo mkdir -p /var/www/nmed/api /var/www/nmed/frontend /var/www/nmed/python
sudo chown -R $USER:www-data /var/www/nmed
```

Repo'ni serverga clone qiling yoki CI/CD orqali yuklang:

```bash
git clone YOUR_REPO_URL /var/www/nmed/source
cd /var/www/nmed/source
```

## 5. Environment fayllar

### Frontend

`frontend/.env.production` production domenlari uchun tayyor:

```env
REACT_APP_API_URL=https://api.nmed.uz/api
REACT_APP_IMG_URL=https://api.nmed.uz
REACT_APP_MEDIA_URL=https://analyse.nmed.uz
```

### .NET backend

Namuna fayl:

```bash
cp backend/EkgAnalyzerApi/.env.production.example backend/EkgAnalyzerApi/.env.production
nano backend/EkgAnalyzerApi/.env.production
```

Majburiy qiymatlar:

```env
ASPNETCORE_ENVIRONMENT=Production
Kestrel__BindAddress=127.0.0.1
Kestrel__HttpPort=5000
Kestrel__EnableHttpsEndpoint=false
ConnectionStrings__DefaultConnection=Host=127.0.0.1;Port=5432;Database=med_helper_data;Username=nmed_user;Password=CHANGE_ME_DB_PASSWORD
Jwt__Key=CHANGE_ME_64_PLUS_RANDOM_CHARS
Jwt__Issuer=NMEDAnalyzerApi
Jwt__Audience=NMEDAnalyzerApiUsers
Encryption__AesKey=CHANGE_ME_BASE64_32_BYTE_AES_KEY
PythonApi__BaseUrl=http://127.0.0.1:8000
App__PublicUrl=https://nmed.uz
Cors__AllowedOrigins=https://nmed.uz,https://www.nmed.uz
```

`Jwt__Key` qiymati Python `JWT_SECRET` bilan aynan bir xil bo'lishi kerak.

AES key yaratish:

```bash
openssl rand -base64 32
```

JWT key yaratish:

```bash
openssl rand -hex 64
```

### Python backend

```bash
cp python_back/.env.production.example python_back/.env
nano python_back/.env
```

Majburiy qiymatlar:

```env
OPENAI_API_KEY=CHANGE_ME_OPENAI_API_KEY
OPENAI_MODEL=gpt-4o
DATABASE_URL=postgresql://nmed_user:CHANGE_ME_DB_PASSWORD@127.0.0.1:5432/med_helper_data
JWT_SECRET=CHANGE_ME_64_PLUS_RANDOM_CHARS
ALLOWED_ORIGINS=https://nmed.uz,https://api.nmed.uz
```

## 6. Build va publish

### Frontend

```bash
cd /var/www/nmed/source/frontend
npm ci
npm run build
rsync -a --delete build/ /var/www/nmed/frontend/
```

### .NET backend

```bash
cd /var/www/nmed/source/backend/EkgAnalyzerApi
dotnet restore
dotnet publish -c Release -o /var/www/nmed/api
cp .env.production /var/www/nmed/api/.env.production
```

Uploads va static fayllar uchun:

```bash
sudo mkdir -p /var/www/nmed/api/wwwroot
sudo chown -R www-data:www-data /var/www/nmed/api/wwwroot
```

> **MUHIM.** `.NET` va Python bitta uploads papkasidan foydalanadi. `.NET` uchun uning
> yo'lini `Storage__UploadsRoot` orqali aniq ko'rsatish **majburiy** — aks holda
> fayllar topilmaydi va PDF hisobotlarga EKG rasmlari qo'shilmaydi:
>
> ```bash
> # /var/www/nmed/api/.env.production
> Storage__UploadsRoot=/var/www/nmed/python/uploads
> App__TimeZone=Asia/Tashkent
> ```
>
> Papkaga `.NET` jarayoni ham o'qish huquqiga ega bo'lishi kerak:
> ```bash
> sudo chown -R www-data:www-data /var/www/nmed/python/uploads
> ```

### Python backend

```bash
# DIQQAT: `--delete` maqsad papkadagi ortiqcha fayllarni o'chiradi.
# Bemor fayllari endi bu papkada EMAS (STORAGE_ROOT ga ko'chirilgan),
# lekin `venv` va `.env` ni saqlab qolish uchun ular chiqarib tashlanadi.
rsync -a --delete /var/www/nmed/source/python_back/ /var/www/nmed/python/ \
      --exclude venv --exclude .env
cd /var/www/nmed/python
python3 -m venv venv
venv/bin/pip install --upgrade pip
venv/bin/pip install -r requirements.txt
sudo mkdir -p /var/www/nmed/python/uploads
sudo chown -R www-data:www-data /var/www/nmed/python/uploads
```

## 7. Database migration

Backend ishga tushganda pending migration'larni avtomatik bajaradi. Baribir productionga chiqarishdan oldin alohida tekshirish tavsiya qilinadi:

```bash
cd /var/www/nmed/source/backend/EkgAnalyzerApi
dotnet tool install --global dotnet-ef --version 7.*
export PATH="$PATH:$HOME/.dotnet/tools"
set -a
source .env.production
set +a
dotnet ef database update
```

## 8. Systemd service'lar

### .NET API service

```bash
sudo nano /etc/systemd/system/nmed-api.service
```

```ini
[Unit]
Description=NMED .NET API
After=network.target postgresql.service

[Service]
WorkingDirectory=/var/www/nmed/api
ExecStart=/usr/bin/dotnet /var/www/nmed/api/EkgAnalyzerApi.dll
EnvironmentFile=/var/www/nmed/api/.env.production
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=nmed-api
User=www-data
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false

[Install]
WantedBy=multi-user.target
```

### Python analysis service

```bash
sudo nano /etc/systemd/system/nmed-analysis.service
```

```ini
[Unit]
Description=NMED Python Analysis API
After=network.target postgresql.service

[Service]
WorkingDirectory=/var/www/nmed/python
ExecStart=/var/www/nmed/python/venv/bin/gunicorn main:app -k uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000 --workers 2 --timeout 300
Restart=always
RestartSec=10
SyslogIdentifier=nmed-analysis
User=www-data

[Install]
WantedBy=multi-user.target
```

Service'larni yoqing:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nmed-api
sudo systemctl enable --now nmed-analysis
sudo systemctl status nmed-api
sudo systemctl status nmed-analysis
```

Loglar:

```bash
journalctl -u nmed-api -f
journalctl -u nmed-analysis -f
```

## 9. Nginx konfiguratsiyasi

```bash
sudo nano /etc/nginx/sites-available/nmed
```

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name nmed.uz www.nmed.uz;

    root /var/www/nmed/frontend;
    index index.html;

    client_max_body_size 100M;

    location / {
        try_files $uri /index.html;
    }
}

server {
    listen 80;
    server_name api.nmed.uz;

    client_max_body_size 200M;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }
}

server {
    listen 80;
    server_name analyse.nmed.uz;

    client_max_body_size 200M;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/nmed /etc/nginx/sites-enabled/nmed
sudo nginx -t
sudo systemctl reload nginx
```

## 10. SSL sertifikat

```bash
sudo certbot --nginx -d nmed.uz -d www.nmed.uz -d api.nmed.uz -d analyse.nmed.uz
sudo certbot renew --dry-run
```

## 11. Ishlashini tekshirish

Backend:

```bash
curl -I https://api.nmed.uz
curl -I https://api.nmed.uz/api/dashboard
```

Python:

```bash
curl -I https://analyse.nmed.uz/docs
```

Frontend:

```bash
curl -I https://nmed.uz
```

Browserda:

- `https://nmed.uz`
- Login qilish
- EKG/Lab/Holter/SMAD fayl yuklash
- PDF download
- QR verification sahifasini login qilmasdan ochish
- SignalR notification va video call ishlashi

## 12. Yangilash tartibi

```bash
cd /var/www/nmed/source
git pull

cd frontend
npm ci
npm run build
rsync -a --delete build/ /var/www/nmed/frontend/

cd ../backend/EkgAnalyzerApi
dotnet publish -c Release -o /var/www/nmed/api
cp .env.production /var/www/nmed/api/.env.production

rsync -a --delete ../../python_back/ /var/www/nmed/python/ \
      --exclude venv --exclude .env --exclude uploads
cd /var/www/nmed/python
venv/bin/pip install -r requirements.txt

sudo systemctl restart nmed-api
sudo systemctl restart nmed-analysis
sudo nginx -t
sudo systemctl reload nginx
```

## 13. Muhim eslatmalar

- Frontend hech qachon Python API'ga bevosita tahlil so'rovi yubormaydi. Tahlillar `.NET API` proxy orqali ketadi.
- `api.nmed.uz` SignalR hub'lar uchun WebSocket proxy headerlari bilan sozlangan bo'lishi kerak.
- `.env`, `.env.production`, real `appsettings.Production.json` va API keylar git'ga commit qilinmaydi.
- `Jwt__Key` va Python `JWT_SECRET` bir xil bo'lmasa Python API tokenlarni rad qiladi.
- Nginx SSL tugatadi, .NET Kestrel esa productionda faqat `127.0.0.1:5000`da HTTP ishlaydi.

---

## Tibbiy fayllarni saqlash (STORAGE_ROOT)

**Muhim:** bemorlarning tibbiy fayllari (EKG suratlari, Holter/SMAD/laboratoriya
PDF'lari, shifokor xulosalari) **loyiha papkasi ichida saqlanmasligi kerak**.

Ilgari ular `python_back/uploads/` ichida yotardi. Bu uch xavf tug'dirardi:

1. **Deploy paytida yo'qolish** — `rsync --delete` buyrug'ida `--exclude uploads`
   unutilsa yoki xato yozilsa, barcha bemor fayllari o'chib ketardi.
2. **Zaxira nusxa chalkash** — kod va ma'lumot bir papkada bo'lgani uchun
   "kodni backup qilish" va "ma'lumotni backup qilish" ajratilmagan edi.
3. **Masshtablash imkonsiz** — ikkinchi server qo'shilsa fayllar faqat
   bittasida qolardi.

### Sozlash

```bash
# 1. Papka yaratish (kod papkasidan TASHQARIDA)
sudo mkdir -p /var/lib/nmed/storage
sudo chown -R www-data:www-data /var/lib/nmed/storage
sudo chmod 750 /var/lib/nmed/storage
```

```bash
# 2. Python: /var/www/nmed/python/.env
STORAGE_ROOT=/var/lib/nmed/storage
```

```bash
# 3. .NET: /var/www/nmed/api/.env.production
Storage__UploadsRoot=/var/lib/nmed/storage
```

Ikkala xizmat ham **ayni bitta papkani** ko'rsatishi shart — Python fayllarni
yozadi, .NET esa ularni proksi orqali beradi.

### Mavjud fayllarni ko'chirish

```bash
sudo systemctl stop nmed-python nmed-api

# Fayllarni ko'chirish (nusxa olish, keyin tekshirib o'chirish)
sudo rsync -a /var/www/nmed/python/uploads/ /var/lib/nmed/storage/
sudo chown -R www-data:www-data /var/lib/nmed/storage

# Hajmlarni solishtirib tekshirish
du -sh /var/www/nmed/python/uploads /var/lib/nmed/storage

sudo systemctl start nmed-python nmed-api
```

Tekshirib bo'lgach eski papkani o'chirish mumkin:
```bash
sudo rm -rf /var/www/nmed/python/uploads
```

### Zaxira nusxa

Endi ma'lumot bitta joyda va uni alohida zaxiralash mumkin:

```bash
# Baza + fayllar birga
pg_dump med_helper_data | gzip > /backup/db-$(date +%F).sql.gz
tar czf /backup/files-$(date +%F).tar.gz -C /var/lib/nmed storage
```

> Baza va fayllar **birga** tiklanishi kerak: bazada yozuv bo'lib fayl
> bo'lmasa yoki aksincha bo'lsa, tahlil ochilmaydi.

### Fayl tuzilmasi

Yangi fayllar sana bo'yicha papkalarga va UUID nomi bilan saqlanadi:

```
/var/lib/nmed/storage/
    ecg_analyse_files/2026/08/c599b9e3f1c64da89da0c43859e54228.jpg
    ecg_generated_files/2026/08/...
    holter_analyse_files/2026/08/...
    smad_analyse_files/2026/08/...
    lab_analyse_files/2026/08/...
    medical_diagnoses/2026/08/...
```

Asl fayl nomi ataylab saqlanmaydi — u bemor ismini o'z ichiga olishi va
manzilni taxmin qilish orqali oshkor bo'lishi mumkin edi.
Eski, tekis tuzilmadagi fayllar ham ishlashda davom etadi.
