from argus.domain.alert import Alert
from argus.domain.comparison.difference import DifferenceKind
from argus.domain.entity import EntityType
from argus.domain.pending_fact import PendingFact, pending_facts
from argus.domain.risk import RiskLevel
from tests.domain.alert_builders import candidate
from tests.domain.fact_builders import CONFIRMED, fact

CONTRACT_ALERT = Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH)


def test_an_alert_without_a_confirmed_value_is_pending() -> None:
    assert pending_facts([CONTRACT_ALERT], []) == (
        PendingFact(EntityType.CONTRACT_ID, ("4857", "4587")),
    )


def test_confirming_either_value_resolves_it() -> None:
    assert pending_facts([CONTRACT_ALERT], [fact(normalized="4587")]) == ()


def test_a_retired_fact_does_not_resolve_it() -> None:
    assert len(pending_facts([CONTRACT_ALERT], [fact().retired(CONFIRMED)])) == 1


def test_a_confirmed_value_of_another_type_does_not_resolve_it() -> None:
    assert len(pending_facts([CONTRACT_ALERT], [fact(EntityType.TAX_ID)])) == 1


def test_the_same_pair_is_pending_once_and_format_differences_never() -> None:
    format_only = Alert.from_candidate(
        candidate(EntityType.ORGANIZATION_NAME, DifferenceKind.FORMAT_ONLY), RiskLevel.LOW
    )

    pending = pending_facts([CONTRACT_ALERT, CONTRACT_ALERT, format_only], [])

    assert [item.entity_type for item in pending] == [EntityType.CONTRACT_ID]
