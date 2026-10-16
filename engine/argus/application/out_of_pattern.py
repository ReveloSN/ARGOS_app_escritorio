"""Valores fuera del patrón del conjunto de documentos (CLAUDE.md §8, capa 4).

Se buscan solo dos anomalías concretas, porque una regla amplia («un monto muy distinto del
resto») alertaría conceptos legítimamente diferentes, como el canon y la multa.
"""

import statistics
from collections.abc import Iterable, Iterator
from datetime import date
from itertools import combinations

from argus.application.alert_candidates import majority_first
from argus.application.review_analyzers import AnalysisContext
from argus.domain.alert import Alert, AlertCandidate, AlertSide
from argus.domain.comparison.difference import Difference, DifferenceKind
from argus.domain.entity import EntityType
from argus.domain.entity_index import EntityIndex
from argus.domain.risk_rules import RiskClassifier

# Una fecha a una década o más del resto, con el mismo día y mes que otra, suele ser un año
# mal digitado («01/07/2062» por «01/07/2026»).
YEAR_GAP = 10
MIN_DATES_FOR_PATTERN = 3
DATE_OUTLIER_CONFIDENCE = 0.7
# El mismo monto con otra escala («18.450.000» frente a «184.500.000»): un cero de más o de menos.
SCALE_FACTORS = frozenset({10, 100, 1000})
# Con menos cifras significativas, montos redondos como 1.000.000 y 10.000.000 son conceptos
# distintos con frecuencia; con 3 o más, la coincidencia de cifras ya no es casual.
MIN_SIGNIFICANT_DIGITS = 3
MAGNITUDE_CONFIDENCE = 0.8
CURRENCY_SEPARATOR = ":"


def _candidate(
    index: EntityIndex, entity_type: EntityType, values: tuple[str, str]
) -> AlertCandidate:
    first, second = (AlertSide(index.entities_with(entity_type, value)) for value in values)
    kind, confidence = (
        (DifferenceKind.MAGNITUDE, MAGNITUDE_CONFIDENCE)
        if entity_type is EntityType.MONEY
        else (DifferenceKind.OUT_OF_PATTERN, DATE_OUTLIER_CONFIDENCE)
    )
    return AlertCandidate(*majority_first(first, second), Difference(kind, confidence))


def _classified(
    candidates: Iterable[AlertCandidate], classifier: RiskClassifier
) -> Iterator[Alert]:
    for candidate in candidates:
        risk = classifier.classify(candidate)
        if risk is not None:
            yield Alert.from_candidate(candidate, risk)


def outlier_date_pairs(values: Iterable[str]) -> Iterator[tuple[str, str]]:
    """Pares (fecha fuera del patrón, fecha típica con el mismo día y mes)."""
    dates = [date.fromisoformat(value) for value in sorted(values)]
    if len(dates) < MIN_DATES_FOR_PATTERN:
        return
    median_year = statistics.median_low(day.year for day in dates)
    typical = [day for day in dates if abs(day.year - median_year) < YEAR_GAP]
    for outlier in (day for day in dates if abs(day.year - median_year) >= YEAR_GAP):
        twins = [day for day in typical if (day.month, day.day) == (outlier.month, outlier.day)]
        yield from ((outlier.isoformat(), twin.isoformat()) for twin in twins[:1])


class DateOutlierSource:
    def __init__(self, risk_classifier: RiskClassifier) -> None:
        self._risk_classifier = risk_classifier

    def find(self, context: AnalysisContext) -> Iterable[Alert]:
        index = context.index
        pairs = outlier_date_pairs(index.values_of(EntityType.DATE))
        candidates = (_candidate(index, EntityType.DATE, pair) for pair in pairs)
        return _classified(candidates, self._risk_classifier)


def _significant_digits(amount: str) -> str:
    return amount.split(".", maxsplit=1)[0].rstrip("0")


def is_rescaled(first: str, second: str) -> bool:
    """Mismo monto en otra escala: igual moneda y cifras, y un factor de 10, 100 o 1000."""
    first_currency, first_amount = first.split(CURRENCY_SEPARATOR, maxsplit=1)
    second_currency, second_amount = second.split(CURRENCY_SEPARATOR, maxsplit=1)
    small, large = sorted((float(first_amount), float(second_amount)))
    digits = _significant_digits(first_amount)
    return (
        first_currency == second_currency
        and small > 0
        and len(digits) >= MIN_SIGNIFICANT_DIGITS
        and digits == _significant_digits(second_amount)
        and round(large / small) in SCALE_FACTORS
        and large == small * round(large / small)
    )


class AmountScaleSource:
    def __init__(self, risk_classifier: RiskClassifier) -> None:
        self._risk_classifier = risk_classifier

    def find(self, context: AnalysisContext) -> Iterable[Alert]:
        index = context.index
        values = sorted(index.values_of(EntityType.MONEY))
        pairs = (pair for pair in combinations(values, 2) if is_rescaled(*pair))
        candidates = (_candidate(index, EntityType.MONEY, pair) for pair in pairs)
        return _classified(candidates, self._risk_classifier)
