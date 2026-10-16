from datetime import datetime

import pytest

from argus.domain.alert import Alert, AlertCandidate
from argus.domain.comparison.difference import Difference, DifferenceKind
from argus.domain.entity import EntityType
from argus.domain.errors import InvalidValueError
from argus.domain.risk import RiskLevel
from argus.domain.suppression import SuppressedCase, SuppressionRule
from tests.domain.alert_builders import candidate, side

CONTRACT_ALERT = Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH)


def swapped(alert: Alert) -> Alert:
    return Alert(alert.second, alert.first, alert.difference, alert.risk)


def test_case_from_an_alert_stores_both_values_in_a_fixed_order() -> None:
    case = SuppressedCase.from_alert(CONTRACT_ALERT)

    assert (case.first_value, case.second_value) == ("4587", "4857")
    assert SuppressedCase.from_alert(swapped(CONTRACT_ALERT)) == case


def test_case_matches_the_same_pair_in_either_order() -> None:
    case = SuppressedCase.from_alert(CONTRACT_ALERT)

    assert case.matches(CONTRACT_ALERT)
    assert case.matches(swapped(CONTRACT_ALERT))


def test_case_does_not_match_another_type_or_another_pair() -> None:
    case = SuppressedCase.from_alert(CONTRACT_ALERT)
    money = Alert.from_candidate(candidate(EntityType.MONEY), RiskLevel.HIGH)
    other = Alert.from_candidate(
        AlertCandidate(
            side(EntityType.CONTRACT_ID, "4857", "a.pdf"),
            side(EntityType.CONTRACT_ID, "4851", "b.pdf"),
            Difference(DifferenceKind.CHARACTER_CHANGE, 0.9),
        ),
        RiskLevel.HIGH,
    )

    assert not case.matches(money)
    assert not case.matches(other)


def test_rule_requires_a_date_with_time_zone() -> None:
    case = SuppressedCase.from_alert(CONTRACT_ALERT)

    with pytest.raises(InvalidValueError):
        SuppressionRule(1, case, datetime(2026, 10, 13))
