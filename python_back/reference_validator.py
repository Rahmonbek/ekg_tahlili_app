"""Tahlil yaratishdan OLDIN bog'lanishlarni tekshirish.

Nima uchun kerak:
    Ilgari tahlil yaratish bosqichma-bosqich, har biri alohida commit bilan
    bajarilardi:
        1. faylni diskka saqlash
        2. `ecg_analyses` yozuvini yaratish
        3. har bir `doctor_id` uchun junction qatori
        4. har bir `complaint_id` uchun junction qatori

    Auditda 4-qadamda mavjud bo'lmagan `complaint_id` sababli
    `ForeignKeyViolation` yuz berdi. Natijada:
        • HTTP 500 qaytdi,
        • lekin `ecg_analyses` yozuvi (status=0) va fayl BAZADA/DISKDA QOLDI,
        • u abadiy "Yuklanmoqda" holatida turib qoldi va uni o'chirib ham bo'lmasdi.

    Yechim: barcha tashqi kalitlar yozuv yaratilishidan oldin tekshiriladi.
    Shunda FK xatoligi umuman yuz bermaydi. Qo'shimcha himoya sifatida
    `cleanup_on_failure()` xatolik bo'lganda yaratilgan faylni o'chiradi.
"""
import logging
from pathlib import Path
from typing import Iterable, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class ReferenceError(ValueError):
    """Kiruvchi ma'lumotdagi bog'lanish yaroqsiz — foydalanuvchiga 400 qaytariladi."""


def _existing_ids(db: Session, table: str, ids: Iterable[int]) -> set:
    unique = {int(i) for i in ids if i is not None}
    if not unique:
        return set()
    rows = db.execute(
        text(f"SELECT id FROM {table} WHERE id = ANY(:ids)"),
        {"ids": list(unique)},
    ).fetchall()
    return {r[0] for r in rows}


def validate_analysis_refs(
    db: Session,
    *,
    patcient_id: int,
    clinic_id: int,
    created_doctor_id: int,
    doctor_ids: Optional[Iterable[int]] = None,
    complaint_ids: Optional[Iterable[int]] = None,
    lab_category_ids: Optional[Iterable[int]] = None,
    main_doctor_id: Optional[int] = None,
) -> None:
    """Barcha bog'lanishlarni tekshiradi. Yaroqsiz bo'lsa `ReferenceError` chiqaradi.

    Bemor, klinika va shifokorlar mavjudligi hamda shifokorlarning SHU klinikaga
    tegishliligi tekshiriladi — bu boshqa klinikaning shifokorini biriktirishning
    oldini oladi.
    """
    if not _existing_ids(db, "patcients", [patcient_id]):
        raise ReferenceError("Bemor topilmadi")

    if not _existing_ids(db, "clinics", [clinic_id]):
        raise ReferenceError("Klinika topilmadi")

    # Shifokorlar shu klinikaga tegishli bo'lishi kerak
    doctor_ids_to_check = {created_doctor_id}
    if main_doctor_id:
        doctor_ids_to_check.add(main_doctor_id)
    if doctor_ids:
        doctor_ids_to_check.update(int(d) for d in doctor_ids if d)

    rows = db.execute(
        text(
            "SELECT d.id FROM doctors d "
            "JOIN users u ON u.id = d.user_id "
            "WHERE d.id = ANY(:ids) AND u.clinic_id = :clinic_id"
        ),
        {"ids": list(doctor_ids_to_check), "clinic_id": clinic_id},
    ).fetchall()
    valid_doctors = {r[0] for r in rows}

    missing_doctors = doctor_ids_to_check - valid_doctors
    if missing_doctors:
        raise ReferenceError(
            f"Shifokor topilmadi yoki boshqa klinikaga tegishli: {sorted(missing_doctors)}"
        )

    if complaint_ids:
        found = _existing_ids(db, "complaints", complaint_ids)
        missing = {int(c) for c in complaint_ids if c} - found
        if missing:
            raise ReferenceError(f"Shikoyat topilmadi: {sorted(missing)}")

    if lab_category_ids:
        found = _existing_ids(db, "lab_categories", lab_category_ids)
        missing = {int(c) for c in lab_category_ids if c} - found
        if missing:
            raise ReferenceError(f"Laboratoriya kategoriyasi topilmadi: {sorted(missing)}")


def cleanup_file(base_dir: Path, file_link: Optional[str]) -> None:
    """Xatolik yuz berganda yaratilgan faylni o'chiradi (yetim fayl qolmasin)."""
    if not file_link:
        return
    try:
        path = base_dir / str(file_link).lstrip("/")
        if path.exists() and path.is_file():
            path.unlink()
            logger.info("Xatolikdan keyin yuklangan fayl o'chirildi")
    except Exception as exc:
        logger.warning("Faylni tozalab bo'lmadi: %s", exc)
