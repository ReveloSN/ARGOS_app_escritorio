import pytest

from argus.domain.document import Document, DocumentFormat, TextFragment
from argus.domain.errors import InvalidValueError, UnreadableReason
from argus.domain.locations import LineLocation, PageLocation
from argus.domain.read_outcome import DocumentReadOutcome, ReadSummary

ATTACHMENT = Document(
    "tarifas.txt", DocumentFormat.TEXT, (TextFragment("Canon $ 18.450.000", LineLocation(1)),)
)
EMAIL = Document(
    "correo.eml",
    DocumentFormat.EML,
    (TextFragment("Adjunto las tarifas", LineLocation(1)),),
    attachments=(ATTACHMENT,),
)


def test_fragments_of_attachments_count_as_read_text() -> None:
    outcome = DocumentReadOutcome("correo.eml", EMAIL, None)

    assert outcome.fragment_count == 2
    assert outcome.summary == ReadSummary("correo.eml", None, 2)
    assert outcome.summary.is_read


def test_unreadable_outcome_keeps_only_its_reason() -> None:
    outcome = DocumentReadOutcome("escaneado.pdf", None, UnreadableReason.NO_TEXT)

    assert not outcome.is_read
    assert outcome.summary == ReadSummary("escaneado.pdf", UnreadableReason.NO_TEXT, 0)
    assert not outcome.summary.is_read


@pytest.mark.parametrize(
    ("document", "reason"),
    [(None, None), (EMAIL, UnreadableReason.CORRUPTED)],
)
def test_outcome_is_either_a_document_or_a_reason(
    document: Document | None, reason: UnreadableReason | None
) -> None:
    with pytest.raises(InvalidValueError):
        DocumentReadOutcome("archivo.pdf", document, reason)


def test_named_fragments_say_in_which_file_each_fragment_is() -> None:
    document = Document(
        "contrato.pdf", DocumentFormat.PDF, (TextFragment("Contrato No. 4857", PageLocation(1)),)
    )

    assert [named.document_name for named in document.named_fragments()] == ["contrato.pdf"]
    assert [named.document_name for named in EMAIL.named_fragments()] == [
        "correo.eml",
        "tarifas.txt",
    ]
