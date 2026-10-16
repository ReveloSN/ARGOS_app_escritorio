from dataclasses import dataclass
from threading import Lock

from argus.application.decision_history import DecisionHistory, DecisionRequest
from argus.application.ports.clock import Clock
from argus.application.ports.repositories import DecisionRepository, SessionRepository
from argus.domain.decision import Decision
from argus.domain.errors import ClosedSessionError


@dataclass(frozen=True)
class DecisionsState:
    """Las decisiones vigentes de una revisión y si hay algo que deshacer (Ctrl Z)."""

    decisions: tuple[Decision, ...]
    can_undo: bool


@dataclass(frozen=True)
class DecisionRepositories:
    sessions: SessionRepository
    decisions: DecisionRepository


class ReviewDecisions:
    """Decidir y deshacer en las revisiones abiertas; cada una conserva su propio historial.

    El motor atiende peticiones en varios hilos: el candado evita que dos decisiones
    simultáneas desordenen el historial de deshacer.
    """

    def __init__(self, repositories: DecisionRepositories, clock: Clock) -> None:
        self._repositories = repositories
        self._clock = clock
        self._histories: dict[str, DecisionHistory] = {}
        self._lock = Lock()

    def decide(self, session_id: str, request: DecisionRequest) -> DecisionsState:
        with self._lock:
            self._open_history(session_id).decide(request)
            return self._state(session_id)

    def undo(self, session_id: str) -> DecisionsState:
        with self._lock:
            self._open_history(session_id).undo()
            return self._state(session_id)

    def state(self, session_id: str) -> DecisionsState:
        with self._lock:
            return self._state(session_id)

    def _open_history(self, session_id: str) -> DecisionHistory:
        if self._repositories.sessions.get(session_id).is_closed:
            raise ClosedSessionError(session_id)
        if session_id not in self._histories:
            self._histories[session_id] = DecisionHistory(
                session_id, self._repositories.decisions, self._clock
            )
        return self._histories[session_id]

    def _state(self, session_id: str) -> DecisionsState:
        history = self._histories.get(session_id)
        is_open = not self._repositories.sessions.get(session_id).is_closed
        return DecisionsState(
            self._repositories.decisions.list_for(session_id),
            can_undo=is_open and history is not None and history.can_undo,
        )
