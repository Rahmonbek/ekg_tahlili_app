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
  * `lab_analysis_values` — FAQAT o'zgargan ko'rsatkichlarning qatorlari
    qayta yoziladi (`replace_lab_values(columns=…)`: birligi mos kelmagani
    `unit_mismatch = true`, baholanmaydi va statistikaga kirmaydi).
    Qolgan qatorlarga tegilmaydi — ilgari tahlilning BARCHA qatorlari eski
    JSON dan qayta yozilardi va migratsiya matndan qo'ygan sifat natijasi
    holati (`result_kind`) UNKNOWN ga tushardi (L-24);
  * eski qoida bilan aylantirilgan kortizol (< 40 "нмоль/л" ×27.6) va
    prolaktin (< 40 "мМЕ/л") asl ko'rinishiga qaytariladi va "birlik
    shubhali" (`unit_suspect`) deb belgilanadi (L-01, L-06);
  * `ai_translations` keshi tozalanadi — unda eski birliklar nusxasi bor,
    keyingi so'rovda qayta yaratiladi.

Ishlatish::

    python repair_lab_units.py            # faqat ko'rsatadi
    python repair_lab_units.py --apply    # tuzatadi
"""

import json
import sys

from sqlalchemy import text

import lab_catalog
import lab_units
from database import SessionLocal
from lab_analyse import replace_lab_values

APPLY = "--apply" in sys.argv


def plan_fixes(db, measurements: dict, units: dict) -> tuple[dict, list, set]:
    """Bitta tahlil uchun: `(tuzatilgan JSON, izohlar, o'zgargan ko'rsatkichlar)`.

    O'zgarmagan katak JSON da ham AYNAN qoladi (qayta yozilmaydi).
    """
    fixed, notes, changed_cols = {}, [], set()
    for column, cell in measurements.items():
        if not isinstance(cell, dict) or "value" not in cell:
            fixed[column] = cell  # boshqa shakl
            continue
        if cell.get("original"):
            # Allaqachon aylantirilgan. Faqat eski qoida bilan aylantirilib,
            # endi "birlik shubhali" bo'lgani asl holiga qaytariladi.
            raw = lab_units.unconvert(column, cell, units.get(column))
            result = lab_units.harmonize_all(db, {column: raw})[column] if raw else None
            if result and result.get("unit_suspect") and not cell.get("unit_suspect"):
                fixed[column] = result
                changed_cols.add(column)
                notes.append(
                    f"{column}: faylda {raw.get('value')} {raw.get('unit')} — ilgari "
                    f"{cell.get('value')} {cell.get('unit')} deb aylantirilgan; endi birlik "
                    f"shubhali, baholanmaydi")
            else:
                fixed[column] = cell
            continue
        # Bitta ko'rsatkich uchun yangi yozuvdagidek: qiymat, me'yor
        # chegaralari (`ref_low`/`ref_high`), `text`, `result_kind`
        result = lab_units.harmonize_all(db, {column: cell})[column]
        note = None
        if result.get("original"):
            note = f"{column}: {cell.get('value')} {cell.get('unit')} → {result['value']} {result['unit']}"
        elif result.get("unit_suspect") and not cell.get("unit_suspect"):
            note = (f"{column}: {cell.get('value')} {cell.get('unit')} — birlik shubhali "
                    f"(me'yor {units.get(column)}), baholanmaydi")
        elif result.get("unit_mismatch") and not cell.get("unit_mismatch"):
            note = f"{column}: {cell.get('value')} {cell.get('unit')} — me'yor {units.get(column)}, baholanmaydi"
        elif cell.get("unit_mismatch") and not result.get("unit_mismatch"):
            # Ilgari tanilmagan birlik (masalan ruscha "МкЕ/мл") endi taniladi
            note = f"{column}: {cell.get('unit')!r} endi taniladi → {result['unit']!r}"
        elif result.get("unit") != cell.get("unit"):
            note = f"{column}: birlik yozuvi {cell.get('unit')!r} → {result['unit']!r}"
        if note:
            fixed[column] = result
            changed_cols.add(column)
            notes.append(note)
        else:
            fixed[column] = cell
    return fixed, notes, changed_cols


def _result_kind_counts(db) -> dict:
    rows = db.execute(text(
        "SELECT COALESCE(v.result_kind, '(null)'), COUNT(*) FROM lab_analysis_values v "
        "JOIN lab_value_types t ON t.id = v.value_type_id "
        "WHERE t.value_kind = 'qualitative' GROUP BY 1 ORDER BY 1"
    )).fetchall()
    return {r[0]: r[1] for r in rows}


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    changed = 0
    qual_rows = 0       # qayta yoziladigan sifat natijasi qatorlari
    qual_no_kind = 0    # shulardan JSON da `result_kind` yo'qlari (matndan tasniflanadi)
    db = SessionLocal()
    try:
        units = lab_units.canonical_units(db)
        types = lab_catalog.catalog(db)
        kinds_before = _result_kind_counts(db)
        rows = db.execute(text(
            "SELECT id, ai_answer_data FROM lab_analyses "
            "WHERE ai_answer_data IS NOT NULL AND deleted_at IS NULL ORDER BY id"
        )).fetchall()

        for row_id, answer in rows:
            data = answer if isinstance(answer, dict) else json.loads(answer)
            measurements = data.get("digital_measurements")
            if not isinstance(measurements, dict):
                continue

            fixed, notes, changed_cols = plan_fixes(db, measurements, units)
            if not notes:
                continue

            changed += 1
            print(f"lab_analyses#{row_id}")
            for note in notes:
                print(f"    {note}")
            for column in changed_cols:
                t = types.get(column)
                if t is not None and t.value_kind == "qualitative":
                    qual_rows += 1
                    if not (fixed.get(column) or {}).get("result_kind"):
                        qual_no_kind += 1

            if APPLY:
                data["digital_measurements"] = fixed
                db.execute(
                    text("UPDATE lab_analyses SET ai_answer_data = CAST(:data AS jsonb), "
                         "ai_translations = NULL WHERE id = :id"),
                    {"data": json.dumps(data, ensure_ascii=False), "id": row_id},
                )
                # Faqat o'zgargan ko'rsatkichlar; o'zi commit qiladi
                replace_lab_values(db, row_id, fixed, columns=changed_cols)

        print(f"\n  O'zgaradigan yozuvlar: {changed}")
        print(f"  Qayta yoziladigan sifat natijasi qatorlari: {qual_rows}"
              f" (shundan JSON da result_kind yo'q — matndan tasniflanadi: {qual_no_kind})")
        print(f"  Sifat natijalari (result_kind) hozir: {kinds_before}")
        if APPLY:
            kinds_after = _result_kind_counts(db)
            print(f"  Sifat natijalari (result_kind) keyin: {kinds_after}"
                  + ("" if kinds_after == kinds_before else "  ⚠ O'ZGARDI — tekshiring"))
    finally:
        db.close()

    if not APPLY:
        print("  (hech narsa o'zgartirilmadi — `--apply` bilan ishga tushiring)")


if __name__ == "__main__":
    main()
