import pytest

from argus.infrastructure.extraction.money_extractor import MoneyExtractor


def normalized(text: str) -> list[str]:
    return [match.normalized_value for match in MoneyExtractor().extract(text)]


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("USD 1234.50", ["USD:1234.5"]),
        ("USD 1234.99", ["USD:1234.99"]),
        ("Valor: 89.90 USD", ["USD:89.9"]),
    ],
)
def test_us_decimals_without_thousands_keep_their_cents(text: str, expected: list[str]) -> None:
    """(Regresión) «USD 1234.50» y «USD 1234.99» no pueden leerse los dos como 1234: se perdería
    justo la diferencia que hay que alertar."""
    assert normalized(text) == expected


def test_es_co_thousands_are_still_thousands() -> None:
    assert normalized("$ 1.234 y $ 1.234,50") == ["COP:1234", "COP:1234.5"]


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("USD 2 millones", ["USD:2000000"]),
        ("US$ 1,5 millones", ["USD:1500000"]),
        ("$ 36 millones", ["COP:36000000"]),
        ("2 millones de dólares", ["USD:2000000"]),
    ],
)
def test_amounts_in_millions_keep_their_currency(text: str, expected: list[str]) -> None:
    """(Regresión) «USD 2 millones» son dólares, no pesos."""
    assert normalized(text) == expected
