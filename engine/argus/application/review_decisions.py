from dataclasses import dataclass

from argus.application.decision_history import DecisionHistories, DecisionRequest, DecisionsState
from argus.application.ports.clock import Clock
from argus.application.ports.repositories import DecisionRepository, SessionRepository
from argus.domain.errors import ClosedSessionError

__all__ = ["DecisionRepositories", "DecisionsState", "ReviewDecisions"]


@dataclass(frozen=True)
class DecisionRepositories:
    sessions: SessionRepository
    decisions: DecisionRepository


class ReviewDecisions:
    """Decidir y deshacer en las revisiones abiertas; cada una conserva su propio historial.

    Una revisión cerrada queda como solo lectura: no admite decisiones ni deshacer.
    """

    def __init__(self, repositories: DecisionRepositories, clock: Clock) -> None:
        self._sessions = repositories.sessions
        self._histories = DecisionHistories(repositories.decisions, clock)

    def decide(self, session_id: str, request: DecisionRequest) -> DecisionsState:
        self._require_open(session_id)
        self._histories.decide(session_id, request)
        return self.state(session_id)

    def undo(self, session_id: str) -> DecisionsState:
        self._require_open(session_id)
        self._histories.undo(session_id)
        return self.state(session_id)

    def state(self, session_id: str) -> DecisionsState:
        is_open = not self._sessions.get(session_id).is_closed
        can_undo = is_open and self._histories.can_undo(session_id)
        return DecisionsState(self._histories.decisions(session_id), can_undo)

    def _require_open(self, session_id: str) -> None:
        if self._sessions.get(session_id).is_closed:
            raise ClosedSessionError(session_id)
