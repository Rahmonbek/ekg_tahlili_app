"""L-22 — buzilgan xlsx va noto'g'ri `<dimension>` (DB va tarmoqsiz)."""
import io
import os
import re
import sys
import zipfile

import pytest

openpyxl = pytest.importorskip("openpyxl")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import excel_to_text  # noqa: E402
from file_validator import FileValidationError, validate_upload  # noqa: E402

SHEET = "xl/worksheets/sheet1.xml"


def _workbook_bytes() -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "БАК"
    ws.append(["Биохимия"])
    ws.append(["Наименование", "Результат", "Норма", "Ед."])
    ws.append(["Глюкоза", 7.8, "3.9-5.5", "ммоль/л"])
    ws.append(["Креатинин", 142, "53-115", "мкмоль/л"])
    ws.append(["Мочевина", 9.1, "2.5-8.3", "ммоль/л"])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _rewrite(content: bytes, member: str, transform) -> bytes:
    src = zipfile.ZipFile(io.BytesIO(content))
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as dst:
        for info in src.infolist():
            data = src.read(info.filename)
            if info.filename == member:
                data = transform(data)
            dst.writestr(info, data)
    return out.getvalue()


def _save(tmp_path, name, content):
    path = tmp_path / name
    path.write_bytes(content)
    return path.read_bytes()


def test_baseline_reads_results(tmp_path):
    content = _save(tmp_path, "ok.xlsx", _workbook_bytes())
    text = excel_to_text.xlsx_to_text(content)
    assert "Креатинин | 142" in text
    validate_upload("ok.xlsx", content, "lab", "uz")


def test_corrupt_sheet_xml_is_broken_xlsx_not_500(tmp_path):
    corrupt = _rewrite(_workbook_bytes(), SHEET,
                       lambda data: data[: len(data) // 2] + b"<row r=")  # uzilgan XML
    content = _save(tmp_path, "corrupt.xlsx", corrupt)

    with pytest.raises(excel_to_text.ExcelReadError) as err:
        excel_to_text.xlsx_to_text(content)
    assert str(err.value) == "broken"
    assert excel_to_text.xlsx_date(content) is None  # sana o'qish ham yiqilmaydi

    with pytest.raises(FileValidationError) as verr:
        validate_upload("corrupt.xlsx", content, "lab", "ru")
    assert verr.value.code == "broken_xlsx"


def test_wrong_dimension_reads_all_columns(tmp_path):
    def shrink(data: bytes) -> bytes:
        new, n = re.subn(rb'<dimension ref="[^"]+"\s*/>', b'<dimension ref="A1"/>', data)
        assert n == 1, "openpyxl `<dimension>` yozmadi"
        return new

    content = _save(tmp_path, "dim.xlsx", _rewrite(_workbook_bytes(), SHEET, shrink))
    assert b'<dimension ref="A1"/>' in zipfile.ZipFile(io.BytesIO(content)).read(SHEET)

    text = excel_to_text.xlsx_to_text(content)
    assert "Глюкоза | 7.8 | 3.9-5.5 | ммоль/л" in text
    assert "Креатинин | 142" in text
    assert "Мочевина | 9.1" in text
    validate_upload("dim.xlsx", content, "lab", "uz")


def test_single_column_table_is_empty_not_sent(tmp_path):
    """Faqat nomlar (qiymatsiz) — AI ga qiymatsiz matn ketmaydi, `xlsx_empty`."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Биохимия"
    for name in ("Наименование", "Глюкоза", "Креатинин"):
        ws.append([name])
    buf = io.BytesIO()
    wb.save(buf)
    content = _save(tmp_path, "names.xlsx", buf.getvalue())

    with pytest.raises(excel_to_text.ExcelReadError) as err:
        excel_to_text.xlsx_to_text(content)
    assert str(err.value) == "empty"
    with pytest.raises(FileValidationError) as verr:
        validate_upload("names.xlsx", content, "lab", "en")
    assert verr.value.code == "xlsx_empty"


def test_headerless_table_still_uses_fallback(tmp_path):
    """Boshqa klinikaning sarlavhasiz oddiy jadvali hamon yuboriladi."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Гемоглобин", 128, "г/л"])
    ws.append(["Лейкоциты", 6.1, "10^9/л"])
    buf = io.BytesIO()
    wb.save(buf)
    text = excel_to_text.xlsx_to_text(_save(tmp_path, "plain.xlsx", buf.getvalue()))
    assert "Гемоглобин | 128 | г/л" in text
