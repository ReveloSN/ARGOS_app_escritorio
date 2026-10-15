import pytest

from argus.domain.document import DocumentFormat
from argus.domain.errors import UnreadableDocumentError, UnreadableReason
from argus.domain.locations import PageLocation
from argus.infrastructure.readers.pdf_reader import PdfDocumentReader
from tests.infrastructure.conftest import fixture_source


def test_each_page_becomes_a_fragment_located_by_page_number() -> None:
    document = PdfDocumentReader().read(fixture_source("Contrato_4857_v3.pdf"))

    assert document.format is DocumentFormat.PDF
    assert [fragment.location for fragment in document.fragments] == [
        PageLocation(1),
        PageLocation(2),
    ]


def test_text_keeps_identifiers_amounts_and_accents() -> None:
    first_page, second_page = (
        PdfDocumentReader().read(fixture_source("Contrato_4857_v3.pdf")).fragments
    )

    assert "Contrato No. 4857" in first_page.text
    assert "Fontibón, Bogotá D.C." in first_page.text
    assert "$ 18.450.000" in second_page.text


@pytest.mark.parametrize(
    ("file_name", "reason"),
    [
        ("anexo_3.pdf", UnreadableReason.NO_TEXT),
        ("Estados_financieros_Q2.pdf", UnreadableReason.ENCRYPTED),
        ("danado.pdf", UnreadableReason.CORRUPTED),
    ],
)
def test_unreadable_pdfs_report_why(file_name: str, reason: UnreadableReason) -> None:
    with pytest.raises(UnreadableDocumentError) as raised:
        PdfDocumentReader().read(fixture_source(file_name))

    assert raised.value.document_name == file_name
    assert raised.value.reason is reason
