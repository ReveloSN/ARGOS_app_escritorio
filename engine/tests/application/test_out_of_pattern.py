import pytest

from argus.application.out_of_pattern import (
    AmountScaleSource,
    DateOutlierSource,
    is_rescaled,
    outlier_date_pairs,
)
from argus.domain.comparison.difference import DifferenceKind
from argus.domain.entity import EntityType
from argus.domain.risk import RiskLevel
from argus.domain.risk_rules import DEFAULT_RISK_RULES, RiskClassifier
from tests.application.analysis_builders import context_with, found

CLASSIFIER = RiskClassifier(DEFAULT_RISK_RULES)


def test_a_year_decades_away_with_the_same_day_and_month_is_an_outlier() -> None:
    values = ["2026-07-01", "2026-08-01", "2062-07-01", "2026-12-31"]

    assert list(outlier_date_pairs(values)) == [("2062-07-01", "2026-07-01")]


def test_far_dates_without_a_twin_are_legitimate_terms() -> None:
    # Una vigencia hasta 2040 no es un error: ninguna otra fecha tiene ese día y mes.
    assert list(outlier_date_pairs(["2026-07-01", "2026-08-01", "2040-03-15"])) == []


def test_few_dates_do_not_make_a_pattern() -> None:
    assert list(outlier_date_pairs(["2026-07-01", "2062-07-01"])) == []


def test_date_outlier_source_creates_a_high_alert_with_the_typical_value() -> None:
    entities = [
        found(EntityType.DATE, ("01/07/2026", "2026-07-01"), "contrato.pdf"),
        found(EntityType.DATE, ("01/07/2026", "2026-07-01"), "anexo.pdf"),
        found(EntityType.DATE, ("15/08/2026", "2026-08-15"), "contrato.pdf"),
        found(EntityType.DATE, ("01/07/2062", "2062-07-01"), "anexo.pdf"),
    ]

    (alert,) = DateOutlierSource(CLASSIFIER).find(context_with([], entities))

    assert alert.difference.kind is DifferenceKind.OUT_OF_PATTERN
    assert alert.risk is RiskLevel.HIGH
    assert (alert.first.normalized_value, alert.second.normalized_value) == (
        "2026-07-01",
        "2062-07-01",
    )


@pytest.mark.parametrize(
    ("first", "second", "expected"),
    [
        ("COP:18450000", "COP:184500000", True),
        ("COP:18450000", "COP:1845000", True),
        ("COP:18450000", "USD:184500000", False),
        ("COP:1000000", "COP:10000000", False),
        ("COP:18450000", "COP:18540000", False),
        ("COP:18450000", "COP:18450000000000", False),
    ],
)
def test_rescaled_amounts(first: str, second: str, expected: bool) -> None:
    assert is_rescaled(first, second) is expected


def test_amount_scale_source_alerts_an_extra_zero() -> None:
    entities = [
        found(EntityType.MONEY, ("$ 18.450.000", "COP:18450000"), "contrato.pdf"),
        found(EntityType.MONEY, ("$ 184.500.000", "COP:184500000"), "anexo.pdf"),
        found(EntityType.MONEY, ("$ 500.000", "COP:500000"), "anexo.pdf"),
    ]

    (alert,) = AmountScaleSource(CLASSIFIER).find(context_with([], entities))

    assert alert.difference.kind is DifferenceKind.MAGNITUDE
    assert alert.risk is RiskLevel.HIGH
