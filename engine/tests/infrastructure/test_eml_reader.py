from email.message import EmailMessage

import pytest

from argus.application.document_reader_factory import DocumentReaderFactory
from argus.application.ports.document_reader import DocumentSource
from argus.domain.document import AttachmentFailure, DocumentFormat
from argus.domain.errors import UnreadableDocumentError, UnreadableReason
from argus.domain.locations import EmailPart, EmailPartLocation
from argus.infrastructure.readers.eml_reader import EmlDocumentReader
from argus.infrastructure.readers.text_reader import PlainTextReader
from argus.infrastructure.readers.xlsx_reader import XlsxDocumentReader
from tests.infrastructure.conftest import all_text, fixture_source


@pytest.fixture
def reader() -> EmlDocumentReader:
    attachment_readers = DocumentReaderFactory(
        {DocumentFormat.XLSX: XlsxDocumentReader(), DocumentFormat.TEXT: PlainTextReader()}
    )
    return EmlDocumentReader(attachment_readers)


def test_subject_and_body_are_located_by_email_part(reader: EmlDocumentReader) -> None:
    document = reader.read(fixture_source("Correo_remision_cliente.eml"))

    def texts_in(part: EmailPart) -> list[str]:
        location = EmailPartLocation(part)
        return [fragment.text for fragment in document.fragments if fragment.location == location]

    assert document.format is DocumentFormat.EML
    assert texts_in(EmailPart.SUBJECT) == ["Remisión del informe de junio"]
    assert any("Adjunto el informe de junio" in text for text in texts_in(EmailPart.BODY))


def test_supported_attachments_are_read_as_documents(reader: EmlDocumentReader) -> None:
    document = reader.read(fixture_source("Correo_remision_cliente.eml"))

    attachments = {attachment.name: attachment for attachment in document.attachments}
    assert set(attachments) == {"Anexo_2_tarifas.xlsx", "notas.txt"}
    assert "Tarifas mayo 2026" in all_text(attachments["Anexo_2_tarifas.xlsx"])
    assert "junio 2026" in all_text(attachments["notas.txt"])


def test_unsupported_attachments_are_reported_with_their_reason(
    reader: EmlDocumentReader,
) -> None:
    document = reader.read(fixture_source("Correo_remision_cliente.eml"))

    assert document.attachment_failures == (
        AttachmentFailure("Acta_comite_oct.pages", UnreadableReason.UNSUPPORTED_FORMAT),
    )


def test_html_only_body_is_read_as_text(reader: EmlDocumentReader) -> None:
    message = EmailMessage()
    message["Subject"] = "Tarifas"
    message.set_content("<p>Canon de <b>junio</b>: $ 18.450.000</p>", subtype="html")

    document = reader.read(DocumentSource("html.eml", message.as_bytes()))

    assert "Canon de junio: $ 18.450.000" in all_text(document)


def test_email_without_text_or_attachments_is_reported(reader: EmlDocumentReader) -> None:
    with pytest.raises(UnreadableDocumentError) as raised:
        reader.read(DocumentSource("vacio.eml", EmailMessage().as_bytes()))

    assert raised.value.reason is UnreadableReason.NO_TEXT
