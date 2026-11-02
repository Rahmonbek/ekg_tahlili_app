"""D:\\labaratoriya dagi BARCHA xlsx fayllarni o'qiydi (faqat o'qish, tarmoq yo'q).

Har fayl uchun: F.I.O., tug'ilgan yili, jinsi, «Дата:», natija bormi
(excel_to_text.xlsx_read — server AI ga yuboradigan matn), papka sanasi,
sha256. Natija: scan.jsonl (har qator bitta fayl) — keyin group.py
bemorlarga ajratadi.

Ishlatish: python scan_all.py <root> <out.jsonl> [workers]
"""
import hashlib
import io
import json
import os
import re
import sys
import warnings
from multiprocessing import Pool

warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

LABELS = {
    "fio": re.compile(r"^\s*(ф\.?\s*и\.?\s*о|фио)", re.I),
    "birth": re.compile(r"(год|дата)\s*рожд", re.I),
    "sex": re.compile(r"^\s*пол\b", re.I),
    "date": re.compile(r"^\s*дата\s*:?\s*$", re.I),
}
# Papka nomidagi sana: "17,11", "02.04", "29,10,2026", "27,085" (xato yozuv)
FOLDER_DAY = re.compile(r"^(\d{1,2})[.,](\d{2})\d?(?:[.,](\d{4}))?$")


def folder_date(rel):
    parts = rel.replace("\\", "/").split("/")
    year = next((p for p in parts if re.fullmatch(r"20\d\d", p)), None)
    for p in reversed(parts[:-1]):
        m = FOLDER_DAY.match(p.strip())
        if m:
            d, mth, y = m.group(1), m.group(2), m.group(3) or year
            if y:
                return f"{y}-{int(mth):02d}-{int(d):02d}"
    return None


def header(content):
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True, read_only=True)
    found = {}
    try:
        for ws in wb.worksheets:
            for i, row in enumerate(ws.iter_rows(values_only=True)):
                if i > 15:
                    break
                cells = [c for c in row if c is not None and str(c).strip()]
                for j, c in enumerate(cells):
                    s = str(c).strip()
                    for k, rx in LABELS.items():
                        if k not in found and rx.search(s) and j + 1 < len(cells):
                            v = cells[j + 1]
                            found[k] = v.isoformat()[:10] if hasattr(v, "isoformat") else str(v).strip()
            if len(found) == 4:
                break
    finally:
        wb.close()
    return found


def work(args):
    root, rel = args
    import excel_to_text
    item = {"path": rel, "folder_date": folder_date(rel)}
    try:
        with open(os.path.join(root, rel), "rb") as fh:
            content = fh.read()
        item["size"] = len(content)
        item["sha256"] = hashlib.sha256(content).hexdigest()
    except OSError as e:
        item["error"] = f"read:{type(e).__name__}"
        return item
    try:
        item.update(header(content))
    except Exception as e:  # noqa: BLE001 — buzilgan fayl ro'yxatga yoziladi
        item["error"] = f"header:{type(e).__name__}"
    try:
        text, d = excel_to_text.xlsx_read(content)
        item["has_results"] = bool(text and text.strip())
        item["xlsx_date"] = d.isoformat() if d else None
    except Exception as e:  # noqa: BLE001
        item["has_results"] = False
        item["read_error"] = type(e).__name__
    return item


def main():
    root, out = sys.argv[1], sys.argv[2]
    workers = int(sys.argv[3]) if len(sys.argv) > 3 else max(2, (os.cpu_count() or 4) - 1)
    files = []
    for d, _, fs in os.walk(root):
        for f in fs:
            if f.lower().endswith(".xlsx") and not f.startswith("~$"):
                files.append(os.path.relpath(os.path.join(d, f), root))
    files.sort()
    print(f"files {len(files)} workers {workers}", flush=True)
    done = 0
    with open(out, "w", encoding="utf-8") as fo, Pool(workers) as pool:
        for item in pool.imap_unordered(work, [(root, r) for r in files], chunksize=16):
            fo.write(json.dumps(item, ensure_ascii=False) + "\n")
            done += 1
            if done % 2000 == 0:
                print(f"progress {done}/{len(files)}", flush=True)
    print(f"done {done}", flush=True)


if __name__ == "__main__":
    main()
