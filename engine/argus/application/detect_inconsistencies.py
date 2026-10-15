from collections.abc import Iterator, Mapping

from argus.application.alert_candidates import (
    format_difference_candidates,
    similar_value_candidates,
)
from argus.domain.alert import Alert, AlertCandidate
from argus.domain.alert_queue import AlertQueue
from argus.domain.comparison.difference import ValueComparator
from argus.domain.entity import EntityType
from argus.domain.entity_index import EntityIndex
from argus.domain.risk_rules import RiskClassifier


class DetectInconsistencies:
    """Caso de uso: del índice de entidades a las alertas ordenadas por riesgo y confianza.

    Para cada tipo de entidad busca valores parecidos con su comparador (Strategy), clasifica
    cada par con las reglas de riesgo (Specification) y ordena el resultado con una cola de
    prioridad. Solo cruza valores que aparecen en documentos distintos.
    """

    def __init__(
        self,
        comparators: Mapping[EntityType, ValueComparator],
        risk_classifier: RiskClassifier,
        reports_format_differences: bool,
    ) -> None:
        self._comparators = dict(comparators)
        self._risk_classifier = risk_classifier
        self._reports_format_differences = reports_format_differences

    def execute(self, index: EntityIndex) -> tuple[Alert, ...]:
        queue = AlertQueue()
        for candidate in self._candidates(index):
            risk = self._risk_classifier.classify(candidate)
            if risk is not None:
                queue.push(Alert.from_candidate(candidate, risk))
        return queue.drain()

    def _candidates(self, index: EntityIndex) -> Iterator[AlertCandidate]:
        for entity_type in EntityType:
            comparator = self._comparators.get(entity_type)
            if comparator is not None:
                yield from similar_value_candidates(index, entity_type, comparator)
            if self._reports_format_differences:
                yield from format_difference_candidates(index, entity_type)
