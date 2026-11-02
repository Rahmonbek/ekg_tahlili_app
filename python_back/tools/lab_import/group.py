"""scan.jsonl → bemorlar va yuklash rejasi (tarmoq yo'q).

Qoidalar (foydalanuvchi bilan kelishilgan, 2026-11-02):
  * Tug'ilgan yili (yoki sanasi) bo'lmagan fayl — O'TKAZIB YUBORILADI.
  * Natijasi yo'q (bo'sh shablon) va F.I.O. yo'q fayl — o'tkazib yuboriladi.
  * Bemor kaliti: lotincha familiya + ism bosh harfi + tug'ilgan yili.
    To'liq ism bitta faylda bo'lsa — bemorga shu yoziladi.
  * Tug'ilgan sana: faylda to'liq sana bo'lsa o'sha, faqat yil — YYYY-01-01.
  * Bir bemorning BIR KUNDAGI fayllari — bitta lab tahlili (1..10 fayl,
    jami ≤ 45 MB), bir xil mazmunli (sha256) fayl bir marta.
  * Tahlil sanasi: fayldagi «Дата:» (server ham shuni oladi), bo'lmasa
    papka nomi.

Ishlatish: python group.py scan.jsonl outdir
Natija: plan.json, skipped.csv, report.txt
"""
import collections
import csv
import json
import os
import re
import sys

MAX_FILES = 10
MAX_BYTES = 45 * 1024 * 1024

_MAP = {
    "А": "A", "Б": "B", "В": "V", "Г": "G", "Д": "D", "Ё": "YO", "Ж": "J", "З": "Z",
    "И": "I", "Й": "Y", "К": "K", "Л": "L", "М": "M", "Н": "N", "О": "O", "П": "P",
    "Р": "R", "С": "S", "Т": "T", "У": "U", "Ф": "F", "Х": "X", "Ц": "TS", "Ч": "CH",
    "Ш": "SH", "Щ": "SH", "Ъ": "'", "Ы": "I", "Ь": "", "Э": "E", "Ю": "YU", "Я": "YA",
    "Ў": "O'", "Қ": "Q", "Ғ": "G'", "Ҳ": "H", "І": "I", "Ә": "A", "Ө": "O", "Ү": "U",
}
_VOWELS = set("АЕЁИОУЫЭЮЯЎ")


def translit(text):
    """Kirill → o'zbek lotin (KATTA harflar). «Е» so'z boshida va unlidan keyin — YE."""
    s = (text or "").upper().replace("‘", "'").replace("’", "'").replace("`", "'")
    out, prev = [], ""
    for ch in s:
        if ch == "Е":
            out.append("YE" if (not prev or not prev.isalpha() or prev in _VOWELS or prev in "ЪЬ") else "E")
        elif ch in _MAP:
            out.append(_MAP[ch])
        else:
            out.append(ch)
        prev = ch
    res = "".join(out)
    res = re.sub(r"[^A-Z' \-]", " ", res)
    return re.sub(r"\s{2,}", " ", res).strip(" -'")


def parse_birth(v):
    v = (v or "").strip()
    m = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", v[:10])
    if m and 1900 <= int(m.group(1)) <= 2026:
        return v[:10], int(m.group(1))
    m = re.fullmatch(r"(\d{1,2})[.,/](\d{1,2})[.,/](\d{4})", v)
    if m and 1900 <= int(m.group(3)) <= 2026:
        d, mth, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= mth <= 12 and 1 <= d <= 31:
            return f"{y}-{mth:02d}-{d:02d}", y
        return f"{y}-01-01", y
    m = re.search(r"\b(19\d\d|20[0-2]\d)\b", v)
    if m:
        return f"{m.group(1)}-01-01", int(m.group(1))
    return None, None


def parse_sex(v):
    v = (v or "").strip().lower()
    if v.startswith("муж") or v.startswith("erk") or v == "m":
        return "male"
    if v.startswith("жен") or v.startswith("ayol") or v == "f":
        return "female"
    return None


