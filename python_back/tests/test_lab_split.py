"""Ikki bosqichli laboratoriya tahlili (`lab_split`, `lab_aliases`) — DB va tarmoqsiz.

O'qish (`extract`) va xulosa (`conclude`) soxta funksiyalar bilan
almashtiriladi; tekshiriladi: nomlarni normallash, bog'lash, eski yo'lga
qaytish (`NeedLegacy`), fayl turi mos kelmasligi va xatoda o'qilgan
qatorlarning saqlanishi (qayta urinish faylni qayta o'qitmasligi uchun).
"""
import asyncio
import json
import sys
from contextlib import contextmanager

import pytest

import ai_config
import lab_aliases
import lab_analyses_api as api
import lab_catalog
import lab_split

HB = lab_catalog.LabType(
    id=1, column_name="hemoglobin", name_uz="Gemoglobin", measure="g/L",
    min_male=130, max_male=170, min_female=120, max_female=150,
    value_kind="numeric", sort_order=1, ai_hint=None, name_ru="Гемоглобин", category="cbc")
GLU_URINE = lab_catalog.LabType(
    id=2, column_name="urine_glucose", name_uz="Siydikda glyukoza", measure="mmol/L",
    min_male=None, max_male=0.8, min_female=None, max_female=0.8,
    value_kind="numeric", sort_order=2, ai_hint=None, name_ru="Глюкоза", category="urine")
GLU = lab_catalog.LabType(
    id=3, column_name="glucose", name_uz="Glyukoza", measure="mmol/L",
    min_male=3.9, max_male=5.5, min_female=3.9, max_female=5.5,
    value_kind="numeric", sort_order=3, ai_hint=None, name_ru="Глюкоза", category="biochem")
CATALOG = {t.column_name: t for t in (HB, GLU_URINE, GLU)}


class _Db:
    def rollback(self):
        pass

    def commit(self):
        pass

    def close(self):
        pass


@contextmanager
def _session():
    yield _Db()


@pytest.fixture
def no_db(monkeypatch):
    monkeypatch.setattr(sys.modules["database"], "SessionLocal", _session, raising=False)
    monkeypatch.setattr(lab_catalog, "catalog", lambda db: CATALOG)
    monkeypatch.setattr(lab_aliases, "_db_aliases", lambda db: {})
    monkeypatch.setattr(lab_aliases, "touch", lambda db, keys: None)


# ─── Nomni normallash va qidirish ──────────────────────────────────────────

@pytest.mark.parametrize("raw, expected", [
    ("Гемоглобин (HGB)", "гемоглобин hgb"),
    ("Тестостерон (М)", "тестостерон"),
    ("Ферритин / мужчины", "ферритин"),
    ("Нейтрофилы, #", "нейтрофилы #"),
    ("  Ёмкость  ", "емкость"),
])
def test_normalize(raw, expected):
    assert lab_aliases.normalize(raw) == expected


def test_lookup_uses_specimen(no_db):
    # Bir xil nom — qon va siydikda boshqa ko'rsatkich
    assert lab_aliases.lookup(None, "blood", "Глюкоза") == (True, "glucose")
    assert lab_aliases.lookup(None, "urine", "Глюкоза") == (True, "urine_glucose")
    # Namuna turi noma'lum va nom ikki ma'noli — taxmin qilinmaydi
    assert lab_aliases.lookup(None, "other", "Глюкоза") == (False, None)
    assert lab_aliases.lookup(None, "other", "Гемоглобин") == (True, "hemoglobin")


def test_lookup_learned_alias_wins(no_db, monkeypatch):
    monkeypatch.setattr(lab_aliases, "_db_aliases", lambda db: {("blood", "hgb"): "hemoglobin",
                                                                ("blood", "соэ"): None})
    assert lab_aliases.lookup(None, "blood", "HGB") == (True, "hemoglobin")
    # "Katalogda yo'q" deb o'rganilgan nom — AI ga qayta so'ralmaydi
    assert lab_aliases.lookup(None, "blood", "СОЭ") == (True, None)


# ─── Bog'lash ─────────────────────────────────────────────────────────────

def _row(name, value=None, specimen="blood", **kw):
    return {"name": name, "section": None, "specimen": specimen, "value": value, "unit": None,
            "text": None, "result_kind": None, "ref_low": None, "ref_high": None, "ref_text": None, **kw}


