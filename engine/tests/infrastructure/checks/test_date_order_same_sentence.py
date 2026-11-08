from argus.domain.comparison.difference import DifferenceKind
from argus.domain.risk_rules import DEFAULT_RISK_RULES, RiskClassifier
from argus.infrastructure.checks.date_order_source import DateOrderSource
from tests.application.analysis_builders import context_with, text_document
from tests.domain.alert_builders import second_side

CLASSIFIER = RiskClassifier(DEFAULT_RISK_RULES)


def test_start_and_end_in_one_sentence_with_different_formats_are_compared() -> None:
    """(Regresión) Con las dos fechas en la misma frase, cada etiqueta toma la suya, la más
    cercana; antes «inicio» se quedaba con la fecha con barras aunque fuera la de terminación."""
    contract = text_document(
        "Contrato_4857_v3.docx", "Inicio: 1 de agosto de 2026. Terminación: 31/07/2026."
    )

    (alert,) = DateOrderSource(CLASSIFIER).find(context_with([contract], []))

    assert alert.difference.kind is DifferenceKind.DATE_ORDER
    assert (alert.first.normalized_value, second_side(alert).normalized_value) == (
        "2026-08-01",
        "2026-07-31",
    )
