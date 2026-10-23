from argus.domain.comparison.difference import DifferenceKind
from argus.domain.entity import EntityType
from argus.domain.risk import RiskLevel
from argus.domain.risk_rules import DEFAULT_RISK_RULES, RiskClassifier
from argus.infrastructure.checks.amount_in_words_source import AmountInWordsSource
from argus.infrastructure.checks.blank_field_source import BlankFieldSource, placeholder_type
from argus.infrastructure.checks.date_order_source import DateOrderSource
from argus.infrastructure.checks.impossible_date_source import ImpossibleDateSource
from tests.application.analysis_builders import context_with, text_document
from tests.domain.alert_builders import second_side

CLASSIFIER = RiskClassifier(DEFAULT_RISK_RULES)


def test_an_amount_whose_words_say_another_number_is_a_high_risk_alert() -> None:
    contract = text_document(
        "Contrato_4857_v3.docx",
        "Canon mensual de $ 18.450.000 (dieciocho millones quinientos cuarenta mil pesos m/cte).",
        "Depósito: treinta y seis millones novecientos mil pesos ($ 36.900.000).",
    )

    (alert,) = AmountInWordsSource(CLASSIFIER).find(context_with([contract], []))

    assert alert.difference.kind is DifferenceKind.AMOUNT_IN_WORDS
    assert alert.risk is RiskLevel.HIGH
    assert alert.first.representative.raw_value == "$ 18.450.000"
    assert (
        second_side(alert).representative.raw_value == "dieciocho millones quinientos cuarenta mil"
    )
    assert second_side(alert).normalized_value == "COP:18540000"


def test_an_end_date_before_the_start_date_is_an_alert() -> None:
    contract = text_document(
        "Contrato_4857_v3.docx",
        "Fecha de inicio: 1 de agosto de 2026.",
        "Fecha de terminación: 31/07/2026, salvo prórroga.",
    )

    (alert,) = DateOrderSource(CLASSIFIER).find(context_with([contract], []))

    assert alert.difference.kind is DifferenceKind.DATE_ORDER
    assert (alert.first.normalized_value, second_side(alert).normalized_value) == (
        "2026-08-01",
        "2026-07-31",
    )


def test_dates_in_order_or_without_labels_are_fine() -> None:
    contract = text_document(
        "Contrato.docx",
        "Vigencia desde el 01/07/2026 hasta el 30/06/2029.",
        "Firmado el 01/06/2026.",
    )

    assert list(DateOrderSource(CLASSIFIER).find(context_with([contract], []))) == []


def test_an_impossible_date_is_one_alert_with_all_its_appearances() -> None:
    contract = text_document(
        "Contrato.docx", "Entrega el 31/02/2026.", "Recibido el 30 de febrero de 2026."
    )
    annex = text_document("Anexo.pdf", "Plazo: 31/02/2026. Código 45/77/2026.")

    alerts = list(ImpossibleDateSource(CLASSIFIER).find(context_with([contract, annex], [])))

    by_value = {alert.first.representative.raw_value: alert for alert in alerts}
    assert set(by_value) == {"31/02/2026", "30 de febrero de 2026"}
    february = by_value["31/02/2026"]
    assert february.second is None
    assert february.first.document_names == {"Contrato.docx", "Anexo.pdf"}
    assert february.risk is RiskLevel.HIGH


def test_blank_fields_and_template_markers_are_medium_risk() -> None:
    draft = text_document(
        "Borrador.docx",
        "Canon mensual: $ ________ pagadero el __/__/____.",
        "Arrendatario: [NOMBRE DEL ARRENDATARIO], NIT ________. [NOTA INTERNA]",
    )

    alerts = list(BlankFieldSource(CLASSIFIER).find(context_with([draft], [])))

    types = {alert.first.representative.raw_value: alert.entity_type for alert in alerts}
    assert types == {
        "$ ________": EntityType.MONEY,
        "__/__/____": EntityType.DATE,
        "[NOMBRE DEL ARRENDATARIO]": EntityType.PERSON_NAME,
        "NIT ________": EntityType.TAX_ID,
    }
    assert {alert.risk for alert in alerts} == {RiskLevel.MEDIUM}
    assert all(alert.second is None for alert in alerts)


def test_a_marker_without_a_known_word_has_no_type() -> None:
    assert placeholder_type("NOTA INTERNA") is None
    assert placeholder_type("Razón social") is EntityType.ORGANIZATION_NAME
