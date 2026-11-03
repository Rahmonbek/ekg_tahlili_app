"""Laboratoriya tahlili — ikki bosqichli (arzonroq) yo'l, 2026-11-03.

Eski yo'lda bitta qimmat so'rov (eng kuchli model, `high` fikrlash, 137 ta
katalog ro'yxati va `enum` sxema) ham qiymatlarni KO'CHIRAR, ham xulosa
YOZAR edi. Bu yerda ular ajratilgan:

1. **O'qish** (`extract`) — AI fayldagi har bir natija qatorini FAYLDAGI
   NOMI, qiymati, birligi va me'yori bilan qaytaradi. Katalog yuborilmaydi,
   prompt o'zgarmas (OpenAI uni keshlaydi), fikrlash `low`. Hujjat turi ham
   shu yerda aniqlanadi — alohida tasniflash so'rovi kerak emas.
2. **Bog'lash** (`map_rows`) — nom katalog kalitiga `lab_aliases` orqali
   kod bilan bog'lanadi; noma'lumlarini arzon model bitta so'rovda bog'laydi.
3. **Xulosa** (`conclude`) — kuchli model faqat o'qilgan (birligi
   keltirilgan, baholangan) qiymatlar ro'yxati bo'yicha xulosa yozadi.

Aniqlik himoyasi: ko'rsatkich topilmasa yoki ko'p nom bog'lanmasa
`NeedLegacy` — chaqiruvchi eski to'liq yo'lga o'tadi.
"""
from __future__ import annotations

import io
import json
import re
import logging

from openai import OpenAI

import ai_config
import ai_schema
import excel_to_text
import lab_aliases
import lab_catalog
from config import OPENAI_API_KEY
from file_validator import prepare_upload_filename

logger = logging.getLogger(__name__)

#: Nomi ANIQLANMAGAN (bog'lash so'rovi xato bergan) natijali qatorlar ulushi
#: shundan yuqori bo'lsa — eski yo'l. "Katalogda yo'q" deb aniq bog'langan nom
#: (siydik mikroskopiyasi: epiteliy, silindrlar, tuzlar…) hisobga kirmaydi —
#: uni eski yo'l ham saqlamaydi
MAX_UNRESOLVED_SHARE = 0.4

DOC_KINDS = ["laboratoriya", "ekg", "holter", "smad", "boshqa", "aniqlanmadi"]


class NeedLegacy(Exception):
    """Ikki bosqichli yo'l ishonchli natija bermadi — eski yo'l bilan tahlil qilinsin."""


# ─── 1. O'qish ───────────────────────────────────────────────────────────────

