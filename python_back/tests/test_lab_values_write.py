"""`lab_analyse.replace_lab_values` va `repair_lab_units.plan_fixes` — bazasiz,
soxta sessiya bilan (TASKLAR_LAB_2026-11-02: L-01, L-02, L-06, L-24)."""
import datetime

import pytest

import lab_catalog
import lab_units
from lab_catalog import LabType
from models import LabAnalysisValues

import lab_analyse
import repair_lab_units

CANON = {
    "cortisol": "nmol/L", "prolactin": "ng/mL", "troponin_i": "ng/mL",
    "hbsag": None, "anti_hcv": None, "alt": "U/L", "hb": "g/L", "glucose": "mmol/L",
}

_TYPES = {
    "cortisol": ("numeric", 138, 690, 138, 690),
    "prolactin": ("numeric", 4.0, 15.2, 4.8, 23.3),
    "troponin_i": ("numeric", None, 0.04, None, 0.04),
    "hbsag": ("qualitative", None, 0.99, None, 0.99),
    "anti_hcv": ("qualitative", None, 0.99, None, 0.99),
    "alt": ("numeric", None, 41, None, 33),
    "hb": ("numeric", 130, 170, 120, 150),
    "glucose": ("numeric", 3.9, 5.5, 3.9, 5.5),
}
TYPES = {
    col: LabType(id=i + 1, column_name=col, name_uz=col, measure=CANON[col],
                 min_male=mn, max_male=mx, min_female=fmn, max_female=fmx,
                 value_kind=kind, sort_order=i, ai_hint=None)
    for i, (col, (kind, mn, mx, fmn, fmx)) in enumerate(_TYPES.items())
}


class _Lab:
    id = 7
    patcient_id = 42
    analysis_date = datetime.datetime(2026, 10, 1)
    created_at = datetime.datetime(2026, 10, 2)


class _Query:
    def __init__(self, session, model):
        self.session, self.model, self.filters = session, model, []

    def filter(self, *criteria):
        self.filters.extend(criteria)
        return self

    def first(self):
        return self.session.lab

    def delete(self, synchronize_session=False):
        self.session.deletes.append([str(c) for c in self.filters])
        return 0


class _Scalar:
    def __init__(self, value):
        self.value = value

    def scalar(self):
        return self.value


class FakeSession:
    def __init__(self, gender=None):
        self.lab = _Lab()
        self.gender = gender
        self.added, self.deletes, self.commits = [], [], 0

    def query(self, model):
        return _Query(self, model)

    def execute(self, *args, **kwargs):
        return _Scalar(self.gender)

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.commits += 1


@pytest.fixture(autouse=True)
def _catalog(monkeypatch):
    monkeypatch.setattr(lab_catalog, "catalog", lambda db: TYPES)
    monkeypatch.setattr(lab_units, "canonical_units", lambda db: dict(CANON))


def _rows(session):
    return {next(c for c, t in TYPES.items() if t.id == r.value_type_id): r for r in session.added}


# ─── L-01 / L-06: unit_suspect → unit_mismatch, flag NULL ─────────────────────

def test_suspect_cortisol_row():
    meas = lab_units.harmonize_all(None, {"cortisol": {
        "value": 6.47, "unit": "нмоль/л", "ref_low": 138, "ref_high": 690, "ref_text": "138–690"}})
    s = FakeSession(gender=True)
    assert lab_analyse.replace_lab_values(s, 7, meas) == 1
    r = _rows(s)["cortisol"]
    assert isinstance(r, LabAnalysisValues)
    assert r.value == 6.47 and r.unit == "нмоль/л"
    assert r.unit_mismatch is True
    assert r.flag is None and r.flag_source is None
    assert r.ref_low is None and r.ref_high is None
    assert r.ref_text == "138–690"
    assert r.original_value == 6.47 and r.original_unit == "нмоль/л"


def test_suspect_prolactin_not_high():
    meas = lab_units.harmonize_all(None, {"prolactin": {"value": 30, "unit": "мМЕ/л"}})
    s = FakeSession(gender=True)
    lab_analyse.replace_lab_values(s, 7, meas)
    r = _rows(s)["prolactin"]
    assert r.flag is None and r.unit_mismatch is True


# ─── L-02: baho yaxlitlanmagan qiymat bilan ──────────────────────────────────

