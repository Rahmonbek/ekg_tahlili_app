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


import pytest  # noqa: E402


@pytest.fixture(autouse=True)
def _no_real_ai(monkeypatch):
    """Testlar haqiqiy OpenAI ga murojaat QILMASIN va xarajat yozmasin.

    Mavjud testlar eski (bitta so'rovli) laboratoriya yo'lini tekshiradi —
    ikki bosqichli yo'l `test_lab_split.py` da o'z soxta mijozi bilan.
    """
    import ai_config
    import ai_usage
    import lab_split

    def _blocked(**kw):
        raise RuntimeError("Testda haqiqiy OpenAI mijozi yaratildi")

    monkeypatch.setattr(ai_config, "LAB_PIPELINE", "legacy")
    monkeypatch.setattr(ai_usage, "record", lambda *a, **k: None)
    monkeypatch.setattr(lab_split, "OpenAI", _blocked)
