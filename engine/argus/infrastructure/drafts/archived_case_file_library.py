import re
from collections.abc import Iterator
from pathlib import PurePath

from argus.application.ports.document_archive import DocumentArchive
from argus.application.ports.document_reader import DocumentSource
from argus.application.ports.repositories import DocumentRepository
from argus.domain.errors import (
    ArchivedFileMissingError,
    DocumentNotFoundError,
    UnreadableDocumentError,
)
from argus.infrastructure.drafts.eml_draft_reader import addresses
from argus.infrastructure.readers.eml_reader import parse_email

EMAIL_ADDRESS = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
EMAIL_EXTENSION = ".eml"
ADDRESS_HEADERS = ("from", "to", "cc", "reply-to")


class ArchivedCaseFileLibrary:
    """El expediente visto desde «Revisar antes de enviar»: sus documentos guardados y contactos.

    Los contactos son las direcciones que aparecen en el texto de los documentos y en los
    encabezados de los correos del expediente.
    """

    def __init__(self, documents: DocumentRepository, archive: DocumentArchive) -> None:
        self._documents = documents
        self._archive = archive

    def document_names(self, session_id: str) -> tuple[str, ...]:
        return tuple(
            summary.name for summary in self._documents.list_for(session_id) if summary.is_read
        )

    def contacts(self, session_id: str) -> frozenset[str]:
        in_text = (
            address.casefold()
            for named in self._documents.fragments_for(session_id)
            for address in EMAIL_ADDRESS.findall(named.fragment.text)
        )
        return frozenset(in_text) | frozenset(self._header_addresses(session_id))

    def content_of(self, session_id: str, document_name: str) -> DocumentSource:
        position = self._documents.position_of(session_id, document_name)
        if position is None:
            raise DocumentNotFoundError(session_id, document_name)
        path = self._archive.path_of(session_id, position)
        if path is None:
            raise ArchivedFileMissingError(session_id, document_name)
        return DocumentSource(document_name, path.read_bytes())

    def _header_addresses(self, session_id: str) -> Iterator[str]:
        emails = (
            name
            for name in self.document_names(session_id)
            if PurePath(name).suffix.lower() == EMAIL_EXTENSION
        )
        for name in emails:
            yield from self._addresses_in(session_id, name)

    def _addresses_in(self, session_id: str, name: str) -> Iterator[str]:
        try:
            message = parse_email(self.content_of(session_id, name))
        except (ArchivedFileMissingError, UnreadableDocumentError):
            return
        for header in ADDRESS_HEADERS:
            yield from (address.casefold() for address in addresses(message, header))