#: O'ZGARMAS prompt — bemor ma'lumoti va fayl undan KEYIN keladi, shuning
#: uchun OpenAI uni har so'rovda keshlab arzonroq hisoblaydi.
EXTRACT_PROMPT = """Sen laboratoriya natijalarini fayldan ko'chiruvchi yordamchisan.
Vazifang — tahlil qilish EMAS, faqat fayldagi natijalarni aniq ko'chirish.

1) document_kind — fayl turi:
   "laboratoriya" — qon, siydik, axlat va boshqa laborator ko'rsatkichlar natijasi;
   "ekg" — elektrokardiogramma (qog'ozdagi EKG egri chizig'i yoki EKG hisoboti);
   "holter" — 24–48 soatlik Holter monitoringi hisoboti;
   "smad" — sutkalik arterial bosim monitoringi (SMAD/ABPM) hisoboti;
   "boshqa" — boshqa tibbiy hujjat (UZI, rentgen, retsept, ma'lumotnoma);
   "aniqlanmadi" — o'qib bo'lmaydi, bo'sh yoki tibbiy hujjat emas.
   Laboratoriya bo'lmasa `groups` bo'sh qolsin.

2) analysis_date — tahlil sanasi YYYY-MM-DD: namuna olingan kun ("Дата забора",
   "Дата взятия"), u bo'lmasa natija berilgan kun ("Дата выдачи", "Дата",
   "Sana"). Tug'ilgan sana EMAS. Topilmasa null. "05.09.2025" → "2025-09-05".

3) groups — fayldagi bo'limlar (blanklar) tartibida; har bir guruhda:
   - section: bo'lim/blank nomi ("ОАК", "Биохимия", "Общий анализ мочи"), bo'lmasa null.
   - specimen: namuna turi — "blood" (qon, zardob, plazma), "urine" (siydik,
     Нечипоренко, sutkalik siydik), "stool" (axlat), "other" (boshqa/noma'lum).
   - rows: shu bo'limda natijasi bor HAR BIR qator (bitta ko'rsatkich — bitta element):
     · name: ko'rsatkich nomi FAYLDAGIDEK (tarjima qilma, qisqartirma; masalan
       "Гемоглобин (HGB)", "АЛТ", "Neu#", "Lym%"). Qatorda kod va nom birga
       bo'lsa — IKKALASINI yoz ("Neu# Нейтрофилы", "Neu% Нейтрофилы"): foiz (%)
       va mutlaq son (#, abs) — alohida ko'rsatkichlar, belgini TASHLAMA.
     · value: NATIJA ustunidagi son FAYLDAGIDEK. Birlikni boshqa birlikka
       O'GIRMA, qayta hisoblama. ">50", "<0,5" — chegara soni (50; 0.5), asl
       yozuv `text` ga. O'qib bo'lmasa yoki natija son bo'lmasa — null.
     · unit: birlik FAYLDAGIDEK; yozilmagan bo'lsa null (taxmin qilma).
     · text: sifat yoki matnli natija aynan ("Отрицательный(-)", "A(II) Rh+",
       "abs", "+", "1015"); oddiy sonli natijada null.
     · result_kind: faqat sifat natijalari (HBsAg, Anti-HCV, RW, OIV, H. pylori
       va h.k.) uchun: NEGATIVE, POSITIVE, EQUIVOCAL ("±", "сомнительно"),
       INVALID; qolganlarida null. Shubhalini musbatga QO'SHMA.
     · ref_low / ref_high: me'yor (referens) ustunidagi chegaralar `value` bilan
       BIR XIL birlikda, aylantirmasdan. "до 10" → ref_high 10; "0–30" → 0 va 30;
       ">1,54" → ref_low 1.54. Me'yor jinsga qarab bir necha qator bo'lsa —
       quyida berilgan bemor jinsiga mosini ol ("(М)" erkak, "(Ж)" ayol);
       jins noma'lum bo'lsa natija turgan qatornikini. Me'yor yosh/faza bo'yicha
       ko'p yoki umuman yo'q bo'lsa — ikkalasi null.
     · ref_text: me'yor matni aynan (bo'lmasa null).
   ❗ Me'yor ustunidagi sonlar NATIJA EMAS. Faylda yo'q ko'rsatkichni
   QO'SHMA, qiymatni taxmin qilma — bu tibbiy xato. Bir ko'rsatkich bir
   necha faylda takrorlansa — bir marta yoz.
"""


def _extract_schema() -> dict:
    nullable = lambda t: {"type": [t, "null"]}  # noqa: E731
    row = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "name": {"type": "string"},
            "value": nullable("number"),
            "unit": nullable("string"),
            "text": nullable("string"),
            "result_kind": {"type": ["string", "null"],
                            "enum": ["NEGATIVE", "POSITIVE", "EQUIVOCAL", "INVALID", None]},
            "ref_low": nullable("number"),
            "ref_high": nullable("number"),
            "ref_text": nullable("string"),
        },
        "required": ["name", "value", "unit", "text",
                     "result_kind", "ref_low", "ref_high", "ref_text"],
    }
    # Bo'lim va namuna turi har qatorda emas, guruhda bir marta — chiqish
    # tokenlari (o'qish bosqichining asosiy narxi) kamayadi
    group = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "section": nullable("string"),
            "specimen": {"type": "string", "enum": list(lab_aliases.SPECIMENS)},
            "rows": {"type": "array", "items": row},
        },
        "required": ["section", "specimen", "rows"],
    }
    return {
        "format": {
            "type": "json_schema",
            "name": "lab_extract",
            "strict": True,
            "schema": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "document_kind": {"type": "string", "enum": DOC_KINDS},
                    "analysis_date": ai_schema.LAB_DATE_PROPERTY,
                    "groups": {"type": "array", "items": group},
                },
                "required": ["document_kind", "analysis_date", "groups"],
            },
        }
    }


