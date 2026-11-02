"""`lab_units` — birliklarni keltirish (TASKLAR_LAB_2026-11-02: L-01, L-02,
L-06, L-07, L-28 va regressiya holatlari)."""
import pytest

import lab_catalog
import lab_units
from lab_catalog import LabType
from lab_units import harmonize, norm_unit

#: Katalog me'yor birliklari (`lab_value_types.measure`) — testlar uchun
CANON = {
    "cortisol": "nmol/L", "prolactin": "ng/mL", "troponin_i": "ng/mL",
    "free_t4": "pmol/L", "insulin": "µIU/mL", "tsh": "µIU/mL",
    "fsh": "mIU/mL", "lh": "mIU/mL", "hcg": "mIU/mL", "ige_total": "IU/mL",
    "anti_tpo": "IU/mL", "rbc": "10^12/L", "wbc": "10^9/L", "plt": "10^9/L",
    "neutrophils_abs": "×10⁹/L", "alt": "U/L", "ast": "U/L", "ggt": "U/L",
    "hb": "g/L", "calcium": "mmol/L", "glucose": "mmol/L",
    "creatinine": "µmol/L", "cholesterol": "mmol/L", "vitamin_d": "ng/mL",
    "uric_acid": "µmol/L", "urine_density": None, "d_dimer": "µg/mL",
}


def _type(column, mn=None, mx=None, fmn=None, fmx=None, kind="numeric"):
    return LabType(id=1, column_name=column, name_uz=column, measure=CANON.get(column),
                   min_male=mn, max_male=mx, min_female=fmn, max_female=fmx,
                   value_kind=kind, sort_order=0, ai_hint=None)


@pytest.fixture
def canon(monkeypatch):
    monkeypatch.setattr(lab_units, "canonical_units", lambda db: dict(CANON))
    return CANON


def _h(column, value, unit):
    return harmonize(column, value, unit, CANON[column])


# ─── L-01: kortizol < 40 nmol/L — aylantirilmaydi, birlik shubhali ────────────

@pytest.mark.parametrize("value,unit", [(25, "nmol/L"), (30, "нмоль/л"), (6.47, "нмоль/л")])
def test_l01_low_cortisol_is_not_converted(value, unit):
    r = _h("cortisol", value, unit)
    assert r["value"] == value
    assert r["unit"] == unit
    assert r["unit_suspect"] is True
    assert r["unit_mismatch"] is True
    assert "original" not in r


def test_l01_cortisol_flag_is_none_even_with_lab_ref(canon):
    out = lab_units.harmonize_all(None, {"cortisol": {
        "value": 25, "unit": "nmol/L", "ref_low": 138, "ref_high": 690}})
    cell = out["cortisol"]
    assert cell["value"] == 25 and cell["unit_suspect"]
    # Fayldagi me'yor JSON da qoladi (aylantirilmagan)
    assert (cell["ref_low"], cell["ref_high"]) == (138, 690)
    flag = lab_catalog.flag_for(_type("cortisol", 138, 690, 138, 690), cell["value"], True,
                                cell["unit_mismatch"], cell["ref_low"], cell["ref_high"],
                                unit_suspect=cell["unit_suspect"])
    assert flag == (None, None)


def test_l01_clinic_blank_6_47_is_suspect_not_normal(canon):
    out = lab_units.harmonize_all(None, {"cortisol": {
        "value": 6.47, "unit": "нмоль/л", "ref_low": 138, "ref_high": 690,
        "ref_text": "138–690"}})
    cell = out["cortisol"]
    assert cell["value"] == 6.47
    assert cell["unit_suspect"] is True
    assert cell["ref_text"] == "138–690"


def test_l01_normal_cortisol_untouched():
    r = _h("cortisol", 250, "нмоль/л")
    assert r == {"value": 250, "unit": "nmol/L"}


def test_l01_cortisol_ug_dl_still_converted():
    r = _h("cortisol", 12, "µg/dL")
    assert r["value"] == 331  # 12 µg/dL × 27.59
    assert r["original"] == {"value": 12, "unit": "µg/dL"}
    assert "unit_suspect" not in r


# ─── L-06: prolaktin < 40 mIU/L — aylantirilmaydi ─────────────────────────────

@pytest.mark.parametrize("unit", ["мМЕ/л", "mIU/L", "мкМЕ/мл", "µIU/mL"])
def test_l06_low_prolactin_is_suspect(unit):
    r = _h("prolactin", 30, unit)
    assert r["value"] == 30 and r["unit"] == unit
    assert r["unit_suspect"] is True and r["unit_mismatch"] is True


