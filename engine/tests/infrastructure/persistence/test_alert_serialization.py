import pytest

from argus.domain.alert import Alert, AlertSide
from argus.domain.comparison.difference import Difference, DifferenceKind
from argus.domain.entity import Entity, EntityType, Occurrence
from argus.domain.locations import (
    EmailPart,
    EmailPartLocation,
    LineLocation,
    PageLocation,
    ParagraphLocation,
    SheetCellLocation,
    SourceLocation,
    TableCellLocation,
)
from argus.domain.risk import RiskLevel
from argus.infrastructure.persistence.alert_serialization import alert_from_json, alert_to_json

LOCATIONS: list[SourceLocation] = [
    PageLocation(1),
    ParagraphLocation(3),
    TableCellLocation(1, 2, 2),
    SheetCellLocation("Resumen", "C12"),
    EmailPartLocation(EmailPart.SUBJECT),
    LineLocation(4),
]


def contract_entity(value: str, location: SourceLocation) -> Entity:
    occurrence = Occurrence("Contrato_4857_v3.pdf", location, f"«…Contrato No. {value}…»")
    return Entity(EntityType.CONTRACT_ID, f"No. {value}", value, occurrence)


@pytest.mark.parametrize("location", LOCATIONS)
def test_alert_survives_a_round_trip_with_every_kind_of_origin(location: SourceLocation) -> None:
    alert = Alert(
        AlertSide((contract_entity("4857", location), contract_entity("4857", PageLocation(2)))),
        AlertSide((contract_entity("4587", location),)),
        Difference(DifferenceKind.TRANSPOSITION, 0.95, (2, 3)),
        RiskLevel.HIGH,
    )

    restored = alert_from_json(alert_to_json(alert))

    assert restored == alert
    assert type(restored.first.representative.occurrence.location) is type(location)


def test_serialized_alert_keeps_accents_readable() -> None:
    alert = Alert(
        AlertSide((contract_entity("4857", PageLocation(1)),)),
        AlertSide((contract_entity("4587", PageLocation(1)),)),
        Difference(DifferenceKind.TRANSPOSITION, 0.95),
        RiskLevel.HIGH,
    )

    assert "«…Contrato" in alert_to_json(alert)


def test_a_single_value_alert_survives_a_round_trip() -> None:
    alert = Alert(
        AlertSide((contract_entity("____", LineLocation(2)),)),
        None,
        Difference(DifferenceKind.BLANK_FIELD, 0.9),
        RiskLevel.MEDIUM,
    )

    assert alert_from_json(alert_to_json(alert)) == alert
