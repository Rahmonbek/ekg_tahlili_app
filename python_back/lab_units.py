"""Laboratoriya ko'rsatkichlarini me'yor birligiga keltirish.

Muammo
------
AI fayldagi qiymatni fayldagi birlikda qaytaradi (klinikalar har xil
birlik ishlatadi), me'yorlar esa `lab_value_types.measure` da bitta
birlikda. Solishtirish birliksiz bo'lgani uchun noto'g'ri baho chiqardi:

    siydik kislotasi 5.5 mg/dL  vs  me'yor 202–416 µmol/L  → "past"  (aslida ~327, norma)
    gemoglobin       15.2 g/dL  vs  me'yor 130–170 g/L     → "past"  (aslida 152, norma)

Xuddi shu noto'g'ri qiymat `lab_analyses` ning raqamli ustunlariga ham
yozilardi — PDF hisobot va dinamika grafigi ham buzilardi.

Yechim
------
* AI dan birlikni o'zgartirmasdan, fayldagidek qaytarish so'raladi
  (arifmetikani modelga ishonmaymiz).
* Bu modul qiymatni DETERMINISTIK aylantiradi. Koeffitsiyent qo'lda
  yozilmaydi: birlik `<prefiks><g|mol>/<l|dl|ml>` ko'rinishida tahlil
  qilinadi, massa ↔ modda miqdori o'tishi esa moddaning molyar massasi
  orqali hisoblanadi.
* Natija FIZIOLOGIK MUMKINLIK bo'yicha tekshiriladi. Bu ikki holatni
  ajratadi: haqiqiy boshqa birlik (aylantiriladi) va faqat birlik NOMI
  xato yozilgan qiymat ("mochevina 4.7 µmol/L" — qiymat aslida mmol/L).
* Aylantirib bo'lmasa (masalan PDW: fL va %) qiymat o'zgarmaydi, lekin
  `unit_mismatch` belgisi qo'yiladi: interfeys uni baholamaydi va raqamli
  ustunga yozilmaydi. Xato tomonga xavfsiz: noaniq bo'lsa — baholanmadi.
"""
from __future__ import annotations

import logging
import re
import time

from sqlalchemy import text

logger = logging.getLogger(__name__)

# ─── Birlik matnini bir xil ko'rinishga keltirish ─────────────────────────────

#: Ruscha "birlik" (ЕД/МЕ) yozuvlari — KATTA-KICHIK HARF MUHIM, shuning uchun
#: kichik harfga o'tkazishdan OLDIN almashtiriladi: "мЕ/л" (milli-birlik)
#: va "МЕ/л" (xalqaro birlik) o'rtasida 1000 baravar farq bor.
_CASE_SENSITIVE = [
    ("мкМЕ", "µiu"), ("мкЕд", "µiu"), ("мкЕД", "µiu"), ("мкЕ", "µiu"), ("МкЕ", "µiu"), ("МкМЕ", "µiu"),
    ("мМЕ", "miu"), ("мЕд", "miu"), ("мЕД", "miu"), ("мЕ", "miu"),
    ("МЕ", "iu"), ("ЕД", "u"), ("Ед", "u"),
]

_REPLACEMENTS = [
    # Kirill → lotin (uzunlari birinchi)
    ("мкмоль", "µmol"), ("ммоль", "mmol"), ("нмоль", "nmol"), ("пмоль", "pmol"), ("моль", "mol"),
    ("мкг", "µg"), ("мг", "mg"), ("нг", "ng"), ("пг", "pg"),
    ("дл", "dl"), ("мл", "ml"), ("мкл", "µl"), ("л", "l"), ("г", "g"),
    ("час", "h"), ("ч", "h"), ("мм", "mm"),
    # Yunon "mu" va lotin muqobillari
    ("μ", "µ"), ("mcmol", "µmol"), ("mkmol", "µmol"), ("umol", "µmol"),
    ("mcg", "µg"), ("ug", "µg"), ("uiu", "µiu"), ("µu/", "µiu/"),
]

#: Bir xil o'lchov — har xil yozuv (chap → o'ng)
_EQUIVALENT = {
    "miu/l": "µiu/ml",
    "mu/l": "µiu/ml",
    "iu/l": "u/l",
    "µg/l": "ng/ml",
    "mg/l": "µg/ml",
    "mm/soat": "mm/h",
    "mm/hr": "mm/h",
    "mm/1h": "mm/h",
    "fl": "fl",
}

_COUNT_9 = {"10^9/l", "g/l", "giga/l", "10e9/l", "thousand/µl", "10^3/µl", "тыс/µl"}
_COUNT_12 = {"10^12/l", "t/l", "tera/l", "10e12/l", "million/µl", "10^6/µl", "млн/µl"}


