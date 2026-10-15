import pytest

from argus.domain.entity import EntityType
from argus.infrastructure.extraction.date_extractor import DateExtractor
from tests.infrastructure.extraction.conftest import normalized_values

EXTRACTOR = DateExtractor()


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Fecha de inicio: 01/07/2026.", "2026-07-01"),
        ("revisado el 13/10/2026 09:42", "2026-10-13"),
        ("1 de julio de 2026", "2026-07-01"),
        ("15 de Septiembre del 2026", "2026-09-15"),
        ("2026-05-31", "2026-05-31"),
    ],
)
def test_dates_are_normalized_to_iso(text: str, expected: str) -> None:
    assert normalized_values(EXTRACTOR, text) == [expected]


def test_day_comes_before_month_as_in_colombia() -> None:
    assert normalized_values(EXTRACTOR, "01/08/2026") == ["2026-08-01"]


@pytest.mark.parametrize("text", ["31/02/2026", "45/01/2026", "2026-13-01", "junio 2026"])
def test_impossible_or_incomplete_dates_are_ignored(text: str) -> None:
    assert normalized_values(EXTRACTOR, text) == []


def test_several_dates_in_one_text_are_found() -> None:
    matches = list(EXTRACTOR.extract("del 01/07/2026 al 30 de junio de 2029"))

    assert [match.normalized_value for match in matches] == ["2026-07-01", "2029-06-30"]
    assert {match.type for match in matches} == {EntityType.DATE}
