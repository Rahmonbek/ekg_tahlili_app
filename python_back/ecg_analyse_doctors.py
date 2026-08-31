from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.future import select
from models import ECGAnalyseDoctors
import datetime


async def create_ecg_analyse_doctor(
    session: AsyncSession,
    ecg_analyse_id: int,
    doctor_id: int
) -> ECGAnalyseDoctors:
    new_ecg = ECGAnalyseDoctors(
        doctor_id=doctor_id,
        ecg_analyse_id=ecg_analyse_id,
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow()
    )
    session.add(new_ecg)
    session.commit()
    session.refresh(new_ecg)  # Get the ID after commit
    return new_ecg


