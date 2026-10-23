from dataclasses import dataclass
from threading import Lock

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


@dataclass(frozen=True)
class DecisionsState:
    """Las decisiones vigentes de una revisión o comparación y si hay algo que deshacer."""

    decisions: tuple[Decision, ...]
    can_undo: bool


class DecisionHistories:
    """Un historial de deshacer por dueño (revisión o comparación) mientras el motor está abierto.

    El motor atiende peticiones en varios hilos: el candado evita que dos decisiones
    simultáneas desordenen un historial.
    """

    def __init__(self, repository: DecisionRepository, clock: Clock) -> None:
        self._repository = repository
        self._clock = clock
        self._histories: dict[str, DecisionHistory] = {}
        self._lock = Lock()

    def decide(self, owner_id: str, request: DecisionRequest) -> None:
        with self._lock:
            self._history(owner_id).decide(request)

    def undo(self, owner_id: str) -> None:
        with self._lock:
            self._history(owner_id).undo()

    def can_undo(self, owner_id: str) -> bool:
        history = self._histories.get(owner_id)
        return history is not None and history.can_undo

    def decisions(self, owner_id: str) -> tuple[Decision, ...]:
        return self._repository.list_for(owner_id)

    def _history(self, owner_id: str) -> DecisionHistory:
        if owner_id not in self._histories:
            self._histories[owner_id] = DecisionHistory(owner_id, self._repository, self._clock)
        return self._histories[owner_id]
