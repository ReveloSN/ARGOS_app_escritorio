from datetime import datetime, timedelta

import pytest

from argus.domain.confirmed_fact import ConfirmedFact, FactDraft, FactValue
from argus.domain.entity import EntityType
from argus.domain.errors import InvalidValueError
from tests.domain.fact_builders import CONFIRMED, fact

AMOUNT = FactValue(EntityType.MONEY, "$ 18.450.000", "COP:18450000")


def test_retiring_keeps_the_value_and_restoring_brings_it_back() -> None:
    later = CONFIRMED + timedelta(days=1)

    retired = fact().retired(later)

    assert retired.is_retired
    assert retired.retired_at == later
    assert retired.value == fact().value
    assert not retired.restored().is_retired


def test_editing_changes_the_value_and_when_it_was_confirmed() -> None:
    later = CONFIRMED + timedelta(days=18)

    edited = fact(EntityType.MONEY).with_value(AMOUNT, later)

    assert edited.value == AMOUNT
    assert edited.confirmed_at == later
    assert edited.label == "Número de contrato"


def test_a_fact_needs_a_name_and_a_value() -> None:
    with pytest.raises(InvalidValueError):
        FactDraft(" ", AMOUNT)
    with pytest.raises(InvalidValueError):
        FactValue(EntityType.MONEY, "$", " ")


def test_the_confirmation_time_needs_a_time_zone() -> None:
    with pytest.raises(InvalidValueError):
        ConfirmedFact(1, "Canon mensual", AMOUNT, datetime(2026, 10, 2))
