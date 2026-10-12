"""Mavjud laboratoriya natijalarini me'yor birligiga keltiradi (`lab_units`).

Yangi tahlillar `lab_analyses_api` da avtomatik aylantiriladi. Bu skript
ESKI yozuvlarni tuzatadi — ularda AI fayldagi birlikni (mg/dL, g/dL, …)
qaytargan va qiymat me'yor birligidagi chegaralar bilan noto'g'ri
solishtirilgan:

    siydik kislotasi 5.5 mg/dL → 327 µmol/L   (ilgari "past", aslida norma)
    gemoglobin       15.2 g/dL → 152 g/L      (ilgari "past", aslida norma)

Har bir yozuvda:
  * `ai_answer_data.digital_measurements` — qiymat va birlik aylantiriladi,
    asl yozuv `original` da saqlanadi; aylantirib bo'lmaganiga
    `unit_mismatch` belgisi qo'yiladi;
  * raqamli ustunlar (`hb`, `uric_acid`, …) — aylantirilgan qiymat;
    birligi mos kelmagani `NULL` (boshqa birlikdagi son PDF va dinamika
    grafigini buzardi);
  * `ai_translations` keshi tozalanadi — unda eski birliklar nusxasi bor,
    keyingi so'rovda qayta yaratiladi.

Ishlatish::

    python repair_lab_units.py            # faqat ko'rsatadi
    python repair_lab_units.py --apply    # tuzatadi
"""

import json
import sys

from sqlalchemy import text

import lab_units
from database import engine
from models import LabAnalyses

APPLY = "--apply" in sys.argv

# Faqat `lab_analyses` da haqiqatan bor ustunlar yangilanadi
_COLUMNS = {c.key for c in LabAnalyses.__table__.columns}


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    changed = 0
    with engine.begin() as conn:
        units = lab_units.canonical_units(conn)
        rows = conn.execute(text(
            "SELECT id, ai_answer_data FROM lab_analyses WHERE ai_answer_data IS NOT NULL ORDER BY id"
        )).fetchall()

        for row_id, answer in rows:
            data = answer if isinstance(answer, dict) else json.loads(answer)
            measurements = data.get("digital_measurements")
            if not isinstance(measurements, dict):
                continue

            fixed = {}
            column_updates = {}
            notes = []
            for column, cell in measurements.items():
                if not isinstance(cell, dict) or "value" not in cell or cell.get("original"):
                    fixed[column] = cell  # allaqachon tuzatilgan yoki boshqa shakl
                    continue
                result = lab_units.harmonize(column, cell.get("value"), cell.get("unit"), units.get(column))
                fixed[column] = result
                if result.get("original"):
                    notes.append(f"{column}: {cell.get('value')} {cell.get('unit')} → {result['value']} {result['unit']}")
                    if column in _COLUMNS:
                        column_updates[column] = result["value"]
                elif result.get("unit_mismatch") and not cell.get("unit_mismatch"):
                    notes.append(f"{column}: {cell.get('value')} {cell.get('unit')} — me'yor {units.get(column)}, baholanmaydi")
                    if column in _COLUMNS:
                        column_updates[column] = None
                elif cell.get("unit_mismatch") and not result.get("unit_mismatch"):
                    # Ilgari tanilmagan birlik (masalan ruscha "МкЕ/мл") endi taniladi
                    notes.append(f"{column}: {cell.get('unit')!r} endi taniladi → {result['unit']!r}")
                    if column in _COLUMNS:
                        column_updates[column] = result["value"]
                elif result.get("unit") != cell.get("unit"):
                    fixed[column] = result  # faqat birlik yozuvi bir xillashtirildi
                    notes.append(f"{column}: birlik yozuvi {cell.get('unit')!r} → {result['unit']!r}")

            if not notes:
                continue

            changed += 1
            print(f"lab_analyses#{row_id}")
            for note in notes:
                print(f"    {note}")

            if APPLY:
                data["digital_measurements"] = fixed
                sets = ["ai_answer_data = CAST(:data AS jsonb)", "ai_translations = NULL"]
                params = {"data": json.dumps(data, ensure_ascii=False), "id": row_id}
                for i, (column, value) in enumerate(column_updates.items()):
                    sets.append(f"{column} = :v{i}")  # ustun nomi `_COLUMNS` dan — xavfsiz
                    params[f"v{i}"] = value
                conn.execute(text(f"UPDATE lab_analyses SET {', '.join(sets)} WHERE id = :id"), params)

    print(f"\n  O'zgaradigan yozuvlar: {changed}")
    if not APPLY:
        print("  (hech narsa o'zgartirilmadi — `--apply` bilan ishga tushiring)")


if __name__ == "__main__":
    main()
