from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import DATABASE_URL

SQLALCHEMY_DATABASE_URL = DATABASE_URL

# MUHIM — DB sessiya vaqt mintaqasini UTC ga majburlaymiz.
#
# Ustunlar `timestamptz` (Npgsql `DateTime` ni shunday map qiladi). Python esa
# NAIVE `datetime.utcnow()` yozadi. Agar sessiya TZ Asia/Tashkent (+5) bo'lsa,
# Postgres naive UTC qiymatni MAHALLIY vaqt deb talqin qilib, saqlashda 5 soat
# oldinga suradi (07:37 UTC → 02:37 UTC saqlanardi). Natijada tahlil "hozir"
# yuklansa ham ro'yxatda "300 daqiqa oldin" ko'rinardi.
#
# Sessiyani UTC qilsak, naive UTC qiymatlar to'g'ri saqlanadi va .NET (UTC bilan
# ishlaydi) bilan mos keladi.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"options": "-c timezone=utc"},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
