from dataclasses import dataclass
from datetime import datetime, timedelta

from argus.application.ports.clock import Clock
from argus.application.ports.document_archive import DocumentArchive
from argus.application.ports.repositories import (
    AlertRepository,
    DecisionRepository,
    SessionRepository,
)
from argus.domain.alert import NumberedAlert
from argus.domain.decision import Decision
from argus.domain.review_session import ReviewSession
from argus.domain.usage_metrics import UsageMetrics, compute_usage_metrics


@dataclass(frozen=True)
class HistoryEntry:
    """Una fila del historial: la sesión y cuántas de sus alertas ya tienen decisión."""

    session: ReviewSession
    decided_count: int


@dataclass(frozen=True)
class HistoryOverview:
    entries: tuple[HistoryEntry, ...]
    metrics: UsageMetrics


@dataclass(frozen=True)
class HistoryRecord:
    """Una alerta del registro exportable, con su decisión o sin ella si sigue pendiente."""

    session: ReviewSession
    alert: NumberedAlert
    decision: Decision | None


@dataclass(frozen=True)
class HistoryRepositories:
    sessions: SessionRepository
    alerts: AlertRepository
    decisions: DecisionRepository


class ReviewHistory:
    """El historial de un periodo («últimos 30 días»): sesiones, métricas y registro de alertas."""

    def __init__(self, repositories: HistoryRepositories) -> None:
        self._repositories = repositories

    def overview(self, since: datetime) -> HistoryOverview:
        sessions = self._repositories.sessions.list_created_since(since)
        decisions = {s.id: self._repositories.decisions.list_for(s.id) for s in sessions}
        entries = tuple(HistoryEntry(s, len(decisions[s.id])) for s in sessions)
        return HistoryOverview(entries, compute_usage_metrics(sessions, decisions))

    def records(self, since: datetime) -> tuple[HistoryRecord, ...]:
        return tuple(
            record
            for session in self._repositories.sessions.list_created_since(since)
            for record in self._session_records(session)
        )

    def _session_records(self, session: ReviewSession) -> tuple[HistoryRecord, ...]:
        decisions = {d.alert_number: d for d in self._repositories.decisions.list_for(session.id)}
        return tuple(
            HistoryRecord(session, alert, decisions.get(alert.number))
            for alert in self._repositories.alerts.list_for(session.id)
        )


class PurgeExpiredHistory:
    """Borra las revisiones más antiguas que el periodo de retención, con la copia de sus archivos."""

    def __init__(self, sessions: SessionRepository, archive: DocumentArchive, clock: Clock) -> None:
        self._sessions = sessions
        self._archive = archive
        self._clock = clock

    def execute(self, retention: timedelta) -> int:
        expired = self._sessions.list_created_before(self._clock.now() - retention)
        for session in expired:
            self._sessions.delete(session.id)
            self._archive.delete_session(session.id)
        return len(expired)
