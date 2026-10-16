"""Casos de uso sobre los archivos de una revisión guardada: buscar en su texto y abrirlos."""

from dataclasses import dataclass

from argus.application.excerpt import Excerpt, excerpt_with_highlight
from argus.application.ports.document_archive import DocumentArchive, FileOpener
from argus.application.ports.repositories import DocumentRepository, SessionRepository
from argus.domain.document import NamedFragment
from argus.domain.errors import ArchivedFileMissingError, DocumentNotFoundError
from argus.domain.locations import SourceLocation
from argus.domain.text_search import fold_for_search

MAX_DOCUMENT_MATCHES = 20
# Con una sola letra coincidiría casi todo el texto; no ayuda a encontrar nada.
MIN_QUERY_LENGTH = 2


@dataclass(frozen=True)
class DocumentMatch:
    document_name: str
    location: SourceLocation
    excerpt: Excerpt


class SearchDocuments:
    """Busca un texto en los documentos de la revisión, sin importar mayúsculas ni tildes."""

    def __init__(self, sessions: SessionRepository, documents: DocumentRepository) -> None:
        self._sessions = sessions
        self._documents = documents

    def execute(self, session_id: str, query: str) -> tuple[DocumentMatch, ...]:
        self._sessions.get(session_id)
        folded = fold_for_search(query.strip())
        if len(folded) < MIN_QUERY_LENGTH:
            return ()
        fragments = self._documents.fragments_matching(session_id, folded, MAX_DOCUMENT_MATCHES)
        return tuple(_match(named, folded) for named in fragments)


def _match(named: NamedFragment, folded_query: str) -> DocumentMatch:
    text = named.fragment.text
    start = fold_for_search(text).index(folded_query)
    excerpt = excerpt_with_highlight(text, start, start + len(folded_query))
    return DocumentMatch(named.document_name, named.fragment.location, excerpt)


class OpenDocument:
    """Abre la copia guardada del archivo; un adjunto se abre desde el correo que lo trae."""

    def __init__(
        self, documents: DocumentRepository, archive: DocumentArchive, opener: FileOpener
    ) -> None:
        self._documents = documents
        self._archive = archive
        self._opener = opener

    def execute(self, session_id: str, document_name: str) -> None:
        position = self._documents.position_of(session_id, document_name)
        if position is None:
            raise DocumentNotFoundError(session_id, document_name)
        path = self._archive.path_of(session_id, position)
        if path is None:
            raise ArchivedFileMissingError(session_id, document_name)
        self._opener.open(path)
