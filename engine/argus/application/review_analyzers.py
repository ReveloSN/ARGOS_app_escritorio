"""Analizadores de la revisión: qué alertas salen de los documentos según los ajustes."""

from collections.abc import Callable, Iterable, Sequence
from dataclasses import dataclass
from typing import Protocol

from argus.application.detect_inconsistencies import DetectInconsistencies
from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.ports.preferences import PreferencesRepository, SuppressionRuleRepository
from argus.domain.alert import Alert
from argus.domain.alert_queue import AlertQueue
from argus.domain.document import Document
from argus.domain.entity import EntityType
from argus.domain.entity_index import EntityIndex
from argus.domain.preferences import UserPreferences
from argus.domain.sensitivity import Sensitivity

type DetectorFactory = Callable[[Sensitivity], DetectInconsistencies]
type AlertKey = tuple[EntityType, frozenset[str]]


class ReviewAnalyzer(Protocol):
    def analyze(self, documents: Sequence[Document]) -> tuple[Alert, ...]: ...


@dataclass(frozen=True)
class AnalysisContext:
    """Lo que necesita cada fuente de alertas: los documentos, sus entidades y los ajustes."""

    documents: tuple[Document, ...]
    index: EntityIndex
    preferences: UserPreferences


class AlertSource(Protocol):
    """Una forma de encontrar alertas (Strategy): reglas y distancia, semántica o anomalías."""

    def find(self, context: AnalysisContext) -> Iterable[Alert]: ...


class InconsistencySource:
    """Capa determinista: valores parecidos que difieren, con la sensibilidad elegida."""

    def __init__(self, detector_for: DetectorFactory) -> None:
        self._detector_for = detector_for

    def find(self, context: AnalysisContext) -> Iterable[Alert]:
        return self._detector_for(context.preferences.sensitivity).execute(context.index)


def rank_alerts(alerts: Iterable[Alert]) -> tuple[Alert, ...]:
    """Primero el riesgo, luego la confianza (cola de prioridad, CLAUDE.md §6)."""
    return AlertQueue(alerts).drain()


def _alert_key(alert: Alert) -> AlertKey:
    return alert.entity_type, frozenset(
        {alert.first.normalized_value, alert.second.normalized_value}
    )


def unique_alerts(alerts: Iterable[Alert]) -> Iterable[Alert]:
    """Un mismo par de valores se alerta una vez, aunque lo encuentren varias fuentes."""
    seen: set[AlertKey] = set()
    for alert in alerts:
        if _alert_key(alert) not in seen:
            seen.add(_alert_key(alert))
            yield alert


class EntityReviewAnalyzer:
    """Extrae las entidades una vez y reúne las alertas de cada fuente con los ajustes vigentes.

    Lee los ajustes en cada revisión: un cambio en Ajustes vale desde la siguiente revisión.
    """

    def __init__(
        self,
        pipeline: EntityExtractionPipeline,
        sources: Sequence[AlertSource],
        preferences: PreferencesRepository,
    ) -> None:
        self._pipeline = pipeline
        self._sources = tuple(sources)
        self._preferences = preferences

    def analyze(self, documents: Sequence[Document]) -> tuple[Alert, ...]:
        preferences = self._preferences.get()
        index = self._pipeline.build_index(documents)
        context = AnalysisContext(tuple(documents), index, preferences)
        found = (alert for source in self._sources for alert in source.find(context))
        return rank_alerts(
            alert for alert in unique_alerts(found) if preferences.compares(alert.entity_type)
        )


class SuppressingReviewAnalyzer:
    """Decorator: quita las alertas de los casos marcados con «No alertar casos similares»."""

    def __init__(self, analyzer: ReviewAnalyzer, rules: SuppressionRuleRepository) -> None:
        self._analyzer = analyzer
        self._rules = rules

    def analyze(self, documents: Sequence[Document]) -> tuple[Alert, ...]:
        cases = [rule.case for rule in self._rules.list_all()]
        return tuple(
            alert
            for alert in self._analyzer.analyze(documents)
            if not any(case.matches(alert) for case in cases)
        )
