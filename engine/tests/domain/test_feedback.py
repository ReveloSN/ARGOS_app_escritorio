import pytest

from argus.domain.alert import AlertCandidate
from argus.domain.comparison.difference import Difference, DifferenceKind
from argus.domain.entity import EntityType
from argus.domain.feedback import NO_FEEDBACK, FeedbackCount, adjusted_confidence
from argus.domain.risk import RiskLevel
from argus.domain.risk_rules import DEFAULT_RISK_RULES, RiskClassifier
from tests.domain.alert_builders import side


def test_without_decisions_the_engine_confidence_stays() -> None:
    assert adjusted_confidence(0.9, NO_FEEDBACK) == 0.9


def test_real_errors_raise_and_dismissals_lower_the_confidence() -> None:
    assert adjusted_confidence(0.5, FeedbackCount(real_errors=6, dismissed=0)) == 0.8
    assert adjusted_confidence(0.5, FeedbackCount(real_errors=0, dismissed=6)) == 0.2


def test_many_decisions_weigh_more_than_the_engine() -> None:
    few = adjusted_confidence(0.9, FeedbackCount(real_errors=0, dismissed=1))
    many = adjusted_confidence(0.9, FeedbackCount(real_errors=0, dismissed=40))

    assert few > 0.7
    assert many < 0.1
    assert FeedbackCount(3, 2).total == 5


def test_a_referenced_period_is_high_risk() -> None:
    candidate = AlertCandidate(
        side(EntityType.PERIOD, "XXXX-06", "correo.eml"),
        side(EntityType.PERIOD, "2026-05", "tarifas.xlsx"),
        Difference(DifferenceKind.REFERENCED_PERIOD, 0.8),
    )

    assert RiskClassifier(DEFAULT_RISK_RULES).classify(candidate) is RiskLevel.HIGH


@pytest.mark.parametrize(
    ("entity_type", "kind", "risk"),
    [
        (EntityType.DATE, DifferenceKind.OUT_OF_PATTERN, RiskLevel.HIGH),
        (EntityType.MONEY, DifferenceKind.MAGNITUDE, RiskLevel.HIGH),
    ],
)
def test_anomalies_follow_the_risk_of_their_entity_type(
    entity_type: EntityType, kind: DifferenceKind, risk: RiskLevel
) -> None:
    candidate = AlertCandidate(
        side(entity_type, "a", "x.pdf"), side(entity_type, "b", "y.pdf"), Difference(kind, 0.7)
    )

    assert RiskClassifier(DEFAULT_RISK_RULES).classify(candidate) is risk
