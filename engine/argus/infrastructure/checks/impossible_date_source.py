import re
from collections import defaultdict
from collections.abc import Iterator

from argus.application.review_analyzers import AnalysisContext
from argus.domain.alert import Alert, AlertSide
from argus.domain.comparison.difference import Difference, DifferenceKind
from argus.domain.document import NamedFragment
from argus.domain.entity import Entity, EntityType
from argus.domain.risk_rules import RiskClassifier
from argus.infrastructure.checks.checked_values import (
    CheckedValue,
    TextSpan,
    entity_in,
    fragments_of,
    single_alert,
)
from argus.infrastructure.extraction.date_extractor import (
    DAY_MONTH_YEAR,
    LONG_DATE,
    parse_date_match,
)
from argus.infrastructure.extraction.spanish_calendar import month_number

MAX_DAY = 31
MAX_MONTH = 12
# Una fecha con día y mes posibles que no existe en el calendario no admite otra lectura.
IMPOSSIBLE_DATE_CONFIDENCE = 0.99


def _looks_like_a_date(match: re.Match[str]) -> bool:
    """Día y mes dentro de rango («31/02»), no un código cualquiera («45/77/2026»)."""
    return (
        1 <= int(match.group("day")) <= MAX_DAY
        and 1 <= month_number(match.group("month")) <= MAX_MONTH
    )


def is_impossible_date(match: re.Match[str]) -> bool:
    return _looks_like_a_date(match) and parse_date_match(match) is None


class ImpossibleDateSource:
    """Verificación interna: una fecha que no existe (31/02/2026, 30 de febrero de 2026).

    El extractor de fechas no la toma como fecha; aquí se reúne con todas sus apariciones.
    """

    def __init__(self, classifier: RiskClassifier) -> None:
        self._classifier = classifier

    def find(self, context: AnalysisContext) -> Iterator[Alert]:
        difference = Difference(DifferenceKind.IMPOSSIBLE_DATE, IMPOSSIBLE_DATE_CONFIDENCE)
        for entities in self._by_written_form(context).values():
            alert = single_alert(AlertSide(tuple(entities)), difference, self._classifier)
            if alert is not None:
                yield alert

    def _by_written_form(self, context: AnalysisContext) -> dict[str, list[Entity]]:
        found: defaultdict[str, list[Entity]] = defaultdict(list)
        for named in fragments_of(context.documents):
            for entity in _impossible_dates_in(named):
                found[entity.raw_value].append(entity)
        return found


def _impossible_dates_in(named: NamedFragment) -> Iterator[Entity]:
    for pattern in (DAY_MONTH_YEAR, LONG_DATE):
        for match in filter(is_impossible_date, pattern.finditer(named.fragment.text)):
            value = CheckedValue(EntityType.DATE, match.group(), match.group())
            yield entity_in(named, TextSpan(match.start(), match.end()), value)
