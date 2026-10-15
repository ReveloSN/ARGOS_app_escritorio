import pytest

from argus.domain.entity import EntityType
from argus.infrastructure.extraction.person_name_extractor import PersonNameExtractor
from tests.infrastructure.extraction.conftest import normalized_values, raw_values

EXTRACTOR = PersonNameExtractor()


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Representante legal: María F. Rojas Pérez", "maria f rojas perez"),
        ("representante legal María F. Rojas Peña, mayor de edad", "maria f rojas pena"),
        ("REPRESENTANTE LEGAL: Camilo Herrera", "camilo herrera"),
        ("Atentamente, Sra. Laura Martínez", "laura martinez"),
        ("el señor Camilo Herrera Díaz firmó", "camilo herrera diaz"),
    ],
)
def test_names_after_a_role_or_courtesy_title_are_recognized(text: str, expected: str) -> None:
    assert normalized_values(EXTRACTOR, text) == [expected]


def test_raw_value_keeps_accents_and_initials() -> None:
    assert raw_values(EXTRACTOR, "Representante legal: María F. Rojas Pérez") == [
        "María F. Rojas Pérez"
    ]


def test_one_letter_difference_in_a_surname_gives_different_values() -> None:
    assert normalized_values(EXTRACTOR, "Representante legal: María F. Rojas Pérez") != (
        normalized_values(EXTRACTOR, "Representante legal: María F. Rojas Peña")
    )


@pytest.mark.parametrize(
    "text",
    ["el representante legal firmará", "María F. Rojas Pérez", "Representante legal: la empresa"],
)
def test_text_without_label_and_capitalized_name_is_ignored(text: str) -> None:
    assert normalized_values(EXTRACTOR, text) == []


def test_matches_are_person_entities() -> None:
    assert {match.type for match in EXTRACTOR.extract("Sr. Camilo Herrera")} == {
        EntityType.PERSON_NAME
    }
