"""Puertos de «Revisar antes de enviar»: leer y corregir el borrador y consultar el expediente."""

from dataclasses import dataclass
from typing import Protocol

from argus.application.ports.document_reader import DocumentSource
from argus.domain.document import Document
from argus.domain.send_review import EmailDraft, SendReview


@dataclass(frozen=True)
class DraftContent:
    """El borrador y el texto de cada adjunto, para saber de qué periodo es cada uno."""

    draft: EmailDraft
    attachments: tuple[Document, ...]


class DraftReader(Protocol):
    def read(self, source: DocumentSource) -> DraftContent:
        """El borrador; UnreadableDocumentError si el correo no se puede leer."""
        ...


@dataclass(frozen=True)
class DraftCorrections:
    """Lo que cambia en la copia: destinatarios y adjuntos que salen, y adjuntos que entran."""

    removed_recipients: frozenset[str]
    removed_attachments: frozenset[str]
    added_attachments: tuple[DocumentSource, ...]


class DraftWriter(Protocol):
    def corrected(self, original: bytes, corrections: DraftCorrections) -> bytes:
        """Una copia del correo con las correcciones; el original no se toca."""
        ...


class DraftOutbox(Protocol):
    def deliver(self, review_id: str, file_name: str, content: bytes) -> None:
        """Guarda la copia corregida y la abre con el cliente de correo del sistema."""
        ...


class CaseFileLibrary(Protocol):
    """Lo que el expediente aporta a la revisión del borrador."""

    def document_names(self, session_id: str) -> tuple[str, ...]: ...

    def contacts(self, session_id: str) -> frozenset[str]:
        """Las direcciones de correo que aparecen en los documentos del expediente."""
        ...

    def content_of(self, session_id: str, document_name: str) -> DocumentSource:
        """La copia guardada del documento; ArchivedFileMissingError si ya no está."""
        ...


class SendReviewRepository(Protocol):
    def save(self, review: SendReview, original: bytes) -> None: ...

    def get(self, review_id: str) -> SendReview:
        """La revisión, o SendReviewNotFoundError si no existe."""
        ...

    def original_of(self, review_id: str) -> bytes: ...
