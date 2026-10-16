from collections.abc import Sequence
from dataclasses import replace
from typing import Protocol

from argus.application.review_analyzers import ReviewAnalyzer, rank_alerts
from argus.domain.alert import Alert
from argus.domain.document import Document
from argus.domain.feedback import NO_FEEDBACK, FeedbackCounts, adjusted_confidence


class DecisionStatistics(Protocol):
    def counts_by_kind(self) -> FeedbackCounts:
        """Decisiones del historial agrupadas por tipo de dato y tipo de diferencia."""
        ...


def with_feedback(alert: Alert, counts: FeedbackCounts) -> Alert:
    feedback = counts.get((alert.entity_type, alert.difference.kind), NO_FEEDBACK)
    confidence = adjusted_confidence(alert.difference.confidence, feedback)
    return replace(alert, difference=replace(alert.difference, confidence=confidence))


class FeedbackAdjustingReviewAnalyzer:
    """Decorator: ajusta la confianza con las decisiones anteriores y vuelve a ordenar."""

    def __init__(self, analyzer: ReviewAnalyzer, statistics: DecisionStatistics) -> None:
        self._analyzer = analyzer
        self._statistics = statistics

    def analyze(self, documents: Sequence[Document]) -> tuple[Alert, ...]:
        counts = self._statistics.counts_by_kind()
        return rank_alerts(
            with_feedback(alert, counts) for alert in self._analyzer.analyze(documents)
        )
