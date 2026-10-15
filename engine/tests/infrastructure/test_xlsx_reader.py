import pytest

from argus.domain.document import DocumentFormat
from argus.domain.errors import UnreadableDocumentError, UnreadableReason
from argus.domain.locations import SheetCellLocation
from argus.infrastructure.readers.xlsx_reader import XlsxDocumentReader
from tests.infrastructure.conftest import fixture_source


def read_rates() -> dict[object, str]:
    document = XlsxDocumentReader().read(fixture_source("Anexo_2_tarifas.xlsx"))
    assert document.format is DocumentFormat.XLSX
    return {fragment.location: fragment.text for fragment in document.fragments}


def test_each_cell_with_data_is_located_by_sheet_and_coordinate() -> None:
    texts = read_rates()

    assert texts[SheetCellLocation("Resumen", "A1")] == "Tarifas mayo 2026"
    assert texts[SheetCellLocation("Resumen", "C12")] == "18540000"
    assert texts[SheetCellLocation("Notas", "A1")] == "Valores sin IVA"


def test_dates_are_written_in_iso_format() -> None:
    assert read_rates()[SheetCellLocation("Resumen", "C14")] == "2026-05-31"


def test_empty_cells_are_skipped() -> None:
    assert len(read_rates()) == 5


def test_corrupted_xlsx_is_reported() -> None:
    with pytest.raises(UnreadableDocumentError) as raised:
        XlsxDocumentReader().read(fixture_source("danado.xlsx"))

    assert raised.value.reason is UnreadableReason.CORRUPTED
