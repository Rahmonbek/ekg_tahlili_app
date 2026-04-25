from sqlalchemy.orm import Session
from models import SmadAnalyses
import datetime
from typing import Optional

def get_smad_analyse_by_id(session: Session, analyse_id: int) -> Optional[SmadAnalyses]:
    """
    Ma'lum ID bo'yicha SmadAnalyses yozuvini qaytaradi.
    Agar yozuv topilmasa, None qaytaradi.
    """
    return session.query(SmadAnalyses).filter(SmadAnalyses.id == analyse_id).first()


def create_smad_analyse(
    session: Session,
    patient_id: int,
    created_doctor_id: int,
    main_doctor_id: int,
    clinic_id: int,
    status: int = 0,
    analyse_file_link: Optional[str] = None,
    ai_answer_data: Optional[str] = None,
    analysis_date: Optional[datetime.datetime] = None
) -> SmadAnalyses:
    """
    Yangi laboratoriya tahlilini yaratadi.
    """
    new_lab = SmadAnalyses(
        patcient_id=patient_id,
        created_doctor_id=created_doctor_id,
        main_doctor_id=main_doctor_id,
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
    new_lab.document_number = f"NMED-SMAD-{str(new_lab.id).zfill(8)}"
    session.commit()

    return new_lab


def update_smad_analyse(
    session: Session,
    analyse_id: int,
    status: Optional[int] = None,
    analyse_file_link: Optional[str] = None,
    ai_answer_data: Optional[str] = None,
    
) -> Optional[SmadAnalyses]:
    """
    SmadAnalyses yozuvini yangilaydi.
    Agar yozuv topilmasa, None qaytaradi.
    AI tomonidan aniqlangan barcha parametrlar ham bazaga yoziladi.
    """

    lab = session.query(SmadAnalyses).filter(SmadAnalyses.id == analyse_id).first()
    if not lab:
        return None

    # AI yoki foydalanuvchi tomonidan kelgan barcha mavjud qiymatlarni yangilash
    fields_to_update = {
        "status": status,
        "analyse_file_link": analyse_file_link,
        "ai_answer_data": ai_answer_data,
        }

    for field, value in fields_to_update.items():
        if value is not None:
            setattr(lab, field, value)

    lab.updated_at = datetime.datetime.utcnow()
    session.commit()
    session.refresh(lab)
    return lab