def test_map_rows_merges_duplicates_and_learns(no_db, monkeypatch):
    asked = []

    def fake_map(client, db, items, **kw):
        asked.extend(i["name"] for i in items)
        return {("blood", "hgb"): "hemoglobin"}

    monkeypatch.setattr(lab_split, "OpenAI", lambda **kw: object())
    monkeypatch.setattr(lab_aliases, "map_unknown", fake_map)
    rows = [
        _row("Гемоглобин (Ж)", None, ref_low=120, ref_high=150),   # faqat me'yor qatori
        _row("HGB", 135, unit="g/L"),                              # noma'lum nom → AI
        _row("Глюкоза", 4.1),
        _row("Пустой"),                                            # natijasiz — e'tiborsiz
    ]
    items, stats = lab_split.map_rows(rows)
    assert asked == ["HGB"]
    by = {i["column_name"]: i for i in items}
    assert by["hemoglobin"]["value"] == 135
    assert (by["hemoglobin"]["ref_low"], by["hemoglobin"]["ref_high"]) == (120, 150)
    assert by["glucose"]["value"] == 4.1
    assert stats["rows"] == 2 and stats["new_names"] == 1  # me'yor qatori hisobga kirmaydi


def test_map_rows_not_in_catalog_is_not_a_failure(no_db, monkeypatch):
    # Siydik mikroskopiyasi (epiteliy, silindrlar, tuzlar) katalogda yo'q —
    # eski yo'l ham ularni saqlamaydi, shuning uchun eski yo'lga qaytilmaydi
    monkeypatch.setattr(lab_split, "OpenAI", lambda **kw: object())
    monkeypatch.setattr(lab_aliases, "map_unknown", lambda *a, **k: {})
    rows = [_row("Гемоглобин", 140), _row("Цилиндры", text="-"), _row("Слизь", text="+")]
    items, stats = lab_split.map_rows(rows)
    assert [i["column_name"] for i in items] == ["hemoglobin"]
    assert stats["not_in_catalog"] == ["Цилиндры", "Слизь"]


def test_map_rows_nothing_mapped_needs_legacy(no_db, monkeypatch):
    monkeypatch.setattr(lab_split, "OpenAI", lambda **kw: object())
    monkeypatch.setattr(lab_aliases, "map_unknown", lambda *a, **k: {})
    with pytest.raises(lab_split.NeedLegacy):
        lab_split.map_rows([_row("X1", 1), _row("X2", 2)])


