import pytest

from argus.domain.risk import RiskLevel
from argus.domain.text_comparison.change import ChangeKind, Materiality
from argus.domain.text_comparison.materiality import (
    MATERIALITY_CLASSIFIER,
    ChangeFacts,
    cosmetic_difference,
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
        (ChangeKind.MODIFIED, {Materiality.CASE}, RiskLevel.LOW),
        (ChangeKind.MODIFIED, {Materiality.PUNCTUATION}, RiskLevel.LOW),
        (ChangeKind.MODIFIED, {Materiality.FORMAT}, RiskLevel.LOW),
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


@pytest.mark.parametrize(
    ("first", "second", "expected"),
    [
        ("El canon\nmensual", "El canon mensual", Materiality.FORMAT),
        ("EL ARRENDATARIO", "El arrendatario", Materiality.CASE),
        ("LOGÍSTICA ANDINA S.A.S.", "LOGÍSTICA ANDINA SAS", Materiality.PUNCTUATION),
        ("Canon de 18.450.000", "Canon de 18450000", Materiality.PUNCTUATION),
        ("El canon mensual", "El canon anual", None),
        ("El canon mensual", "El canon mensual", None),
    ],
)
def test_a_difference_only_in_spacing_case_or_punctuation_is_cosmetic(
    first: str, second: str, expected: Materiality | None
) -> None:
    assert cosmetic_difference(first, second) is expected
