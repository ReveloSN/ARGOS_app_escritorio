import pytest

from argus.domain.entity import EntityType
from argus.infrastructure.extraction.tax_id_extractor import TaxIdExtractor
from tests.infrastructure.extraction.conftest import normalized_values

EXTRACTOR = TaxIdExtractor()


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Logística Andina S.A.S., NIT 900.482.315-7", "NIT:900482315-7"),
        ("NIT. 900482315 - 1", "NIT:900482315-1"),
        ("N.I.T. No. 900.482.315", "NIT:900482315"),
        ("nit: 830.123.456-2", "NIT:830123456-2"),
    ],
)
def test_nit_is_normalized_to_digits_and_check_digit(text: str, expected: str) -> None:
    assert normalized_values(EXTRACTOR, text) == [expected]


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("identificada con C.C. 1.020.304.050", "CC:1020304050"),
        ("cédula de ciudadanía No. 79.123.456", "CC:79123456"),
        ("CC 52345678 de Bogotá", "CC:52345678"),
    ],
)
def test_citizen_id_is_normalized_to_digits(text: str, expected: str) -> None:
    assert normalized_values(EXTRACTOR, text) == [expected]


def test_nit_and_citizen_id_are_both_tax_identifiers() -> None:
    types = {match.type for match in EXTRACTOR.extract("NIT 900.482.315-7 y C.C. 79.123.456")}

    assert types == {EntityType.TAX_ID}


@pytest.mark.parametrize("text", ["unidad 900.482.315", "accesorios 123.456", "$ 18.450.000"])
def test_numbers_without_label_are_ignored(text: str) -> None:
    assert normalized_values(EXTRACTOR, text) == []
