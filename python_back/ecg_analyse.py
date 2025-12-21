from sqlalchemy.orm import Session
from models import ECGAnalyse
import datetime

def create_ecg_analyse(session: Session, patient_id: int, created_doctor_id: int, status: int,
                       analyse_file_link: bytes = None,
                       generated_file_link: bytes = None,
                       ai_answer_data: bytes = None) -> ECGAnalyse:
    new_ecg = ECGAnalyse(
        patcient_id=patient_id,
        created_doctor_id=created_doctor_id,
        status=status,
        analyse_file_link=analyse_file_link,
        generated_file_link=generated_file_link,
        ai_answer_data=ai_answer_data,
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow()
    )
    session.add(new_ecg)
    session.commit()
    session.refresh(new_ecg)  # Get the ID after commit
    return new_ecg

def update_ecg_analyse(session: Session, ecg_id: int,
                       status: int = None,
                       analyse_file_link: bytes = None,
                       generated_file_link: bytes = None,
                       ai_answer_data: bytes = None) -> ECGAnalyse | None:
    ecg = session.query(ECGAnalyse).filter(ECGAnalyse.id == ecg_id).first()
    if not ecg:
        return None

    if status is not None:
        ecg.status = status
    if analyse_file_link is not None:
        ecg.analyse_file_link = analyse_file_link
    if generated_file_link is not None:
        ecg.generated_file_link = generated_file_link
    if ai_answer_data is not None:
        ecg.ai_answer_data = ai_answer_data

    ecg.updated_at = datetime.datetime.utcnow()

    session.commit()
    session.refresh(ecg)
    return ecg
