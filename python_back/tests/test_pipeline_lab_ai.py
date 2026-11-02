"""L-05, L-14, L-29, L-38 — laboratoriya AI quvuri (DB va tarmoqsiz).

OpenAI klienti va DB sessiyasi soxta obyektlar bilan almashtiriladi.
"""
import asyncio
import json
import os
import sys
from types import SimpleNamespace

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import ai_errors  # noqa: E402
import lab_analyses_api as api  # noqa: E402

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


class FakeFiles:
    def __init__(self):
        self.created, self.deleted = [], []

    def create(self, file, purpose):
        fid = f"file-{len(self.created) + 1}"
        self.created.append(fid)
        return SimpleNamespace(id=fid)

    def delete(self, file_id):
        self.deleted.append(file_id)


class FakeResponses:
    def __init__(self, resp=None, exc=None):
        self.resp, self.exc = resp, exc

    def create(self, **kwargs):
        self.kwargs = kwargs
        if self.exc:
            raise self.exc
        return self.resp


class FakeClient:
    last = None

    def __init__(self, resp=None, exc=None):
        self.files = FakeFiles()
        self.responses = FakeResponses(resp, exc)
        FakeClient.last = self


def _install_client(monkeypatch, resp=None, exc=None):
    monkeypatch.setattr(api, "OpenAI", lambda **kw: FakeClient(resp, exc))


# ─── L-05: kesilgan / to'liqsiz / JSON emas javob ──────────────────────────

TRUNCATED = '{"digital_measurements": [{"col'


def test_truncated_json_raises_incomplete():
    with pytest.raises(ai_errors.AIOutputIncomplete):
        api._parse_lab_response(SimpleNamespace(output_text=TRUNCATED, status="completed"))


def test_incomplete_status_raises_even_with_text():
    resp = SimpleNamespace(output_text='{"a": 1}', status="incomplete",
                           incomplete_details=SimpleNamespace(reason="max_output_tokens"))
    with pytest.raises(ai_errors.AIOutputIncomplete):
        api._parse_lab_response(resp)


@pytest.mark.parametrize("text", [None, "", "   "])
def test_empty_output_raises(text):
    with pytest.raises(ai_errors.AIOutputIncomplete):
        api._parse_lab_response(SimpleNamespace(output_text=text, status="completed"))


@pytest.mark.parametrize("text", ["hello", "{} trailing", "[1, 2]"])
def test_non_json_or_wrong_shape_raises(text):
    with pytest.raises(ai_errors.AIInvalidOutput):
        api._parse_lab_response(SimpleNamespace(output_text=text, status="completed"))


def test_valid_json_parsed():
    parsed = api._parse_lab_response(SimpleNamespace(output_text='{"final_summary": "ok"}',
                                                     status="completed"))
    assert parsed == {"final_summary": "ok"}


def test_truncated_classified_with_user_message():
    exc = ai_errors.AIOutputIncomplete("x")
    assert ai_errors.classify(exc) == ai_errors.ERR_OUTPUT_TRUNCATED
    answer = json.loads(ai_errors.to_ai_answer(exc, "ru"))
    assert answer["xato_kodi"] == "ai_output_truncated"
    assert "меньшим" in answer["xabar"]
    assert "automatic_analysis_bool" not in answer


def test_lab_request_uses_larger_token_budget(monkeypatch):
    _install_client(monkeypatch, resp=SimpleNamespace(output_text='{"x": 1}', status="completed"))
    api._sync_lab_openai([(PNG, "a.png")], 40, "erkak", "uz", "- hb", ["hb"])
    assert FakeClient.last.responses.kwargs["max_output_tokens"] == api.ai_config.LAB_MAX_OUTPUT_TOKENS


# ─── L-14: yuklangan fayllar o'chiriladi (xato bo'lsa ham) ─────────────────

def test_uploaded_files_deleted_after_success(monkeypatch):
    _install_client(monkeypatch, resp=SimpleNamespace(output_text='{"x": 1}', status="completed"))
    api._sync_lab_openai([(PNG, "a.png"), (PNG + b"1", "b.png")], 40, None, "uz", "- hb", ["hb"])
    client = FakeClient.last
    assert client.files.created == ["file-1", "file-2"]
    assert client.files.deleted == ["file-1", "file-2"]


def test_uploaded_files_deleted_when_ai_fails(monkeypatch):
    _install_client(monkeypatch, exc=RuntimeError("Connection error"))
    with pytest.raises(RuntimeError):
        api._sync_lab_openai([(PNG, "a.png")], 40, None, "uz", "- hb", ["hb"])
    assert FakeClient.last.files.deleted == ["file-1"]


