"""Dónde está un fragmento dentro de su archivo (CLAUDE.md §7: nunca un valor sin su origen).

Cada formato tiene su propia forma de ubicar el texto; por eso son tipos distintos y no un
registro con campos opcionales. Las posiciones son base 1, como las ve el usuario.
"""

from dataclasses import dataclass
from enum import StrEnum

from argus.domain.validation import require_positive, require_text


@dataclass(frozen=True)
class PageLocation:
    page: int

    def __post_init__(self) -> None:
        require_positive("La página", self.page)


@dataclass(frozen=True)
class ParagraphLocation:
    paragraph: int

    def __post_init__(self) -> None:
        require_positive("El párrafo", self.paragraph)


@dataclass(frozen=True)
class TableCellLocation:
    table: int
    row: int
    column: int

    def __post_init__(self) -> None:
        require_positive("La tabla", self.table)
        require_positive("La fila", self.row)
        require_positive("La columna", self.column)


@dataclass(frozen=True)
class SheetCellLocation:
    sheet: str
    cell: str

    def __post_init__(self) -> None:
        require_text("La hoja", self.sheet)
        require_text("La celda", self.cell)


class EmailPart(StrEnum):
    SUBJECT = "subject"
    BODY = "body"


@dataclass(frozen=True)
class EmailPartLocation:
    part: EmailPart


@dataclass(frozen=True)
class LineLocation:
    line: int

    def __post_init__(self) -> None:
        require_positive("La línea", self.line)


type SourceLocation = (
    PageLocation
    | ParagraphLocation
    | TableCellLocation
    | SheetCellLocation
    | EmailPartLocation
    | LineLocation
)
