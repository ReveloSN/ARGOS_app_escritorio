import pytest

from argus.domain.entity import EntityType
from argus.infrastructure.extraction.organization_name_extractor import (
    OrganizationNameExtractor,
)
from tests.infrastructure.extraction.conftest import normalized_values, raw_values

EXTRACTOR = OrganizationNameExtractor()


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Arrendador: Inversiones Torres Gómez S.A.S., NIT", "inversiones torres gomez sas"),
        ("Grupo Empresarial del Valle S.A.", "grupo empresarial del valle sa"),
        ("Facturación proveedor Transportes del Caribe S.A.S.", "transportes del caribe sas"),
        ("Constructora Andes Ltda. presentó", "constructora andes ltda"),
    ],
)
def test_names_with_a_legal_form_are_recognized(text: str, expected: str) -> None:
    assert normalized_values(EXTRACTOR, text) == [expected]


def test_format_variants_of_the_same_company_share_a_normalized_value() -> None:
    dotted = normalized_values(EXTRACTOR, "Logística Andina S.A.S.")
    plain = normalized_values(EXTRACTOR, "LOGISTICA ANDINA SAS")

    assert dotted == plain == ["logistica andina sas"]


def test_raw_value_keeps_the_original_format() -> None:
    assert raw_values(EXTRACTOR, "suscrito con Logística Andina S.A.S. el día") == [
        "Logística Andina S.A.S."
    ]


def test_two_companies_joined_by_y_are_separate() -> None:
    text = "suscrito entre Inversiones Torres Gómez S.A.S. y Logística Andina S.A.S., NIT"

    assert normalized_values(EXTRACTOR, text) == [
        "inversiones torres gomez sas",
        "logistica andina sas",
    ]


@pytest.mark.parametrize("text", ["la casa de Santa Ana", "Contrato No. 4857", "SAS"])
def test_text_without_name_and_legal_form_is_ignored(text: str) -> None:
    assert normalized_values(EXTRACTOR, text) == []


def test_matches_are_organization_entities() -> None:
    assert {match.type for match in EXTRACTOR.extract("Logística Andina S.A.S.")} == {
        EntityType.ORGANIZATION_NAME
    }
