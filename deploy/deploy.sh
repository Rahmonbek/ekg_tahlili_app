#!/bin/bash
# =============================================================
# NMED — Deploy skripti
# Ishlatish: bash deploy.sh [--skip-frontend] [--skip-backend] [--skip-python]
# =============================================================

set -e  # Xato bo'lsa skript to'xtasin

PROJECT_DIR="/opt/nmed/source"
FRONTEND_DEST="/var/www/nmed/frontend"
BACKEND_DEST="/opt/nmed/backend"
PYTHON_DEST="/opt/nmed/python"
PYTHON_VENV="/opt/nmed/python-venv"
LOG_DIR="/var/log/nmed"

# Bayroqlar
SKIP_FRONTEND=false
SKIP_BACKEND=false
SKIP_PYTHON=false

for arg in "$@"; do
    case $arg in
        --skip-frontend) SKIP_FRONTEND=true ;;
        --skip-backend)  SKIP_BACKEND=true  ;;
        --skip-python)   SKIP_PYTHON=true   ;;
    esac
done

echo "======================================================"
echo "  NMED Deploy — $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================"

# ─── 0. Papkalarni tayyorlash ────────────────────────────────
echo "[0/5] Papkalar tekshirilmoqda..."
sudo mkdir -p "$FRONTEND_DEST" "$BACKEND_DEST" "$PYTHON_DEST" "$LOG_DIR"
sudo chown -R www-data:www-data "$FRONTEND_DEST" "$LOG_DIR"

# ─── 1. Kodni yangilash ──────────────────────────────────────
echo "[1/5] Git pull..."
cd "$PROJECT_DIR"
git pull origin main

# ─── 2. Frontend ─────────────────────────────────────────────
if [ "$SKIP_FRONTEND" = false ]; then
    echo "[2/5] Frontend build qilinmoqda..."
    cd "$PROJECT_DIR/frontend"
    npm ci --silent
    npm run build
    echo "  → Build tayyor, ko'chirilmoqda..."
    sudo rm -rf "$FRONTEND_DEST"/*
    sudo cp -r build/* "$FRONTEND_DEST/"
    sudo chown -R www-data:www-data "$FRONTEND_DEST"
    echo "  ✓ Frontend deploy qilindi"
else
    echo "[2/5] Frontend o'tkazib yuborildi"
fi

# ─── 3. .NET Backend ─────────────────────────────────────────
if [ "$SKIP_BACKEND" = false ]; then
    echo "[3/5] .NET backend publish qilinmoqda..."
    cd "$PROJECT_DIR/backend/EkgAnalyzerApi"

    # Publish
    dotnet publish -c Release -o "$BACKEND_DEST" --no-self-contained -r linux-x64
    sudo chown -R www-data:www-data "$BACKEND_DEST"

    # EF Core migratsiyalarni ishlatish
    echo "  → Database migratsiyasi ishlatilmoqda..."
    dotnet ef database update \
        --project . \
        --connection "$(grep ConnectionStrings__DefaultConnection /etc/nmed/backend.env | cut -d= -f2-)"

    # Servisni qayta ishga tushirish
    sudo systemctl restart nmed-backend
    echo "  ✓ .NET backend deploy qilindi"
else
    echo "[3/5] .NET backend o'tkazib yuborildi"
fi

# ─── 4. Python Backend ───────────────────────────────────────
if [ "$SKIP_PYTHON" = false ]; then
    echo "[4/5] Python backend yangilanmoqda..."

    # Virtual environment (birinchi marta)
    if [ ! -d "$PYTHON_VENV" ]; then
        echo "  → Virtual environment yaratilmoqda..."
        python3 -m venv "$PYTHON_VENV"
    fi

    # Fayllarni ko'chirish
    rsync -a --delete \
        --exclude '__pycache__' \
        --exclude '*.pyc' \
        --exclude '.env' \
        "$PROJECT_DIR/python_back/" "$PYTHON_DEST/"

    # Kutubxonalarni yangilash
    "$PYTHON_VENV/bin/pip" install -q --upgrade pip
    "$PYTHON_VENV/bin/pip" install -q -r "$PYTHON_DEST/requirements.txt"

    sudo chown -R www-data:www-data "$PYTHON_DEST" "$PYTHON_VENV"

    # Servisni qayta ishga tushirish
    sudo systemctl restart nmed-python
    echo "  ✓ Python backend deploy qilindi"
else
    echo "[4/5] Python backend o'tkazib yuborildi"
fi

# ─── 5. Nginx reload ─────────────────────────────────────────
echo "[5/5] Nginx qayta yuklanmoqda..."
sudo nginx -t && sudo systemctl reload nginx

# ─── Holat tekshiruvi ────────────────────────────────────────
echo ""
echo "======================================================"
echo "  Servislar holati:"
echo "======================================================"
systemctl is-active --quiet nmed-backend && echo "  ✓ nmed-backend: ishlayapti" || echo "  ✗ nmed-backend: XATO!"
systemctl is-active --quiet nmed-python  && echo "  ✓ nmed-python:  ishlayapti" || echo "  ✗ nmed-python:  XATO!"
systemctl is-active --quiet nginx        && echo "  ✓ nginx:        ishlayapti" || echo "  ✗ nginx:        XATO!"
echo "======================================================"
echo "  Deploy tugadi: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================"
