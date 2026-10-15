"""Repositorios y reloj en memoria: dobles de prueba de los puertos de persistencia."""

from collections.abc import Sequence
from datetime import UTC, datetime, timedelta

from argus.domain.alert import Alert, NumberedAlert
from argus.domain.decision import Decision
from argus.domain.errors import SessionNotFoundError
from argus.domain.review_session import ReviewSession

START = datetime(2026, 10, 13, 9, 42, tzinfo=UTC)


class SteppingClock:
    """Reloj que avanza un paso fijo en cada consulta, para medir duraciones de forma exacta."""

    def __init__(self, start: datetime = START, step: timedelta = timedelta(minutes=1)) -> None:
        self._current = start - step
        self._step = step

    def now(self) -> datetime:
        self._current += self._step
        return self._current


class InMemorySessionRepository:
    def __init__(self) -> None:
        self.sessions: dict[str, ReviewSession] = {}

    def save(self, session: ReviewSession) -> None:
        self.sessions[session.id] = session

    def get(self, session_id: str) -> ReviewSession:
        if session_id not in self.sessions:
            raise SessionNotFoundError(session_id)
        return self.sessions[session_id]

    def list_created_since(self, since: datetime) -> tuple[ReviewSession, ...]:
        return tuple(s for s in self.sessions.values() if s.created_at >= since)


class InMemoryAlertRepository:
    def __init__(self) -> None:
        self.alerts: dict[str, tuple[NumberedAlert, ...]] = {}

    def save_all(self, session_id: str, alerts: Sequence[Alert]) -> tuple[NumberedAlert, ...]:
        numbered = tuple(NumberedAlert(n, alert) for n, alert in enumerate(alerts, start=1))
        self.alerts[session_id] = numbered
        return numbered

    def list_for(self, session_id: str) -> tuple[NumberedAlert, ...]:
        return self.alerts.get(session_id, ())


class InMemoryDecisionRepository:
    def __init__(self) -> None:
        self.decisions: dict[tuple[str, int], Decision] = {}

    def get(self, session_id: str, alert_number: int) -> Decision | None:
        return self.decisions.get((session_id, alert_number))

    def save(self, session_id: str, decision: Decision) -> None:
        self.decisions[(session_id, decision.alert_number)] = decision

    def delete(self, session_id: str, alert_number: int) -> None:
        self.decisions.pop((session_id, alert_number), None)

    def list_for(self, session_id: str) -> tuple[Decision, ...]:
        return tuple(d for (owner, _), d in sorted(self.decisions.items()) if owner == session_id)
