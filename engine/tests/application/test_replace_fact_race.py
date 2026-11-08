from dataclasses import dataclass, replace

from argus.application.confirmed_facts import ReplaceFactCommand


@dataclass(frozen=True)
class _Fact:
    id: int
    value: str


class _Facts:
    """Repositorio en memoria: solo lo que usa el comando (leer y guardar un dato)."""

    def __init__(self, fact: _Fact) -> None:
        self.stored = {fact.id: fact}

    def get(self, _session_id: str, fact_id: int) -> _Fact:
        return self.stored[fact_id]

    def save(self, _session_id: str, fact: _Fact) -> None:
        self.stored[fact.id] = fact


def test_undo_restores_the_value_right_before_its_own_change() -> None:
    """(Regresión) Dos ediciones simultáneas: deshacer la segunda vuelve a la primera, no al inicio."""
    original = _Fact(1, "X")
    facts = _Facts(original)
    # Las dos peticiones construyen su comando antes de que el candado ejecute ninguno.
    to_y = ReplaceFactCommand(facts, "s-1", replace(original, value="Y"))  # type: ignore[arg-type]
    to_z = ReplaceFactCommand(facts, "s-1", replace(original, value="Z"))  # type: ignore[arg-type]

    to_y.execute()
    to_z.execute()
    to_z.undo()

    assert facts.stored[1].value == "Y"
