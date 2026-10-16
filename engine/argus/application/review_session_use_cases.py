from collections.abc import Sequence

from argus.application.ports.clock import Clock
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
