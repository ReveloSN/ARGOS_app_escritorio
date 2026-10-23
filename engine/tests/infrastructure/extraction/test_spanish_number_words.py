import pytest

from argus.infrastructure.extraction.spanish_number_words import (
    WrittenNumber,
    parse_spanish_number,
    trailing_number,
)


@pytest.mark.parametrize(
    ("words", "value"),
    [
        ("dieciocho millones cuatrocientos cincuenta mil", 18_450_000),
        ("treinta y seis millones novecientos mil", 36_900_000),
        ("mil quinientos", 1_500),
        ("un millón", 1_000_000),
        ("mil millones", 1_000_000_000),
        ("doscientos veintiún mil", 221_000),
        ("cero", 0),
    ],
)
def test_reads_a_number_written_in_spanish(words: str, value: int) -> None:
    assert trailing_number(words) == WrittenNumber(value, words)


def test_a_word_that_is_not_a_number_is_rejected() -> None:
    assert parse_spanish_number(["dieciocho", "manzanas"]) is None
    assert parse_spanish_number(["y", "dos"]) is None
    assert parse_spanish_number([]) is None


def test_takes_the_number_at_the_end_and_ignores_the_currency() -> None:
    written = trailing_number("la suma de Dieciocho Millones de pesos m/cte")

    assert written == WrittenNumber(18_000_000, "Dieciocho Millones")


def test_a_text_without_a_number_has_none() -> None:
    assert trailing_number("según lo pactado") is None
