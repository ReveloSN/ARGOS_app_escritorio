"""Detección de punta a punta: archivos reales del expediente 2026-118 → alertas ordenadas."""

import pytest

from argus.api.composition import (
    build_document_reader_factory,
    build_entity_extraction_pipeline,
    build_inconsistency_detector,
)
from argus.domain.alert import Alert
from argus.domain.comparison.difference import DifferenceKind
from argus.domain.entity import EntityType
from argus.domain.risk import RiskLevel
from tests.domain.alert_builders import second_side
from tests.infrastructure.conftest import fixture_source

CASE_FILES = ("Contrato_4857_v3.pdf", "Anexo_1_condiciones.docx", "Correo_remision_cliente.eml")


@pytest.fixture(scope="module")
def alerts() -> tuple[Alert, ...]:
    factory = build_document_reader_factory()
    documents = [factory.reader_for(name).read(fixture_source(name)) for name in CASE_FILES]
    index = build_entity_extraction_pipeline().build_index(documents)
    return build_inconsistency_detector().execute(index)


def summary(alert: Alert) -> tuple[EntityType, RiskLevel, str, str]:
    return (
        alert.entity_type,
        alert.risk,
        alert.first.normalized_value,
        second_side(alert).normalized_value,
    )


def test_case_file_produces_the_expected_alerts_in_priority_order(
    alerts: tuple[Alert, ...],
) -> None:
    assert [summary(alert) for alert in alerts] == [
        (EntityType.CONTRACT_ID, RiskLevel.HIGH, "4587", "4857"),
        (EntityType.MONEY, RiskLevel.HIGH, "COP:18450000", "COP:18540000"),
        (EntityType.PERSON_NAME, RiskLevel.MEDIUM, "maria f rojas pena", "maria f rojas perez"),
        (EntityType.PERIOD, RiskLevel.MEDIUM, "2026-05", "2026-06"),
    ]


def test_contract_alert_traces_both_values_to_their_files(alerts: tuple[Alert, ...]) -> None:
    contract_alert = alerts[0]

    assert contract_alert.difference.kind is DifferenceKind.TRANSPOSITION
    assert contract_alert.first.document_names == frozenset({"Anexo_1_condiciones.docx"})
    assert second_side(contract_alert).document_names == frozenset({"Contrato_4857_v3.pdf"})


def test_rent_value_a_is_the_one_repeated_in_contract_and_email_notes(
    alerts: tuple[Alert, ...],
) -> None:
    rent_alert = alerts[1]

    assert rent_alert.first.document_names == frozenset({"Contrato_4857_v3.pdf", "notas.txt"})
    assert rent_alert.difference.positions == (3, 4)
