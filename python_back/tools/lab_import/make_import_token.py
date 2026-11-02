"""Laboratoriya arxivini import qilish uchun VAQTINCHALIK kirish tokeni.

Login sahifasida reCAPTCHA bor — skript parol bilan kira olmaydi. Shuning
uchun token SERVERNING o'zida, API kaliti (`Jwt:Key`) bilan yaratiladi:
kalit serverdan chiqmaydi, parol kerak emas. Token tanlangan xodim nomidan
ishlaydi — tahlillar uning klinikasiga va uning nomiga yoziladi.

Ishlatish (serverda, Python papkasidan):
    venv/bin/python tools/lab_import/make_import_token.py --who 998901234567 --days 4 \
        --appsettings /projects/nmed/api.nmed.uz > ~/import_token.txt

`--who` — xodimning telefoni (raqamlari) yoki email. Token muddati
tugagach o'z-o'zidan bekor bo'ladi; import tugagach faylni o'chiring.
"""
import argparse
import json
import os
import re
import sys
import time

import jwt
from sqlalchemy import text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from database import SessionLocal  # noqa: E402

ROLE_NAMES = {1: "SuperAdmin", 2: "Admin", 3: "Director", 4: "Doctor", 5: "Nurse"}


def jwt_settings(folder):
    merged = {}
    for name in ("appsettings.json", "appsettings.Production.json"):
        p = os.path.join(folder, name)
        if os.path.exists(p):
            with open(p, encoding="utf-8-sig") as fh:
                merged.update(json.load(fh).get("Jwt", {}))
    if not merged.get("Key"):
        sys.exit(f"Jwt:Key topilmadi ({folder}/appsettings*.json)")
    return merged


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--who", required=True, help="xodim telefoni yoki email")
    ap.add_argument("--days", type=float, default=4)
    ap.add_argument("--appsettings", default="/projects/nmed/api.nmed.uz")
    a = ap.parse_args()

    digits = re.sub(r"\D", "", a.who)
    with SessionLocal() as db:
        rows = db.execute(text("""
            SELECT u.id, u.role_id, u.clinic_id, u.email, d.phone, d.lastname, d.firstname
              FROM users u LEFT JOIN doctors d ON d.user_id = u.id
             WHERE (:digits <> '' AND regexp_replace(COALESCE(d.phone, ''), '\\D', '', 'g') LIKE '%' || :digits)
                OR lower(u.email) = lower(:who)
        """), {"digits": digits, "who": a.who}).mappings().all()
    if len(rows) != 1:
        sys.exit(f"Xodim aniqlanmadi: {len(rows)} ta mos keldi")
    u = rows[0]
    if u["role_id"] not in (2, 3, 4, 5) or not u["clinic_id"]:
        sys.exit("Bu xodim tahlil yuklay olmaydi (rol yoki klinika yo'q)")

    s = jwt_settings(a.appsettings)
    claims = {
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier": str(u["id"]),
        "roleId": str(u["role_id"]),
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name": u["phone"] or u["email"] or str(u["id"]),
        "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": ROLE_NAMES[u["role_id"]],
        "iss": s.get("Issuer"),
        "aud": s.get("Audience"),
        "exp": int(time.time() + a.days * 86400),
    }
    print(jwt.encode(claims, s["Key"], algorithm="HS256"))
    print(f"# {u['lastname'] or ''} {u['firstname'] or ''} · rol {u['role_id']} · klinika {u['clinic_id']} · "
          f"{a.days} kun", file=sys.stderr)


if __name__ == "__main__":
    main()
