from dataclasses import dataclass

from argus.application.command_history import CommandHistories
from argus.application.fact_value_reader import FactValueReader
from argus.application.ports.clock import Clock
from argus.application.ports.repositories import ConfirmedFactRepository, SessionRepository
from argus.domain.confirmed_fact import ConfirmedFact, FactDraft
from argus.domain.entity import EntityType
from argus.domain.errors import ClosedSessionError


@dataclass(frozen=True)
class FactRequest:
    """«Agregar dato»: su nombre, su tipo y el valor tal como lo escribe el usuario."""

    label: str
    entity_type: EntityType
    text: str


@dataclass(frozen=True)
class FactsState:
    """Los datos del expediente y si hay algo que deshacer."""

    facts: tuple[ConfirmedFact, ...]
    can_undo: bool


@dataclass(frozen=True)
class FactRepositories:
    sessions: SessionRepository
    facts: ConfirmedFactRepository


class AddFactCommand:
    def __init__(
        self, repository: ConfirmedFactRepository, session_id: str, fact: ConfirmedFact
    ) -> None:
        self._repository = repository
        self._session_id = session_id
        self._fact = fact

    def execute(self) -> None:
        self._repository.save(self._session_id, self._fact)

    def undo(self) -> None:
        self._repository.delete(self._session_id, self._fact.id)


class ReplaceFactCommand:
    """Editar, retirar o restaurar: deshacer vuelve a guardar el dato como estaba."""

    def __init__(
        self, repository: ConfirmedFactRepository, session_id: str, fact: ConfirmedFact
    ) -> None:
        self._repository = repository
        self._session_id = session_id
        self._fact = fact
        self._previous = repository.get(session_id, fact.id)

    def execute(self) -> None:
        self._repository.save(self._session_id, self._fact)

    def undo(self) -> None:
        self._repository.save(self._session_id, self._previous)


class ConfirmedFacts:
    """Agregar, editar, retirar y restaurar datos del expediente, con deshacer (Ctrl Z).

    Como las decisiones, solo se cambian en una revisión abierta: la cerrada es de solo lectura.
    """

    def __init__(
        self, repositories: FactRepositories, reader: FactValueReader, clock: Clock
    ) -> None:
        self._sessions = repositories.sessions
        self._facts = repositories.facts
        self._reader = reader
        self._clock = clock
        self._commands = CommandHistories()

    def add(self, session_id: str, request: FactRequest) -> FactsState:
        self._require_open(session_id)
        value = self._reader.read(request.entity_type, request.text)
        fact = self._facts.add(session_id, FactDraft(request.label, value), self._clock.now())
        # Ya quedó guardado; el comando solo se registra para poder deshacerlo.
        self._commands.execute(session_id, AddFactCommand(self._facts, session_id, fact))
        return self.state(session_id)

    def edit(self, session_id: str, fact_id: int, text: str) -> FactsState:
        fact = self._facts.get(session_id, fact_id)
        value = self._reader.read(fact.value.entity_type, text)
        return self._replace(session_id, fact.with_value(value, self._clock.now()))

    def retire(self, session_id: str, fact_id: int) -> FactsState:
        fact = self._facts.get(session_id, fact_id)
        return self._replace(session_id, fact.retired(self._clock.now()))

    def restore(self, session_id: str, fact_id: int) -> FactsState:
        return self._replace(session_id, self._facts.get(session_id, fact_id).restored())

    def undo(self, session_id: str) -> FactsState:
        self._require_open(session_id)
        self._commands.undo(session_id)
        return self.state(session_id)

    def state(self, session_id: str) -> FactsState:
        is_open = not self._sessions.get(session_id).is_closed
        can_undo = is_open and self._commands.can_undo(session_id)
        return FactsState(self._facts.list_for(session_id), can_undo)

    def _replace(self, session_id: str, fact: ConfirmedFact) -> FactsState:
        self._require_open(session_id)
        command = ReplaceFactCommand(self._facts, session_id, fact)
        self._commands.execute(session_id, command)
        return self.state(session_id)

    def _require_open(self, session_id: str) -> None:
        if self._sessions.get(session_id).is_closed:
            raise ClosedSessionError(session_id)
