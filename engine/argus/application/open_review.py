from dataclasses import dataclass

from argus.application.ports.repositories import (
    AlertRepository,
    DocumentRepository,
    SessionRepository,
)
from argus.domain.alert import NumberedAlert
from argus.domain.read_outcome import ReadSummary
from argus.domain.review_session import ReviewSession


@dataclass(frozen=True)
class StoredReview:
    """Una revisión guardada tal como la ve el usuario: sesión, archivos y alertas."""

    session: ReviewSession
    documents: tuple[ReadSummary, ...]
    alerts: tuple[NumberedAlert, ...]


@dataclass(frozen=True)
class StoredReviewRepositories:
    sessions: SessionRepository
    alerts: AlertRepository
    documents: DocumentRepository


class OpenReview:
    """Vuelve a una revisión guardada: la en curso para seguir decidiendo, la cerrada para leerla."""

    def __init__(self, repositories: StoredReviewRepositories) -> None:
        self._repositories = repositories

    def execute(self, session_id: str) -> StoredReview:
        session = self._repositories.sessions.get(session_id)
        return StoredReview(
            session,
            self._repositories.documents.list_for(session_id),
            self._repositories.alerts.list_for(session_id),
        )
