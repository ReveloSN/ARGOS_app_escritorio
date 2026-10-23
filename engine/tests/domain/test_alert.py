import pytest

from argus.domain.alert import Alert, AlertCandidate, AlertSide
from argus.domain.comparison.difference import Difference, DifferenceKind
from argus.domain.entity import EntityType
from argus.domain.errors import InvalidValueError
from argus.domain.risk import RiskLevel
from tests.domain.alert_builders import candidate, entity, second_side, side


def test_side_groups_every_occurrence_of_one_value() -> None:
    value_a = side(
        EntityType.CONTRACT_ID, "4857", "Contrato_4857_v3.pdf", "Correo.eml", "Correo.eml"
    )

    assert value_a.normalized_value == "4857"
    assert value_a.occurrence_count == 3
    assert value_a.document_names == frozenset({"Contrato_4857_v3.pdf", "Correo.eml"})
    assert value_a.entity_type is EntityType.CONTRACT_ID


def test_side_requires_at_least_one_occurrence() -> None:
    with pytest.raises(InvalidValueError):
        AlertSide(())


def test_side_cannot_mix_different_values() -> None:
    with pytest.raises(InvalidValueError):
        AlertSide((entity(EntityType.CONTRACT_ID, "4857"), entity(EntityType.CONTRACT_ID, "4587")))


def test_candidate_cannot_compare_different_entity_types() -> None:
    with pytest.raises(InvalidValueError):
        AlertCandidate(
            side(EntityType.CONTRACT_ID, "4857"),
            side(EntityType.MONEY, "COP:4857"),
            Difference(DifferenceKind.TRANSPOSITION, 0.9),
        )


def test_alert_takes_risk_and_keeps_both_values_with_their_origin() -> None:
    alert = Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH)

    assert alert.risk is RiskLevel.HIGH
    assert alert.confidence == 0.95
    assert alert.entity_type is EntityType.CONTRACT_ID
    assert alert.first.document_names == frozenset({"Contrato_4857_v3.pdf"})
    assert second_side(alert).document_names == frozenset({"Anexo_1_condiciones.docx"})


def test_risk_levels_are_ordered_by_priority() -> None:
    assert RiskLevel.HIGH.priority > RiskLevel.MEDIUM.priority > RiskLevel.LOW.priority


def test_an_internal_check_can_point_to_a_single_value() -> None:
    impossible = side(EntityType.DATE, "31/02/2026", "Contrato.docx", "Anexo.pdf")

    alert = Alert(
        impossible, None, Difference(DifferenceKind.IMPOSSIBLE_DATE, 0.99), RiskLevel.HIGH
    )

    assert alert.sides == (impossible,)
    assert alert.normalized_values == {"31/02/2026"}


def test_both_values_must_be_of_the_same_type() -> None:
    with pytest.raises(InvalidValueError):
        Alert(
            side(EntityType.CONTRACT_ID, "4857"),
            side(EntityType.TAX_ID, "4587"),
            Difference(DifferenceKind.TRANSPOSITION, 0.9),
            RiskLevel.HIGH,
        )
