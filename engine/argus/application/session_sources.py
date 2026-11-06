"""Los archivos de una revisión guardada como fuentes, para volver a usarlos sin cargarlos otra vez."""

from collections.abc import Sequence

from argus.application.ports.document_archive import DocumentArchive
from argus.application.ports.document_reader import DocumentSource
from argus.application.ports.repositories import DocumentRepository, SessionRepository
from argus.domain.errors import ArchivedFileMissingError, DocumentNotFoundError


class ArchivedDocumentContent:
    """El contenido de la copia guardada de un archivo de la revisión."""

    def __init__(self, documents: DocumentRepository, archive: DocumentArchive) -> None:
        self._documents = documents
        self._archive = archive

    def content_of(self, session_id: str, document_name: str) -> DocumentSource:
        position = self._documents.position_of(session_id, document_name)
        if position is None:
            raise DocumentNotFoundError(session_id, document_name)
        path = self._archive.path_of(session_id, position)
        if path is None:
            raise ArchivedFileMissingError(session_id, document_name)
        return DocumentSource(document_name, path.read_bytes())


class SessionSources:
    """Los archivos leídos de la sesión que el usuario elige, listos para compararlos.

    Solo los que se leyeron tienen copia guardada: un archivo que no se pudo leer no se ofrece.
    """

    def __init__(
        self,
        sessions: SessionRepository,
        documents: DocumentRepository,
        content: ArchivedDocumentContent,
    ) -> None:
        self._sessions = sessions
        self._documents = documents
        self._content = content

    def sources_for(
        self, session_id: str, document_names: Sequence[str]
    ) -> tuple[DocumentSource, ...]:
        self._sessions.get(session_id)
        readable = {item.name for item in self._documents.list_for(session_id) if item.is_read}
        for name in document_names:
            if name not in readable:
                raise DocumentNotFoundError(session_id, name)
        return tuple(self._content.content_of(session_id, name) for name in document_names)
