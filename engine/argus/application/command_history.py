from threading import Lock
from typing import Protocol


class Command(Protocol):
    def execute(self) -> None: ...

    def undo(self) -> None: ...


class CommandHistory:
    """Pilas de deshacer y rehacer (patrón Command); un comando nuevo descarta lo rehacible."""

    def __init__(self) -> None:
        self._done: list[Command] = []
        self._undone: list[Command] = []

    @property
    def can_undo(self) -> bool:
        return bool(self._done)

    @property
    def can_redo(self) -> bool:
        return bool(self._undone)

    def execute(self, command: Command) -> None:
        command.execute()
        self._done.append(command)
        self._undone.clear()

    def undo(self) -> bool:
        if not self._done:
            return False
        command = self._done.pop()
        command.undo()
        self._undone.append(command)
        return True

    def redo(self) -> bool:
        if not self._undone:
            return False
        command = self._undone.pop()
        command.execute()
        self._done.append(command)
        return True


class CommandHistories:
    """Un historial de deshacer por dueño (revisión o comparación) mientras el motor está abierto.

    El motor atiende peticiones en varios hilos: el candado evita que dos cambios simultáneos
    desordenen un historial.
    """

    def __init__(self) -> None:
        self._histories: dict[str, CommandHistory] = {}
        self._lock = Lock()

    def execute(self, owner_id: str, command: Command) -> None:
        with self._lock:
            self._history(owner_id).execute(command)

    def undo(self, owner_id: str) -> bool:
        with self._lock:
            return self._history(owner_id).undo()

    def can_undo(self, owner_id: str) -> bool:
        history = self._histories.get(owner_id)
        return history is not None and history.can_undo

    def _history(self, owner_id: str) -> CommandHistory:
        return self._histories.setdefault(owner_id, CommandHistory())
