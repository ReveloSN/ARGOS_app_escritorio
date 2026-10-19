import pytest

from argus.domain.risk import RiskLevel
from argus.domain.text_comparison.change import ChangeKind, Materiality
from argus.domain.text_comparison.materiality import (
    MATERIALITY_CLASSIFIER,
    ChangeFacts,
    negation_count,
)


@pytest.mark.parametrize(
    ("kind", "materialities", "risk"),
    [
        (ChangeKind.MODIFIED, {Materiality.AMOUNT}, RiskLevel.HIGH),
        (ChangeKind.MODIFIED, {Materiality.DATE}, RiskLevel.HIGH),
        (ChangeKind.MODIFIED, {Materiality.NUMBER}, RiskLevel.HIGH),
        (ChangeKind.MODIFIED, {Materiality.NEGATION}, RiskLevel.HIGH),
        (ChangeKind.MODIFIED, {Materiality.PARTY}, RiskLevel.MEDIUM),
        (ChangeKind.ADDED, set(), RiskLevel.MEDIUM),
        (ChangeKind.REMOVED, {Materiality.AMOUNT}, RiskLevel.HIGH),
        (ChangeKind.MODIFIED, {Materiality.WORDING}, RiskLevel.LOW),
        (ChangeKind.MOVED, set(), RiskLevel.LOW),
    ],
)
def test_material_changes_raise_the_risk(
    kind: ChangeKind, materialities: set[Materiality], risk: RiskLevel
) -> None:
    facts = ChangeFacts(kind, frozenset(materialities))

    assert MATERIALITY_CLASSIFIER.classify(facts) is risk


def test_negations_are_counted_as_whole_words_in_spanish_and_english() -> None:
    assert negation_count("Las partes NO podrán ceder, ni subarrendar.") == 2
    assert negation_count("The tenant shall not sublet") == 1
    assert negation_count("Notificación sin novedad") == 1
