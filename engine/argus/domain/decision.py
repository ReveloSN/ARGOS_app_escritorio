from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum

from argus.domain.errors import InvalidValueError
from argus.domain.validation import require_positive, require_time_zone


class DecisionKind(StrEnum):
    """Las tres decisiones del detalle de alerta: «Es correcto», «Es un error», «Ignorar»."""

    CORRECT = "correct"
    ERROR = "error"
    IGNORED = "ignored"


class CorrectSide(StrEnum):
    """Cuál valor es el correcto cuando la alerta es un error: Valor A o Valor B."""

    FIRST = "first"
    SECOND = "second"


@dataclass(frozen=True)
class Decision:
    alert_number: int
    kind: DecisionKind
    decided_at: datetime
    correct_side: CorrectSide | None = None

    def __post_init__(self) -> None:
        require_positive("El número de alerta", self.alert_number)
        require_time_zone("La fecha de la decisión", self.decided_at)
        if self.correct_side is not None and self.kind is not DecisionKind.ERROR:
            raise InvalidValueError("Solo «Es un error» indica cuál valor es el correcto.")

    @property
    def marks_real_error(self) -> bool:
        return self.kind is DecisionKind.ERROR
