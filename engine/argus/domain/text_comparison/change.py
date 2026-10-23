"""Un cambio entre dos documentos, enlazado a los segmentos de origen de cada lado."""

from dataclasses import dataclass
from enum import StrEnum

from argus.domain.errors import InvalidValueError
from argus.domain.risk import RiskLevel
from argus.domain.text_comparison.meaning import MeaningSuggestion
from argus.domain.text_comparison.segment import Segment
from argus.domain.text_comparison.text_diff import WordEdit


class ChangeKind(StrEnum):
    ADDED = "added"
    REMOVED = "removed"
    MODIFIED = "modified"
    MOVED = "moved"


class Materiality(StrEnum):
    """Qué toca el cambio; decide su riesgo (reglas de `materiality`)."""

    AMOUNT = "amount"
    DATE = "date"
    NUMBER = "number"
    PARTY = "party"
    NEGATION = "negation"
    WORDING = "wording"
    # Cambios de forma: el texto dice lo mismo (la pantalla Comparar permite ocultarlos).
    CASE = "case"
    PUNCTUATION = "punctuation"
    FORMAT = "format"


# Qué lado debe existir según el tipo de cambio: (primer documento, segundo documento).
_SIDES_BY_KIND = {
    ChangeKind.ADDED: (False, True),
    ChangeKind.REMOVED: (True, False),
    ChangeKind.MODIFIED: (True, True),
    ChangeKind.MOVED: (True, True),
}


@dataclass(frozen=True)
class Change:
    kind: ChangeKind
    risk: RiskLevel
    materialities: tuple[Materiality, ...]
    first: Segment | None
    second: Segment | None
    edits: tuple[WordEdit, ...]
    # Un segmento modificado también puede haber cambiado de lugar.
    is_moved: bool
    # Sugerencia «reformulado» o «cambio de sentido»; None si no hay nada que sugerir.
    meaning: MeaningSuggestion | None = None

    def __post_init__(self) -> None:
        sides = (self.first is not None, self.second is not None)
        if sides != _SIDES_BY_KIND[self.kind]:
            raise InvalidValueError(f"Un cambio «{self.kind}» no puede tener esos segmentos.")
