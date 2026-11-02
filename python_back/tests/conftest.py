"""Laboratoriya testlari uchun umumiy sozlama — baza va tarmoqsiz.

`database` moduli import paytida `config` (muhit o'zgaruvchilari) va
`create_engine` ni talab qiladi. Testlar bazaga ulanmaydi, shuning uchun
`models` import qilinishidan OLDIN o'rniga soxta modul qo'yiladi (haqiqiy
`declarative_base` bilan — SQLAlchemy ifodalari ishlashi uchun).
"""
import os
import sys
import types

from sqlalchemy.orm import declarative_base

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

if "database" not in sys.modules:
    _db = types.ModuleType("database")
    _db.Base = declarative_base()
    _db.SessionLocal = None
    _db.engine = None

    def _no_db():  # pragma: no cover — testlar bazaga murojaat qilmaydi
        raise RuntimeError("Testlarda baza yo'q")

    _db.get_db = _no_db
    sys.modules["database"] = _db
