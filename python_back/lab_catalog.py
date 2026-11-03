"""Laboratoriya ko'rsatkichlari katalogi — `lab_value_types` (yagona manba).

Ilgari ko'rsatkichlar ro'yxati to'qqiz joyda alohida yozilardi: `lab_analyses`
ustunlari, SQLAlchemy modeli, `ai_schema.LAB_COLUMNS`, AI prompti, .NET model,
DTO, servis, PDF… Yangi ko'rsatkich qo'shish migratsiya va shu joylarning
hammasini o'zgartirishni talab qilardi, bittasi unutilsa ko'rsatkich jimgina
yo'qolardi.

Endi qiymatlar `lab_analysis_values` jadvalida (har biri alohida qator), va
katalog — `lab_value_types`. Bu modul katalogni o'qib, keshlaydi va undan:

* AI javob sxemasidagi `column_name` `enum` ini (`columns`),
* AI promptidagi ko'rsatkichlar ro'yxatini (`prompt_lines`),
* me'yor birliklari va chegaralarini (`get`, `flag_for`)

beradi. Yangi ko'rsatkich = `lab_value_types` ga bitta qator (`ai_hint` bilan).
"""
from __future__ import annotations

import logging
import re
import threading
import time
from dataclasses import dataclass

from sqlalchemy import text

logger = logging.getLogger(__name__)

_CACHE_TTL = 600  # soniya — katalog deyarli o'zgarmaydi
_lock = threading.Lock()
_cache: dict = {"types": None, "at": 0.0}


@dataclass(frozen=True)
class LabType:
    id: int
    column_name: str
    name_uz: str | None
    measure: str | None
    min_male: float | None
    max_male: float | None
    min_female: float | None
    max_female: float | None
    value_kind: str
    sort_order: int
    ai_hint: str | None
    # Fayldagi nomni katalogga bog'lash uchun (`lab_aliases`) — testlarda ixtiyoriy
    name_ru: str | None = None
    name_en: str | None = None
    category: str | None = None


def _load(db) -> dict[str, LabType]:
    rows = db.execute(text(
        "SELECT id, column_name, name_uz, measure, normal_min_male, normal_max_male, "
        "normal_min_female, normal_max_female, COALESCE(value_kind, 'numeric'), "
        "COALESCE(sort_order, 0), ai_hint, name_ru, name_en, category "
        "FROM lab_value_types WHERE column_name IS NOT NULL ORDER BY sort_order, id"
    )).fetchall()
    out: dict[str, LabType] = {}
    for r in rows:
        out[r[1]] = LabType(
            id=r[0], column_name=r[1], name_uz=r[2], measure=r[3],
            min_male=r[4], max_male=r[5], min_female=r[6], max_female=r[7],
            value_kind=r[8], sort_order=r[9], ai_hint=r[10],
            name_ru=r[11], name_en=r[12], category=r[13],
        )
    return out


def catalog(db) -> dict[str, LabType]:
    """`{column_name: LabType}` — katalog tartibida (10 daqiqa kesh)."""
    now = time.monotonic()
    with _lock:
        if _cache["types"] is None or now - _cache["at"] > _CACHE_TTL:
            _cache["types"] = _load(db)
            _cache["at"] = now
            logger.info("Lab katalogi yuklandi: %d ta ko'rsatkich", len(_cache["types"]))
        return _cache["types"]


def invalidate() -> None:
    """Keshni tozalaydi (katalog o'zgargandan keyin, testlar uchun)."""
    with _lock:
        _cache["types"] = None


def columns(db) -> list[str]:
    """AI sxemasidagi `column_name` uchun ruxsat etilgan qiymatlar."""
    return list(catalog(db).keys())


def canonical_units(db) -> dict[str, str | None]:
    """`{column_name: measure}` — me'yor birligi."""
    return {c: t.measure for c, t in catalog(db).items()}


def prompt_lines(db) -> str:
    """AI promptidagi ro'yxat: `kalit - tavsif` (har biri alohida qatorda)."""
    lines = []
    for column, t in catalog(db).items():
        hint = (t.ai_hint or t.name_uz or column).strip()
        if t.ai_hint is None and t.measure:
            hint += f" ({t.measure})"
        lines.append(f"{column} - {hint}")
    return "\n".join(lines)


