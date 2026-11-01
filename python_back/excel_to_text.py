"""Laboratoriya natijasi Excel faylini (.xlsx) AI uchun matnli jadvalga o'giradi.

Nima uchun matn: OpenAI ga xlsx ni fayl sifatida yuborib bo'lmaydi (model
faqat rasm va PDF ni "ko'radi"). Jadval esa allaqachon tuzilgan ma'lumot —
uni lokal o'qib, toza matn ko'rinishida yuborish arzonroq va aniqroq: AI
raqamni rasmdan "taxmin qilmaydi", faqat qatorni ko'rsatkich kalitiga
moslaydi.

Klinika shabloni (bitta faylda 20 ga yaqin list: БАК, ОАК, ОАМ, ГОРМ, КОАГ…)
uchun muhim qoidalar — klinika arxividagi 26 ming fayl tahlili asosida:

* Har bir listda "Результат" sarlavhali ustun topiladi; faqat SHU ustunda
  qiymati bor qatorlar olinadi. Norma ustunidagi sonlar natija emas.
* To'ldirilmagan listlarda ham shablonning standart yozuvlari turadi
  ("abs", "-", "Желтый", "Отрицательный(-)", "Начало:", "серо-молочный").
  Faqat shunday yozuvlardan iborat list TASHLAB YUBORILADI — aks holda
  topshirilmagan siydik tahlili "normal" bo'lib chiqardi.
* Bemor F.I.O., tug'ilgan yili va shifokor imzosi AI ga yuborilmaydi
  (yoshi va jinsi formadan alohida beriladi).
* "Результат" sarlavhasi hech bir listda topilmasa (boshqa klinikaning
  oddiy jadvali) — ko'rinadigan listlarning barcha to'ldirilgan qatorlari
  yuboriladi.
"""
from __future__ import annotations

import datetime
import io
import logging
import re
import zipfile

logger = logging.getLogger(__name__)

#: Zip-bomba va o'ta katta fayllardan himoya
MAX_UNCOMPRESSED_BYTES = 80 * 1024 * 1024
MAX_SHEETS = 60
MAX_ROWS_PER_SHEET = 3000
MAX_TEXT_CHARS = 60_000

_HEADER = re.compile(r"^(результат|резултат|result|natija|значение|qiymat)", re.I)
#: Bemor/shifokor ma'lumoti va xizmat qatorlari — AI ga kerak emas
_SKIP_ROW = re.compile(
    r"^(фио|ф\.и\.о|год рожд|дата рожд|пол\b|пол:|дата|врач|подпись|f\.i\.o|ism|tug'ilgan)", re.I)
_SIGNATURE = re.compile(r"врач|лаборант|подпись", re.I)

#: Shablonning to'ldirilmagan listlaridagi standart yozuvlar
_DEFAULT_VALUES = {
    "abs", "-", "—", "–", '"-"', "отрицательный(-)", "отрицательный (-)", "отрицательный",
    "начало:", "конец:", "желтый", "жёлтый", "прозрачный", "отсутствует", "отсутствуют",
    "0",
}
#: Tavsif qatorlari (rang, tiniqlik, hid…) — shablonda turli variantda
#: oldindan yozilgan ("Мутный", "серо-молочный"), shuning uchun listni
#: "to'ldirilgan" deb hisoblashga asos bo'lmaydi
_DESCRIPTOR_LABELS = re.compile(r"^(цвет|прозрачность|запах|консистенция|форма|вязкость)", re.I)


class ExcelReadError(Exception):
    """Excel faylni o'qib bo'lmadi yoki unda natija yo'q."""


def is_xlsx(filename: str) -> bool:
    return (filename or "").lower().endswith(".xlsx")


def _cell_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return str(value)
    if isinstance(value, float):
        if value.is_integer():
            return str(int(value))
        return f"{value:.6g}"
    if isinstance(value, (datetime.datetime, datetime.date)):
        return value.strftime("%d.%m.%Y")
    return re.sub(r"\s+", " ", str(value)).strip()


def _check_zip(content: bytes) -> None:
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            if "xl/workbook.xml" not in set(zf.namelist()):
                raise ExcelReadError("not_xlsx")
            if sum(info.file_size for info in zf.infolist()) > MAX_UNCOMPRESSED_BYTES:
                raise ExcelReadError("too_large")
    except zipfile.BadZipFile as exc:
        raise ExcelReadError("not_xlsx") from exc


def _is_default(label: str, result: str, rest: str) -> bool:
    """Shablon standart yozuvimi (list to'ldirilganiga dalil emas)."""
    value = result.strip().lower()
    norm = rest.split(" | ")[0].strip().lower() if rest else ""
    return (value in _DEFAULT_VALUES
            or (norm and value == norm)
            or bool(_DESCRIPTOR_LABELS.match(label)))


