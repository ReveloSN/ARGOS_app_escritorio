from collections.abc import Sequence
from datetime import UTC, datetime

from argus.application.review_analyzers import SuppressingReviewAnalyzer
from argus.domain.alert import Alert
from argus.domain.document import Document
from argus.domain.entity import EntityType
from argus.domain.risk import RiskLevel
from argus.domain.suppression import SuppressedCase
from tests.application.in_memory_repositories import InMemorySuppressionRuleRepository
from tests.domain.alert_builders import candidate

CONTRACT_ALERT = Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH)
MONEY_ALERT = Alert.from_candidate(candidate(EntityType.MONEY), RiskLevel.HIGH)


class FixedAnalyzer:
    def analyze(self, documents: Sequence[Document]) -> tuple[Alert, ...]:
        return (CONTRACT_ALERT, MONEY_ALERT)


def test_alerts_of_suppressed_cases_are_left_out() -> None:
    rules = InMemorySuppressionRuleRepository()
    rules.add(SuppressedCase.from_alert(CONTRACT_ALERT), datetime(2026, 10, 13, tzinfo=UTC))

    alerts = SuppressingReviewAnalyzer(FixedAnalyzer(), rules).analyze([])

    assert alerts == (MONEY_ALERT,)


def test_without_rules_every_alert_is_kept() -> None:
    analyzer = SuppressingReviewAnalyzer(FixedAnalyzer(), InMemorySuppressionRuleRepository())

    assert analyzer.analyze([]) == (CONTRACT_ALERT, MONEY_ALERT)