def extract(files: list[tuple[bytes, str]], gender, *, analysis_id=None, bulk: bool = False) -> dict:
    """1-bosqich: fayl(lar)dagi natija qatorlari. Qaytaradi `{document_kind, analysis_date, rows}`."""
    from lab_analyses_api import _parse_lab_response  # kesilgan/noto'g'ri javob tekshiruvi umumiy

    client = OpenAI(api_key=OPENAI_API_KEY)
    sex = {"erkak": "erkak", "ayol": "ayol"}.get(str(gender or "").lower(), "noma'lum")
    tail = f"Bemor jinsi: {sex}."
    if len(files) > 1:
        tail += (f" {len(files)} ta fayl — bitta topshiriqning varaqlari; barcha "
                 "fayllardagi bo'limlarni bitta `groups` ro'yxatiga yoz.")
    # Statik prompt — `instructions` da (OpenAI uni keshlaydi), qolgani xabarda
    parts = [{"type": "input_text", "text": tail}]
    uploaded: list[str] = []
    try:
        for index, (content, fname) in enumerate(files, start=1):
            fname = prepare_upload_filename(fname, content, default_stem="lab_upload").lower()
            label = f"Fayl {index}/{len(files)}" if len(files) > 1 else None
            if excel_to_text.is_xlsx(fname):
                table = excel_to_text.xlsx_to_text(content)
                parts.append({"type": "input_text",
                              "text": f"{label + ' — ' if label else ''}Excel jadvali:\n{table}"})
                continue
            fobj = io.BytesIO(content)
            fobj.name = fname
            up = client.files.create(file=fobj, purpose="user_data")
            uploaded.append(up.id)
            if label:
                parts.append({"type": "input_text", "text": f"{label}:"})
            is_image = fname.endswith((".png", ".jpg", ".jpeg"))
            parts.append({"type": "input_image" if is_image else "input_file", "file_id": up.id})

        resp = ai_config.create_response(
            client, module="lab", analysis_id=analysis_id, step="extract", bulk=bulk,
            model=ai_config.LAB_EXTRACT_MODEL,
            reasoning={"effort": ai_config.LAB_EXTRACT_EFFORT},
            max_output_tokens=ai_config.LAB_EXTRACT_MAX_OUTPUT_TOKENS,
            instructions=EXTRACT_PROMPT,
            input=[{"role": "user", "content": parts}],
            text=_extract_schema(),
        )
    finally:
        ai_config.delete_uploaded_files(client, uploaded, "lab_extract")
    data = _parse_lab_response(resp)
    rows = [
        {**r, "section": g.get("section"), "specimen": g.get("specimen")}
        for g in (data.get("groups") or []) if isinstance(g, dict)
        for r in (g.get("rows") or []) if isinstance(r, dict)
    ]
    return {
        "document_kind": data.get("document_kind") if data.get("document_kind") in DOC_KINDS else "aniqlanmadi",
        "analysis_date": data.get("analysis_date"),
        "rows": rows,
    }


def _usable(row: dict) -> bool:
    return row.get("value") is not None or bool(row.get("result_kind")) or bool(
        isinstance(row.get("text"), str) and row["text"].strip())


def _has_ref(row: dict) -> bool:
    return row.get("ref_low") is not None or row.get("ref_high") is not None or bool(row.get("ref_text"))


