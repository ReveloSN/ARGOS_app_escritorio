from collections.abc import Iterable
from dataclasses import replace

from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.feedback_confidence import FeedbackAdjustingReviewAnalyzer, with_feedback
from argus.application.review_analyzers import (
    AnalysisContext,
    EntityReviewAnalyzer,
    rank_alerts,
    unique_alerts,
)
from argus.domain.alert import Alert
from argus.domain.comparison.difference import Difference, DifferenceKind
from argus.domain.document import Document
from argus.domain.entity import EntityType
from argus.domain.feedback import FeedbackCount, FeedbackCounts
from argus.domain.preferences import ComparedCategory, UserPreferences
from argus.domain.risk import RiskLevel
from tests.application.in_memory_repositories import InMemoryPreferencesRepository
from tests.domain.alert_builders import candidate

CONTRACT = Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH)
NAME = Alert.from_candidate(candidate(EntityType.PERSON_NAME, confidence=0.8), RiskLevel.MEDIUM)
MONEY = Alert.from_candidate(candidate(EntityType.MONEY, confidence=0.7), RiskLevel.HIGH)


class FixedSource:
    def __init__(self, *alerts: Alert) -> None:
        self.alerts = alerts
        self.contexts: list[AnalysisContext] = []

    def find(self, context: AnalysisContext) -> Iterable[Alert]:
        self.contexts.append(context)
        return self.alerts


class FixedAnalyzer:
    def __init__(self, *alerts: Alert) -> None:
        self.alerts = alerts

    def analyze(self, documents: object) -> tuple[Alert, ...]:
        return self.alerts


class FixedStatistics:
    def __init__(self, counts: FeedbackCounts) -> None:
        self.counts = counts

    def counts_by_kind(self) -> FeedbackCounts:
        return self.counts


def test_sources_share_one_context_and_results_are_ranked_without_repeats() -> None:
    first, second = FixedSource(NAME, CONTRACT), FixedSource(CONTRACT, MONEY)
    analyzer = EntityReviewAnalyzer(
        EntityExtractionPipeline([]), [first, second], InMemoryPreferencesRepository()
    )
    documents: list[Document] = []

    alerts = analyzer.analyze(documents)

    assert alerts == (CONTRACT, MONEY, NAME)
    assert first.contexts == second.contexts


def test_types_that_are_not_compared_are_left_out() -> None:
    preferences = InMemoryPreferencesRepository(
        UserPreferences(compared_categories=frozenset({ComparedCategory.NAMES}))
    )
    analyzer = EntityReviewAnalyzer(
        EntityExtractionPipeline([]), [FixedSource(CONTRACT, NAME)], preferences
    )

    assert analyzer.analyze([]) == (NAME,)


def test_the_same_pair_found_twice_counts_once_in_either_order() -> None:
    swapped = Alert(CONTRACT.second, CONTRACT.first, CONTRACT.difference, CONTRACT.risk)

    assert list(unique_alerts([CONTRACT, swapped, MONEY])) == [CONTRACT, MONEY]


def test_feedback_moves_the_confidence_and_reorders_within_a_risk() -> None:
    dismissed_contracts = {
        (EntityType.CONTRACT_ID, DifferenceKind.TRANSPOSITION): FeedbackCount(0, 12)
    }
    analyzer = FeedbackAdjustingReviewAnalyzer(
        FixedAnalyzer(CONTRACT, MONEY), FixedStatistics(dismissed_contracts)
    )

    adjusted = analyzer.analyze([])

    assert [alert.entity_type for alert in adjusted] == [EntityType.MONEY, EntityType.CONTRACT_ID]
    assert adjusted[1].confidence == 0.24
    assert adjusted[1].risk is RiskLevel.HIGH


def test_alerts_without_feedback_keep_their_confidence() -> None:
    assert with_feedback(MONEY, {}) == MONEY


def test_ranking_puts_risk_before_confidence() -> None:
    low_confidence_high = replace(
        CONTRACT, difference=Difference(DifferenceKind.TRANSPOSITION, 0.1)
    )

    assert rank_alerts([NAME, low_confidence_high]) == (low_confidence_high, NAME)
