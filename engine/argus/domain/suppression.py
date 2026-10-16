from dataclasses import dataclass
from datetime import datetime

from argus.domain.alert import Alert
from argus.domain.entity import EntityType
from argus.domain.validation import require_text, require_time_zone


@dataclass(frozen=True)
class SuppressedCase:
    """Par de valores que el usuario indicó que no debe generar alerta («No alertar casos
    similares»). Los valores normalizados se guardan en orden fijo: A = B es lo mismo que B = A.
    """

    entity_type: EntityType
    first_value: str
    second_value: str
    first_label: str
    second_label: str

    def __post_init__(self) -> None:
        require_text("El primer valor", self.first_value)
        require_text("El segundo valor", self.second_value)

    @classmethod
    def from_alert(cls, alert: Alert) -> "SuppressedCase":
        first, second = sorted([alert.first, alert.second], key=lambda side: side.normalized_value)
        return cls(
            alert.entity_type,
            first.normalized_value,
            second.normalized_value,
            first.representative.raw_value,
            second.representative.raw_value,
        )

    def matches(self, alert: Alert) -> bool:
        values = {alert.first.normalized_value, alert.second.normalized_value}
        return alert.entity_type is self.entity_type and values == {
            self.first_value,
            self.second_value,
        }


@dataclass(frozen=True)
class SuppressionRule:
    id: int
    case: SuppressedCase
    created_at: datetime

    def __post_init__(self) -> None:
        require_time_zone("La fecha de la regla", self.created_at)
