"""Si un cambio solo dice lo mismo con otras palabras o cambia lo que el texto significa.

Es una sugerencia con su confianza: la pantalla la muestra como «IA: Reformulado» o «IA: Cambio
de sentido» y la decisión sigue siendo del usuario (CLAUDE.md §8).
"""

from dataclasses import dataclass
from enum import StrEnum

from argus.domain.errors import InvalidValueError


class ChangeMeaning(StrEnum):
    REWORDED = "reworded"
    MEANING_CHANGE = "meaning_change"


@dataclass(frozen=True)
class MeaningSuggestion:
    meaning: ChangeMeaning
    confidence: float

    def __post_init__(self) -> None:
        if not 0 <= self.confidence <= 1:
            raise InvalidValueError(f"La confianza debe estar entre 0 y 1: {self.confidence}.")
