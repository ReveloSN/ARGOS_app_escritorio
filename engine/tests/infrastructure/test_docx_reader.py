import pytest

from argus.domain.document import DocumentFormat
from argus.domain.errors import UnreadableDocumentError, UnreadableReason
from argus.domain.locations import ParagraphLocation, TableCellLocation
from argus.infrastructure.readers.docx_reader import DocxDocumentReader
from tests.infrastructure.conftest import fixture_source


def read_annex() -> dict[object, str]:
    document = DocxDocumentReader().read(fixture_source("Anexo_1_condiciones.docx"))
    assert document.format is DocumentFormat.DOCX
    return {fragment.location: fragment.text for fragment in document.fragments}


def test_paragraphs_keep_their_position_and_skip_empty_ones() -> None:
    texts = read_annex()

    assert texts[ParagraphLocation(1)] == "ANEXO 1 · CONDICIONES GENERALES"
    assert ParagraphLocation(2) not in texts
    assert "Contrato No. 4587" in texts[ParagraphLocation(3)]


def test_table_cells_are_located_by_table_row_and_column() -> None:
    texts = read_annex()

    assert texts[TableCellLocation(table=1, row=2, column=2)] == "$ 18.540.000"


def test_corrupted_docx_is_reported() -> None:
    with pytest.raises(UnreadableDocumentError) as raised:
        DocxDocumentReader().read(fixture_source("danado.docx"))

    assert raised.value.reason is UnreadableReason.CORRUPTED
