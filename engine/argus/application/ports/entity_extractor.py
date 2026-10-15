from collections.abc import Iterable
from dataclasses import dataclass
from typing import Protocol

from argus.domain.entity import EntityType


@dataclass(frozen=True)
class EntityMatch:
    """Valor reconocido dentro de un texto; `start` y `end` delimitan todo lo que reconoció.

    El tramo incluye la etiqueta («Contrato No. 4857»), no solo el valor, para que ningún otro
    extractor vuelva a leer esa etiqueta como un valor distinto.
    """

    type: EntityType
    raw_value: str
    normalized_value: str
    start: int
    end: int

    def overlaps(self, other: "EntityMatch") -> bool:
        return self.start < other.end and other.start < self.end


class EntityExtractor(Protocol):
    def extract(self, text: str) -> Iterable[EntityMatch]:
        """Reconoce los valores de su tipo en el texto; no lanza si no encuentra ninguno."""
        ...