def test_l06_prolactin_30_is_not_high():
    r = _h("prolactin", 30, "мМЕ/л")
    t = _type("prolactin", 4.0, 15.2, 4.8, 23.3)
    flag = lab_catalog.flag_for(t, r["value"], True, r.get("unit_mismatch", False),
                                unit_suspect=r.get("unit_suspect", False))
    assert flag[0] != 1
    assert flag == (None, None)


def test_l06_prolactin_high_miu_still_converted():
    r = _h("prolactin", 300, "мМЕ/л")
    assert r["value"] == pytest.approx(14.2, abs=0.01)  # 300 / 21.2
    assert r["unit"] == "ng/mL"


def test_l06_prolactin_ng_ml_untouched():
    assert _h("prolactin", 12, "ng/mL") == {"value": 12, "unit": "ng/mL"}


# ─── L-02: yaxlitlash — muhim raqamlar, koeffitsiyent yaxlitlanmagan ──────────

@pytest.mark.parametrize("value,expected", [
    (0, 0), (327.1497, 327), (5.5555, 5.56), (14.44, 14.4),
    (0.0144, 0.0144), (0.57485, 0.575), (0.30527, 0.305), (0.000123456, 0.000123),
    (-0.0144, -0.0144),
])
def test_l02_round_significant(value, expected):
    assert lab_units._round(value) == pytest.approx(expected, rel=1e-9, abs=1e-12)


@pytest.mark.parametrize("value,unit,ref_high,exp_value,exp_ref", [
    (14.4, "ng/L", 14, 0.0144, 0.014),
    (26.4, "pg/mL", 26.2, 0.0264, 0.0262),
])
def test_l02_troponin_lab_ref_flag_high(canon, value, unit, ref_high, exp_value, exp_ref):
    cell = lab_units.harmonize_all(None, {"troponin_i": {
        "value": value, "unit": unit, "ref_high": ref_high}})["troponin_i"]
    assert cell["value"] == pytest.approx(exp_value)
    assert cell["ref_high"] == pytest.approx(exp_ref)
    t = _type("troponin_i", None, 0.04, None, 0.04)
    v, lo, hi = lab_units.exact_values("troponin_i", cell, CANON["troponin_i"])
    assert lab_catalog.flag_for(t, v, None, False, lo, hi) == (1, "lab")
    # Saqlangan (yaxlitlangan) qiymatlar bilan ham
    assert lab_catalog.flag_for(t, cell["value"], None, False, None, cell["ref_high"]) == (1, "lab")


def test_l02_troponin_catalog_flag_high(canon):
    cell = lab_units.harmonize_all(None, {"troponin_i": {"value": 40.4, "unit": "ng/L"}})["troponin_i"]
    assert cell["value"] == pytest.approx(0.0404)
    t = _type("troponin_i", None, 0.04, None, 0.04)
    assert lab_catalog.flag_for(t, cell["value"], None, False) == (1, "catalog")


def test_l02_flag_uses_unrounded_value(canon):
    # 40.04 ng/L → 0.04004 ng/mL: ko'rsatishda 0.04, baho esa aniq qiymat bilan
    cell = lab_units.harmonize_all(None, {"troponin_i": {"value": 40.04, "unit": "ng/L"}})["troponin_i"]
    assert cell["value"] == pytest.approx(0.04)
    v, lo, hi = lab_units.exact_values("troponin_i", cell, CANON["troponin_i"])
    assert v == pytest.approx(0.04004)
    t = _type("troponin_i", None, 0.04, None, 0.04)
    assert lab_catalog.flag_for(t, v, None, False, lo, hi) == (1, "catalog")


def test_l02_ref_factor_from_unrounded_value(canon):
    # 1.23456 mg/dL kreatinin → 109.137… µmol/L (yaxlitlangani 109): me'yor
    # koeffitsiyenti aniq qiymatdan — 1.2 mg/dL → 106.08, 109 dan emas
    cell = lab_units.harmonize_all(None, {"creatinine": {
        "value": 1.23456, "unit": "mg/dL", "ref_high": 1.2}})["creatinine"]
    assert cell["value"] == 109
    assert cell["ref_high"] == 106  # 1.2 × 88.4
    assert cell["original"]["ref_high"] == 1.2
    v, lo, hi = lab_units.exact_values("creatinine", cell, CANON["creatinine"])
    assert v == pytest.approx(109.138, abs=0.01)
    assert hi == pytest.approx(106.082, abs=0.01)


def test_exact_values_without_original_returns_cell():
    cell = {"value": 5.0, "unit": "mmol/L", "ref_low": 3.9, "ref_high": 5.5}
    assert lab_units.exact_values("glucose", cell, "mmol/L") == (5.0, 3.9, 5.5)


