from collections.abc import Sequence

import pytest

from argus.application.alert_explanation import Explanation, ExplanationPart
from argus.application.explain_alert import ExplainAlert
from argus.application.text_comparison.change_explanation import (
    ChangeExplanation,
    ExplanationRequest,
    ExplanationSubject,
    TemplateChangeExplainer,
)
from argus.domain.alert import Alert
from argus.domain.comparison.difference import Difference, DifferenceKind
from argus.domain.entity import EntityType
from argus.domain.errors import AlertNotFoundError
from argus.domain.risk import RiskLevel
from tests.application.in_memory_repositories import InMemoryAlertRepository
from tests.domain.alert_builders import candidate, side

SESSION = "s-1"
TWO_VALUES = Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH)
SINGLE_VALUE = Alert(
    side(EntityType.DATE, "31/02/2026", "Contrato.docx"),
    None,
    Difference(DifferenceKind.IMPOSSIBLE_DATE, 0.99),
    RiskLevel.HIGH,
)
LOCAL = (ExplanationPart("explanation.internal.impossible_date", {"document": "Contrato.docx"}),)


class FixedAlertExplainer:
    """La explicación local que ya acompaña a cada alerta en la revisión."""

    def explain(self, alerts: Sequence[Alert]) -> tuple[Explanation, ...]:
        return tuple(LOCAL for _ in alerts)


class RecordingChangeExplainer:
    """El mismo puerto de «Explicar este cambio»: recuerda qué se le pidió."""

    def __init__(self) -> None:
        self.requests: list[ExplanationRequest] = []

    def explain(self, request: ExplanationRequest) -> ChangeExplanation:
        self.requests.append(request)
        return TemplateChangeExplainer().explain(request)


def use_case(*alerts: Alert) -> tuple[ExplainAlert, RecordingChangeExplainer]:
    repository = InMemoryAlertRepository()
    repository.save_all(SESSION, alerts)
    explainer = RecordingChangeExplainer()
    return ExplainAlert(repository, FixedAlertExplainer(), explainer), explainer


def test_a_two_value_alert_sends_only_the_origin_fragment_of_each_value() -> None:
    explain, explainer = use_case(TWO_VALUES)

    explanation = explain.execute(SESSION, 1, "en")

    (request,) = explainer.requests
    assert request.subject is ExplanationSubject.ALERT
    assert request.kind == str(TWO_VALUES.difference.kind)
    assert request.fragments == (
        TWO_VALUES.first.representative.occurrence.excerpt,
        TWO_VALUES.second.representative.occurrence.excerpt if TWO_VALUES.second else "",
    )
    assert request.locale == "en"
    assert explanation.parts == LOCAL


def test_a_single_value_alert_sends_one_fragment() -> None:
    explain, explainer = use_case(TWO_VALUES, SINGLE_VALUE)

    explain.execute(SESSION, 2, "es")

    (request,) = explainer.requests
    assert request.kind == "impossible_date"
    assert request.fragments == (SINGLE_VALUE.first.representative.occurrence.excerpt,)


def test_an_unknown_alert_is_not_found() -> None:
    explain, _ = use_case(TWO_VALUES)

    with pytest.raises(AlertNotFoundError):
        explain.execute(SESSION, 7, "es")