def test_map_rows_many_unresolved_needs_legacy(no_db, monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("provayder")

    monkeypatch.setattr(lab_split, "OpenAI", lambda **kw: object())
    monkeypatch.setattr(lab_aliases, "map_unknown", boom)
    with pytest.raises(lab_split.NeedLegacy):
        lab_split.map_rows([_row("Гемоглобин", 140), _row("X1", 1), _row("X2", 2)])


def test_map_rows_alias_ai_failure_is_not_fatal(no_db, monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("provayder")

    monkeypatch.setattr(lab_split, "OpenAI", lambda **kw: object())
    monkeypatch.setattr(lab_aliases, "map_unknown", boom)
    items, stats = lab_split.map_rows([_row("Гемоглобин", 140), _row("Глюкоза", 5.0), _row("X", 1)])
    assert {i["column_name"] for i in items} == {"hemoglobin", "glucose"}


def test_map_rows_without_results_needs_legacy(no_db):
    with pytest.raises(lab_split.NeedLegacy):
        lab_split.map_rows([_row("Гемоглобин")])


# ─── Xulosa uchun ro'yxat ─────────────────────────────────────────────────

def test_data_lines_verdicts(no_db):
    lines = lab_split.data_lines({
        "hemoglobin": {"value": 112, "unit": "g/L", "original": {"value": 11.2, "unit": "g/dL"}},
        "glucose": {"value": 5.0, "unit": "mmol/L", "ref_low": 4.1, "ref_high": 5.9},
    }, "ayol")
    assert lines[0].startswith("- Gemoglobin: 112 g/L [faylda: 11.2 g/dL] | me'yor 120–150 (katalog) | PAST")
    assert lines[1].endswith("me'yor 4.1–5.9 (laboratoriya) | me'yorda")


# ─── Fon tahlili: ikki bosqichli yo'l ─────────────────────────────────────

class _Stub:
    def __init__(self):
        self.rolled_back = 0

    def commit(self):
        pass

    def rollback(self):
        self.rolled_back += 1

    def close(self):
        pass


EXTRACTED = {"document_kind": "laboratoriya", "analysis_date": "2026-10-01",
             "rows": [_row("Гемоглобин", 140, unit="g/L")]}
CONCLUSION = {"automatic_analysis": "Chetlanish yo'q", "automatic_analysis_bool": 1,
              "AI_recommendations": "Profilaktika", "final_summary": "Me'yorda",
              "analiz_mumkinmi": True, "analiz_mumkin_emas_sababi": None}


def _background(monkeypatch, *, extract=None, map_rows=None, conclude=None, extraction=None):
    updates, written, legacy = [], [], []
    monkeypatch.setattr(ai_config, "LAB_PIPELINE", "split")
    monkeypatch.setattr(api, "SessionLocal", _Stub)
    monkeypatch.setattr(api, "clear_lab_values", lambda db, aid: None)
    monkeypatch.setattr(api.lab_catalog, "columns", lambda db: ["hemoglobin"])
    monkeypatch.setattr(api.lab_units, "harmonize_all", lambda db, m: m)
    monkeypatch.setattr(api, "_apply_document_date", lambda *a: None)
    monkeypatch.setattr(api, "update_lab_analyse", lambda **kw: updates.append(kw))
    monkeypatch.setattr(api, "replace_lab_values", lambda db, aid, m: written.append(m) or len(m))
    monkeypatch.setattr(api, "classify_document", lambda *a: None)
    monkeypatch.setattr(api.lab_catalog, "prompt_lines", lambda db: "- hemoglobin")

    def fake_legacy(*a):
        legacy.append(a)
        return {**CONCLUSION, "digital_measurements": [{"column_name": "hemoglobin", "value": 139}]}

    monkeypatch.setattr(api, "_sync_lab_openai", fake_legacy)
    monkeypatch.setattr(api.lab_split, "extract", extract or (lambda *a, **k: EXTRACTED))
    monkeypatch.setattr(api.lab_split, "map_rows", map_rows or (
        lambda rows, **k: ([{"column_name": "hemoglobin", "value": 140, "unit": "g/L"}],
                           {"rows": 1, "mapped": 1, "new_names": 0})))
    monkeypatch.setattr(api.lab_split, "conclude", conclude or (lambda *a, **k: dict(CONCLUSION)))
    asyncio.run(api._lab_ai_background(5, [(b"x", "a.pdf")], 40, "erkak", "uz", extraction=extraction))
    return updates, written, legacy


def test_split_success_writes_values_without_legacy(monkeypatch):
    updates, written, legacy = _background(monkeypatch)
    assert legacy == []
    assert updates[-1]["status"] == api.STATUS_DONE
    assert written[0]["hemoglobin"]["value"] == 140
    answer = json.loads(updates[-1]["ai_answer_data"])
    assert answer["final_summary"] == "Me'yorda"


def test_split_not_lab_document_is_mismatch(monkeypatch):
    updates, written, legacy = _background(
        monkeypatch, extract=lambda *a, **k: {"document_kind": "ekg", "analysis_date": None, "rows": []})
    assert updates[-1]["status"] == api.STATUS_FILE_MISMATCH
    assert json.loads(updates[-1]["ai_answer_data"])
    assert written == [] and legacy == []


def test_split_falls_back_to_legacy(monkeypatch):
    def need_legacy(rows, **k):
        raise lab_split.NeedLegacy("past ulush")

    updates, written, legacy = _background(monkeypatch, map_rows=need_legacy)
    assert len(legacy) == 1
    assert updates[-1]["status"] == api.STATUS_DONE
    assert written[0]["hemoglobin"]["value"] == 139


def test_split_error_keeps_extraction_and_retry_reuses_it(monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("xulosa xatosi")

    updates, _, _ = _background(monkeypatch, conclude=boom)
    assert updates[-1]["status"] == api.STATUS_ERROR
    stored = json.loads(updates[-1]["ai_answer_data"])
    assert stored["_extraction"] == EXTRACTED

    # Qayta urinish: o'qish bosqichi chaqirilmaydi
    analyse = type("A", (), {"status": api.STATUS_ERROR, "ai_answer_data": updates[-1]["ai_answer_data"]})
    reused = api._stored_extraction(analyse)
    assert reused == EXTRACTED

    def no_extract(*a, **k):
        pytest.fail("fayl qayta o'qilmasligi kerak")

    updates, written, _ = _background(monkeypatch, extract=no_extract, extraction=reused)
    assert updates[-1]["status"] == api.STATUS_DONE


def test_stored_extraction_only_for_error_status():
    data = json.dumps({"_extraction": {"rows": []}})
    assert api._stored_extraction(type("A", (), {"status": api.STATUS_DONE, "ai_answer_data": data})) is None
    assert api._stored_extraction(type("A", (), {"status": api.STATUS_ERROR, "ai_answer_data": data})) == {"rows": []}
    assert api._stored_extraction(type("A", (), {"status": api.STATUS_ERROR, "ai_answer_data": "x"})) is None


def test_prompt_static_part_first():
    a = api.compose_prompt_for_openai(30, "erkak", "uz", "- hb")
    b = api.compose_prompt_for_openai(70, "ayol", "ru", "- hb")
    head = a[: a.index("Bemor ma'lumotlari")]
    assert b.startswith(head) and len(head) > 1000
    assert a.rstrip().endswith("Javob tili: O'ZBEK.")


# ─── Foiz / mutlaq son (2026-11-03: "Neu# Нейтрофилы" va "Neu% Нейтрофилы") ──

def test_percent_and_absolute_rows_with_same_name(no_db, monkeypatch):
    cat = {**CATALOG, "neutrophils": HB, "neutrophils_abs": HB}
    monkeypatch.setattr(lab_catalog, "catalog", lambda db: cat)
    monkeypatch.setattr(lab_aliases, "lookup", lambda db, spec, name: (True, "neutrophils"))
    items, _ = lab_split.map_rows([
        _row("Нейтрофилы", 2.9, unit="10 9 /л"),
        _row("Нейтрофилы", 46.9, unit="%"),
    ])
    by = {i["column_name"]: i["value"] for i in items}
    assert by == {"neutrophils_abs": 2.9, "neutrophils": 46.9}


def test_two_different_values_for_one_column_needs_legacy(no_db, monkeypatch):
    monkeypatch.setattr(lab_aliases, "lookup", lambda db, spec, name: (True, "hemoglobin"))
    with pytest.raises(lab_split.NeedLegacy):
        lab_split.map_rows([_row("Hb", 140), _row("Гемоглобин", 95)])


# ─── Bitta so'rovli yo'l: hujjat turi javobning o'zida (tasniflash so'rovisiz) ──

def _single(monkeypatch, answer, classify=False, mismatch=None):
    updates, written, classified = [], [], []
    monkeypatch.setattr(ai_config, "LAB_PIPELINE", "single")
    monkeypatch.setattr(ai_config, "LAB_CLASSIFY", classify)
    monkeypatch.setattr(api, "SessionLocal", _Stub)
    monkeypatch.setattr(api, "clear_lab_values", lambda db, aid: None)
    monkeypatch.setattr(api.lab_catalog, "columns", lambda db: ["hemoglobin"])
    monkeypatch.setattr(api.lab_catalog, "prompt_lines", lambda db: "- hemoglobin")
    monkeypatch.setattr(api.lab_units, "harmonize_all", lambda db, m: m)
    monkeypatch.setattr(api, "_apply_document_date", lambda *a: None)
    monkeypatch.setattr(api, "update_lab_analyse", lambda **kw: updates.append(kw))
    monkeypatch.setattr(api, "replace_lab_values", lambda db, aid, m: written.append(m) or len(m))
    monkeypatch.setattr(api, "classify_document", lambda *a: classified.append(a) or mismatch)
    monkeypatch.setattr(api, "_sync_lab_openai", lambda *a: dict(answer))
    asyncio.run(api._lab_ai_background(5, [(b"x", "a.pdf")], 40, "erkak", "uz"))
    return updates, written, classified


def test_single_not_lab_document_is_mismatch_without_classifier(monkeypatch):
    updates, written, classified = _single(
        monkeypatch, {**CONCLUSION, "document_kind": "ekg", "digital_measurements": []})
    assert classified == []
    assert updates[-1]["status"] == api.STATUS_FILE_MISMATCH
    assert json.loads(updates[-1]["ai_answer_data"])
    assert written == []


def test_single_lab_document_is_saved(monkeypatch):
    updates, written, classified = _single(monkeypatch, {
        **CONCLUSION, "document_kind": "laboratoriya",
        "digital_measurements": [{"column_name": "hemoglobin", "value": 141}]})
    assert classified == []
    assert updates[-1]["status"] == api.STATUS_DONE
    assert written[0]["hemoglobin"]["value"] == 141


def test_single_classifier_can_be_enabled(monkeypatch):
    from document_classifier import DocumentMismatch
    m = DocumentMismatch(expected="laboratoriya", detected="ekg", confidence=0.95, note="")
    updates, written, classified = _single(monkeypatch, {**CONCLUSION}, classify=True, mismatch=m)
    assert len(classified) == 1
    assert updates[-1]["status"] == api.STATUS_FILE_MISMATCH


def test_lab_schema_document_kind_optional():
    import ai_schema
    plain = ai_schema.response_format("lab", lab_columns=["hb"])["format"]["schema"]
    with_kind = ai_schema.response_format("lab", lab_columns=["hb"], document_kind=True)["format"]["schema"]
    assert "document_kind" not in plain["properties"]
    assert "document_kind" in with_kind["required"]