_ABS_UNIT = re.compile(r"10\s*[\^*⁹¹]|10\s*(?:9|12)\s*/|/\s*(?:мкл|µl|ul|mkl)", re.IGNORECASE)


def _pct_or_abs(column: str, row: dict, cat: dict) -> str:
    """Foiz va mutlaq son juftligini (`neutrophils` / `neutrophils_abs`) birlik
    va belgi bo'yicha aniqlaydi — nom bir xil ("Нейтрофилы") bo'lishi mumkin."""
    name = row.get("name") or ""
    unit = (row.get("unit") or "").strip()
    is_pct = unit == "%" or "%" in name
    is_abs = "#" in name or "abs" in name.lower() or "абс" in name.lower() or bool(_ABS_UNIT.search(unit))
    if is_abs and not is_pct and f"{column}_abs" in cat:
        return f"{column}_abs"
    if is_pct and not is_abs and column.endswith("_abs") and column[:-4] in cat:
        return column[:-4]
    return column


# ─── 2. Bog'lash ─────────────────────────────────────────────────────────────

def map_rows(rows: list[dict], *, analysis_id=None, bulk: bool = False) -> tuple[list[dict], dict]:
    """Qatorlarni katalog kalitiga bog'laydi.

    Qaytaradi: eski sxemadagi massiv (`column_name`, `value`, `unit`, `text`,
    `ref_*`, `result_kind`) va statistika. Bog'lanish ulushi past bo'lsa —
    `NeedLegacy`.
    """
    from database import SessionLocal

    usable = [r for r in rows if _usable(r)]
    if not usable:
        raise NeedLegacy("faylda natija qatori topilmadi")
    # Natijasiz, faqat me'yori bor qator ("Гемоглобин (Ж)") — shu ko'rsatkich
    # natijasiga me'yor berish uchun bog'lanadi, ulush hisobiga kirmaydi
    candidates = usable + [r for r in rows if not _usable(r) and _has_ref(r)]

    with SessionLocal() as db:
        cat = lab_catalog.catalog(db)
        resolved: list[tuple[dict, str | None]] = []
        unknown: list[dict] = []
        unresolved: list[dict] = []
        for r in candidates:
            found, column = lab_aliases.lookup(db, r.get("specimen"), r.get("name"))
            if found:
                resolved.append((r, column))
            else:
                unknown.append(r)
        if unknown:
            try:
                client = OpenAI(api_key=OPENAI_API_KEY)
                learned = lab_aliases.map_unknown(client, db, unknown, analysis_id=analysis_id, bulk=bulk)
            except Exception as exc:  # noqa: BLE001 — aniqlanmagan nomlar ulushi hal qiladi
                db.rollback()
                logger.warning("Lab: noma'lum nomlarni bog'lab bo'lmadi (%s)", type(exc).__name__)
                learned = None
            for r in unknown:
                key = (lab_aliases.specimen_of(r.get("specimen")), lab_aliases.normalize(r.get("name")))
                if learned is None:
                    unresolved.append(r)
                else:
                    resolved.append((r, learned.get(key)))
        lab_aliases.touch(db, [(lab_aliases.specimen_of(r.get("specimen")), lab_aliases.normalize(r.get("name")))
                               for r, col in resolved if col])

    mapped = [(r, _pct_or_abs(c, r, cat)) for r, c in resolved if c]
    mapped_results = sum(1 for r, _ in mapped if _usable(r))
    unresolved_results = sum(1 for r in unresolved if _usable(r))
    stats = {"rows": len(usable), "mapped": mapped_results, "new_names": len(unknown),
             "not_in_catalog": [r.get("name") for r, c in resolved if not c and _usable(r)][:30]}
    if not mapped_results:
        raise NeedLegacy("birorta ko'rsatkich katalogga bog'lanmadi")
    if unresolved_results / len(usable) > MAX_UNRESOLVED_SHARE:
        raise NeedLegacy(f"{unresolved_results}/{len(usable)} ta nom aniqlanmadi")

    # Bitta ko'rsatkich bir necha qatorda (bir nechta varaq, "(М)"/"(Ж)" me'yor
    # qatorlari) — qiymati borini olamiz, me'yorni bo'shini to'ldirish uchun
    items: dict[str, dict] = {}
    for r, column in mapped:
        item = {
            "column_name": column,
            "value": r.get("value"),
            "unit": r.get("unit"),
            "text": r.get("text"),
            "ref_low": r.get("ref_low"),
            "ref_high": r.get("ref_high"),
            "ref_text": r.get("ref_text"),
            "result_kind": r.get("result_kind"),
        }
        prev = items.get(column)
        if prev is None:
            items[column] = item
            continue
        if _usable(item) and _usable(prev) and (item["value"], item["text"]) != (prev["value"], prev["text"]):
            # Ikki xil natija bitta ko'rsatkichga tushdi — bog'lash noaniq,
            # qiymatlardan birini tashlab yuborish xato bo'lardi
            raise NeedLegacy(f"'{column}' ga ikki xil natija bog'landi")
        # Natijali qator asosiy; ikkinchisidan faqat bo'sh me'yor to'ldiriladi
        main, other = (item, prev) if _usable(item) and not _usable(prev) else (prev, item)
        for key in ("ref_low", "ref_high", "ref_text"):
            if main.get(key) is None and other.get(key) is not None:
                main[key] = other[key]
        items[column] = main
    return [i for i in items.values() if _usable(i)], stats


