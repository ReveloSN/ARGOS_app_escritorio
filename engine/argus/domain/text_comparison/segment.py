"""Segmento: la unidad que se alinea y compara entre dos documentos, siempre con su origen."""

import hashlib
from dataclasses import dataclass
from enum import StrEnum
from functools import cached_property

from argus.domain.errors import InvalidValueError
from argus.domain.locations import SourceLocation
from argus.domain.validation import require_positive, require_text


class SegmentKind(StrEnum):
    PARAGRAPH = "paragraph"
    CLAUSE = "clause"
    TABLE_ROW = "table_row"


@dataclass(frozen=True)
class TextSpan:
    """Tramo [start, end) de un texto, en caracteres desde 0."""

    start: int
    end: int

    def __post_init__(self) -> None:
        if not 0 <= self.start < self.end:
            raise InvalidValueError(f"Tramo de texto inválido: {self.start}-{self.end}.")


@dataclass(frozen=True)
class SegmentOrigin:
    """Archivo, ubicación y tramo del fragmento leído (CLAUDE.md §7: nunca sin su origen).

    Una fila de tabla reúne varias celdas: no tiene un tramo único y se ubica por su primera
    celda, que ya indica la tabla (u hoja) y la fila.
    """

    document_name: str
    location: SourceLocation
    span: TextSpan | None


def normalize_for_comparison(text: str) -> str:
    """Sin mayúsculas ni espacios repetidos: así cambiar el formato no es cambiar el texto."""
    return " ".join(text.casefold().split())


@dataclass(frozen=True)
class Segment:
    position: int
    kind: SegmentKind
    text: str
    origin: SegmentOrigin

    def __post_init__(self) -> None:
        require_positive("La posición del segmento", self.position)
        require_text("El segmento", self.text)

    @cached_property
    def fingerprint(self) -> str:
        """Huella del texto normalizado: dos segmentos con la misma huella dicen lo mismo."""
        normalized = normalize_for_comparison(self.text).encode("utf-8")
        return hashlib.sha256(normalized).hexdigest()
