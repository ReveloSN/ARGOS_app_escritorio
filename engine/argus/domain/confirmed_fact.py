from dataclasses import dataclass, replace
from datetime import datetime

from argus.domain.entity import EntityType
from argus.domain.validation import require_text, require_time_zone


@dataclass(frozen=True)
class FactValue:
    """Valor que el usuario confirmó: como lo escribió y como se compara con los documentos."""

    entity_type: EntityType
    raw_value: str
    normalized_value: str

    def __post_init__(self) -> None:
        require_text("El valor confirmado", self.raw_value)
        require_text("El valor normalizado", self.normalized_value)


@dataclass(frozen=True)
class FactDraft:
    """Un dato nuevo del expediente antes de guardarlo («Número de contrato» = 4857)."""

    label: str
    value: FactValue

    def __post_init__(self) -> None:
        require_text("El nombre del dato", self.label)


@dataclass(frozen=True)
class ConfirmedFact:
    """Dato del expediente que el usuario confirmó: la fuente de verdad de la revisión.

    Retirarlo no lo borra: deja de compararse y se puede restaurar (mockup Expediente).
    """

    id: int
    label: str
    value: FactValue
    confirmed_at: datetime
    retired_at: datetime | None = None

    def __post_init__(self) -> None:
        require_text("El nombre del dato", self.label)
        require_time_zone("La fecha de confirmación", self.confirmed_at)

    @property
    def is_retired(self) -> bool:
        return self.retired_at is not None

    def with_value(self, value: FactValue, confirmed_at: datetime) -> "ConfirmedFact":
        return replace(self, value=value, confirmed_at=confirmed_at)

    def retired(self, retired_at: datetime) -> "ConfirmedFact":
        return replace(self, retired_at=retired_at)

    def restored(self) -> "ConfirmedFact":
        return replace(self, retired_at=None)