def norm_unit(unit) -> str:
    """Birlikni taqqoslash uchun yagona ko'rinishga keltiradi."""
    if unit is None:
        return ""
    s = str(unit).strip()
    for src, dst in _CASE_SENSITIVE:
        s = s.replace(src, dst)
    s = s.lower()
    for src, dst in _REPLACEMENTS:
        s = s.replace(src, dst)
    s = s.replace(" ", "").replace("×", "x").replace("*", "^")
    # 10⁹, 10¹² → 10^9, 10^12
    s = s.replace("⁹", "^9").replace("¹²", "^12").replace("10^^", "10^")
    s = re.sub(r"^x?10\^?(9|12)", r"10^\1", s)
    return _EQUIVALENT.get(s, s)


# ─── Konsentratsiya birliklari: <prefiks><g|mol>/<l|dl|ml> ────────────────────

_PREFIX = {"": 1.0, "m": 1e-3, "µ": 1e-6, "n": 1e-9, "p": 1e-12}
_VOLUME = {"l": 1.0, "dl": 0.1, "ml": 1e-3}
_CONC_RE = re.compile(r"^(m|µ|n|p)?(g|mol)/(l|dl|ml)$")

#: Molyar massa, g/mol — massa ↔ modda miqdori aylantirish uchun
MOLAR_MASS = {
    "glucose": 180.16,
    "cholesterol": 386.65, "hdl": 386.65, "ldl": 386.65, "vldl": 386.65,
    "triglycerides": 885.7,
    "creatinine": 113.12, "daily_creatinine": 113.12,
    "urea": 60.06,
    "uric_acid": 168.11,
    "bilirubin_total": 584.66, "bilirubin_direct": 584.66, "bilirubin_indirect": 584.66,
    "urine_bilirubin": 584.66,
    "calcium": 40.08, "daily_calcium": 40.08,
    "magnesium": 24.305,
    "phosphorus": 30.97,
    "sodium": 22.99, "daily_sodium": 22.99,
    "potassium": 39.10,
    "chloride": 35.45,
    "iron": 55.845, "tibc": 55.845,
    "free_t4": 776.87, "t4_total": 776.87,
    "free_t3": 650.97, "t3_total": 650.97,
    "vitamin_d": 400.64,
    "vitamin_b12": 1355.37,
    "folate": 441.4,
    "c_peptide": 3020.3,
}


def _parse_conc(unit: str):
    m = _CONC_RE.match(unit)
    if not m:
        return None
    prefix, kind, volume = m.group(1) or "", m.group(2), m.group(3)
    return kind, _PREFIX[prefix] / _VOLUME[volume]


def _factor(column: str, src: str, dst: str):
    """`src` birlikdagi qiymatni `dst` ga o'tkazish koeffitsiyenti; bo'lmasa None."""
    a, b = _parse_conc(src), _parse_conc(dst)
    if a and b:
        (kind_a, scale_a), (kind_b, scale_b) = a, b
        base = scale_a / scale_b
        if kind_a == kind_b:
            return base
        mm = MOLAR_MASS.get(column)
        if not mm:
            return None
        # g → mol: massani molyar massaga bo'lamiz; mol → g: ko'paytiramiz
        return base / mm if kind_a == "g" else base * mm
    # Gematokrit: 0.45 L/L = 45 %
    if src == "l/l" and dst == "%":
        return 100.0
    if src == "%" and dst == "l/l":
        return 0.01
    # Insulin: 1 µIU/mL ≈ 6 pmol/L (xalqaro konvensiya)
    if column == "insulin" and src == "pmol/l" and dst == "µiu/ml":
        return 1 / 6.0
    return None


#: Me'yor birligidagi FIZIOLOGIK mumkin bo'lgan oraliq (me'yor emas — kasal
#: odamda ham uchraydigan keng chegara). Aylantirilgan va xom qiymatdan
#: qaysi biri haqiqat ekanini aniqlash uchun.
PLAUSIBLE = {
    "hb": (30, 250), "mchc": (200, 450), "mch": (10, 60), "hct": (10, 75),
    "total_protein": (20, 150), "albumin": (10, 80), "globulin": (5, 100),
    "glucose": (0.5, 60), "cholesterol": (0.5, 30), "hdl": (0.1, 6), "ldl": (0.1, 20),
    "vldl": (0.01, 10), "triglycerides": (0.1, 60),
    "creatinine": (10, 3000), "urea": (0.3, 100), "uric_acid": (30, 1500),
    "bilirubin_total": (1, 1000), "bilirubin_direct": (0, 800), "bilirubin_indirect": (0, 800),
    "calcium": (0.5, 5), "magnesium": (0.1, 5), "phosphorus": (0.1, 6),
    "sodium": (90, 200), "potassium": (1, 10), "chloride": (60, 150),
    "iron": (1, 100), "tibc": (10, 150), "ferritin": (1, 50000),
    "free_t4": (1, 200), "free_t3": (0.5, 80), "t4_total": (5, 500), "t3_total": (0.2, 20),
    "vitamin_d": (1, 250), "vitamin_b12": (30, 5000), "folate": (0.3, 60),
    "crp": (0, 600), "fibrinogen": (0.2, 15), "d_dimer": (0, 100),
    "insulin": (0.1, 1000), "tsh": (0.001, 150), "c_peptide": (0.01, 40), "hba1c": (2, 20),
    "wbc": (0.1, 500), "rbc": (0.5, 10), "plt": (1, 3000),
}