def parse_name(fio, path):
    """F.I.O. → (familiya, ism, otasining ismi) lotincha. Ism faqat bosh harf bo'lishi mumkin."""
    raw = re.sub(r"[.,]", " ", fio or "")
    words = [w for w in raw.split() if not w.isdigit()]
    if not words or words[0] in ("0", "-"):
        return None
    if len(words) == 1:
        # F.I.O. katagida faqat familiya — fayl nomidan bosh harf («Рузиев Х.xlsx»)
        stem = re.sub(r"\.xlsx$", "", os.path.basename(path), flags=re.I)
        fw = [w for w in re.sub(r"[.,]", " ", stem).split() if not w.isdigit()]
        if len(fw) >= 2 and translit(fw[0]) == translit(words[0]) and len(translit(fw[1])) <= 2:
            words.append(fw[1])
        else:
            last = translit(words[0])
            return (last, "", "") if len(last) >= 2 else None
    last, first = translit(words[0]), translit(words[1])
    middle = translit(" ".join(words[2:])) if len(words) > 2 else ""
    if len(last) < 2:
        return None
    return last, first, middle


def initial(first):
    for dig in ("SH", "CH", "YO", "YU", "YA", "TS", "O'", "G'"):
        if first.startswith(dig):
            return dig
    return first[:1]


def _upload(date, batch):
    """Bitta lab tahlili. Sana fayllarda yo'q bo'lsa (papkadan) — API ga yuboriladi."""
    return {
        "date": date or None,
        "date_from_folder": all(b["_folder"] for b in batch),
        "files": [b["path"] for b in batch],
        "bytes": sum(b["size"] for b in batch),
    }


