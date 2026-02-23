from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.future import select
from models import HolterAnalyseDoctors
import datetime


async def create_holter_analyse_doctor(
    session: AsyncSession,
    holter_analyse_id: int,
    doctor_id: int
) -> HolterAnalyseDoctors:
    new_ecg = HolterAnalyseDoctors(
        doctor_id=doctor_id,
        holter_analyse_id=holter_analyse_id,
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow()
    )
    session.add(new_ecg)
    session.commit()
    session.refresh(new_ecg)  # Get the ID after commit
    return new_ecg


