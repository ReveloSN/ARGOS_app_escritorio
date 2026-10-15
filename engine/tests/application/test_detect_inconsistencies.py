from argus.application.detect_inconsistencies import DetectInconsistencies
from argus.domain.comparison.comparators_by_type import comparators_for
from argus.domain.comparison.difference import DifferenceKind
from argus.domain.entity import Entity, EntityType, Occurrence
from argus.domain.entity_index import EntityIndex
from argus.domain.locations import PageLocation
from argus.domain.risk import RiskLevel
from argus.domain.risk_rules import DEFAULT_RISK_RULES, RiskClassifier
from argus.domain.sensitivity import Sensitivity
from tests.domain.alert_builders import entity

CONTRACT = "Contrato_4857_v3.pdf"
ANNEX = "Anexo_1_condiciones.docx"
EMAIL = "Correo_remision_cliente.eml"


def detector(sensitivity: Sensitivity = Sensitivity.BALANCED) -> DetectInconsistencies:
    policy = sensitivity.policy
    return DetectInconsistencies(
        comparators_for(policy),
        RiskClassifier(DEFAULT_RISK_RULES),
        reports_format_differences=policy.reports_format_differences,
    )


def company_written_as(raw: str, document: str) -> Entity:
    occurrence = Occurrence(document, PageLocation(1), raw)
    return Entity(EntityType.ORGANIZATION_NAME, raw, "logistica andina sas", occurrence)


def rent_written_as(raw: str, document: str) -> Entity:
    return Entity(EntityType.MONEY, raw, "COP:18450000", Occurrence(document, PageLocation(1), raw))


def test_contract_4857_against_4587_is_a_high_risk_alert() -> None:
    index = EntityIndex(
        [
            entity(EntityType.CONTRACT_ID, "4857", CONTRACT),
            entity(EntityType.CONTRACT_ID, "4587", ANNEX),
        ]
    )

    (alert,) = detector().execute(index)

    assert alert.risk is RiskLevel.HIGH
    assert alert.difference.kind is DifferenceKind.TRANSPOSITION
    assert alert.difference.positions == (2, 3)
    assert {alert.first.normalized_value, alert.second.normalized_value} == {"4857", "4587"}


def test_value_a_is_the_one_that_appears_most() -> None:
    index = EntityIndex(
        [
            entity(EntityType.CONTRACT_ID, "4587", ANNEX),
            entity(EntityType.CONTRACT_ID, "4857", CONTRACT),
            entity(EntityType.CONTRACT_ID, "4857", EMAIL),
        ]
    )

    (alert,) = detector().execute(index)

    assert alert.first.normalized_value == "4857"
    assert alert.first.occurrence_count == 2


def test_values_found_only_inside_one_document_are_not_cross_checked() -> None:
    index = EntityIndex(
        [
            entity(EntityType.DATE, "2026-07-01", CONTRACT),
            entity(EntityType.DATE, "2026-08-01", CONTRACT),
        ]
    )

    assert detector().execute(index) == ()


def test_equal_values_in_several_documents_are_consistent() -> None:
    index = EntityIndex(
        [
            entity(EntityType.TAX_ID, "NIT:900482315-7", CONTRACT),
            entity(EntityType.TAX_ID, "NIT:900482315-7", ANNEX),
        ]
    )

    assert detector().execute(index) == ()


def test_alerts_are_ordered_by_risk_and_confidence() -> None:
    index = EntityIndex(
        [
            entity(EntityType.PERSON_NAME, "maria f rojas perez", CONTRACT),
            entity(EntityType.PERSON_NAME, "maria f rojas pena", ANNEX),
            entity(EntityType.MONEY, "COP:18450000", CONTRACT),
            entity(EntityType.MONEY, "COP:18540000", ANNEX),
        ]
    )

    alerts = detector().execute(index)

    assert [(alert.entity_type, alert.risk) for alert in alerts] == [
        (EntityType.MONEY, RiskLevel.HIGH),
        (EntityType.PERSON_NAME, RiskLevel.MEDIUM),
    ]


def test_format_only_differences_are_reported_only_when_strict() -> None:
    index = EntityIndex(
        [
            company_written_as("Logística Andina S.A.S.", CONTRACT),
            company_written_as("LOGISTICA ANDINA SAS", ANNEX),
        ]
    )

    (alert,) = detector(Sensitivity.STRICT).execute(index)

    assert alert.risk is RiskLevel.LOW
    assert alert.difference.kind is DifferenceKind.FORMAT_ONLY
    assert detector(Sensitivity.BALANCED).execute(index) == ()


def test_spacing_differences_are_not_format_differences() -> None:
    index = EntityIndex(
        [
            rent_written_as("$ 18.450.000", CONTRACT),
            rent_written_as("$18.450.000", ANNEX),
        ]
    )

    assert detector(Sensitivity.STRICT).execute(index) == ()


def test_types_without_comparator_are_not_compared() -> None:
    only_money = DetectInconsistencies(
        {EntityType.MONEY: comparators_for(Sensitivity.BALANCED.policy)[EntityType.MONEY]},
        RiskClassifier(DEFAULT_RISK_RULES),
        reports_format_differences=False,
    )
    index = EntityIndex(
        [
            entity(EntityType.CONTRACT_ID, "4857", CONTRACT),
            entity(EntityType.CONTRACT_ID, "4587", ANNEX),
        ]
    )

    assert only_money.execute(index) == ()
