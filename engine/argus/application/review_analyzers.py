"""Analizadores de la revisión: qué alertas salen de los documentos según los ajustes."""

from collections.abc import Callable, Sequence
from typing import Protocol

from argus.application.detect_inconsistencies import DetectInconsistencies
from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.ports.preferences import PreferencesRepository, SuppressionRuleRepository
from argus.domain.alert import Alert
from argus.domain.document import Document
from argus.domain.sensitivity import Sensitivity

type DetectorFactory = Callable[[Sensitivity], DetectInconsistencies]


class ReviewAnalyzer(Protocol):
    def analyze(self, documents: Sequence[Document]) -> tuple[Alert, ...]: ...


class EntityReviewAnalyzer:
    """Extrae las entidades y detecta inconsistencias con la sensibilidad y los tipos elegidos.

    Lee los ajustes en cada revisión: un cambio en Ajustes vale desde la siguiente revisión.
    """

    def __init__(
        self,
        pipeline: EntityExtractionPipeline,
        detector_for: DetectorFactory,
        preferences: PreferencesRepository,
    ) -> None:
        self._pipeline = pipeline
        self._detector_for = detector_for
        self._preferences = preferences

    def analyze(self, documents: Sequence[Document]) -> tuple[Alert, ...]:
        preferences = self._preferences.get()
        detector = self._detector_for(preferences.sensitivity)
        alerts = detector.execute(self._pipeline.build_index(documents))
        return tuple(alert for alert in alerts if preferences.compares(alert.entity_type))


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
