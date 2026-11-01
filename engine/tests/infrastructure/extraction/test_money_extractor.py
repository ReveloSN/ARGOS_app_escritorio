import pytest

from argus.domain.entity import EntityType
from argus.infrastructure.extraction.money_extractor import MoneyExtractor
from tests.infrastructure.extraction.conftest import normalized_values, raw_values

EXTRACTOR = MoneyExtractor()


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Canon mensual: $ 18.450.000", "COP:18450000"),
        ("Canon mensual $18.540.000", "COP:18540000"),
        ("$ 18.450.000,00", "COP:18450000"),
        ("Total: $ 4.218.600.000", "COP:4218600000"),
        ("COP 36.900.000", "COP:36900000"),
        ("USD 1.250,50", "USD:1250.5"),
        ("US$ 300", "USD:300"),
        ("$ 950", "COP:950"),
    ],
)
def test_amounts_are_normalized_with_currency(text: str, expected: str) -> None:
    assert normalized_values(EXTRACTOR, text) == [expected]


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Depósito de 36,9 millones", "COP:36900000"),
        ("18 millones de pesos", "COP:18000000"),
    ],
)
def test_amounts_written_in_millions_are_expanded(text: str, expected: str) -> None:
    assert normalized_values(EXTRACTOR, text) == [expected]


def test_amounts_written_differently_normalize_to_the_same_value() -> None:
    written_out = normalized_values(EXTRACTOR, "Depósito: 36,9 millones")

    assert written_out == normalized_values(EXTRACTOR, "Depósito: $ 36.900.000")


def test_transposed_digits_give_different_amounts() -> None:
    assert normalized_values(EXTRACTOR, "$ 18.450.000") != normalized_values(
        EXTRACTOR, "$ 18.540.000"
    )


def test_raw_value_is_the_amount_as_written() -> None:
    assert raw_values(EXTRACTOR, "Canon: $ 18.450.000 mensuales") == ["$ 18.450.000"]


@pytest.mark.parametrize("text", ["NIT 900.482.315-7", "Contrato No. 4857", "36 meses"])
def test_numbers_without_currency_are_not_amounts(text: str) -> None:
    assert normalized_values(EXTRACTOR, text) == []


def test_matches_are_money_entities() -> None:
    assert {match.type for match in EXTRACTOR.extract("$ 1.000 y 2 millones")} == {EntityType.MONEY}


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Canon de 18.450.000 COP", "COP:18450000"),
        ("Valor: 18.450.000 pesos", "COP:18450000"),
        ("Depósito de 1.200 USD", "USD:1200"),
        ("Pago de 300 dólares", "USD:300"),
        ("Pago de 300 DOLARES", "USD:300"),
    ],
)
def test_currency_written_after_the_number_is_recognized(text: str, expected: str) -> None:
    assert normalized_values(EXTRACTOR, text) == [expected]


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("USD 1,200.50", "USD:1200.5"),
        ("$ 1,250,000", "COP:1250000"),
        ("US$ 12,345.67", "USD:12345.67"),
    ],
)
def test_us_number_format_is_not_misread_as_a_decimal(text: str, expected: str) -> None:
    assert normalized_values(EXTRACTOR, text) == [expected]


def test_es_co_decimals_with_one_or_two_digits_still_use_the_comma() -> None:
    assert normalized_values(EXTRACTOR, "USD 1.250,50") == ["USD:1250.5"]
    assert normalized_values(EXTRACTOR, "$ 36,9") == ["COP:36.9"]


def test_an_amount_with_currency_on_both_sides_is_counted_once() -> None:
    assert normalized_values(EXTRACTOR, "$ 18.450.000 pesos") == ["COP:18450000"]


@pytest.mark.parametrize("text", ["Plazo de 36 meses", "Hay 40 pesos de diferencia en 3 pagos"])
def test_a_trailing_word_that_is_not_a_currency_is_ignored(text: str) -> None:
    assert "meses" not in " ".join(normalized_values(EXTRACTOR, text))
