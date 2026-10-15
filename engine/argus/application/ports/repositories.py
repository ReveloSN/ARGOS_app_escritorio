"""Puertos de persistencia (Repository): pequeños y separados por lo que guarda cada uno."""

from collections.abc import Sequence
from datetime import datetime
from typing import Protocol

from argus.domain.alert import Alert, NumberedAlert
from argus.domain.decision import Decision
from argus.domain.review_session import ReviewSession


class SessionRepository(Protocol):
    def save(self, session: ReviewSession) -> None: ...

    def get(self, session_id: str) -> ReviewSession:
        """La sesión, o SessionNotFoundError si no existe."""
        ...

    def list_created_since(self, since: datetime) -> tuple[ReviewSession, ...]: ...


class AlertRepository(Protocol):
    def save_all(self, session_id: str, alerts: Sequence[Alert]) -> tuple[NumberedAlert, ...]:
        """Guarda las alertas ya ordenadas y las numera desde 1 en ese orden."""
        ...

    def list_for(self, session_id: str) -> tuple[NumberedAlert, ...]: ...


class DecisionRepository(Protocol):
    def get(self, session_id: str, alert_number: int) -> Decision | None: ...

    def save(self, session_id: str, decision: Decision) -> None:
        """Guarda o reemplaza la decisión; AlertNotFoundError si la alerta no existe."""
        ...

    def delete(self, session_id: str, alert_number: int) -> None: ...

    def list_for(self, session_id: str) -> tuple[Decision, ...]: ...
