"""L-13, L-16, L-30, L-39 — laboratoriya endpointlari (DB va tarmoqsiz).

Endpoint funksiyalari to'g'ridan-to'g'ri chaqiriladi; DB sessiyasi va
bog'liq funksiyalar soxta obyektlar bilan almashtiriladi.
"""
import asyncio
import datetime
import os
import sys
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import lab_analyse  # noqa: E402
import lab_analyses_api as api  # noqa: E402

UTC = datetime.timezone.utc


def _now():
    return datetime.datetime.now(UTC)


# ─── L-13: tarjima keshi va AI tili ─────────────────────────────────────────

class QuerySession:
    """`update_lab_analyse` uchun soxta sessiya."""

    def __init__(self, lab):
        self.lab = lab
        self.executed = []
        self.commits = 0

    def query(self, model):
        lab = self.lab

        class Q:
            def filter(self, *a):
                return self

            def first(self):
                return lab

        return Q()

    def execute(self, stmt, params=None):
        self.executed.append((str(stmt), params))

    def commit(self):
        self.commits += 1

    def refresh(self, obj):
        pass


def _lab(**kw):
    base = dict(id=5, status=2, ai_answer_data='{"a": 1}', ai_lang="uz",
                updated_at=None, created_at=None, analyse_file_link=None)
    base.update(kw)
    return SimpleNamespace(**base)


def test_clear_ai_answer_also_clears_translations():
    lab = _lab()
    db = QuerySession(lab)
    lab_analyse.update_lab_analyse(db, 5, status=0, clear_ai_answer=True, ai_lang="ru")
    assert lab.ai_answer_data is None
    assert lab.ai_lang == "ru"
    assert lab.status == 0
    sql = [s for s, _ in db.executed]
    assert any("ai_translations = NULL" in s and "lab_analyses" in s for s in sql)
    assert db.commits == 1


def test_new_answer_clears_translations_status_only_does_not():
    db = QuerySession(_lab())
    lab_analyse.update_lab_analyse(db, 5, status=2, ai_answer_data='{"b": 2}')
    assert any("ai_translations = NULL" in s for s, _ in db.executed)

    db2 = QuerySession(_lab())
    lab_analyse.update_lab_analyse(db2, 5, status=1)
    assert db2.executed == []


class EndpointSession:
    def __init__(self):
        self.events = []

    def execute(self, stmt, params=None):
        self.events.append(("execute", str(stmt), params))
        return SimpleNamespace(scalar=lambda: None)

    def commit(self):
        self.events.append(("commit",))

    def rollback(self):
        self.events.append(("rollback",))


def _patch_retry(monkeypatch, lab, tmp_path):
    f = tmp_path / "lab.png"
    f.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 16)
    calls = {"update": [], "start": []}
    monkeypatch.setattr(api, "OPENAI_API_KEY", "test")
    monkeypatch.setattr(api, "get_lab_analyse_by_id", lambda db, i: lab)
    monkeypatch.setattr(api, "lock_lab_analyse", lambda db, i: lab)
    monkeypatch.setattr(api, "get_lab_analysis_file_links", lambda db, a: ["x"])
    monkeypatch.setattr(api.storage, "resolve_existing", lambda link: f)
    monkeypatch.setattr(api, "update_lab_analyse", lambda **kw: calls["update"].append(kw))
    monkeypatch.setattr(api, "_start_lab_ai", lambda *a, **k: calls["start"].append(a + tuple(k.values())))
    return calls


def test_retry_sets_ai_lang_and_clears_answer(monkeypatch, tmp_path):
    lab = _lab(status=-1, updated_at=_now())
    calls = _patch_retry(monkeypatch, lab, tmp_path)
    asyncio.run(api.retry_analyse(db=EndpointSession(), user={}, id=5, gender=None, lang="ru", age=40))
    assert calls["update"] == [dict(session=calls["update"][0]["session"], analyse_id=5, status=0,
                                    clear_ai_answer=True, ai_lang="ru")]
    assert len(calls["start"]) == 1


# ─── L-16: 409 — tahlil hali ishlanmoqda ────────────────────────────────────

