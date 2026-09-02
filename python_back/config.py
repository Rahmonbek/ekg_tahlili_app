"""
NMED Python API — Markaziy konfiguratsiya moduli.
Barcha maxfiy kalitlar va sozlamalar shu yerdan o'qiladi.
Hech qanday maxfiy ma'lumotni kod ichiga yozmang — faqat .env faylida saqlang.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# .env faylini yuklash (python_back/ papkasidan)
#
# `override=True` — `.env` fayli YAGONA haqiqiy manba. U tizim (OS/User)
# darajasidagi muhit o'zgaruvchilarini **bosib o'tadi**.
#
# Nima uchun: OS'da eskirib qolgan `OPENAI_API_KEY` (masalan, Windows User
# muhit o'zgaruvchisi) `.env`'dagi yangi kalitni jimgina yashirar edi va
# xizmat yaroqsiz kalit bilan ishlab, barcha tahlillar 401 bilan tugardi.
# Endi kalitni faqat `.env` faylida yangilash yetarli — restart qiling,
# `os.environ`'dagi eski qiymat e'tiborga olinmaydi.
#
# `config.py` — .env'ni `os.environ`'ga yuklaydigan yagona joy; qolgan
# modullar (`ai_config.py` va h.k.) `os.getenv` orqali shundan o'qiydi.
BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env", override=True)


# ─────────────── OpenAI ───────────────
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o")

if not OPENAI_API_KEY:
    raise RuntimeError(
        "OPENAI_API_KEY topilmadi! "
        "python_back/.env fayliga OPENAI_API_KEY=sk-... qo'shing."
    )


# ─────────────── Anthropic ───────────────
ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")


# ─────────────── PostgreSQL ───────────────
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/med_helper_data"
)


# ─────────────── JWT (Python API token tekshiruvi uchun) ───────────────
JWT_SECRET: str = os.getenv("JWT_SECRET", "")
JWT_ALGORITHM: str = "HS256"

if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET topilmadi! "
        "python_back/.env fayliga JWT_SECRET=<.NET Jwt:Key bilan bir xil qiymat> qo'shing. "
        "C5 talabi: JWT_SECRET bo'lmasa Python API ishga tushmaydi."
    )


# ─────────────── CORS ───────────────
ALLOWED_ORIGINS: list[str] = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,https://nmed.uz"
    ).split(",")
    if origin.strip()
]


# ─────────────── Fayl yuklash papkalari ───────────────
UPLOAD_BASE_DIR: Path = BASE_DIR / "uploads"
