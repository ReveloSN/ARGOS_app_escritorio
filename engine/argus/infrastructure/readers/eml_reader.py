from collections.abc import Iterator
from email import policy
from email.message import EmailMessage, MIMEPart
from email.parser import BytesParser
from itertools import chain

from argus.application.document_reader_factory import DocumentReaderFactory
from argus.application.ports.document_reader import DocumentSource
from argus.domain.document import AttachmentFailure, Document, DocumentFormat
from argus.domain.errors import UnreadableDocumentError, UnreadableReason
from argus.domain.locations import EmailPart, EmailPartLocation, SourceLocation
from argus.infrastructure.readers.fragments import build_fragments
from argus.infrastructure.readers.html_text import html_to_text

UNNAMED_ATTACHMENT = "adjunto_sin_nombre"
BODY_PREFERENCE = ("plain", "html")
SUBJECT_LOCATION = EmailPartLocation(EmailPart.SUBJECT)
BODY_LOCATION = EmailPartLocation(EmailPart.BODY)


class EmlDocumentReader:
    """Lee asunto, cuerpo y adjuntos de un correo; cada adjunto se lee con su propio lector.

    Recibe la factory de los demás formatos. Como esa factory no incluye EML, un correo dentro
    de otro correo se informa como no compatible en lugar de leerse sin límite de profundidad.
    """

    def __init__(self, attachment_readers: DocumentReaderFactory) -> None:
        self._attachment_readers = attachment_readers

    def read(self, source: DocumentSource) -> Document:
        message = BytesParser(policy=policy.default).parsebytes(source.content)
        if not isinstance(message, EmailMessage):
            raise UnreadableDocumentError(source.name, UnreadableReason.CORRUPTED)
        fragments = build_fragments(chain(_subject_texts(message), _body_texts(message)))
        outcomes = [self._read_attachment(part) for part in message.iter_attachments()]
        attachments = tuple(item for item in outcomes if isinstance(item, Document))
        if not fragments and not attachments:
            raise UnreadableDocumentError(source.name, UnreadableReason.NO_TEXT)
        failures = tuple(item for item in outcomes if isinstance(item, AttachmentFailure))
        return Document(source.name, DocumentFormat.EML, fragments, attachments, failures)

    def _read_attachment(self, part: MIMEPart) -> Document | AttachmentFailure:
        name = part.get_filename() or UNNAMED_ATTACHMENT
        payload = part.get_payload(decode=True)
        content = payload if isinstance(payload, bytes) else b""
        try:
            return self._attachment_readers.reader_for(name).read(DocumentSource(name, content))
        except UnreadableDocumentError as error:
            return AttachmentFailure(name, error.reason)


def _subject_texts(message: EmailMessage) -> Iterator[tuple[str, SourceLocation]]:
    yield str(message["subject"] or ""), SUBJECT_LOCATION


def _body_texts(message: EmailMessage) -> Iterator[tuple[str, SourceLocation]]:
    body = message.get_body(preferencelist=BODY_PREFERENCE)
    if body is None:
        return
    content = str(body.get_content())
    if body.get_content_subtype() == "html":
        content = html_to_text(content)
    yield from ((line, BODY_LOCATION) for line in content.splitlines())
