from argus.application.command_history import CommandHistories, CommandHistory


class AppendCommand:
    """Comando de prueba: agrega un valor a una lista y lo quita al deshacer."""

    def __init__(self, target: list[str], value: str) -> None:
        self._target = target
        self._value = value

    def execute(self) -> None:
        self._target.append(self._value)

    def undo(self) -> None:
        self._target.remove(self._value)


def test_executed_command_can_be_undone_and_redone() -> None:
    log: list[str] = []
    history = CommandHistory()

    history.execute(AppendCommand(log, "Alerta 1: Es un error"))
    assert history.undo()
    assert log == []
    assert history.redo()
    assert log == ["Alerta 1: Es un error"]


def test_undo_goes_back_one_command_at_a_time() -> None:
    log: list[str] = []
    history = CommandHistory()
    history.execute(AppendCommand(log, "1"))
    history.execute(AppendCommand(log, "2"))

    history.undo()

    assert log == ["1"]


def test_new_command_discards_what_could_be_redone() -> None:
    log: list[str] = []
    history = CommandHistory()
    history.execute(AppendCommand(log, "1"))
    history.undo()

    history.execute(AppendCommand(log, "2"))

    assert not history.can_redo
    assert not history.redo()
    assert log == ["2"]


def test_nothing_to_undo_or_redo_returns_false() -> None:
    history = CommandHistory()

    assert not history.can_undo
    assert not history.undo()
    assert not history.redo()


def test_each_owner_keeps_its_own_undo_history() -> None:
    histories = CommandHistories()
    log: list[str] = []
    histories.execute("expediente-a", AppendCommand(log, "Canon mensual"))

    assert histories.can_undo("expediente-a")
    assert not histories.can_undo("expediente-b")
    assert not histories.undo("expediente-b")
    assert histories.undo("expediente-a")
    assert not histories.can_undo("expediente-a")
