import pytest

from argus.domain.errors import InvalidValueError
from argus.domain.report_document import ReportCell, ReportSection, ReportTable
from tests.domain.report_builders import report_document


def test_the_page_label_gets_the_page_and_the_total() -> None:
    assert report_document().page_text(2, 3) == "Página 2 de 3"


def test_each_row_needs_one_cell_per_column() -> None:
    with pytest.raises(InvalidValueError):
        ReportTable(("Dato", "Valor"), ((ReportCell("Identificador"),),))


def test_a_section_needs_a_heading() -> None:
    with pytest.raises(InvalidValueError):
        ReportSection(" ")
