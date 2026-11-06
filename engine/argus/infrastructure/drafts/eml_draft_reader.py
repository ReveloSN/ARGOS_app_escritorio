from email.message import EmailMessage

from argus.application.document_reader_factory import DocumentReaderFactory
from argus.application.ports.document_reader import DocumentSource
from argus.application.ports.drafts import DraftContent
from argus.domain.document import Document
from argus.domain.errors import NotADraftEmailError
from argus.domain.send_review import DraftAttachment, EmailDraft
from argus.infrastructure.readers.eml_reader import (
    attachment_bytes,
    attachment_name,
    body_text,
    parse_email,
    read_attachment,
)

# Un correo siempre trae alguno de estos encabezados; un texto cualquiera con extensión .eml, ninguno.
IDENTIFYING_HEADERS = ("from", "to", "cc", "subject", "date")


def has_email_headers(message: EmailMessage) -> bool:
    return any(message[header] is not None for header in IDENTIFYING_HEADERS)


def addresses(message: EmailMessage, header: str) -> tuple[str, ...]:
    """Las direcciones de un encabezado («Para», «CC»), sin el nombre que las acompaña."""
    value = message[header]
    if value is None:
        return ()
    return tuple(address.addr_spec for address in value.addresses if address.addr_spec)


class EmlDraftReader:
    """Lee un borrador .eml: destinatarios, asunto, cuerpo y el texto de cada adjunto."""

    def __init__(self, attachment_readers: DocumentReaderFactory) -> None:
        self._attachment_readers = attachment_readers

    def read(self, source: DocumentSource) -> DraftContent:
        message = parse_email(source)
        if not has_email_headers(message):
            raise NotADraftEmailError(source.name)
        parts = list(message.iter_attachments())
        draft = EmailDraft(
            source.name,
            str(message["subject"] or ""),
            addresses(message, "to"),
            addresses(message, "cc"),
            body_text(message),
            tuple(
                DraftAttachment(attachment_name(part), len(attachment_bytes(part)))
                for part in parts
            ),
        )
        read = (read_attachment(self._attachment_readers, part) for part in parts)
        return DraftContent(draft, tuple(item for item in read if isinstance(item, Document)))
