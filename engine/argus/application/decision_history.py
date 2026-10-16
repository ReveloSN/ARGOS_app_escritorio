from dataclasses import dataclass

from argus.application.command_history import CommandHistory
from argus.application.ports.clock import Clock
from argus.application.ports.repositories import DecisionRepository
from argus.domain.decision import CorrectSide, Decision, DecisionKind


@dataclass(frozen=True)
class DecisionRequest:
    alert_number: int
    kind: DecisionKind
    correct_side: CorrectSide | None = None


class RecordDecisionCommand:
    """Guarda una decisión recordando la anterior, para que deshacer la restaure exactamente."""

    def __init__(self, repository: DecisionRepository, session_id: str, decision: Decision) -> None:
        self._repository = repository
        self._session_id = session_id
        self._decision = decision
        self._previous: Decision | None = None

    def execute(self) -> None:
        self._previous = self._repository.get(self._session_id, self._decision.alert_number)
        self._repository.save(self._session_id, self._decision)

    def undo(self) -> None:
        if self._previous is None:
            self._repository.delete(self._session_id, self._decision.alert_number)
        else:
            self._repository.save(self._session_id, self._previous)


class DecisionHistory:
    """Decisiones de una revisión con deshacer y rehacer (Ctrl Z en la interfaz).

    La decisión vigente de cada alerta se guarda en el repositorio; el historial vive mientras
    la revisión está abierta, como el deshacer de cualquier aplicación de escritorio.
    """

    def __init__(self, session_id: str, repository: DecisionRepository, clock: Clock) -> None:
        self._session_id = session_id
        self._repository = repository
        self._clock = clock
        self._commands = CommandHistory()

    def decide(self, request: DecisionRequest) -> Decision:
        decision = Decision(
            request.alert_number, request.kind, self._clock.now(), request.correct_side
        )
        self._commands.execute(RecordDecisionCommand(self._repository, self._session_id, decision))
        return decision

    @property
    def can_undo(self) -> bool:
        return self._commands.can_undo

    def undo(self) -> bool:
        return self._commands.undo()

    def redo(self) -> bool:
        return self._commands.redo()
