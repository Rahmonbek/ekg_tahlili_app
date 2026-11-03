"""Fayldagi ko'rsatkich nomi → katalog kaliti (`lab_value_types`) — 2026-11-03.

Ikki bosqichli laboratoriya tahlilida (`lab_split`) AI ko'rsatkichni FAYLDAGI
NOMI bilan qaytaradi ("Гемоглобин (HGB)", "АЛТ", "Neu#"). Bu modul nomni
katalog kalitiga bog'laydi:

1. `lab_value_aliases` jadvali (o'rganilgan va tasdiqlangan nomlar);
2. katalogning o'z nomlari (`name_uz/ru/en`, `column_name`) — namuna turi
   kategoriyadan (siydik kategoriyalari → `urine`, qolgani → `blood`);
3. qolgan noma'lum nomlar BITTA arzon so'rovda AI ga bog'latiladi
   (`map_unknown`) va natija jadvalga yoziladi (`source='ai'`, tasdiqlanmagan).
   Katalogda yo'q nom ham yoziladi (`value_type_id NULL`) — qayta so'ralmaydi.

Kalit — namuna turi + normallashtirilgan nom: "Глюкоза" qonda (`glucose`) va
siydikda (`urine_glucose`) boshqa ko'rsatkich. Jins belgisi ("(М)", "/ мужчины")
nomdan olib tashlanadi — me'yorni jinsga qarab o'qish AI ning ishi.
"""
from __future__ import annotations

import logging
import re
import threading
import time

from sqlalchemy import text

import ai_config
import lab_catalog

logger = logging.getLogger(__name__)

SPECIMENS = ("blood", "urine", "stool", "other")
_URINE_CATEGORIES = {"urine", "nechiporenko", "urine_daily"}

_SEX_MARK = re.compile(r"\(\s*(?:м|ж|муж\.?|жен\.?|m|f|male|female|erkak|ayol)\s*\)", re.IGNORECASE)
_SEX_WORD = re.compile(r"\s*/\s*(?:мужчины|женщины|муж\.?|жен\.?)\s*$", re.IGNORECASE)
_PUNCT = re.compile(r"[^\w%#+/\- ]+", re.UNICODE)
_SPACES = re.compile(r"\s+")

_CACHE_TTL = 120
_lock = threading.Lock()
_cache: dict = {"aliases": None, "at": 0.0}


def normalize(name: str | None) -> str:
    """Taqqoslash uchun nom: kichik harf, ё→е, jins belgisi va tinish belgilarsiz."""
    s = (name or "").lower().replace("ё", "е")
    s = _SEX_MARK.sub(" ", s)
    s = _SEX_WORD.sub(" ", s)
    s = _PUNCT.sub(" ", s)
    return _SPACES.sub(" ", s).strip(" -/")[:200]


def specimen_of(value: str | None) -> str:
    v = (value or "").strip().lower()
    return v if v in SPECIMENS else "other"


def _catalog_specimen(t) -> str:
    return "urine" if (t.category or "") in _URINE_CATEGORIES else "blood"


def _catalog_names(db) -> dict[tuple[str, str], str]:
    """Katalogning o'z nomlaridan: `(specimen, nom) → column_name`."""
    out: dict[tuple[str, str], str] = {}
    for column, t in lab_catalog.catalog(db).items():
        spec = _catalog_specimen(t)
        for raw in (column, t.name_uz, t.name_ru, t.name_en):
            if not raw:
                continue
            for variant in (raw, re.sub(r"\(.*?\)", " ", raw)):
                key = normalize(variant)
                if key:
                    out.setdefault((spec, key), column)
    return out


def _db_aliases(db) -> dict[tuple[str, str], str | None]:
    """`lab_value_aliases`: `(specimen, alias) → column_name | None` (2 daqiqa kesh)."""
    now = time.monotonic()
    with _lock:
        if _cache["aliases"] is not None and now - _cache["at"] < _CACHE_TTL:
            return _cache["aliases"]
    rows = db.execute(text(
        "SELECT a.specimen, a.alias, t.column_name FROM lab_value_aliases a "
        "LEFT JOIN lab_value_types t ON t.id = a.value_type_id"
    )).fetchall()
    data = {(r[0], r[1]): r[2] for r in rows}
    with _lock:
        _cache["aliases"], _cache["at"] = data, now
    return data


def invalidate() -> None:
    with _lock:
        _cache["aliases"] = None


def lookup(db, specimen: str, name: str) -> tuple[bool, str | None]:
    """`(topildimi, column_name)`. `(True, None)` — "katalogda yo'q" deb belgilangan."""
    spec, key = specimen_of(specimen), normalize(name)
    if not key:
        return True, None
    aliases = _db_aliases(db)
    if (spec, key) in aliases:
        return True, aliases[(spec, key)]
    names = _catalog_names(db)
    if (spec, key) in names:
        return True, names[(spec, key)]
    if spec == "other":
        # Namuna turi aniqlanmagan — nom faqat BITTA ko'rsatkichga mos kelsa
        hits = {col for (s, k), col in names.items() if k == key}
        if len(hits) == 1:
            return True, hits.pop()
    return False, None


