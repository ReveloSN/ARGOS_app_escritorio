from collections.abc import Sequence

from argus.application.ports.clock import Clock
from argus.application.ports.document_archive import DocumentArchive
from argus.application.ports.repositories import AlertRepository, SessionRepository
from argus.domain.alert import Alert
from argus.domain.review_session import NewReviewSession, ReviewSession


class StartReviewSession:
    """Registra una revisión nueva con sus alertas ya ordenadas por prioridad."""

    def __init__(self, sessions: SessionRepository, alerts: AlertRepository, clock: Clock) -> None:
        self._sessions = sessions
        self._alerts = alerts
        self._clock = clock

    def execute(
        self, name: str, document_names: Sequence[str], alerts: Sequence[Alert]
    ) -> ReviewSession:
        new_session = NewReviewSession(name, tuple(document_names), len(alerts))
        session = ReviewSession.start(new_session, self._clock.now())
        self._sessions.save(session)
        self._alerts.save_all(session.id, alerts)
        return session


class CloseReviewSession:
    """Cierra la revisión; desde ese momento queda en el historial y cuenta en las métricas."""

    def __init__(self, sessions: SessionRepository, clock: Clock) -> None:
        self._sessions = sessions
        self._clock = clock

    def execute(self, session_id: str) -> ReviewSession:
        closed = self._sessions.get(session_id).close(self._clock.now())
        self._sessions.save(closed)
        return closed


class RenameReviewSession:
    """El usuario cambia el nombre de una sesión; sus alertas y decisiones no se tocan."""

    def __init__(self, sessions: SessionRepository) -> None:
        self._sessions = sessions

    def execute(self, session_id: str, name: str) -> ReviewSession:
        renamed = self._sessions.get(session_id).rename(name)
        self._sessions.save(renamed)
        # Lo guardado, no la copia leída: si se cerró entretanto, la respuesta lo dice.
        return self._sessions.get(session_id)


class DeleteReviewSession:
    """Elimina la sesión con sus alertas, decisiones y la copia de sus archivos."""

    def __init__(self, sessions: SessionRepository, archive: DocumentArchive) -> None:
        self._sessions = sessions
        self._archive = archive

    def execute(self, session_id: str) -> None:
        self._sessions.get(session_id)
        self._sessions.delete(session_id)
        self._archive.delete_session(session_id)