def main():
    scan, outdir = sys.argv[1], sys.argv[2]
    items = [json.loads(line) for line in open(scan, encoding="utf-8")]
    skipped, ok = [], []
    for it in items:
        reason = None
        # ExcelReadError — server `xlsx_read` bilan bir xil: natija yo'q (bo'sh shablon)
        if it.get("read_error") == "ExcelReadError" and not it.get("error"):
            reason = "natija yo'q (bo'sh shablon)"
        elif it.get("error") or it.get("read_error"):
            reason = f"buzilgan fayl ({it.get('error') or it.get('read_error')})"
        elif not it.get("has_results"):
            reason = "natija yo'q (bo'sh shablon)"
        else:
            name = parse_name(it.get("fio"), it["path"])
            bdate, byear = parse_birth(it.get("birth"))
            if not name:
                reason = f"F.I.O. aniqlanmadi ({it.get('fio')!r})"
            elif not byear:
                reason = f"tug'ilgan yili yo'q ({it.get('birth')!r})"
            else:
                it["_name"], it["_bdate"], it["_byear"] = name, bdate, byear
                it["_sex"] = parse_sex(it.get("sex"))
                it["_date"] = it.get("xlsx_date") or it.get("folder_date")
                it["_folder"] = not it.get("xlsx_date")
                it["path"] = it["path"].replace("\\", "/")
                ok.append(it)
        if reason:
            skipped.append((it["path"], reason, it.get("fio", ""), it.get("birth", "")))

    groups = collections.OrderedDict()
    nameless = []
    for it in sorted(ok, key=lambda x: x["path"]):
        last, first, middle = it["_name"]
        if not first:
            nameless.append(it)
            continue
        key = f"{last}|{initial(first)}|{it['_byear']}"
        groups.setdefault(key, []).append(it)
    # Faqat familiya yozilgan fayl — familiyasi va tug'ilgan yili mos YAGONA
    # bemorga qo'shiladi; mos bemor yo'q yoki bir nechta bo'lsa — o'tkazib yuboriladi
    by_last_year = collections.defaultdict(list)
    for key in groups:
        last, _, year = key.split("|")
        by_last_year[(last, year)].append(key)
    attached = 0
    for it in nameless:
        cands = by_last_year.get((it["_name"][0], str(it["_byear"])), [])
        if len(cands) == 1:
            groups[cands[0]].append(it)
            attached += 1
        else:
            why = "bir nechta mos bemor" if cands else "mos bemor yo'q"
            skipped.append((it["path"], f"faqat familiya, ism yo'q ({why})", it.get("fio", ""), it.get("birth", "")))

    plan, dup_files = [], 0
    for key, its in groups.items():
        last = its[0]["_name"][0]
        firsts = [i["_name"][1] for i in its if i["_name"][1]]
        first = max(firsts, key=len)  # to'liq ism bosh harfdan afzal
        middles = [i["_name"][2] for i in its if i["_name"][2]]
        bdates = collections.Counter(i["_bdate"] for i in its)
        exact = [b for b in bdates if not b.endswith("-01-01")]
        bdate = exact[0] if len(exact) == 1 else bdates.most_common(1)[0][0]
        sexes = collections.Counter(i["_sex"] for i in its if i["_sex"])
        visits = collections.OrderedDict()
        seen = set()
        for i in sorted(its, key=lambda x: (x["_date"] or "", x["path"])):
            if i["sha256"] in seen:
                dup_files += 1
                continue
            seen.add(i["sha256"])
            visits.setdefault(i["_date"] or "", []).append(i)
        uploads = []
        for d, files in visits.items():
            batch, size = [], 0
            for f in files:
                if batch and (len(batch) >= MAX_FILES or size + f["size"] > MAX_BYTES):
                    uploads.append(_upload(d, batch))
                    batch, size = [], 0
                batch.append(f)
                size += f["size"]
            if batch:
                uploads.append(_upload(d, batch))
        plan.append({
            "key": key,
            "lastname": last,
            "firstname": first,
            "surename": max(middles, key=len) if middles else "",
            "birthdate": bdate,
            "gender": sexes.most_common(1)[0][0] if sexes else None,
            "source_names": sorted({i.get("fio", "") for i in its})[:5],
            "uploads": uploads,
        })

    os.makedirs(outdir, exist_ok=True)
    json.dump(plan, open(os.path.join(outdir, "plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    with open(os.path.join(outdir, "skipped.csv"), "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["fayl", "sabab", "F.I.O.", "tug'ilgan yili"])
        w.writerows(skipped)

    n_up = sum(len(p["uploads"]) for p in plan)
    n_files = sum(len(u["files"]) for p in plan for u in p["uploads"])
    reasons = collections.Counter(r.split(" (")[0] for _, r, _, _ in skipped)
    multi = sum(1 for p in plan for u in p["uploads"] if len(u["files"]) > 1)
    nodate = sum(1 for p in plan for u in p["uploads"] if not u["date"])
    folder = sum(1 for p in plan for u in p["uploads"] if u["date"] and u["date_from_folder"])
    total_mb = sum(u["bytes"] for p in plan for u in p["uploads"]) / 1024 / 1024
    per_patient = collections.Counter(min(len(p["uploads"]), 6) for p in plan)
    lines = [
        f"Jami xlsx fayl: {len(items)}",
        f"Yuklanadigan fayl: {n_files} (takror mazmunli {dup_files} ta olib tashlandi)",
        f"O'tkazib yuboriladigan: {len(skipped)}",
        *[f"  - {k}: {v}" for k, v in reasons.most_common()],
        f"Faqat familiyali, mos bemorga qo'shilgan fayl: {attached}",
        f"Bemorlar: {len(plan)}",
        f"Lab tahlillari (AI so'rovlari): {n_up}  — shundan bir nechta faylli: {multi}, sana papkadan: {folder}, sanasiz: {nodate}",
        f"Yuklanadigan hajm: {total_mb:.0f} MB",
        "Bemordagi tahlillar soni: " + ", ".join(f"{k if k < 6 else '6+'}: {v}" for k, v in sorted(per_patient.items())),
    ]
    open(os.path.join(outdir, "report.txt"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
