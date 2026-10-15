import pytest

from argus.domain.alert import Alert
from argus.domain.alert_queue import AlertQueue
from argus.domain.comparison.difference import DifferenceKind
from argus.domain.entity import EntityType
from argus.domain.risk import RiskLevel
from tests.domain.alert_builders import candidate


def alert(risk: RiskLevel, confidence: float, entity_type: EntityType = EntityType.MONEY) -> Alert:
    return Alert.from_candidate(
        candidate(entity_type, DifferenceKind.CHARACTER_CHANGE, confidence), risk
    )


def test_alerts_come_out_by_risk_then_by_confidence() -> None:
    low = alert(RiskLevel.LOW, 0.99)
    medium = alert(RiskLevel.MEDIUM, 0.84)
    high_unsure = alert(RiskLevel.HIGH, 0.75)
    high_sure = alert(RiskLevel.HIGH, 0.95)

    ordered = AlertQueue([low, medium, high_unsure, high_sure]).drain()

    assert ordered == (high_sure, high_unsure, medium, low)


def test_ties_keep_the_order_in_which_alerts_were_found() -> None:
    contract = alert(RiskLevel.HIGH, 0.95, EntityType.CONTRACT_ID)
    amount = alert(RiskLevel.HIGH, 0.95, EntityType.MONEY)

    assert AlertQueue([contract, amount]).drain() == (contract, amount)


def test_queue_reports_its_size_and_empties_when_drained() -> None:
    queue = AlertQueue([alert(RiskLevel.LOW, 0.5)])
    queue.push(alert(RiskLevel.HIGH, 0.9))

    assert len(queue) == 2
    queue.drain()
    assert len(queue) == 0


def test_pop_returns_the_most_urgent_alert() -> None:
    urgent = alert(RiskLevel.HIGH, 0.95)
    queue = AlertQueue([alert(RiskLevel.MEDIUM, 0.9), urgent])

    assert queue.pop() is urgent


def test_popping_an_empty_queue_fails_explicitly() -> None:
    with pytest.raises(IndexError):
        AlertQueue().pop()