def test_delete_failure_does_not_break_flow(monkeypatch):
    def boom(file_id):
        raise RuntimeError("404")

    _install_client(monkeypatch, resp=SimpleNamespace(output_text='{"x": 1}', status="completed"))
    original = FakeFiles.delete
    monkeypatch.setattr(FakeFiles, "delete", lambda self, fid: boom(fid))
    try:
        assert api._sync_lab_openai([(PNG, "a.png")], 40, None, "uz", "- hb", ["hb"]) == {"x": 1}
    finally:
        monkeypatch.setattr(FakeFiles, "delete", original)


# ─── L-05 + L-29: fon vazifasi status -1 ga o'tadi ─────────────────────────

class StubSession:
    def __init__(self):
        self.rolled_back = 0
        self.closed = False
        self.committed = 0

    def commit(self):
        self.committed += 1

    def rollback(self):
        self.rolled_back += 1

    def close(self):
        self.closed = True


def _run_background(monkeypatch, resp=None, exc=None):
    db = StubSession()
    updates = []
    monkeypatch.setattr(api, "SessionLocal", lambda: db)
    monkeypatch.setattr(api, "clear_lab_values", lambda session, aid: None)
    monkeypatch.setattr(api, "classify_document", lambda content, fname, kind: None)
    monkeypatch.setattr(api.lab_catalog, "prompt_lines", lambda session: "- hb")
    monkeypatch.setattr(api.lab_catalog, "columns", lambda session: ["hb"])
    monkeypatch.setattr(api, "update_lab_analyse", lambda **kw: updates.append(kw))
    monkeypatch.setattr(api, "replace_lab_values",
                        lambda *a, **k: pytest.fail("qiymatlar yozilmasligi kerak"))
    _install_client(monkeypatch, resp=resp, exc=exc)
    asyncio.run(api._lab_ai_background(7, [(PNG, "a.png")], 40, None, "uz"))
    return db, updates


def test_background_truncated_sets_error_status(monkeypatch):
    db, updates = _run_background(
        monkeypatch, resp=SimpleNamespace(output_text=TRUNCATED, status="completed"))
    assert len(updates) == 1
    assert updates[0]["status"] == api.STATUS_ERROR == -1
    answer = json.loads(updates[0]["ai_answer_data"])
    assert answer["xato_kodi"] == "ai_output_truncated"
    assert db.rolled_back == 1  # L-29: rollback xato ishlovchisi boshida
    assert db.closed
    assert FakeClient.last.files.deleted == ["file-1"]


def test_background_non_json_sets_error_status(monkeypatch):
    _, updates = _run_background(
        monkeypatch, resp=SimpleNamespace(output_text="Kechirasiz, o'qiy olmadim", status="completed"))
    assert updates[0]["status"] == -1
    assert json.loads(updates[0]["ai_answer_data"])["xato_kodi"] == "internal_error"


def test_background_error_write_failure_is_logged(monkeypatch, caplog):
    db = StubSession()
    monkeypatch.setattr(api, "SessionLocal", lambda: db)
    monkeypatch.setattr(api, "clear_lab_values", lambda session, aid: (_ for _ in ()).throw(
        RuntimeError("IntegrityError")))

    def failing_update(**kw):
        raise RuntimeError("db down")

    monkeypatch.setattr(api, "update_lab_analyse", failing_update)
    with caplog.at_level("ERROR", logger=api.logger.name):
        asyncio.run(api._lab_ai_background(9, [(PNG, "a.png")], 40, None, "uz"))
    assert db.rolled_back == 1
    assert any("xatolik holatini yozib bo'lmadi" in r.getMessage() for r in caplog.records)


# ─── L-38: teskari me'yor JSON ga tushmaydi ────────────────────────────────

def test_inverted_reference_dropped_from_json():
    out = api._measurements_to_dict([
        {"column_name": "hb", "value": 30, "unit": "g/L", "ref_low": 40, "ref_high": 20,
         "ref_text": "40-20"},
        {"column_name": "plt", "value": 200, "unit": "10^9/L", "ref_low": 150, "ref_high": 400},
        {"column_name": "glucose", "value": 5, "unit": "mmol/L", "ref_low": None, "ref_high": 5.5},
    ], {"hb", "plt", "glucose"})
    assert "ref_low" not in out["hb"] and "ref_high" not in out["hb"]
    assert out["hb"]["ref_text"] == "40-20"  # asl matn saqlanadi
    assert out["plt"]["ref_low"] == 150 and out["plt"]["ref_high"] == 400
    assert out["glucose"] == {"value": 5, "unit": "mmol/L", "ref_high": 5.5}


def test_inverted_reference_dropped_in_legacy_dict_shape():
    out = api._measurements_to_dict(
        {"hb": {"value": 30, "ref_low": 40, "ref_high": 20}, "zzz": {"value": 1}}, {"hb"})
    assert out == {"hb": {"value": 30}}


def test_equal_bounds_not_inverted():
    out = api._measurements_to_dict(
        [{"column_name": "hb", "value": 3, "ref_low": 3, "ref_high": 3}], {"hb"})
    assert out["hb"]["ref_low"] == 3 and out["hb"]["ref_high"] == 3
