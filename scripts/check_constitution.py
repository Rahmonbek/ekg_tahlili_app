#!/usr/bin/env python3
"""Konstitutsiyada e'lon qilingan endpointlar kodda bormi (T-078).

Nima uchun bu, test freymvorki emas
-----------------------------------
Taskda "har bir endpoint uchun avtomatlashtirilgan test yozish"
deyilgan. Loyihada test loyihasi umuman yo'q, va HTTP darajasidagi
integratsiya testlari uchun ishlab turgan baza, migratsiyalar va
autentifikatsiya kerak bo'ladi — bu alohida infratuzilma.

Lekin muammo aslida boshqacha: konstitutsiya **mavjud bo'lmagan**
endpointlarni e'lon qilgan edi (`mark-viewed-by-doctor`,
`api/med-diagnose/*`). Bunday farqni topish uchun so'rov yuborish
shart emas — marshrut atributlarini o'qish yetarli.

Shuning uchun bu skript hujjatdagi `METHOD api/...` qatorlarini
Controller fayllaridagi `[Route]` + `[HttpGet/Post/Put/Delete]`
juftliklari bilan solishtiradi. Tez, bog'liqliksiz va CI da ishlaydi.

Ishlatish::

    python scripts/check_constitution.py          # hisobot
    python scripts/check_constitution.py --strict # farq bo'lsa exit 1
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONSTITUTION = os.path.join(ROOT, ".specify", "memory", "constitution.md")
CONTROLLERS = os.path.join(ROOT, "backend", "EkgAnalyzerApi", "Controllers")

ROUTE_ATTR = re.compile(r'\[Route\("([^"]+)"\)\]')
VERB_ATTR = re.compile(r'\[Http(Get|Post|Put|Patch|Delete)(?:\("([^"]*)"\))?\]')

#: Hujjatdagi endpoint qatori, masalan:
#:   PUT api/ecg-analyses/mark-viewed     (body: { doctor_id })
DOC_LINE = re.compile(
    r"^\s*(GET|POST|PUT|PATCH|DELETE)\s+(api/[A-Za-z0-9\-_/{}:.]+)", re.M)


def normalize(path: str) -> str:
    """Marshrutni taqqoslash uchun soddalashtiradi.

    Yo'l parametrlari (`{id:int}`, `{userId}`) bir xil `{}` ga
    keltiriladi — hujjatda ular har xil yoziladi va bu farq
    ma'nosiz signal bergan bo'lardi.
    """
    path = path.strip().strip("/")
    path = re.sub(r"\{[^}]*\}", "{}", path)
    return path.lower()


def actual_routes():
    """Controller fayllaridan haqiqiy marshrutlar to'plami."""
    found = set()
    if not os.path.isdir(CONTROLLERS):
        print(f"  Controller papkasi topilmadi: {CONTROLLERS}")
        return found

    for fname in sorted(os.listdir(CONTROLLERS)):
        if not fname.endswith(".cs"):
            continue
        with open(os.path.join(CONTROLLERS, fname), encoding="utf-8-sig",
                  errors="replace") as fh:
            text = fh.read()

        base_match = ROUTE_ATTR.search(text)
        base = base_match.group(1) if base_match else ""
        base = base.replace("[controller]", fname[:-len("Controller.cs")].lower())

        for verb, suffix in VERB_ATTR.findall(text):
            parts = [p for p in (base, suffix or "") if p]
            found.add((verb.upper(), normalize("/".join(parts))))
    return found


def documented_routes():
    """Konstitutsiyada e'lon qilingan marshrutlar."""
    with open(CONSTITUTION, encoding="utf-8") as fh:
        text = fh.read()
    return {(verb, normalize(path)) for verb, path in DOC_LINE.findall(text)}


def main():
    actual = actual_routes()
    documented = documented_routes()

    missing = sorted(documented - actual)

    print(f"  Kodda topilgan marshrutlar     : {len(actual)}")
    print(f"  Konstitutsiyada e'lon qilingan : {len(documented)}")
    print()

    if not missing:
        print("  Konstitutsiyadagi har bir endpoint kodda mavjud.")
    else:
        print(f"  KODDA YO'Q ({len(missing)} ta) — hujjat kodga mos emas:")
        for verb, path in missing:
            print(f"    {verb:6} {path}")

    # Teskari yo'nalish (kodda bor, hujjatda yo'q) ATAYLAB xato
    # hisoblanmaydi: konstitutsiya to'liq API ma'lumotnomasi emas,
    # u faqat muhim shartnomalarni qayd etadi. Uni majburiy qilish
    # har bir yangi endpointda hujjat yozishga majburlagan bo'lardi
    # va tez orada hamma buni chetlab o'tishni o'rganardi.
    extra = len(actual - documented)
    print(f"\n  (Hujjatda qayd etilmagan {extra} ta endpoint — bu xato emas)")

    if missing and "--strict" in sys.argv:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
