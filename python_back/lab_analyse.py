from sqlalchemy.orm import Session
from models import LabAnalyses, LabAnalysisFiles, LabAnalysisValues
from sqlalchemy import text
import lab_catalog
import datetime
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def get_lab_analyse_by_id(session: Session, analyse_id: int) -> Optional[LabAnalyses]:
    """
    Ma'lum ID bo'yicha LabAnalyses yozuvini qaytaradi.
    Agar yozuv topilmasa, None qaytaradi.
    """
    return session.query(LabAnalyses).filter(LabAnalyses.id == analyse_id).first()


def create_lab_analyse(
    session: Session,
    patient_id: int,
    created_doctor_id: int,
    clinic_id: int,
    status: int = 0,
    
    analyse_file_link: Optional[str] = None,
    ai_answer_data: Optional[str] = None,
    analysis_date: Optional[datetime.datetime] = None
) -> LabAnalyses:
    """
    Yangi laboratoriya tahlilini yaratadi.

    Ko'rsatkich qiymatlari bu yerda berilmaydi — ular AI natijasidan keyin
    `replace_lab_values` bilan `lab_analysis_values` ga yoziladi.
    """
    new_lab = LabAnalyses(
        patcient_id=patient_id,
        created_doctor_id=created_doctor_id,
        clinic_id=clinic_id,
        status=status,
        analyse_file_link=analyse_file_link,
        ai_answer_data=ai_answer_data,
        analysis_date=analysis_date,
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow()
    )
    session.add(new_lab)
    session.commit()
    session.refresh(new_lab)

    # Document number generatsiya (o'zgarmas, takrorlanmas)
    new_lab.document_number = f"NMED-LAB-{str(new_lab.id).zfill(8)}"
    session.commit()

    return new_lab


def update_lab_analyse(
    session: Session,
    analyse_id: int,
    status: Optional[int] = None,
    analyse_file_link: Optional[str] = None,
    ai_answer_data: Optional[str] = None,
    clear_ai_answer: bool = False,
) -> Optional[LabAnalyses]:
    """
    LabAnalyses yozuvini yangilaydi (holat, fayl, AI javobi).
    Agar yozuv topilmasa, None qaytaradi.

    Ko'rsatkich qiymatlari bu yerda yozilmaydi — `replace_lab_values`.
    """

    lab = session.query(LabAnalyses).filter(LabAnalyses.id == analyse_id).first()
    if not lab:
        return None

    # Asosiy (laboratoriya ko'rsatkichi bo'lmagan) maydonlar
    base_fields = {
        "status": status,
        "analyse_file_link": analyse_file_link,
        "ai_answer_data": ai_answer_data,
    }
    for field, value in base_fields.items():
        if value is not None:
            setattr(lab, field, value)

    # Aniq tozalash: yuqoridagi sikl `None` ni "bu maydonga tegma" deb
    # qabul qiladi, shuning uchun o'chirish uchun alohida bayroq kerak.
    # Ilgari shu maqsadda bo'sh satr yozilardi, lekin ustun `jsonb` ga
    # o'tgach bo'sh satr yaroqsiz bo'lib qoldi (T-036).
    if clear_ai_answer:
        lab.ai_answer_data = None

    lab.updated_at = datetime.datetime.utcnow()
    session.commit()
    session.refresh(lab)
    return lab


def set_lab_analysis_files(session: Session, analyse_id: int, files: list[dict]) -> None:
    """Tahlilning fayllar ro'yxatini to'liq almashtiradi (`lab_analysis_files`).

    `files` — yuklangan tartibda: `{"file_link", "original_filename", "file_hash"}`.
    Birinchi fayl `lab_analyses.analyse_file_link` ga ham yoziladi: shu
    ustunga tayanadigan eski kod (PDF, konsultatsiya) buzilmasligi uchun.

    Bitta tranzaksiyada: eski qatorlar o'chiriladi va yangilari yoziladi —
    yarim yangilangan ro'yxat qolmaydi.
    """
    session.query(LabAnalysisFiles).filter(
        LabAnalysisFiles.lab_analysis_id == analyse_id
    ).delete(synchronize_session=False)
    now = datetime.datetime.utcnow()
    for position, item in enumerate(files):
        session.add(LabAnalysisFiles(
            lab_analysis_id=analyse_id,
            file_link=item["file_link"],
            original_filename=item.get("original_filename"),
            file_hash=item.get("file_hash"),
            position=position,
            created_at=now,
        ))
    if files:
        lab = session.query(LabAnalyses).filter(LabAnalyses.id == analyse_id).first()
        if lab is not None:
            first = files[0]
            lab.analyse_file_link = first["file_link"]
            lab.original_filename = first.get("original_filename")
            lab.file_hash = first.get("file_hash")
            lab.updated_at = now
    session.commit()


