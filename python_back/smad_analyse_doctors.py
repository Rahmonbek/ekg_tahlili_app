from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.future import select
from models import SmadAnalyseDoctors
import datetime


async def create_smad_analyse_doctor(
    session: AsyncSession,
    smad_analyse_id: int,
    doctor_id: int
) -> SmadAnalyseDoctors:
    new_ecg = SmadAnalyseDoctors(
        doctor_id=doctor_id,
        smad_analyse_id=smad_analyse_id,
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow()
    )
    session.add(new_ecg)
    session.commit()
    session.refresh(new_ecg)  # Get the ID after commit
    return new_ecg


