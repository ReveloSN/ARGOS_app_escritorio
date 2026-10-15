from dataclasses import dataclass
from enum import StrEnum
from typing import Protocol

from argus.domain.errors import InvalidValueError


class DifferenceKind(StrEnum):
    TRANSPOSITION = "transposition"
    CHARACTER_CHANGE = "character_change"
    DATE_COMPONENT = "date_component"
    DAY_MONTH_SWAP = "day_month_swap"
    SIMILAR_NAME = "similar_name"
    FORMAT_ONLY = "format_only"


@dataclass(frozen=True)
class Difference:
    """Cómo difieren dos valores y qué tan probable es que sea un error y no dos datos distintos.

    `positions` (base 1) señala los caracteres distintos cuando ambos valores miden lo mismo; la
    interfaz los resalta y la explicación los menciona («posiciones 2 y 3 intercambiadas»).
    """

    kind: DifferenceKind
    confidence: float
    positions: tuple[int, ...] = ()

    def __post_init__(self) -> None:
        if not 0 <= self.confidence <= 1:
            raise InvalidValueError(f"La confianza debe estar entre 0 y 1: {self.confidence}.")


class ValueComparator(Protocol):
    """Strategy: compara dos valores normalizados de un mismo tipo de entidad."""

    def candidate_radius(self, value: str) -> int:
        """Distancia de edición máxima a la que puede estar un valor comparable (para el BK-tree)."""
        ...

    def compare(self, first: str, second: str) -> Difference | None:
        """Diferencia sospechosa entre los valores, o None si son iguales o no se relacionan."""
        ...