# ─── L-07: rus blankalari birliklari ──────────────────────────────────────────

@pytest.mark.parametrize("column,value,unit", [
    ("rbc", 4.5, "млн/мкл"),
    ("alt", 35, "ед/л"),
    ("ast", 28, "Ед/л"),
    ("ggt", 40, "ЕД/Л"),
    ("tsh", 2.5, "МКМЕ/МЛ"),
    ("tsh", 2.5, "МКЕД/МЛ"),
    ("tsh", 2.5, "мкед/мл"),
    ("fsh", 6.0, "mU/mL"),
    ("lh", 5.0, "mU/mL"),
    ("hcg", 3.0, "mU/mL"),
    ("ige_total", 50, "kU/L"),
    ("wbc", 6.1, "x10E9/L"),
    ("plt", 250, "x10e9/l"),
    ("rbc", 4.6, "x10E12/L"),
    ("wbc", 6.1, "×10^9/л"),
    ("wbc", 6.1, "х10^9/л"),  # kirill "х"
    ("neutrophils_abs", 3.2, "10^9/L"),
    ("wbc", 6.1, "109/л"),  # Excel yuqori indeksni yo'qotadi
    ("rbc", 4.6, "1012/л"),
    ("plt", 250, "тыс/мкл"),
])
def test_l07_russian_units_recognised(column, value, unit):
    r = _h(column, value, unit)
    assert "unit_mismatch" not in r, r
    assert r["value"] == value
    assert r["unit"] == CANON[column]


def test_l07_norm_unit_mln_before_ml():
    assert norm_unit("млн/мкл") == "mln/µl"
    assert norm_unit("мл") == "ml"
    assert norm_unit("ед/л") == "u/l"
    assert norm_unit("МКМЕ/МЛ") == "µiu/ml"
    assert norm_unit("x10E9/L") == "10^9/l"


def test_l07_lowercase_me_stays_mismatch():
    # "ме/л": mE yoki ME — aniqlab bo'lmaydi
    assert _h("tsh", 2.5, "ме/л").get("unit_mismatch") is True
    assert _h("alt", 30, "ме/л").get("unit_mismatch") is True


def test_l07_mu_ml_not_equivalent_for_tsh():
    assert _h("tsh", 2.5, "mU/mL").get("unit_mismatch") is True


def test_case_sensitive_mE_vs_ME():
    assert norm_unit("мЕ/л") == "µiu/ml"   # milli-birlik/L = µIU/mL
    assert norm_unit("МЕ/л") == "u/l"      # xalqaro birlik/L
    assert _h("tsh", 2.5, "мЕ/л") == {"value": 2.5, "unit": "µIU/mL"}
    assert _h("alt", 30, "МЕ/л") == {"value": 30, "unit": "U/L"}


# ─── L-28: birlik mos bo'lsa ham fiziologik mumkinlik ─────────────────────────

def test_l28_hb_g_per_l_implausible_is_suspect():
    r = _h("hb", 14.5, "g/L")
    assert r["value"] == 14.5 and r["unit_suspect"] is True and r["unit_mismatch"] is True


def test_l28_hb_valid():
    assert _h("hb", 145, "g/L") == {"value": 145, "unit": "g/L"}
    assert _h("hb", 14.5, "g/dL")["value"] == 145


def test_l28_calcium_mislabeled_mg_dl():
    # 2.3 "mg/dL" → 0.574 mmol/L imkonsiz → birlik nomi xato, qiymat mmol/L
    r = _h("calcium", 2.3, "mg/dL")
    assert r["value"] == 2.3 and r["unit"] == "mmol/L"
    assert r["original"] == {"value": 2.3, "unit": "mg/dL"}


def test_l28_calcium_real_mg_dl_converted():
    assert _h("calcium", 9.2, "mg/dL")["value"] == pytest.approx(2.3, abs=0.01)


def test_l28_glucose_hhs_1100_mg_dl():
    r = _h("glucose", 1100, "mg/dL")
    assert "unit_mismatch" not in r
    assert r["value"] == pytest.approx(61.1, abs=0.05)


def test_l28_glucose_same_unit_implausible():
    assert _h("glucose", 1100, "mmol/L")["unit_suspect"] is True


def test_l28_extreme_but_real_values_not_suspect():
    assert _h("tsh", 250, "µIU/mL") == {"value": 250, "unit": "µIU/mL"}
    assert _h("plt", 0, "10^9/L") == {"value": 0, "unit": "10^9/L"}
    assert _h("wbc", 0.05, "10^9/L") == {"value": 0.05, "unit": "10^9/L"}
    assert _h("prolactin", 5000, "ng/mL") == {"value": 5000, "unit": "ng/mL"}