def test_is_in_progress_rules():
    now = _now()
    recent = now - datetime.timedelta(minutes=5)
    old = now - datetime.timedelta(minutes=31)
    assert api._is_in_progress(0, recent, now=now)
    assert api._is_in_progress(1, recent, now=now)
    assert api._is_in_progress(0, recent.replace(tzinfo=None), now=now)  # naive UTC
    assert not api._is_in_progress(0, old, now=now)          # muzlagan — ruxsat
    assert not api._is_in_progress(-1, recent, now=now)
    assert not api._is_in_progress(2, recent, now=now)
    assert not api._is_in_progress(0, None, None, now=now)
    assert api._is_in_progress(0, None, recent, now=now)     # updated_at yo'q — created_at


@pytest.mark.parametrize("lang,expected", [
    ("uz", "Tahlil hali davom etmoqda. Natija tayyor bo'lishini kuting."),
    ("ru", "Анализ ещё выполняется. Дождитесь результата."),
    ("en", "The analysis is still in progress. Please wait for the result."),
])
def test_retry_returns_409_while_running(monkeypatch, tmp_path, lang, expected):
    lab = _lab(status=0, updated_at=_now() - datetime.timedelta(minutes=2))
    calls = _patch_retry(monkeypatch, lab, tmp_path)
    db = EndpointSession()
    with pytest.raises(HTTPException) as err:
        asyncio.run(api.retry_analyse(db=db, user={}, id=5, gender=None, lang=lang, age=None))
    assert err.value.status_code == 409
    assert err.value.detail == expected
    assert calls["update"] == [] and calls["start"] == []
    assert ("rollback",) in db.events


def test_retry_allowed_for_stale_in_progress(monkeypatch, tmp_path):
    lab = _lab(status=1, updated_at=_now() - datetime.timedelta(hours=2))
    calls = _patch_retry(monkeypatch, lab, tmp_path)
    asyncio.run(api.retry_analyse(db=EndpointSession(), user={}, id=5, gender=None, lang="uz", age=None))
    assert len(calls["start"]) == 1


def test_retry_rechecks_under_lock(monkeypatch, tmp_path):
    """Birinchi tekshiruvdan o'tgan, lekin qulfni kutib turgan paytda boshqa
    so'rov ishga tushirgan tahlil — qulf ostidagi tekshiruv 409 beradi."""
    before = _lab(status=-1, updated_at=_now() - datetime.timedelta(hours=1))
    after = _lab(status=0, updated_at=_now())
    calls = _patch_retry(monkeypatch, before, tmp_path)
    monkeypatch.setattr(api, "lock_lab_analyse", lambda db, i: after)
    with pytest.raises(HTTPException) as err:
        asyncio.run(api.retry_analyse(db=EndpointSession(), user={}, id=5, gender=None, lang="uz", age=None))
    assert err.value.status_code == 409
    assert calls["update"] == []


def test_replace_file_returns_409_before_reading_files(monkeypatch, tmp_path):
    lab = _lab(status=0, updated_at=_now())
    calls = _patch_retry(monkeypatch, lab, tmp_path)

    async def must_not_read(*a, **k):
        pytest.fail("fayllar o'qilmasligi kerak")

    monkeypatch.setattr(api, "_read_lab_uploads", must_not_read)
    monkeypatch.setattr(api, "save_analyse_file", lambda *a: pytest.fail("saqlanmasin"))
    with pytest.raises(HTTPException) as err:
        asyncio.run(api.replace_file(db=EndpointSession(), user={}, id=5, file=[], gender=None,
                                     lang="en", age=None, original_filename=None,
                                     original_filenames=None))
    assert err.value.status_code == 409
    assert calls["update"] == []


def test_replace_file_sets_ai_lang(monkeypatch, tmp_path):
    lab = _lab(status=2, updated_at=_now())
    calls = _patch_retry(monkeypatch, lab, tmp_path)
    uploads = [api._LabUpload(b"data", "a.png", "a.png")]

    async def fake_read(*a, **k):
        return uploads

    files_set = []
    monkeypatch.setattr(api, "_read_lab_uploads", fake_read)
    monkeypatch.setattr(api, "save_analyse_file", lambda content, fname: "/uploads/lab/x.png")
    monkeypatch.setattr(api, "set_lab_analysis_files",
                        lambda db, i, saved, commit=True: files_set.append(commit))
    asyncio.run(api.replace_file(db=EndpointSession(), user={}, id=5, file=[], gender=None,
                                 lang="en", age=None, original_filename=None, original_filenames=None))
    assert files_set == [False]  # bitta tranzaksiyada status bilan birga
    assert calls["update"][0]["ai_lang"] == "en"
    assert calls["update"][0]["clear_ai_answer"] is True


