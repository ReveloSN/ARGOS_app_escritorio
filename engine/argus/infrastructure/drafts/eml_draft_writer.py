import mimetypes
from email.headerregistry import Address
from email.message import EmailMessage, Message

from argus.application.ports.document_reader import DocumentSource
from argus.application.ports.drafts import DraftCorrections
from argus.infrastructure.readers.eml_reader import attachment_name, parse_email

RECIPIENT_HEADERS = ("to", "cc")
GENERIC_TYPE = "application/octet-stream"
# Solo para los mensajes de error: el borrador ya se leyó bien al revisarlo.
DRAFT_NAME = "borrador.eml"


def _without_recipients(message: EmailMessage, removed: frozenset[str]) -> None:
    for header in RECIPIENT_HEADERS:
        value = message[header]
        if value is None:
            continue
        kept: list[Address] = [item for item in value.addresses if item.addr_spec not in removed]
        del message[header]
        if kept:
            message[header] = kept


def _without_attachments(message: EmailMessage, removed: frozenset[str]) -> None:
    if not removed or not message.is_multipart():
        return
    kept: list[Message[str, str] | str] = [
        part
        for part in message.iter_parts()
        if not (part.is_attachment() and attachment_name(part) in removed)
    ]
    message.set_payload(kept)


def _attach(message: EmailMessage, source: DocumentSource) -> None:
    content_type = mimetypes.guess_type(source.name)[0] or GENERIC_TYPE
    maintype, subtype = content_type.split("/", 1)
    message.add_attachment(source.content, maintype=maintype, subtype=subtype, filename=source.name)


class EmlDraftWriter:
    """Arma la copia corregida de un .eml: quita destinatarios y adjuntos y agrega los nuevos."""

    def corrected(self, original: bytes, corrections: DraftCorrections) -> bytes:
        message = parse_email(DocumentSource(DRAFT_NAME, original))
        _without_recipients(message, corrections.removed_recipients)
        _without_attachments(message, corrections.removed_attachments)
        for source in corrections.added_attachments:
            _attach(message, source)
        return message.as_bytes()