@pytest.mark.parametrize("cell", [
    {"value": 14.4, "unit": "ng/L", "ref_high": 14},
    {"value": 26.4, "unit": "pg/mL", "ref_high": 26.2},
    {"value": 40.4, "unit": "ng/L"},
    {"value": 40.04, "unit": "ng/L"},
])
def test_troponin_flag_high(cell):
    meas = lab_units.harmonize_all(None, {"troponin_i": cell})
    s = FakeSession()
    lab_analyse.replace_lab_values(s, 7, meas)
    r = _rows(s)["troponin_i"]
    assert r.flag == 1
    assert r.unit_mismatch is False


# ─── L-24: result_kind yo'q eski JSON — matndan tasniflanadi ──────────────────

def test_qualitative_without_kind_classified_from_text():
    meas = {
        "hbsag": {"value": 1, "unit": None, "text": "Положительный(+)"},
        "anti_hcv": {"value": 0, "unit": None, "text": "Отрицательный(-)"},
    }
    s = FakeSession()
    assert lab_analyse.replace_lab_values(s, 7, meas) == 2
    rows = _rows(s)
    assert rows["hbsag"].result_kind == "POSITIVE" and rows["hbsag"].flag == 1
    assert rows["hbsag"].value is None  # 0/1 — soxta kod (migratsiyadagi kabi)
    assert rows["anti_hcv"].result_kind == "NEGATIVE" and rows["anti_hcv"].flag == 0


def test_qualitative_index_without_text():
    s = FakeSession()
    lab_analyse.replace_lab_values(s, 7, {"hbsag": {"value": 3.2, "unit": "COI"}})
    r = _rows(s)["hbsag"]
    assert r.result_kind == "POSITIVE" and r.value == 3.2


def test_qualitative_existing_kind_kept():
    s = FakeSession()
    lab_analyse.replace_lab_values(s, 7, {"hbsag": {
        "value": None, "text": "Сомнительный", "result_kind": "EQUIVOCAL"}})
    assert _rows(s)["hbsag"].result_kind == "EQUIVOCAL"


def test_columns_limits_delete_and_write():
    meas = {"alt": {"value": 50, "unit": "U/L"}, "hb": {"value": 140, "unit": "g/L"}}
    s = FakeSession(gender=True)
    assert lab_analyse.replace_lab_values(s, 7, meas, columns={"alt"}) == 1
    assert list(_rows(s)) == ["alt"]
    assert len(s.deletes) == 1
    assert any("value_type_id IN" in c for c in s.deletes[0])


def test_full_replace_clears_all():
    s = FakeSession(gender=True)
    lab_analyse.replace_lab_values(s, 7, {"hb": {"value": 140, "unit": "g/L"}})
    assert len(s.deletes) == 1
    assert not any("value_type_id" in c for c in s.deletes[0])


# ─── repair_lab_units.plan_fixes ──────────────────────────────────────────────

def test_plan_fixes_reverts_old_cortisol_conversion():
    meas = {"cortisol": {"value": 178.5, "unit": "nmol/L", "ref_low": 138, "ref_high": 690,
                         "original": {"value": 6.47, "unit": "нмоль/л"}}}
    fixed, notes, cols = repair_lab_units.plan_fixes(None, meas, CANON)
    assert cols == {"cortisol"}
    assert fixed["cortisol"]["value"] == 6.47
    assert fixed["cortisol"]["unit_suspect"] is True
    assert notes and "shubhali" in notes[0]


def test_plan_fixes_leaves_qualitative_and_correct_cells_untouched():
    hbsag = {"value": None, "unit": None, "text": "Отрицательный(-)"}
    hb = {"value": 140, "unit": "g/L"}
    glucose = {"value": 5.55, "unit": "mmol/L", "original": {"value": 100, "unit": "mg/dL"}}
    fixed, notes, cols = repair_lab_units.plan_fixes(
        None, {"hbsag": hbsag, "hb": hb, "glucose": glucose}, CANON)
    assert cols == set() and notes == []
    assert fixed["hbsag"] is hbsag and fixed["hb"] is hb and fixed["glucose"] is glucose


def test_plan_fixes_recognises_new_units():
    alt = {"value": 35, "unit": "ед/л", "unit_mismatch": True}
    hb = {"value": 140, "unit": "g/L"}
    fixed, notes, cols = repair_lab_units.plan_fixes(None, {"alt": alt, "hb": hb}, CANON)
    assert cols == {"alt"}
    assert fixed["alt"] == {"value": 35, "unit": "U/L"}
    assert fixed["hb"] is hb
