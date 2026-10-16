from argus.application.alert_explanation import ExplanationPart, TemplateAlertExplainer
from argus.domain.alert import Alert, AlertCandidate, AlertSide
from argus.domain.comparison.difference import Difference, DifferenceKind
from argus.domain.entity import EntityType
from argus.domain.feedback import FeedbackCount, FeedbackCounts
from argus.domain.risk import RiskLevel
from tests.domain.alert_builders import entity, side


class FixedStatistics:
    def __init__(self, counts: FeedbackCounts | None = None) -> None:
        self.counts = counts or {}

    def counts_by_kind(self) -> FeedbackCounts:
        return self.counts


def contract_alert() -> Alert:
    repeated = AlertSide(
        tuple(
            entity(EntityType.CONTRACT_ID, "4857", name)
            for name in ("contrato.pdf", "acta.pdf", "otrosí.pdf")
        )
    )
    once = side(EntityType.CONTRACT_ID, "4587", "anexo.pdf")
    return Alert.from_candidate(
        AlertCandidate(repeated, once, Difference(DifferenceKind.TRANSPOSITION, 0.95)),
        RiskLevel.HIGH,
    )


def test_explanation_names_the_documents_the_cause_and_where_the_error_probably_is() -> None:
    (explanation,) = TemplateAlertExplainer(FixedStatistics()).explain([contract_alert()])

    assert explanation == (
        ExplanationPart(
            "explanation.lead.contract_id", {"first": "contrato.pdf", "second": "anexo.pdf"}
        ),
        ExplanationPart("explanation.cause.transposition", {"a": "8", "b": "5"}),
        ExplanationPart("explanation.majority", count=3),
    )


def test_previous_decisions_on_similar_alerts_are_mentioned() -> None:
    counts = {(EntityType.CONTRACT_ID, DifferenceKind.TRANSPOSITION): FeedbackCount(4, 1)}

    (explanation,) = TemplateAlertExplainer(FixedStatistics(counts)).explain([contract_alert()])

    assert explanation[-1] == ExplanationPart("explanation.feedback", {"errors": 4}, count=5)


def test_each_difference_kind_has_its_cause() -> None:
    period = Alert.from_candidate(
        AlertCandidate(
            side(EntityType.PERIOD, "XXXX-06", "correo.eml"),
            side(EntityType.PERIOD, "2026-05", "tarifas.xlsx"),
            Difference(DifferenceKind.REFERENCED_PERIOD, 0.8),
        ),
        RiskLevel.HIGH,
    )
    name = Alert.from_candidate(
        AlertCandidate(
            side(EntityType.PERSON_NAME, "maria rojas perez", "a.pdf"),
            side(EntityType.PERSON_NAME, "maria rojas pena", "b.pdf"),
            Difference(DifferenceKind.SIMILAR_NAME, 0.8),
        ),
        RiskLevel.MEDIUM,
    )
    changed = Alert.from_candidate(
        AlertCandidate(
            side(EntityType.CONTRACT_ID, "4857", "a.pdf"),
            side(EntityType.CONTRACT_ID, "4851", "b.pdf"),
            Difference(DifferenceKind.CHARACTER_CHANGE, 0.8),
        ),
        RiskLevel.HIGH,
    )

    explanations = TemplateAlertExplainer(FixedStatistics()).explain([period, name, changed])

    assert explanations[0][1] == ExplanationPart(
        "explanation.cause.referenced_period",
        {"mentioned": "XXXX-06", "attached": "2026-05", "attachment": "tarifas.xlsx"},
    )
    assert explanations[1][1] == ExplanationPart("explanation.cause.similar_name")
    assert explanations[2][1] == ExplanationPart("explanation.cause.character_change", count=1)
    assert all(len(explanation) == 2 for explanation in explanations)