def _store(db, items: list[tuple[str, str, str | None]]) -> None:
    """O'rganilgan nomlarni jadvalga yozadi (mavjudiga tegmaydi)."""
    cat = lab_catalog.catalog(db)
    for spec, key, column in items:
        type_id = cat[column].id if column in cat else None
        db.execute(text(
            "INSERT INTO lab_value_aliases (specimen, alias, value_type_id, source, approved) "
            "VALUES (:s, :a, :t, 'ai', false) ON CONFLICT (specimen, alias) DO NOTHING"
        ), {"s": spec, "a": key, "t": type_id})
    db.commit()
    invalidate()


def touch(db, keys: list[tuple[str, str]]) -> None:
    """Ishlatilgan nomlarning hisoblagichi (qaysi nomlar ko'p uchrashini ko'rish uchun)."""
    if not keys:
        return
    try:
        for spec, key in set(keys):
            db.execute(text(
                "UPDATE lab_value_aliases SET hits = hits + 1, updated_at = now() "
                "WHERE specimen = :s AND alias = :a"), {"s": spec, "a": key})
        db.commit()
    except Exception as exc:  # noqa: BLE001 — statistika, tahlilga ta'sir qilmaydi
        db.rollback()
        logger.debug("alias hits yangilanmadi: %s", exc)


_MAP_PROMPT = """Sen laboratoriya ko'rsatkichlari nomlarini tizim katalogiga bog'lovchi yordamchisan.
Quyida KATALOG (kalit - tavsif) va laboratoriya faylidan o'qilgan NOMLAR berilgan.
Har bir nom uchun katalogdagi AYNAN shu ko'rsatkichning kalitini tanla.

Qoidalar:
- Faqat ma'nosi bir xil bo'lsa bog'la (sinonim, qisqartma, boshqa tildagi nom).
  Taxmin qilma: mos kalit bo'lmasa — null.
- Namuna turini hisobga ol: siydikdagi glyukoza/oqsil/leykotsit — siydik
  kalitlari (urine_*), qondagisi — qon kalitlari.
- Foiz (%) va mutlaq son (#, abs) — ikki xil ko'rsatkich (masalan
  neutrophils va neutrophils_abs).
- Birlik va bo'lim nomi yordamchi ma'lumot.

KATALOG:
{catalog}
"""


def map_unknown(client, db, items: list[dict], *, analysis_id=None, bulk: bool = False) -> dict:
    """Noma'lum nomlarni bitta so'rovda katalogga bog'laydi va jadvalga yozadi.

    `items` — `[{"specimen", "name", "section", "unit"}]`. Qaytaradi
    `{(specimen, normalize(name)): column_name | None}`.
    """
    if not items:
        return {}
    uniq: dict[tuple[str, str], dict] = {}
    for it in items:
        key = (specimen_of(it.get("specimen")), normalize(it.get("name")))
        if key[1] and key not in uniq:
            uniq[key] = it
    keys = list(uniq.keys())
    if not keys:
        return {}
    columns = lab_catalog.columns(db)
    lines = [
        f"{i}. [{spec}] {uniq[(spec, key)].get('name')!s}"
        + (f" | bo'lim: {uniq[(spec, key)].get('section')}" if uniq[(spec, key)].get("section") else "")
        + (f" | birlik: {uniq[(spec, key)].get('unit')}" if uniq[(spec, key)].get("unit") else "")
        for i, (spec, key) in enumerate(keys)
    ]
    schema = {
        "type": "object",
        "additionalProperties": False,
        "properties": {"mappings": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "index": {"type": "integer"},
                    "column_name": {"type": ["string", "null"], "enum": list(columns) + [None]},
                },
                "required": ["index", "column_name"],
            },
        }},
        "required": ["mappings"],
    }
    resp = ai_config.create_response(
        client, module="lab", analysis_id=analysis_id, step="alias_map", bulk=bulk,
        model=ai_config.LAB_ALIAS_MODEL,
        reasoning={"effort": ai_config.LAB_ALIAS_EFFORT},
        max_output_tokens=4000,
        # Katalog — `instructions` da: OpenAI uni keshlaydi
        instructions=_MAP_PROMPT.format(catalog=lab_catalog.prompt_lines(db)),
        input=[{"role": "user", "content": [
            {"type": "input_text", "text": "NOMLAR:\n" + "\n".join(lines)},
        ]}],
        text={"format": {"type": "json_schema", "name": "lab_alias_map", "strict": True, "schema": schema}},
    )
    import json
    data = json.loads(resp.output_text or "{}")
    result: dict[tuple[str, str], str | None] = {k: None for k in keys}
    for m in data.get("mappings") or []:
        idx, col = m.get("index"), m.get("column_name")
        if isinstance(idx, int) and 0 <= idx < len(keys):
            result[keys[idx]] = col if col in columns else None
    _store(db, [(spec, key, col) for (spec, key), col in result.items()])
    logger.info("Lab: %d ta yangi nom bog'landi (%d tasi katalogda yo'q)",
                len(result), sum(1 for v in result.values() if v is None))
    return result