def test_l28_count_unit_implausible_is_suspect():
    # WBC "mkl da" yozilgan son 10⁹/L deb kelgan
    assert _h("wbc", 7500, "10^9/L")["unit_suspect"] is True


# ─── Regressiya: mavjud aylantirishlar buzilmagan ─────────────────────────────

def test_regression_glucose_mg_dl():
    r = _h("glucose", 100, "mg/dL")
    assert r["value"] == pytest.approx(5.55, abs=0.01)
    assert r["unit"] == "mmol/L"


def test_regression_creatinine():
    assert _h("creatinine", 1.2, "mg/dL")["value"] == 106


def test_regression_cholesterol():
    assert _h("cholesterol", 200, "mg/dL")["value"] == pytest.approx(5.17, abs=0.01)


def test_regression_vitamin_d_nmol_to_ng():
    r = _h("vitamin_d", 75, "nmol/L")
    assert r["value"] == pytest.approx(30.0, abs=0.06)
    assert r["unit"] == "ng/mL"


def test_regression_uric_acid():
    assert _h("uric_acid", 5.5, "mg/dL")["value"] == 327


def test_regression_free_t4_mislabeled():
    r = _h("free_t4", 0.95, "нг/мл")
    assert r["value"] == pytest.approx(12.2, abs=0.01)
    assert r["unit"] == "pmol/L"
    assert r["original"] == {"value": 0.95, "unit": "нг/мл"}


def test_regression_free_t4_refs_same_scale(canon):
    cell = lab_units.harmonize_all(None, {"free_t4": {
        "value": 0.95, "unit": "нг/мл", "ref_low": 0.5, "ref_high": 1.4}})["free_t4"]
    assert cell["value"] == pytest.approx(12.2, abs=0.01)
    assert cell["ref_low"] == pytest.approx(6.44, abs=0.01)
    assert cell["ref_high"] == pytest.approx(18.0, abs=0.06)


def test_regression_insulin_mislabeled():
    r = _h("insulin", 10, "нг/мл")
    assert r == {"value": 10, "unit": "µIU/mL", "original": {"value": 10, "unit": "нг/мл"}}


def test_regression_ddimer_mislabeled():
    r = _h("d_dimer", 0.4, "нг/мл")
    assert r["value"] == 0.4 and r["unit"] == "µg/mL"


def test_regression_fsh_miu_l_mislabeled():
    r = _h("fsh", 6.0, "мМЕ/л")
    assert r["value"] == 6.0 and r["unit"] == "mIU/mL"


def test_regression_urine_density():
    r = harmonize("urine_density", 1020, None, None)
    assert r["value"] == 1.02


def test_regression_non_numeric_value():
    assert _h("hb", "abc", "g/L") == {"value": "abc", "unit": "g/L"}


def test_harmonize_all_keeps_text_and_kind(canon):
    out = lab_units.harmonize_all(None, {"hbsag": {
        "value": None, "unit": None, "text": "Отрицательный(-)", "result_kind": "NEGATIVE"}})
    assert out["hbsag"]["text"] == "Отрицательный(-)"
    assert out["hbsag"]["result_kind"] == "NEGATIVE"


# ─── `unconvert` (repair skripti uchun) ───────────────────────────────────────

def test_unconvert_with_raw_refs():
    cell = {"value": 0.0144, "unit": "ng/mL", "ref_high": 0.014,
            "original": {"value": 14.4, "unit": "ng/L", "ref_high": 14}}
    assert lab_units.unconvert("troponin_i", cell, "ng/mL") == {
        "value": 14.4, "unit": "ng/L", "ref_high": 14}


def test_unconvert_old_cortisol_ambiguous_refs_dropped():
    cell = {"value": 178.5, "unit": "nmol/L", "ref_low": 138, "ref_high": 690,
            "ref_text": "138–690", "original": {"value": 6.47, "unit": "нмоль/л"}}
    raw = lab_units.unconvert("cortisol", cell, "nmol/L")
    assert raw["value"] == 6.47 and raw["unit"] == "нмоль/л"
    assert raw["ref_text"] == "138–690"
    assert "ref_low" not in raw and "ref_high" not in raw
    assert harmonize("cortisol", raw["value"], raw["unit"], "nmol/L")["unit_suspect"] is True


def test_unconvert_without_original():
    assert lab_units.unconvert("hb", {"value": 140, "unit": "g/L"}, "g/L") is None
