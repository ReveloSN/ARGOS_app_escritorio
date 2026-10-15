import pytest

from argus.domain.document import (
    AttachmentFailure,
    Document,
    DocumentFormat,
    TextFragment,
)
from argus.domain.errors import (
    InvalidValueError,
    UnreadableDocumentError,
    UnreadableReason,
    UnsupportedFormatError,
)
from argus.domain.locations import (
    LineLocation,
    PageLocation,
    ParagraphLocation,
    SheetCellLocation,
    TableCellLocation,
)


@pytest.mark.parametrize(
    ("file_name", "expected"),
    [
        ("Contrato_4857_v3.pdf", DocumentFormat.PDF),
        ("Anexo_1_condiciones.DOCX", DocumentFormat.DOCX),
        ("Anexo_2_tarifas.xlsx", DocumentFormat.XLSX),
        ("Correo_remision_cliente.eml", DocumentFormat.EML),
        ("texto_pegado.txt", DocumentFormat.TEXT),
    ],
)
def test_format_is_chosen_by_extension_ignoring_case(
    file_name: str, expected: DocumentFormat
) -> None:
    assert DocumentFormat.from_file_name(file_name) is expected


@pytest.mark.parametrize("file_name", ["Acta_comite_oct.pages", "sin_extension"])
def test_unknown_extension_is_an_unsupported_format(file_name: str) -> None:
    with pytest.raises(UnsupportedFormatError) as raised:
        DocumentFormat.from_file_name(file_name)

    assert raised.value.document_name == file_name
    assert raised.value.reason is UnreadableReason.UNSUPPORTED_FORMAT


def test_unsupported_format_is_a_kind_of_unreadable_document() -> None:
    assert issubclass(UnsupportedFormatError, UnreadableDocumentError)


def test_unreadable_document_keeps_name_and_reason() -> None:
    error = UnreadableDocumentError("anexo_3.pdf", UnreadableReason.NO_TEXT)

    assert error.document_name == "anexo_3.pdf"
    assert error.reason is UnreadableReason.NO_TEXT


def test_document_keeps_fragments_with_their_origin() -> None:
    fragment = TextFragment("Contrato No. 4857", PageLocation(1))

    document = Document("Contrato_4857_v3.pdf", DocumentFormat.PDF, (fragment,))

    assert document.fragments[0].location == PageLocation(1)
    assert document.attachments == ()
    assert document.attachment_failures == ()


def test_document_requires_a_name() -> None:
    with pytest.raises(InvalidValueError):
        Document("", DocumentFormat.PDF, ())


def test_fragment_requires_text() -> None:
    with pytest.raises(InvalidValueError):
        TextFragment("   ", LineLocation(1))


def test_attachment_failure_records_why_it_was_not_read() -> None:
    failure = AttachmentFailure("acta.pages", UnreadableReason.UNSUPPORTED_FORMAT)

    assert failure.reason is UnreadableReason.UNSUPPORTED_FORMAT


@pytest.mark.parametrize(
    "build",
    [
        lambda: PageLocation(0),
        lambda: ParagraphLocation(-1),
        lambda: LineLocation(0),
        lambda: TableCellLocation(1, 0, 1),
        lambda: TableCellLocation(1, 1, 0),
        lambda: SheetCellLocation("", "C12"),
        lambda: SheetCellLocation("Resumen", ""),
    ],
)
def test_locations_reject_impossible_positions(build: object) -> None:
    with pytest.raises(InvalidValueError):
        build()  # type: ignore[operator]