# ─── 3. Xulosa ───────────────────────────────────────────────────────────────

CONCLUDE_PROMPT = """Sen tajribali laborant-shifokorsan. Senga bemorning laboratoriya
natijalari TAYYOR ro'yxat ko'rinishida beriladi: ko'rsatkich, qiymat, birlik,
me'yor va tizim hisoblagan baho (YUQORI / PAST / me'yorda / baholanmagan).
Qiymatlar allaqachon katalog birligiga keltirilgan; "faylda:" — asl yozuv.
Faqat shu ro'yxat asosida xulosa yoz — ro'yxatda yo'q ko'rsatkich haqida
yozma, qiymatlarni o'zgartirma.

MAYDONLAR:
- automatic_analysis — me'yordan tashqari ko'rsatkichlar: nomi, qiymati,
  me'yori va klinik ma'nosi. Me'yordagilarni sanama. "Baholanmagan (birlik
  shubhali)" bo'lsa: "birligi shubhali, laboratoriya blankasini tekshirish
  kerak" deb yoz, past ham, normal ham DEMA. Bir nechta chetlanish birgalikda
  bitta holatga ishora qilsa — buni ayt.
- automatic_analysis_bool — 1 = barcha baholangan ko'rsatkichlar me'yorda;
  2 = e'tibor talab qiladi (chetlanish bor, shoshilinch emas); 3 = shoshilinch
  (hayot uchun xavfli qiymatlar). YUQORI yoki PAST bor bo'lsa 1 QO'YMA.
- AI_recommendations — oddiy tilda: qo'shimcha tekshiruv, mutaxassis,
  ovqatlanish va turmush tarzi. Hammasi me'yorda bo'lsa ham profilaktik
  tavsiya yoz — bo'sh qoldirma.
- final_summary — qisqa, tibbiy asoslangan yakuniy xulosa.
- analiz_mumkinmi — ro'yxatda kamida bitta baholanadigan ko'rsatkich bo'lsa
  true; analiz_mumkin_emas_sababi — aks holda sababi, bo'lmasa null.
"""


def _conclude_schema() -> dict:
    fmt = ai_schema.response_format("lab", lab_columns=["_"])
    schema = json.loads(json.dumps(fmt["format"]["schema"]))
    for key in ("digital_measurements", "analysis_date"):
        schema["properties"].pop(key, None)
        if key in schema["required"]:
            schema["required"].remove(key)
    return {"format": {"type": "json_schema", "name": "lab_conclusion", "strict": True, "schema": schema}}