def _plausible(column: str, value: float) -> bool | None:
    rng = PLAUSIBLE.get(column)
    if rng is None:
        return None
    return rng[0] <= value <= rng[1]


def _round(value: float) -> float:
    """Klinik ma'noli aniqlik: katta sonlar butun, kichiklari 2–3 belgi."""
    a = abs(value)
    digits = 0 if a >= 100 else 1 if a >= 10 else 2 if a >= 1 else 3
    return round(value, digits)


def harmonize(column: str, value, unit, canonical) -> dict:
    """Bitta ko'rsatkichni me'yor birligiga keltiradi.

    Qaytaradi: `{"value", "unit", ...}` va kerak bo'lsa:
      * `"original": {"value", "unit"}` — qiymat aylantirilgan yoki birlik
        nomi tuzatilgan bo'lsa (shifokor asl yozuvni ko'ra olishi uchun);
      * `"unit_mismatch": True` — aylantirib bo'lmadi, baholanmaydi.
    """
    cell = {"value": value, "unit": unit}
    if canonical in (None, "") or unit in (None, ""):
        return cell
    try:
        num = float(value)
    except (TypeError, ValueError):
        return cell

    src, dst = norm_unit(unit), norm_unit(canonical)
    if src == dst:
        return {"value": value, "unit": canonical}
    # Hisob birliklari (10⁹/L va h.k.) — yozuvi har xil, ma'nosi bir
    if (src in _COUNT_9 and dst in _COUNT_9) or (src in _COUNT_12 and dst in _COUNT_12):
        return {"value": value, "unit": canonical}

    original = {"value": value, "unit": unit}
    factor = _factor(column, src, dst)
    if factor is not None:
        converted = num * factor
        if _plausible(column, converted) is not False:
            return {"value": _round(converted), "unit": canonical, "original": original}
        if _plausible(column, num):
            # Aylantirilgan qiymat imkonsiz, xom qiymat esa me'yor birligida
            # mantiqli — demak faylda (yoki AI da) faqat birlik NOMI xato
            return {"value": value, "unit": canonical, "original": original}
    elif _plausible(column, num) and src in ("", "-"):
        return {"value": value, "unit": canonical}

    return {"value": value, "unit": unit, "unit_mismatch": True}


# ─── `lab_value_types` dan me'yor birliklari ──────────────────────────────────

_CACHE: dict = {"units": None, "at": 0.0}
_CACHE_TTL = 600  # soniya — ma'lumotnoma deyarli o'zgarmaydi


def canonical_units(db) -> dict:
    """`{column_name: measure}` — `lab_value_types` dan (10 daqiqa kesh)."""
    now = time.monotonic()
    if _CACHE["units"] is None or now - _CACHE["at"] > _CACHE_TTL:
        rows = db.execute(text("SELECT column_name, measure FROM lab_value_types")).fetchall()
        _CACHE["units"] = {r[0]: r[1] for r in rows if r[0]}
        _CACHE["at"] = now
    return _CACHE["units"]


def harmonize_all(db, measurements: dict) -> dict:
    """`digital_measurements` lug'atidagi barcha ko'rsatkichlarni keltiradi."""
    if not isinstance(measurements, dict):
        return measurements
    units = canonical_units(db)
    out = {}
    for column, cell in measurements.items():
        if not isinstance(cell, dict) or "value" not in cell:
            out[column] = cell
            continue
        result = harmonize(column, cell.get("value"), cell.get("unit"), units.get(column))
        if result.get("original"):
            logger.info("Lab birlik: %s %s %s → %s %s", column, cell.get("value"),
                        cell.get("unit"), result["value"], result["unit"])
        elif result.get("unit_mismatch"):
            logger.info("Lab birlik mos emas (baholanmaydi): %s %s %s, me'yor %s",
                        column, cell.get("value"), cell.get("unit"), units.get(column))
        out[column] = result
    return out


def column_values(measurements: dict) -> dict:
    """`lab_analyses` raqamli ustunlariga yoziladigan qiymatlar.

    Birligi mos kelmagan ko'rsatkich yozilmaydi: boshqa birlikdagi son
    ustunga tushsa, PDF va dinamika grafigi uni noto'g'ri baholardi.
    """
    return {
        key: cell["value"]
        for key, cell in (measurements or {}).items()
        if isinstance(cell, dict) and "value" in cell and not cell.get("unit_mismatch")
    }
