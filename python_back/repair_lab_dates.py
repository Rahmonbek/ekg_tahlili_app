"""Mavjud laboratoriya tahlillariga fayldagi tahlil sanasini qo'yadi.

Yuklash formasi ilgari sanani avtomatik BUGUN qilib qo'yardi — statistika,
dinamika va klinik qoidalar tahlil sanasi o'rniga yuklangan kunni ko'rardi.
Yangi tahlillarda sana fayldan olinadi (`lab_analyses_api._apply_document_date`).
Bu skript ESKI yozuvlarni tuzatadi:

  * faqat sanasi tasdiqlanmagan yozuvlar (`analysis_date_source` NULL yoki
    `document`); formada ataylab kiritilgan (`user`) sana o'zgartirilmaydi;
  * sana Excel fayldagi «Дата:» katagidan olinadi (AI chaqirilmaydi).
    PDF/rasmda sana faqat AI orqali o'qiladi — ular uchun tahlilni qayta
    yuboring ("AI orqali tekshirish"); skript ularni sanab ko'rsatadi;
  * `lab_analysis_values.measured_at` ham yangilanadi va bemor klinik
    qoidalar bo'yicha qayta baholanadi (`lab_rule_patient_state` o'chiriladi).

Ishlatish::

    python repair_lab_dates.py            # faqat ko'rsatadi
    python repair_lab_dates.py --apply    # tuzatadi
"""

import sys

from sqlalchemy import text

import excel_to_text
import lab_dates
import storage
from database import SessionLocal

APPLY = "--apply" in sys.argv


def _files(db, analyse_id: int, first_link: str | None) -> list[tuple[str, str]]:
    rows = db.execute(text(
        "SELECT file_link, original_filename FROM lab_analysis_files "
        "WHERE lab_analysis_id = :id ORDER BY position, id"), {"id": analyse_id}).fetchall()
    if rows:
        return [(r[0], r[1] or r[0]) for r in rows]
    return [(first_link, first_link)] if first_link else []


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    changed = no_date = not_excel = missing = 0
    db = SessionLocal()
    try:
        rows = db.execute(text("""
            SELECT la.id, la.analyse_file_link, la.analysis_date, la.created_at, p.birthdate,
                   la.patient_id, la.clinic_id
              FROM lab_analyses la
              LEFT JOIN patients p ON p.id = la.patient_id
             WHERE la.deleted_at IS NULL
               AND la.analysis_date_source IS DISTINCT FROM 'user'
             ORDER BY la.id""")).fetchall()

        for row_id, first_link, current, created_at, birthdate, patient_id, clinic_id in rows:
            files = _files(db, row_id, first_link)
            excel = [(link, name) for link, name in files
                     if excel_to_text.is_xlsx(name) or excel_to_text.is_xlsx(link)]
            if not excel:
                not_excel += 1
                continue
            dates = []
            for link, _name in excel:
                path = storage.resolve_existing(link)
                if path is None:
                    missing += 1
                    continue
                dates.append(lab_dates.validate(excel_to_text.xlsx_date(path.read_bytes()), birthdate))
            found = lab_dates.pick_latest(dates)
            if not found:
                no_date += 1
                print(f"lab_analyses#{row_id}: fayldan sana topilmadi")
                continue
            stored = lab_dates.to_storage(found)
            if current is not None and current.replace(tzinfo=None) == stored:
                continue

            changed += 1
            local = lambda v: v.astimezone(lab_dates.TZ).date()
            was = local(current) if current else f"— (yuklangan {local(created_at)})"
            print(f"lab_analyses#{row_id}: {was} → {found}")
            if APPLY:
                db.execute(text(
                    "UPDATE lab_analyses SET analysis_date = :d, analysis_date_source = :s "
                    "WHERE id = :id"), {"d": stored, "s": lab_dates.SOURCE_DOCUMENT, "id": row_id})
                db.execute(text(
                    "UPDATE lab_analysis_values SET measured_at = :d WHERE lab_analysis_id = :id"),
                    {"d": stored, "id": row_id})
                # Qiymatlar to'plami o'zgarmagani uchun worker o'zi sezmaydi
                db.execute(text(
                    "DELETE FROM lab_rule_patient_state WHERE clinic_id = :c AND patient_id = :p"),
                    {"c": clinic_id, "p": patient_id})
                db.commit()
    finally:
        db.close()

    print(f"\n  O'zgaradigan yozuvlar: {changed}")
    print(f"  Excel'da sana topilmadi: {no_date}; diskda fayl yo'q: {missing}")
    print(f"  PDF/rasm (sana faqat AI orqali — qayta tahlil qiling): {not_excel}")
    if not APPLY:
        print("  (hech narsa o'zgartirilmadi — `--apply` bilan ishga tushiring)")


if __name__ == "__main__":
    main()
