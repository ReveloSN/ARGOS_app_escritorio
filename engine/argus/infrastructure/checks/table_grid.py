"""Celdas de hojas de cálculo y tablas de Word ordenadas por fila y columna."""

import re
from collections import defaultdict
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

from openpyxl.utils.cell import (
    column_index_from_string,
    coordinate_from_string,
    get_column_letter,
)

from argus.domain.document import NamedFragment
from argus.domain.locations import SheetCellLocation, SourceLocation, TableCellLocation
from argus.infrastructure.extraction.normalization import parse_colombian_number

# «18.450.000» o «18.450.000,50» (es-CO); «18450000.5» es el número tal como lo guarda Excel.
COLOMBIAN_AMOUNT = re.compile(r"\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+,\d{1,2}")
PLAIN_NUMBER = re.compile(r"-?\d+(?:\.\d+)?")
CURRENCY_MARKS = re.compile(r"\$|\bCOP\b", re.IGNORECASE)

type GridKey = tuple[str, str]


@dataclass(frozen=True)
class GridCell:
    """Una celda con su posición (base 1) dentro de su hoja o tabla, y su fragmento."""

    row: int
    column: int
    named: NamedFragment

    @property
    def text(self) -> str:
        return self.named.fragment.text.strip()


def cell_amount(text: str) -> Decimal | None:
    """El número de la celda, con o sin el símbolo de la moneda; None si no es un número."""
    bare = CURRENCY_MARKS.sub("", text).strip()
    try:
        if COLOMBIAN_AMOUNT.fullmatch(bare):
            return parse_colombian_number(bare)
        return Decimal(bare) if PLAIN_NUMBER.fullmatch(bare) else None
    except InvalidOperation:
        return None


def _position(location: SourceLocation) -> tuple[str, int, int] | None:
    if isinstance(location, SheetCellLocation):
        letters, row = coordinate_from_string(location.cell)
        return f"hoja:{location.sheet}", row, column_index_from_string(letters)
    if isinstance(location, TableCellLocation):
        return f"tabla:{location.table}", location.row, location.column
    return None


def grids_of(fragments: Iterable[NamedFragment]) -> Iterator[dict[tuple[int, int], GridCell]]:
    """Cada hoja o tabla de cada documento, como un mapa (fila, columna) → celda."""
    grids: defaultdict[GridKey, dict[tuple[int, int], GridCell]] = defaultdict(dict)
    for named in fragments:
        position = _position(named.fragment.location)
        if position is not None:
            grid, row, column = position
            grids[(named.document_name, grid)][(row, column)] = GridCell(row, column, named)
    yield from grids.values()


def range_location(first: GridCell, last: GridCell) -> SourceLocation:
    """Dónde están las celdas sumadas: «C2:C11» en una hoja; la primera celda en una tabla."""
    location = first.named.fragment.location
    if isinstance(location, SheetCellLocation):
        letter = get_column_letter(first.column)
        return SheetCellLocation(location.sheet, f"{letter}{first.row}:{letter}{last.row}")
    return location
