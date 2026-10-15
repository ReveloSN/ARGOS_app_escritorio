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