def norm_bounds(t: LabType, gender: bool | None) -> tuple[float | None, float | None]:
    """Bemor jinsiga mos me'yor chegaralari.

    Jinsi noma'lum bo'lsa ikkala me'yorning birlashmasi olinadi — NULL jinsni
    erkak yoki ayol deb hisoblash noto'g'ri baho berardi. Biror jinsning shu
    tomondagi chegarasi YO'Q bo'lsa (masalan FSG/LG ning ayol me'yori siklga
    bog'liq, ataylab NULL), birlashmada ham o'sha tomonda chegara yo'q:
    aks holda faqat erkak me'yori qolib, menopauzadagi ayolning FSG 60 si
    "yuqori" bo'lardi (L-17).
    """
    if gender is True:
        return t.min_male, t.max_male
    if gender is False:
        return t.min_female, t.max_female
    lo = None if (t.min_male is None or t.min_female is None) else min(t.min_male, t.min_female)
    hi = None if (t.max_male is None or t.max_female is None) else max(t.max_male, t.max_female)
    return lo, hi


# ─── Sifat natijasini matndan tasniflash ──────────────────────────────────────
# Migratsiya `20261102000000_LabValueReferenceAndKind` dagi SQL bilan bir xil
# (tartib muhim: "shubhali" birinchi, "не обнаруж" — "обнаруж" dan oldin).
# `result_kind` siz eski JSON dan qatorlar qayta yozilganda
# (`repair_lab_units.py`) migratsiya qo'ygan holat yo'qolmasligi uchun (L-24).
# Yagona farq: "Non-reactive" (defis bilan) — SQL da "reactiv" ga tushib
# MUSBAT bo'lardi, bu yerda manfiy.
_QUAL_EQUIVOCAL = re.compile(r"(сомнит|shubha|equivoc|\(\+-\)|\(-\+\)|±)", re.IGNORECASE)
_QUAL_NEGATIVE = re.compile(r"(отриц|manfiy|negativ|non-?react|не обнаруж|\(-\))", re.IGNORECASE)
_QUAL_POSITIVE = re.compile(r"(полож|musbat|positiv|reactiv|обнаруж|\(\+\))", re.IGNORECASE)


def classify_qualitative(text_value, value) -> str:
    """Sifat natijasi holati: matn bo'yicha, matn yo'q bo'lsa indeks (COI ≥ 1)."""
    if isinstance(text_value, str) and text_value.strip():
        if _QUAL_EQUIVOCAL.search(text_value):
            return "EQUIVOCAL"
        if _QUAL_NEGATIVE.search(text_value):
            return "NEGATIVE"
        if _QUAL_POSITIVE.search(text_value):
            return "POSITIVE"
        return "UNKNOWN"
    if value is not None:
        try:
            return "POSITIVE" if float(value) >= 1 else "NEGATIVE"
        except (TypeError, ValueError):
            return "UNKNOWN"
    return "UNKNOWN"


#: Sifat natijasi holati → baho (shubhali ham e'tibor talab qiladi, lekin
#: `result_kind` da musbatdan alohida saqlanadi)
_KIND_FLAG = {"NEGATIVE": 0, "POSITIVE": 1, "EQUIVOCAL": 1}


def flag_for(
    t: LabType,
    value,
    gender: bool | None,
    unit_mismatch: bool,
    ref_low=None,
    ref_high=None,
    result_kind: str | None = None,
    unit_suspect: bool = False,
) -> tuple[int | None, str | None]:
    """Baho va uning manbasi: `(-1 | 0 | 1 | None, "lab" | "catalog" | None)`.

    * Birligi shubhali qiymat (`unit_suspect`, `lab_units`) — BAHOLANMAYDI,
      laboratoriya me'yori bo'lsa ham: qiymat qaysi birlikda ekani noma'lum.
    * Sifat natijasi — `result_kind` bo'yicha.
    * Sonli — avval LABORATORIYANING o'z me'yori (`ref_low`/`ref_high`,
      fayldan): me'yor assayga xos, klinik qoidalar ham "laboratoriya
      ULN/LLN" ni talab qiladi. Me'yor qiymat bilan bir birlikda bo'lgani
      uchun birligi aylantirilmagan qiymat ham shu bilan baholanadi.
    * Fayldagi me'yor bo'lmasa — katalog me'yori (birligi mos bo'lsa).
    """
    if t.value_kind == "code":
        return None, None
    if unit_suspect and t.value_kind != "qualitative":
        return None, None
    if t.value_kind == "qualitative":
        flag = _KIND_FLAG.get(result_kind or "")
        return (flag, "lab") if flag is not None else (None, None)
    if value is None:
        return None, None
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None, None

    if ref_low is not None or ref_high is not None:
        lo, hi, source = ref_low, ref_high, "lab"
    elif unit_mismatch:
        return None, None
    else:
        (lo, hi), source = norm_bounds(t, gender), "catalog"
    if lo is None and hi is None:
        return None, None
    if lo is not None and num < float(lo):
        return -1, source
    if hi is not None and num > float(hi):
        return 1, source
    return 0, source