def _sheet_blocks(ws) -> tuple[list[str], bool, list[str]]:
    """Bitta listdan natija qatorlari.

    Qaytaradi: (qatorlar, sarlavha topildimi, "kuchsiz" qatorlar). Kuchsiz —
    listning BARCHA qatorlari to'ldirilgan, lekin faqat standart yozuvlar
    bilan (masalan serologiyaning to'rttala qatori "Отрицательный(-)").
    Ular faqat faylda boshqa hech narsa topilmasa yuboriladi.
    """
    title = ""
    result_col = None
    parent = ""
    last = ("", "")  # oxirgi qatorning (nomi, normasi) — birlashgan kataklar uchun
    data_rows: list[tuple[str, str, str]] = []
    any_header = False
    for index, row in enumerate(ws.iter_rows(values_only=True)):
        if index >= MAX_ROWS_PER_SHEET:
            break
        cells = [_cell_text(v) for v in row]
        if not any(cells):
            continue
        header_hit = [i for i, c in enumerate(cells) if _HEADER.match(c)]
        if header_hit:
            result_col = header_hit[0]
            any_header = True
            parent = ""
            last = ("", "")
            continue
        if result_col is None:
            # Sarlavhadan oldingi birinchi mazmunli qator — list nomi
            first = next((c for c in cells if c), "")
            if not title and not _SKIP_ROW.match(first) and len(first) > 3:
                title = first
            continue
        if any(_SIGNATURE.search(c) for c in cells if c):
            continue
        if result_col >= len(cells):
            continue
        result = cells[result_col]
        rest = " | ".join(c for c in cells[result_col + 1:] if c)
        labels = [c for c in cells[:result_col] if c]
        if not labels:
            # Nomi bir necha qatorga birlashtirilgan katakda (masalan "Вит Д"
            # listida natija nomdan 4 qator pastda turadi)
            if result and last[0]:
                data_rows.append((last[0], result, rest or last[1]))
            continue
        if cells[0]:
            parent = cells[0]
        elif parent and result_col > 1:
            labels = [parent] + labels
        label = " / ".join(labels)
        if _SKIP_ROW.match(label):
            continue
        last = (label, rest)
        data_rows.append((label, result, rest))

    if not any_header:
        return [], False, []

    filled = [r for r in data_rows if r[1]]
    if not filled:
        return [], True, []

    lines = [f"### {ws.title}" + (f" — {title}" if title else "")]
    lines.append("Ko'rsatkich | Natija | Norma / birlik")
    for label, result, rest in filled:
        lines.append(f"{label} | {result}" + (f" | {rest}" if rest else ""))

    # Faqat shablon standart yozuvlari bo'lsa — list to'ldirilmagan.
    # Ehtiyot: klinika shablonining ba'zi versiyalarida serologiya (HBS)
    # listiga ham "Отрицательный(-)" oldindan yozilgan — faqat "manfiy"lardan
    # iborat list bo'sh shablondan farq qilmaydi va boshqa natijalar bilan
    # birga YUBORILMAYDI (topshirilmagan tahlil "manfiy" bo'lib chiqmasin).
    # Fayl faqat shundan iborat bo'lsa — yuboriladi (bu holda u ataylab
    # to'ldirilgan serologiya natijasi).
    if any(not _is_default(*r) for r in filled):
        return lines, True, []
    if len(filled) == len(data_rows) and len(filled) >= 2:
        return [], True, lines
    return [], True, []


def _fallback_blocks(ws) -> list[str]:
    """Sarlavhasiz oddiy jadval: barcha to'ldirilgan qatorlar."""
    lines = []
    for index, row in enumerate(ws.iter_rows(values_only=True)):
        if index >= MAX_ROWS_PER_SHEET:
            break
        cells = [c for c in (_cell_text(v) for v in row) if c]
        if not cells or _SKIP_ROW.match(cells[0]) or any(_SIGNATURE.search(c) for c in cells):
            continue
        lines.append(" | ".join(cells))
    return ([f"### {ws.title}"] + lines) if lines else []


def xlsx_to_text(content: bytes) -> str:
    """xlsx baytlaridan AI uchun matnli jadval.

    `ExcelReadError` — fayl xlsx emas, buzilgan, juda katta yoki natija yo'q.
    """
    _check_zip(content)
    try:
        import openpyxl
    except ImportError as exc:  # pragma: no cover - requirements.txt da bor
        raise ExcelReadError("no_engine") from exc
    try:
        wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    except Exception as exc:
        logger.info("Excel ochilmadi: %s", exc)
        raise ExcelReadError("broken") from exc

    try:
        sheets = [ws for ws in wb.worksheets[:MAX_SHEETS]
                  if getattr(ws, "sheet_state", "visible") == "visible"]
        blocks: list[str] = []
        weak: list[str] = []
        header_found = False
        for ws in sheets:
            lines, has_header, weak_lines = _sheet_blocks(ws)
            header_found = header_found or has_header
            if lines:
                blocks.append("\n".join(lines))
            if weak_lines:
                weak.append("\n".join(weak_lines))
        if not blocks and weak:
            blocks = weak
        if not header_found:
            for ws in sheets:
                lines = _fallback_blocks(ws)
                if lines:
                    blocks.append("\n".join(lines))
    finally:
        wb.close()

    text = "\n\n".join(blocks).strip()
    if not text:
        raise ExcelReadError("empty")
    if len(text) > MAX_TEXT_CHARS:
        text = text[:MAX_TEXT_CHARS] + "\n… (jadval qisqartirildi)"
    return text
