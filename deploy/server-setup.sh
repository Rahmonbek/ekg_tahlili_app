#!/bin/bash
# =============================================================
# NMED — Serverda birinchi marta o'rnatish skripti
# Ubuntu 22.04 LTS uchun
# Ishlatish: sudo bash server-setup.sh
# =============================================================

set -e

echo "======================================================"
echo "  NMED Server — Dastlabki o'rnatish"
echo "======================================================"

# ─── 1. Tizim paketlari ──────────────────────────────────────
echo "[1/9] Tizim yangilanmoqda..."
apt-get update -q
apt-get upgrade -y -q

apt-get install -y -q \
    curl wget git unzip \
    nginx \
    certbot python3-certbot-nginx \
    postgresql postgresql-contrib \
    python3 python3-pip python3-venv \
    rsync \
    poppler-utils        # pdf2image uchun

# ─── 2. .NET 8 ────────────────────────────────────────────────
echo "[2/9] .NET 8 o'rnatilmoqda..."
if ! command -v dotnet &> /dev/null; then
    wget -q https://dot.net/v1/dotnet-install.sh
    bash dotnet-install.sh --channel 8.0 --install-dir /usr/local/dotnet
    ln -sf /usr/local/dotnet/dotnet /usr/bin/dotnet
    rm dotnet-install.sh
fi
dotnet --version

# ─── 3. Papkalar ─────────────────────────────────────────────
echo "[3/9] Papkalar yaratilmoqda..."
mkdir -p /opt/nmed/{source,backend,python,python-venv}
mkdir -p /var/www/nmed/frontend
mkdir -p /var/log/nmed
mkdir -p /etc/nmed

# ─── 4. Kodni olish ──────────────────────────────────────────
echo "[4/9] Git repository klonlanmoqda..."
if [ ! -d "/opt/nmed/source/.git" ]; then
    git clone https://github.com/YOUR_USERNAME/ekg_tahlili_app.git /opt/nmed/source
else
    echo "  → Repository allaqachon mavjud, git pull..."
    cd /opt/nmed/source && git pull
fi

# ─── 5. Secrets fayllar ──────────────────────────────────────
echo "[5/9] Secrets fayllar yaratilmoqda..."
if [ ! -f "/etc/nmed/backend.env" ]; then
    cp /opt/nmed/source/deploy/backend.env.example /etc/nmed/backend.env
    chmod 600 /etc/nmed/backend.env
    chown root:root /etc/nmed/backend.env
    echo ""
    echo "  ⚠  /etc/nmed/backend.env ga haqiqiy qiymatlarni kiriting!"
    echo "     nano /etc/nmed/backend.env"
fi

if [ ! -f "/etc/nmed/python.env" ]; then
    cp /opt/nmed/source/deploy/python.env.example /etc/nmed/python.env
    chmod 600 /etc/nmed/python.env
    chown root:root /etc/nmed/python.env
    echo ""
    echo "  ⚠  /etc/nmed/python.env ga haqiqiy qiymatlarni kiriting!"
    echo "     nano /etc/nmed/python.env"
fi

# ─── 6. PostgreSQL ───────────────────────────────────────────
echo "[6/9] PostgreSQL sozlanmoqda..."
systemctl enable postgresql
systemctl start postgresql
# Baza va user allaqachon mavjud bo'lsa xato bermaydi
sudo -u postgres psql -c "CREATE DATABASE med_helper_data;" 2>/dev/null || true
echo "  → Parolni /etc/nmed/backend.env da o'rnating"

# ─── 7. Nginx ────────────────────────────────────────────────
echo "[7/9] Nginx sozlanmoqda..."
cp /opt/nmed/source/deploy/nginx.conf /etc/nginx/sites-available/nmed.conf
ln -sf /etc/nginx/sites-available/nmed.conf /etc/nginx/sites-enabled/nmed.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx

# ─── 8. Systemd servislari ───────────────────────────────────
echo "[8/9] Systemd servislari o'rnatilmoqda..."
cp /opt/nmed/source/deploy/nmed-backend.service /etc/systemd/system/
cp /opt/nmed/source/deploy/nmed-python.service  /etc/systemd/system/
systemctl daemon-reload
systemctl enable nmed-backend nmed-python

# ─── 9. SSL (Let's Encrypt) ──────────────────────────────────
echo "[9/9] SSL sertifikatlari olishdan oldin DNS tekshiring!"
echo ""
echo "  Quyidagi buyruqlarni qo'lda bajaring:"
echo "  sudo certbot --nginx -d nmed.uz -d www.nmed.uz"
echo "  sudo certbot --nginx -d api.nmed.uz"
echo ""

# ─── Huquqlar ────────────────────────────────────────────────
chown -R www-data:www-data /var/www/nmed /var/log/nmed
chown -R www-data:www-data /opt/nmed/backend /opt/nmed/python /opt/nmed/python-venv 2>/dev/null || true

echo "======================================================"
echo "  O'rnatish tugadi!"
echo ""
echo "  Keyingi qadamlar:"
echo "  1. nano /etc/nmed/backend.env   — .NET secrets"
echo "  2. nano /etc/nmed/python.env    — Python secrets"
echo "  3. SSL sertifikatlarini oling"
echo "  4. bash /opt/nmed/source/deploy/deploy.sh"
echo "======================================================"