# ─── L-30: formadagi sana ───────────────────────────────────────────────────

@pytest.mark.parametrize("value", ["not-a-date", "2026-13-45", "1926-05-01",
                                   "2999-01-01T00:00:00Z"])
def test_bad_form_date_rejected(value):
    with pytest.raises(HTTPException) as err:
        api._parse_form_date(value, "uz")
    assert err.value.status_code == 400


def test_form_date_before_birthdate_rejected():
    with pytest.raises(HTTPException):
        api._parse_form_date("2010-05-01", "ru", birthdate=datetime.date(2012, 1, 1))


def test_good_form_date_parsed():
    dt = api._parse_form_date("2026-10-30T19:00:00.000Z", "uz")
    assert dt == datetime.datetime(2026, 10, 30, 19, 0, tzinfo=UTC)
    assert api._parse_form_date(None, "uz") is None
    assert api._parse_form_date("  ", "uz") is None


def _analyze_kwargs(**over):
    kw = dict(doctor_id=None, file=[], lab_category_id=None, created_doctor_id=1, clinic_id=1,
              patcient_id=3, gender=None, lang="uz", age=None, analysis_date=None,
              force_duplicate=False, original_filename=None, original_filenames=None)
    kw.update(over)
    return kw


def _patch_analyze(monkeypatch):
    events = []
    uploads = [api._LabUpload(b"one", "a.png", "a.png"), api._LabUpload(b"two", "b.png", "b.png")]

    async def fake_read(*a, **k):
        return uploads

    monkeypatch.setattr(api, "OPENAI_API_KEY", "test")
    monkeypatch.setattr(api, "_read_lab_uploads", fake_read)
    monkeypatch.setattr(api.reference_validator, "validate_analysis_refs", lambda *a, **k: None)
    def fake_check(db, kind, pid, contents, force):
        db.events.append(("check",))
        events.append(("check",))
        return ["h1", "h2"]

    monkeypatch.setattr(api.duplicate_guard, "check_many", fake_check)
    monkeypatch.setattr(api, "save_analyse_file",
                        lambda content, fname: events.append(("save", fname)) or f"/u/{fname}")

    def fake_create(**kw):
        events.append(("create", kw["commit"], kw["analysis_date"]))
        return SimpleNamespace(id=11, ai_lang=None, analysis_date_source=None)

    monkeypatch.setattr(api, "create_lab_analyse", fake_create)
    monkeypatch.setattr(api, "set_lab_analysis_files",
                        lambda db, i, saved, commit=True: events.append(("files", commit)))
    monkeypatch.setattr(api, "_start_lab_ai", lambda *a, **k: events.append(("start",)))
    return events


def test_analyze_bad_date_400_before_any_file_saved(monkeypatch):
    events = _patch_analyze(monkeypatch)
    db = EndpointSession()
    with pytest.raises(HTTPException) as err:
        asyncio.run(api.analyze(db=db, user={}, **_analyze_kwargs(analysis_date="31/02/2026")))
    assert err.value.status_code == 400
    assert events == []  # fayl saqlanmadi, yozuv yaratilmadi
    assert not any("pg_advisory" in e[1] for e in db.events if e[0] == "execute")


# ─── L-39: takror tekshiruvi va insert bitta qulf ostida ───────────────────

def test_analyze_duplicate_check_and_insert_under_advisory_lock(monkeypatch):
    events = _patch_analyze(monkeypatch)
    db = EndpointSession()
    asyncio.run(api.analyze(db=db, user={}, **_analyze_kwargs(analysis_date="2026-10-30T19:00:00Z")))

    # DB hodisalari va funksiya chaqiruvlari bitta ketma-ketlikda
    lock_idx = next(i for i, e in enumerate(db.events)
                    if e[0] == "execute" and "pg_advisory_xact_lock" in e[1])
    assert db.events[lock_idx][2] == {"key": "lab:3"}
    assert db.events.index(("check",)) > lock_idx
    commits = [i for i, e in enumerate(db.events) if e == ("commit",)]
    assert len(commits) == 1 and commits[0] > lock_idx
    # Qulfdan keyin: tekshiruv → fayllar → yozuv (commit siz) → fayllar ro'yxati (commit siz)
    assert [e[0] for e in events] == ["check", "save", "save", "create", "files", "start"]
    assert events[3][1] is False and events[4] == ("files", False)
    assert events[3][2] == datetime.datetime(2026, 10, 30, 19, 0, tzinfo=UTC)