def _num(v) -> str:
    if v is None:
        return "—"
    try:
        f = float(v)
    except (TypeError, ValueError):
        return str(v)
    return str(int(f)) if f == int(f) else f"{f:g}"


def data_lines(measurements: dict, gender) -> list[str]:
    """Xulosa uchun ixcham ro'yxat — katalog tartibida, baho kod bilan hisoblangan."""
    from database import SessionLocal

    gbool = {"erkak": True, "ayol": False}.get(str(gender or "").lower())
    with SessionLocal() as db:
        cat = lab_catalog.catalog(db)
    lines = []
    for column, t in cat.items():
        cell = measurements.get(column)
        if not isinstance(cell, dict):
            continue
        flag, source = lab_catalog.flag_for(
            t, cell.get("value"), gbool, bool(cell.get("unit_mismatch")),
            cell.get("ref_low"), cell.get("ref_high"), cell.get("result_kind"),
            bool(cell.get("unit_suspect")),
        )
        if cell.get("unit_suspect"):
            verdict = "baholanmagan (birlik shubhali)"
        elif flag is None:
            verdict = "baholanmagan"
        else:
            verdict = {1: "YUQORI", -1: "PAST", 0: "me'yorda"}[flag]
        shown = cell.get("text") or f"{_num(cell.get('value'))} {cell.get('unit') or ''}".strip()
        if cell.get("ref_low") is not None or cell.get("ref_high") is not None:
            ref = f"{_num(cell.get('ref_low'))}–{_num(cell.get('ref_high'))} (laboratoriya)"
        elif cell.get("ref_text"):
            ref = f"{cell['ref_text']} (laboratoriya)"
        else:
            lo, hi = lab_catalog.norm_bounds(t, gbool)
            ref = f"{_num(lo)}–{_num(hi)} (katalog)" if (lo is not None or hi is not None) else "—"
        orig = cell.get("original")
        orig_txt = ""
        if isinstance(orig, dict) and orig.get("value") is not None:
            unit = f" {orig['unit']}" if orig.get("unit") else ""
            orig_txt = f" [faylda: {_num(orig.get('value'))}{unit}]"
        name = t.name_uz or column
        lines.append(f"- {name}: {shown}{orig_txt} | me'yor {ref} | {verdict}")
    return lines


def conclude(measurements: dict, age, gender, lang: str, *, analysis_id=None, bulk: bool = False) -> dict:
    """3-bosqich: xulosa maydonlari (`automatic_analysis`, `final_summary`, …)."""
    from lab_analyses_api import _parse_lab_response

    language = {"uz": "O'ZBEK", "ru": "RUS", "en": "INGLIZ"}.get(lang, "O'ZBEK")
    patient = []
    if age is not None:
        patient.append(f"yoshi {age}")
    if gender:
        patient.append(f"jinsi {gender}")
    lines = data_lines(measurements, gender)
    tail = (
        (f"Bemor: {', '.join(patient)}.\n" if patient else "")
        + "NATIJALAR:\n" + ("\n".join(lines) if lines else "(baholanadigan ko'rsatkich yo'q)")
        + f"\n\nBarcha matnli maydonlarni {language} tilida yoz."
    )
    client = OpenAI(api_key=OPENAI_API_KEY)
    resp = ai_config.create_response(
        client, module="lab", analysis_id=analysis_id, step="conclude", bulk=bulk,
        model=ai_config.LAB_CONCLUDE_MODEL,
        reasoning={"effort": ai_config.LAB_CONCLUDE_EFFORT},
        max_output_tokens=ai_config.LAB_CONCLUDE_MAX_OUTPUT_TOKENS,
        instructions=CONCLUDE_PROMPT,
        input=[{"role": "user", "content": [{"type": "input_text", "text": tail}]}],
        text=_conclude_schema(),
    )
    return _parse_lab_response(resp)
