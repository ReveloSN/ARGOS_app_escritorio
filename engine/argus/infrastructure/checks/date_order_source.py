import re
from collections import defaultdict
from collections.abc import Iterator

from argus.application.ports.entity_extractor import EntityMatch
from argus.application.review_analyzers import AnalysisContext
from argus.domain.alert import Alert
from argus.domain.comparison.difference import Difference, DifferenceKind
from argus.domain.document import NamedFragment
from argus.domain.entity import Entity
from argus.domain.risk_rules import RiskClassifier
from argus.infrastructure.checks.checked_values import (
    CheckedValue,
    FoundPair,
    TextSpan,
    entity_in,
    fragments_of,
    paired_alert,
)
from argus.infrastructure.extraction.date_extractor import DateExtractor

START_LABEL = re.compile(
    r"\b(?:inicio|iniciaci[óo]n|comienzo|a\s+partir\s+del?|desde\s+el)\b", re.IGNORECASE
)
END_LABEL = re.compile(
    r"\b(?:terminaci[óo]n|finalizaci[óo]n|vencimiento|fin|hasta\s+el)\b", re.IGNORECASE
)
# La fecha debe estar cerca de su etiqueta: «fecha de inicio: 1 de julio de 2026».
LABEL_REACH = 60
# Inicio después del fin puede ser un error de digitación o una prórroga mal redactada.
DATE_ORDER_CONFIDENCE = 0.9


def labeled_date(named: NamedFragment, label: re.Pattern[str]) -> Entity | None:
    """La primera fecha que sigue a la etiqueta dentro del mismo fragmento."""
    text = named.fragment.text
    for found in label.finditer(text):
        window = text[found.end() : found.end() + LABEL_REACH]
        match = next(iter(DateExtractor().extract(window)), None)
        if match is not None:
            return _entity(named, match, found.end())
    return None


def _entity(named: NamedFragment, match: EntityMatch, offset: int) -> Entity:
    value = CheckedValue(match.type, match.raw_value, match.normalized_value)
    return entity_in(named, TextSpan(offset + match.start, offset + match.end), value)


def _first(fragments: list[NamedFragment], label: re.Pattern[str]) -> Entity | None:
    dates = (labeled_date(named, label) for named in fragments)
    return next((date for date in dates if date is not None), None)


class DateOrderSource:
    """Verificación interna: en un mismo documento, la fecha de fin no va antes que la de inicio."""

    def __init__(self, classifier: RiskClassifier) -> None:
        self._classifier = classifier

    def find(self, context: AnalysisContext) -> Iterator[Alert]:
        by_document: defaultdict[str, list[NamedFragment]] = defaultdict(list)
        for named in fragments_of(context.documents):
            by_document[named.document_name].append(named)
        for fragments in by_document.values():
            alert = self._out_of_order(fragments)
            if alert is not None:
                yield alert

    def _out_of_order(self, fragments: list[NamedFragment]) -> Alert | None:
        start, end = _first(fragments, START_LABEL), _first(fragments, END_LABEL)
        # Las fechas normalizadas son ISO 8601: comparar el texto es comparar las fechas.
        if start is None or end is None or end.normalized_value >= start.normalized_value:
            return None
        difference = Difference(DifferenceKind.DATE_ORDER, DATE_ORDER_CONFIDENCE)
        return paired_alert(FoundPair(start, end, difference), self._classifier)