def get_lab_analysis_file_links(session: Session, lab: LabAnalyses) -> list[str]:
    """Tahlil fayllari yo'llari, yuklangan tartibda.

    Migratsiyadan oldin yaratilgan va ko'chirilmay qolgan yozuv uchun
    `analyse_file_link` ga qaytadi.
    """
    rows = (
        session.query(LabAnalysisFiles.file_link)
        .filter(LabAnalysisFiles.lab_analysis_id == lab.id)
        .order_by(LabAnalysisFiles.position, LabAnalysisFiles.id)
        .all()
    )
    links = [row[0] for row in rows if row[0]]
    if not links and lab.analyse_file_link:
        links = [lab.analyse_file_link]
    return links


def clear_lab_values(session: Session, analyse_id: int) -> None:
    """Tahlilning barcha ko'rsatkich qatorlarini o'chiradi (commit qilmaydi).

    Qayta tahlil yoki fayl almashtirilganda chaqiriladi: ilgari eski
    fayldagi qiymatlar ustunlarda qolib ketardi, chunki yangi natija
    faqat TOPILGAN ko'rsatkichlarni yozardi.
    """
    session.query(LabAnalysisValues).filter(
        LabAnalysisValues.lab_analysis_id == analyse_id
    ).delete(synchronize_session=False)


def replace_lab_values(session: Session, analyse_id: int, measurements: dict) -> int:
    """AI natijasini `lab_analysis_values` ga yozadi (eski qatorlar o'rniga).

    `measurements` — `lab_units.harmonize_all` natijasi:
    `{column_name: {"value", "unit", "text"?, "original"?, "unit_mismatch"?}}`.

    * Katalogda yo'q kalit tashlab yuboriladi (log bilan).
    * `unit_mismatch` qiymatlar ham SAQLANADI (asl birligi bilan), lekin
      `flag` qo'yilmaydi — statistikada ular chiqarib tashlanishi kerak.
    * `flag` avval laboratoriyaning o'z me'yori (`ref_low`/`ref_high`) bilan,
      bo'lmasa katalog me'yori va bemor jinsi bilan (`lab_catalog.flag_for`);
      sifat natijasi — `result_kind` bo'yicha.

    Bitta tranzaksiyada: eski qatorlar o'chiriladi va yangilari yoziladi.
    Qaytaradi: yozilgan qatorlar soni.
    """
    lab = session.query(LabAnalyses).filter(LabAnalyses.id == analyse_id).first()
    if lab is None:
        return 0
    types = lab_catalog.catalog(session)
    gender = session.execute(
        text("SELECT gender FROM patients WHERE id = :id"), {"id": lab.patcient_id}
    ).scalar()
    measured_at = lab.analysis_date or lab.created_at or datetime.datetime.utcnow()

    clear_lab_values(session, analyse_id)
    written = 0
    for column, cell in (measurements or {}).items():
        t = types.get(column)
        if t is None:
            logger.warning("Lab: katalogda yo'q ko'rsatkich yozilmadi: %s", column)
            continue
        if not isinstance(cell, dict):
            continue
        value = _to_number(cell.get("value"))
        text_value = cell.get("text") if isinstance(cell.get("text"), str) else None
        kind = cell.get("result_kind") if cell.get("result_kind") in _RESULT_KINDS else None
        if t.value_kind == "qualitative" and kind is None:
            kind = "UNKNOWN"
        if value is None and not text_value and kind in (None, "UNKNOWN"):
            continue
        mismatch = bool(cell.get("unit_mismatch"))
        original = cell.get("original") if isinstance(cell.get("original"), dict) else {}
        ref_low, ref_high = _to_number(cell.get("ref_low")), _to_number(cell.get("ref_high"))
        # Teskari yozilgan me'yor (masalan 40–20) ishonchsiz — ishlatilmaydi
        if ref_low is not None and ref_high is not None and ref_low > ref_high:
            ref_low = ref_high = None
        flag, flag_source = lab_catalog.flag_for(
            t, value, gender, mismatch, ref_low, ref_high, kind)
        ref_text = cell.get("ref_text") if isinstance(cell.get("ref_text"), str) else None
        session.add(LabAnalysisValues(
            lab_analysis_id=analyse_id,
            value_type_id=t.id,
            patient_id=lab.patcient_id,
            measured_at=measured_at,
            value=value,
            unit=(str(cell.get("unit"))[:64] if cell.get("unit") else None),
            text=(text_value[:200] if text_value else None),
            original_value=_to_number(original.get("value")),
            original_unit=(str(original.get("unit"))[:64] if original.get("unit") else None),
            unit_mismatch=mismatch,
            flag=flag,
            flag_source=flag_source,
            ref_low=ref_low,
            ref_high=ref_high,
            ref_text=(ref_text[:300] if ref_text else None),
            result_kind=kind,
            created_at=datetime.datetime.utcnow(),
        ))
        written += 1
    session.commit()
    return written


_RESULT_KINDS = {"NEGATIVE", "POSITIVE", "EQUIVOCAL", "INVALID", "UNKNOWN"}


def _to_number(value):
    """Son yoki None (bool va matnli qiymatlar son emas)."""
    if value is None or isinstance(value, bool):
        return None
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    if num != num or num in (float("inf"), float("-inf")):
        return None
    return num
