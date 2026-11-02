"""L-13, L-14 — Holter, SMAD, kompleks va EKG yo'llari (DB va tarmoqsiz)."""
import asyncio
import os
import sys
from types import SimpleNamespace

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import ai_config  # noqa: E402
import combined_analyses_api  # noqa: E402
import holter_analyses_api  # noqa: E402
import smad_analyses_api  # noqa: E402

PDF = b"%PDF-1.4\n" + b"0" * 32


class FakeClient:
    last = None

    def __init__(self, exc=None, text='{"automatic_analysis": "x"}'):
        self.created, self.deleted = [], []
        self._exc, self._text = exc, text
        client = self

        class Files:
            def create(self, file, purpose):
                fid = f"file-{len(client.created) + 1}"
                client.created.append(fid)
                return SimpleNamespace(id=fid)

            def delete(self, file_id):
                client.deleted.append(file_id)

        class Responses:
            def create(self, **kw):
                if client._exc:
                    raise client._exc
                return SimpleNamespace(output_text=client._text, status="completed", usage=None)

        self.files, self.responses = Files(), Responses()
        FakeClient.last = self


@pytest.mark.parametrize("module,func", [
    (holter_analyses_api, "_sync_holter_openai"),
    (smad_analyses_api, "_sync_smad_openai"),
])
@pytest.mark.parametrize("exc", [None, RuntimeError("Connection error")])
def test_monitoring_uploaded_file_deleted(monkeypatch, module, func, exc):
    monkeypatch.setattr(module, "OpenAI", lambda **kw: FakeClient(exc))
    call = lambda: getattr(module, func)(PDF, "report.pdf", 50, None, "uz")  # noqa: E731
    if exc:
        with pytest.raises(RuntimeError):
            call()
    else:
        call()
    assert FakeClient.last.created == ["file-1"]
    assert FakeClient.last.deleted == ["file-1"]


@pytest.mark.parametrize("exc", [None, RuntimeError("timeout")])
def test_combined_images_deleted(monkeypatch, exc):
    monkeypatch.setattr(combined_analyses_api, "OpenAI", lambda **kw: FakeClient(exc))
    images = [("ecg1.png", b"a"), ("ecg2.png", b"b")]
    if exc:
        with pytest.raises(RuntimeError):
            combined_analyses_api._sync_openai({}, [], images, "uz")
    else:
        combined_analyses_api._sync_openai({}, [], images, "uz")
    assert FakeClient.last.deleted == ["file-1", "file-2"]


def test_delete_helper_swallows_errors(caplog):
    class Bad:
        class files:  # noqa: N801
            @staticmethod
            def delete(file_id):
                raise RuntimeError("boom")

    ai_config.delete_uploaded_files(Bad(), ["f1", None, "f2"], "t")  # istisno yo'q
    assert sum("f1" in r.getMessage() or "f2" in r.getMessage() for r in caplog.records) == 2


class RecordingSession:
    def __init__(self):
        self.executed = []

    def execute(self, stmt, params=None):
        self.executed.append((str(stmt), params))


@pytest.mark.parametrize("module,table", [
    (holter_analyses_api, "holter_analyses"),
    (smad_analyses_api, "smad_analyses"),
])
def test_monitoring_retry_resets_translation_and_lang(monkeypatch, tmp_path, module, table):
    f = tmp_path / "r.pdf"
    f.write_bytes(PDF)
    db = RecordingSession()
    order = []
    getter = [n for n in dir(module) if n.startswith("get_") and n.endswith("_analyse_by_id")][0]
    updater = [n for n in dir(module) if n.startswith("update_") and n.endswith("_analyse")][0]
    monkeypatch.setattr(module, "OPENAI_API_KEY", "test")
    monkeypatch.setattr(module, getter, lambda db, i: SimpleNamespace(analyse_file_link="x"))
    monkeypatch.setattr(module.storage, "resolve_existing", lambda link: f)
    monkeypatch.setattr(module, updater, lambda **kw: order.append(("update", kw)))

    class FakeTask:
        def add_done_callback(self, cb):
            pass

    def fake_task(coro):
        coro.close()
        return FakeTask()

    monkeypatch.setattr(module.asyncio, "create_task", fake_task)
    asyncio.run(module.retry_analyse(db=db, user={}, id=4, gender=None, lang="ru", age=None))
    sql, params = db.executed[0]
    assert f"UPDATE {table} SET ai_translations = NULL, ai_lang = :lang" in sql
    assert params == {"lang": "ru", "id": 4}
    assert order and order[0][1]["clear_ai_answer"] is True


def test_combined_update_with_answer_clears_translations():
    executed = []
    row = SimpleNamespace(status=1, ai_answer_data=None, updated_at=None)

    class S:
        def query(self, model):
            class Q:
                def filter(self, *a):
                    return self

                def first(self):
                    return row
            return Q()

        def execute(self, stmt, params=None):
            executed.append(str(stmt))

        def commit(self):
            pass

    combined_analyses_api._update(S(), 3, status=2, ai_answer_data="{}")
    assert any("combined_analyses SET ai_translations = NULL" in s for s in executed)
    executed.clear()
    combined_analyses_api._update(S(), 3, status=1)
    assert executed == []
