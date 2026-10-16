import pytest

from argus.application.review_session_use_cases import StartReviewSession
from argus.application.suppress_similar_alerts import SuppressSimilarAlerts
from argus.domain.alert import Alert
from argus.domain.entity import EntityType
from argus.domain.errors import AlertNotFoundError
from argus.domain.risk import RiskLevel
from tests.application.in_memory_repositories import (
    START,
    InMemoryAlertRepository,
    InMemorySessionRepository,
    InMemorySuppressionRuleRepository,
    SteppingClock,
)
from tests.domain.alert_builders import candidate

ALERT = Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH)


def test_suppressing_an_alert_creates_a_rule_with_its_two_values() -> None:
    alerts, rules = InMemoryAlertRepository(), InMemorySuppressionRuleRepository()
    session = StartReviewSession(InMemorySessionRepository(), alerts, SteppingClock()).execute(
        "Expediente", ("a.pdf", "b.pdf"), [ALERT]
    )

    rule = SuppressSimilarAlerts(alerts, rules, SteppingClock()).execute(session.id, 1)

    assert (rule.case.first_label, rule.case.second_label) == ("4587", "4857")
    assert rule.created_at == START
    assert rules.list_all() == (rule,)


def test_suppressing_an_unknown_alert_fails_explicitly() -> None:
    suppress = SuppressSimilarAlerts(
        InMemoryAlertRepository(), InMemorySuppressionRuleRepository(), SteppingClock()
    )

    with pytest.raises(AlertNotFoundError):
        suppress.execute("no-existe", 1)
