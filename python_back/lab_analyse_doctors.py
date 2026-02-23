from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.future import select
from models import LabAnalyseDoctors
import datetime


async def create_lab_analyse_doctor(
    session: AsyncSession,
    lab_analyse_id: int,
    doctor_id: int
) -> LabAnalyseDoctors:
    new_ecg = LabAnalyseDoctors(
        doctor_id=doctor_id,
        lab_analyse_id=lab_analyse_id,
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow()
    )
    session.add(new_ecg)
    session.commit()
    session.refresh(new_ecg)  # Get the ID after commit
    return new_ecg


