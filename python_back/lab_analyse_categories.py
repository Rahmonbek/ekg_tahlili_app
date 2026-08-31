# lab_analyse_categories.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models import LabAnalyseCategories
import datetime
from typing import List, Optional


async def create_lab_analyse_category(
    session: AsyncSession,
    lab_analyse_id: int,
    category_id: int
) -> LabAnalyseCategories:
    new_entry = LabAnalyseCategories(
        lab_analyse_id=lab_analyse_id,
        category_id=category_id,
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow()
    )
    session.add(new_entry)
    session.commit()
    session.refresh(new_entry)  # Get the ID after commit
    return new_entry