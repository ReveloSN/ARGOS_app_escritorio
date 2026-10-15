import pytest

from argus.domain.entity import EntityType
from argus.infrastructure.extraction.period_extractor import UNKNOWN_YEAR, PeriodExtractor
from tests.infrastructure.extraction.conftest import normalized_values

EXTRACTOR = PeriodExtractor()


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Tarifas mayo 2026", "2026-05"),
        ("Informe de gestión de junio 2026", "2026-06"),
        ("Conciliación bancaria septiembre de 2026", "2026-09"),
        ("cierre de Diciembre del 2025", "2025-12"),
    ],
)
def test_month_and_year_become_a_monthly_period(text: str, expected: str) -> None:
    assert normalized_values(EXTRACTOR, text) == [expected]


def test_month_without_year_keeps_the_month_and_marks_the_year_unknown() -> None:
    assert normalized_values(EXTRACTOR, "Adjunto el informe de junio con las tarifas") == [
        f"{UNKNOWN_YEAR}-06"
    ]


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Vigencia: 36 meses.", "P36M"),
        ("por un plazo de 30 meses", "P30M"),
        ("1 mes de depósito", "P1M"),
        ("prorrogable por 2 años", "P2Y"),
    ],
)
def test_durations_are_normalized_to_iso_8601(text: str, expected: str) -> None:
    assert normalized_values(EXTRACTOR, text) == [expected]


def test_different_months_give_different_periods() -> None:
    assert normalized_values(EXTRACTOR, "informe de junio 2026") != normalized_values(
        EXTRACTOR, "Tarifas mayo 2026"
    )


@pytest.mark.parametrize("text", ["Mayorista", "el mayor valor", "Contrato No. 4857"])
def test_words_that_contain_a_month_are_ignored(text: str) -> None:
    assert normalized_values(EXTRACTOR, text) == []


def test_matches_are_period_entities() -> None:
    assert {match.type for match in EXTRACTOR.extract("junio 2026, 36 meses")} == {
        EntityType.PERIOD
    }
