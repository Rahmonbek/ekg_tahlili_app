"""Bir xil faylning qayta yuklanishini aniqlaydi (T-096).

Muammo
------
Auditda bitta `ecg_test.jpg` fayli **besh marta** yuklangani va har safar
yangi tahlil yozuvi yaratilgani aniqlandi — bir xil bemor uchun, bir xil
sana bilan, hech qanday ogohlantirishsiz.

Bu sun'iy holat emas, amalda doim uchraydi:

* laborant sekin internetda tugmani ikki marta bosadi;
* "xato bo'ldi shekilli" deb o'ylab qaytadan yuklaydi;
* smenani topshirayotgan xodim oldingisi yuklaganini bilmaydi.

Oqibati ikki tomonlama: bemor kartasida bir xil EKG bir necha marta
turadi (shifokor qaysi biri haqiqiy natija ekanini bilmaydi) va har bir
nusxa sun'iy intellektga alohida yuboriladi — xarajat shuncha barobar
oshadi.

Yechim
------
Faylning **mazmuni** bo'yicha SHA-256 xeshi hisoblanadi va bazaga
yoziladi. Fayl nomi bo'yicha taqqoslash ishlamaydi: nom o'zgaradi
(`ecg.jpg` → `ecg (1).jpg`), mazmuni esa o'sha bo'lib qolaveradi.

Takror topilsa so'rov **to'xtatiladi va 409 qaytariladi** — foydalanuvchi
mavjud tahlilga o'tishi yoki "baribir yuklash" ni tanlashi mumkin. Qaror
foydalanuvchida qoladi, chunki qonuniy takrorlar ham bo'ladi: masalan
bemor tekshiruvni takrorlagan va apparat aynan bir xil fayl bergan.
"""

import datetime
import hashlib
import logging

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

#: Shu kunlardan eski tahlillar takror deb hisoblanmaydi. Bemor bir oydan
#: keyin tekshiruvni takrorlashi mumkin va bu mutlaqo qonuniy holat —
#: eski yozuvni ko'rsatib ogohlantirish faqat xalaqit berardi.
DUPLICATE_WINDOW_DAYS = 30

#: Tahlil turi → (jadval nomi, hujjat raqami ustuni)
_TABLES = {
    "ecg": "ecg_analyses",
    "lab": "lab_analyses",
    "holter": "holter_analyses",
    "smad": "smad_analyses",
}


def file_hash(content: bytes) -> str:
    """Fayl mazmunining SHA-256 xeshi (64 ta o'n oltilik belgi)."""
    return hashlib.sha256(content).hexdigest()


def find_duplicate(db: Session, kind: str, patcient_id: int, digest: str):
    """Shu bemorda shu mazmunli fayl allaqachon bormi?

    O'chirilgan yozuvlar hisobga olinmaydi: xodim tahlilni ataylab
    o'chirib, to'g'ri ma'lumot bilan qayta yuklashi mumkin — bunda
    ogohlantirish faqat xalaqit beradi.

    Topilsa `{"id", "document_number", "created_at"}` qaytaradi.
    """
    table = _TABLES[kind]
    since = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(
        days=DUPLICATE_WINDOW_DAYS
    )

    row = db.execute(
        text(
            f"""
            SELECT id, document_number, created_at
              FROM {table}
             WHERE patient_id = :pid   -- baza ustuni tuzatildi (T-068)
               AND file_hash   = :digest
               AND deleted_at IS NULL
               AND created_at >= :since
             ORDER BY created_at DESC
             LIMIT 1
            """
        ),
        {"pid": patcient_id, "digest": digest, "since": since},
    ).first()

    if row is None:
        return None

    return {
        "id": row[0],
        "document_number": row[1],
        "created_at": row[2].isoformat() if row[2] else None,
    }


def check(db: Session, kind: str, patcient_id: int, content: bytes,
          force: bool = False) -> str:
    """Takrorni tekshiradi va faylning xeshini qaytaradi.

    Takror topilsa va `force` berilmagan bo'lsa `HTTPException(409)`
    ko'tariladi. Javob tanasi frontend uchun strukturali:

        {
          "code": "DUPLICATE_FILE",
          "message": "...",
          "existing": {"id": 96, "document_number": "...", "created_at": "..."}
        }

    `force=True` — foydalanuvchi ogohlantirishni ko'rib, ataylab davom
    etishni tanlagan.
    """
    digest = file_hash(content)

    if force:
        logger.info(
            "%s: takroriy fayl foydalanuvchi tasdig'i bilan qabul qilindi "
            "(bemor=%s, xesh=%s)", kind, patcient_id, digest[:12],
        )
        return digest

    existing = find_duplicate(db, kind, patcient_id, digest)
    if existing is None:
        return digest

    logger.info(
        "%s: takroriy fayl aniqlandi (bemor=%s, mavjud tahlil=%s)",
        kind, patcient_id, existing["id"],
    )
    raise HTTPException(
        status_code=409,
        detail={
            "code": "DUPLICATE_FILE",
            "message": (
                "Aynan shu fayl shu bemor uchun allaqachon yuklangan."
            ),
            "existing": existing,
        },
    )
