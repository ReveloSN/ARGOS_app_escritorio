from dataclasses import dataclass
from typing import Protocol

from argus.application.ports.document_archive import ArchivedFile, DocumentArchive
from argus.application.ports.document_reader import DocumentSource
from argus.application.ports.repositories import DocumentRepository
from argus.application.review_session_use_cases import StartReviewSession
from argus.domain.alert import Alert
from argus.domain.errors import InvalidValueError
from argus.domain.read_outcome import DocumentReadOutcome
from argus.domain.review_session import ReviewSession


@dataclass(frozen=True)
class ReviewDraft:
    """Una revisión ya leída y analizada, antes de guardarla: cada archivo con su resultado."""

    name: str
    sources: tuple[DocumentSource, ...]
    documents: tuple[DocumentReadOutcome, ...]
    alerts: tuple[Alert, ...]

    def __post_init__(self) -> None:
        if len(self.sources) != len(self.documents):
            raise InvalidValueError("Cada archivo cargado necesita su resultado de lectura.")


class ReviewRecorder(Protocol):
    def record(self, draft: ReviewDraft) -> ReviewSession: ...


class StoredReviewRecorder:
    """Guarda la revisión: sesión y alertas, cómo se leyó cada archivo, su texto y una copia.

    La copia de los archivos leídos permite abrirlos desde el detalle de la alerta y volver a
    una sesión del historial; los que no se pudieron leer no se guardan.
    """

    def __init__(
        self,
        start_session: StartReviewSession,
        documents: DocumentRepository,
        archive: DocumentArchive,
    ) -> None:
        self._start_session = start_session
        self._documents = documents
        self._archive = archive

    def record(self, draft: ReviewDraft) -> ReviewSession:
        names = [document.name for document in draft.documents]
        session = self._start_session.execute(draft.name, names, draft.alerts)
        self._documents.save_all(session.id, draft.documents)
        readable = [
            (position, source)
            for position, (source, document) in enumerate(
                zip(draft.sources, draft.documents, strict=True)
            )
            if document.is_read
        ]
        for position, source in readable:
            self._archive.store(ArchivedFile(session.id, position, source))
        return session
