from sqlalchemy.orm import Session
from models import MedicalDiagnoses
import datetime

def get_medical_diagnose_by_id(session: Session, ecg_id: int) -> MedicalDiagnoses | None:
    """
    Ma'lum ID bo'yicha MedicalDiagnoses yozuvini qaytaradi.
    Agar yozuv topilmasa, None qaytaradi.
    """
    ecg = session.query(MedicalDiagnoses).filter(MedicalDiagnoses.id == ecg_id).first()
    return ecg

def create_medical_diagnose(session: Session, patient_id: int, created_doctor_id: int, clinic_id: int,  main_doctor_id: int,
                       diagnose_file_link: bytes = None,
                       ) -> MedicalDiagnoses:
    new_ecg = MedicalDiagnoses(
        patcient_id=patient_id,
        created_doctor_id=created_doctor_id,
        clinic_id=clinic_id,
        main_doctor_id=main_doctor_id,
        diagnose_file_link=diagnose_file_link,
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow()
    )
    session.add(new_ecg)
    session.commit()
    session.refresh(new_ecg)  # Get the ID after commit
    return new_ecg

