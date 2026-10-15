from datetime import UTC, datetime

import pytest

from argus.domain.decision import CorrectSide, Decision, DecisionKind
from argus.domain.errors import InvalidValueError

DECIDED = datetime(2026, 10, 8, 16, 14, tzinfo=UTC)


def test_error_decision_may_say_which_value_is_correct() -> None:
    decision = Decision(1, DecisionKind.ERROR, DECIDED, CorrectSide.FIRST)

    assert decision.correct_side is CorrectSide.FIRST
    assert decision.marks_real_error


@pytest.mark.parametrize("kind", [DecisionKind.CORRECT, DecisionKind.IGNORED])
def test_only_error_decisions_can_point_to_a_correct_value(kind: DecisionKind) -> None:
    with pytest.raises(InvalidValueError):
        Decision(1, kind, DECIDED, CorrectSide.SECOND)


@pytest.mark.parametrize("kind", [DecisionKind.CORRECT, DecisionKind.IGNORED])
def test_correct_and_ignored_are_not_real_errors(kind: DecisionKind) -> None:
    assert not Decision(1, kind, DECIDED).marks_real_error


def test_decision_refers_to_an_existing_alert_number() -> None:
    with pytest.raises(InvalidValueError):
        Decision(0, DecisionKind.CORRECT, DECIDED)


def test_decision_time_must_include_a_time_zone() -> None:
    with pytest.raises(InvalidValueError):
        Decision(1, DecisionKind.CORRECT, datetime(2026, 10, 8, 16, 14))
