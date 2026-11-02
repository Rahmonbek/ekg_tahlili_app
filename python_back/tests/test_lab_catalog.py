"""`lab_catalog` — me'yor chegaralari, baho va sifat natijasi tasnifi
(TASKLAR_LAB_2026-11-02: L-17, L-24, L-01/L-06 `unit_suspect`)."""
import pytest

from lab_catalog import LabType, classify_qualitative, flag_for, norm_bounds


def _t(column, mn, mx, fmn, fmx, kind="numeric"):
    return LabType(id=1, column_name=column, name_uz=column, measure=None,
                   min_male=mn, max_male=mx, min_female=fmn, max_female=fmx,
                   value_kind=kind, sort_order=0, ai_hint=None)


FSH = _t("fsh", 1.4, 14.0, None, None)
CREATININE = _t("creatinine", 62, 115, 53, 97)
PSA = _t("psa_total", None, 4.0, None, None)
CA125 = _t("ca125", None, None, None, 35.0)
HBSAG = _t("hbsag", None, 0.99, None, 0.99, kind="qualitative")


# ─── L-17: jinsi noma'lum — birlashmada bir jins chegarasi yo'q bo'lsa, yo'q ──

def test_l17_fsh_unknown_gender_not_evaluated():
    assert norm_bounds(FSH, None) == (None, None)
    assert flag_for(FSH, 70, None, False) == (None, None)
    assert flag_for(FSH, 60, None, False) == (None, None)


def test_l17_fsh_known_gender():
    assert flag_for(FSH, 70, True, False) == (1, "catalog")
    assert flag_for(FSH, 70, False, False) == (None, None)


def test_l17_union_when_both_sexes_have_bounds():
    assert norm_bounds(CREATININE, None) == (53, 115)
    assert flag_for(CREATININE, 120, None, False) == (1, "catalog")
    assert flag_for(CREATININE, 50, None, False) == (-1, "catalog")
    assert flag_for(CREATININE, 100, None, False) == (0, "catalog")


def test_l17_one_sided_bounds():
    # PSA: faqat erkak me'yori — jinsi noma'lumda baholanmaydi
    assert norm_bounds(PSA, None) == (None, None)
    assert norm_bounds(CA125, None) == (None, None)
    # Ikkala jinsda faqat yuqori chegara — pastki yo'q, yuqorisi bor
    t = _t("troponin_i", None, 0.04, None, 0.04)
    assert norm_bounds(t, None) == (None, 0.04)


# ─── unit_suspect: laboratoriya me'yori bo'lsa ham baholanmaydi ──────────────

def test_unit_suspect_never_flagged():
    t = _t("cortisol", 138, 690, 138, 690)
    assert flag_for(t, 25, True, True, 138, 690, unit_suspect=True) == (None, None)
    assert flag_for(t, 25, True, True, unit_suspect=True) == (None, None)
    # Oddiy unit_mismatch + laboratoriya me'yori — avvalgidek baholanadi
    assert flag_for(t, 25, True, True, 138, 690) == (-1, "lab")


def test_unit_suspect_does_not_affect_qualitative():
    assert flag_for(HBSAG, None, None, False, result_kind="POSITIVE", unit_suspect=True) == (1, "lab")


# ─── L-24: sifat natijasi matndan (migratsiya bilan bir xil) ─────────────────

@pytest.mark.parametrize("text,value,kind", [
    ("Отрицательный(-)", None, "NEGATIVE"),
    ("отрицательно", 0, "NEGATIVE"),
    ("Положительный(+)", 1, "POSITIVE"),
    ("ПОЛОЖИТЕЛЬНЫЙ", None, "POSITIVE"),
    ("Не обнаружено", None, "NEGATIVE"),
    ("Обнаружено", None, "POSITIVE"),
    ("Сомнительный", None, "EQUIVOCAL"),
    ("(+-)", None, "EQUIVOCAL"),
    ("±", None, "EQUIVOCAL"),
    ("manfiy", None, "NEGATIVE"),
    ("Musbat", None, "POSITIVE"),
    ("Non-reactive", None, "NEGATIVE"),  # SQL da bu MUSBAT bo'lardi ("reactiv")
    ("nonreactive", None, "NEGATIVE"),
    ("Reactive", None, "POSITIVE"),
    ("Negative", None, "NEGATIVE"),
    ("A(II)", None, "UNKNOWN"),
    (None, 0.3, "NEGATIVE"),
    (None, 1.0, "POSITIVE"),
    (None, 12.5, "POSITIVE"),
    ("", 0.3, "NEGATIVE"),
    (None, None, "UNKNOWN"),
])
def test_l24_classify_qualitative(text, value, kind):
    assert classify_qualitative(text, value) == kind
