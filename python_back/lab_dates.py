"""Laboratoriya tahlilining O'Z sanasi (namuna olingan / natija berilgan kun).

Statistika, dinamika va klinik qoidalar tahlil KIRITILGAN vaqtni emas,
tahlil sanasini ishlatadi (`lab_analyses.analysis_date`, `measured_at`).
Foydalanuvchi sanani formada kiritmasa, u fayldan olinadi:

* Excel — klinika shablonidagi «Дата:» katagi (`excel_to_text`), AI siz;
* PDF/rasm — AI javobidagi `analysis_date` maydoni.

Manba `lab_analyses.analysis_date_source` da: `user` (forma — AI uni
o'zgartirmaydi), `document` (fayldan — har qayta tahlilda yangilanadi).
"""
from __future__ import annotations

import datetime
import logging
import re

logger = logging.getLogger(__name__)

try:
    from zoneinfo import ZoneInfo
    TZ = ZoneInfo("Asia/Tashkent")
except Exception:  # pragma: no cover - tzdata bo'lmasa (O'zbekistonda DST yo'q)
    TZ = datetime.timezone(datetime.timedelta(hours=5))

SOURCE_USER = "user"
SOURCE_DOCUMENT = "document"

#: Bundan oldingi sana — deyarli aniq xato o'qish (tug'ilgan yil va h.k.)
MIN_DATE = datetime.date(2000, 1, 1)

_ISO = re.compile(r"^\s*(\d{4})-(\d{1,2})-(\d{1,2})")
_DMY = re.compile(r"(?<!\d)(\d{1,2})[./,\-](\d{1,2})[./,\-](\d{4}|\d{2})(?!\d)")


def today_local() -> datetime.date:
    return datetime.datetime.now(TZ).date()


def parse(value) -> datetime.date | None:
    """`date`/`datetime`/"2025-09-05"/"05.09.2025"/"5,09,25" → `date`."""
    if value is None:
        return None
    if isinstance(value, datetime.datetime):
        return value.date()
    if isinstance(value, datetime.date):
        return value
    s = str(value).strip()
    if not s:
        return None
    try:
        m = _ISO.match(s)
        if m:
            return datetime.date(int(m[1]), int(m[2]), int(m[3]))
        m = _DMY.search(s)
        if m:
            year = int(m[3])
            if year < 100:
                year += 2000
            return datetime.date(year, int(m[2]), int(m[1]))
    except ValueError:
        return None
    return None


def excel_serial(value) -> datetime.date | None:
    """Sana formatisiz katakdagi Excel seriya raqami (45905 → 2025-09-05)."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if not 36526 <= value <= 73050:  # 2000-01-01 … 2099-12-31
        return None
    return datetime.date(1899, 12, 30) + datetime.timedelta(days=int(value))


def validate(d: datetime.date | None, birthdate=None) -> datetime.date | None:
    """Tahlil sanasi bo'la oladimi: 2000-yildan keyin, kelajakda emas
    (1 kun zaxira — vaqt mintaqasi), bemorning tug'ilgan kuni emas."""
    if d is None:
        return None
    if d < MIN_DATE or d > today_local() + datetime.timedelta(days=1):
        return None
    born = parse(birthdate)
    if born and d <= born:
        return None
    return d


def to_storage(d: datetime.date) -> datetime.datetime:
    """Mahalliy yarim tun → naive UTC (Python sessiyasi UTC da yozadi;
    formadan kelgan sana ham shu ko'rinishda saqlanadi)."""
    local = datetime.datetime(d.year, d.month, d.day, tzinfo=TZ)
    return local.astimezone(datetime.timezone.utc).replace(tzinfo=None)


def pick_latest(dates) -> datetime.date | None:
    """Bir nechta fayl/varaq — eng kech sana (natija berilgan kun)."""
    valid = [d for d in dates if d]
    return max(valid) if valid else None
