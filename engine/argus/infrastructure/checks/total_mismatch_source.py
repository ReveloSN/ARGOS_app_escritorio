import re
from collections.abc import Iterator, Mapping
from decimal import Decimal

from argus.application.review_analyzers import AnalysisContext
from argus.domain.alert import Alert
from argus.domain.comparison.difference import Difference, DifferenceKind
from argus.domain.entity import Entity, EntityType, Occurrence
from argus.domain.risk_rules import RiskClassifier
from argus.domain.values import DEFAULT_CURRENCY
from argus.infrastructure.checks.checked_values import (
    CheckedValue,
    FoundPair,
    TextSpan,
    entity_in,
    fragments_of,
    paired_alert,
)
from argus.infrastructure.checks.table_grid import GridCell, cell_amount, grids_of, range_location
from argus.infrastructure.extraction.normalization import format_decimal

# «Total», «TOTAL GENERAL»; no «Subtotal», que suma solo una parte.
TOTAL_LABEL = re.compile(r"^\s*total\b", re.IGNORECASE)
# Con un solo valor encima no hay suma que verificar.
MIN_ADDENDS = 2
# Un total que no suma sus celdas puede venir de una fórmula con el rango equivocado.
TOTAL_MISMATCH_CONFIDENCE = 0.9
SUM_SEPARATOR = " + "

type Grid = Mapping[tuple[int, int], GridCell]


def _money(amount: Decimal) -> str:
    return f"{DEFAULT_CURRENCY}:{format_decimal(amount)}"


def addends_above(grid: Grid, total: GridCell) -> list[GridCell]:
    """Las celdas con número justo encima del total, hasta la primera que no lo tiene."""
    addends: list[GridCell] = []
    cell = grid.get((total.row - 1, total.column))
    while cell is not None and cell_amount(cell.text) is not None:
        addends.append(cell)
        cell = grid.get((cell.row - 1, cell.column))
    return list(reversed(addends))


def _sum_entity(addends: list[GridCell], amount: Decimal) -> Entity:
    """La suma de las celdas, con el rango como origen y los sumandos como fragmento."""
    first, last = addends[0], addends[-1]
    excerpt = SUM_SEPARATOR.join(cell.text for cell in addends)
    occurrence = Occurrence(first.named.document_name, range_location(first, last), excerpt)
    return Entity(EntityType.MONEY, format_decimal(amount), _money(amount), occurrence)


def _total_cells(grid: Grid) -> Iterator[GridCell]:
    """Las celdas con número a la derecha de una etiqueta «Total» en la misma fila."""
    for label in (cell for cell in grid.values() if TOTAL_LABEL.match(cell.text)):
        yield from (
            cell
            for cell in grid.values()
            if cell.row == label.row
            and cell.column > label.column
            and cell_amount(cell.text) is not None
        )


class TotalMismatchSource:
    """Verificación interna: en una hoja o tabla, el «Total» debe ser la suma de las celdas de arriba."""

    def __init__(self, classifier: RiskClassifier) -> None:
        self._classifier = classifier

    def find(self, context: AnalysisContext) -> Iterator[Alert]:
        for grid in grids_of(fragments_of(context.documents)):
            found = (self._mismatch(grid, total) for total in _total_cells(grid))
            yield from (alert for alert in found if alert is not None)

    def _mismatch(self, grid: Grid, total: GridCell) -> Alert | None:
        addends = addends_above(grid, total)
        written = cell_amount(total.text)
        if written is None or len(addends) < MIN_ADDENDS:
            return None
        computed = sum((cell_amount(cell.text) or Decimal(0) for cell in addends), Decimal(0))
        if computed == written:
            return None
        value = CheckedValue(EntityType.MONEY, total.text, _money(written))
        total_entity = entity_in(total.named, TextSpan(0, len(total.named.fragment.text)), value)
        difference = Difference(DifferenceKind.TOTAL_MISMATCH, TOTAL_MISMATCH_CONFIDENCE)
        pair = FoundPair(total_entity, _sum_entity(addends, computed), difference)
        return paired_alert(pair, self._classifier)
