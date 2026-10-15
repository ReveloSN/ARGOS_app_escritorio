import pytest

from argus.domain.entity import EntityType
from argus.infrastructure.extraction.contract_id_extractor import ContractIdExtractor
from tests.infrastructure.extraction.conftest import normalized_values, raw_values

EXTRACTOR = ContractIdExtractor()


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("celebran el presente Contrato No. 4857 de arrendamiento", "4857"),
        ("hace parte integral del Contrato No. 4587 suscrito", "4587"),
        ("CONTRATO N° 4410", "4410"),
        ("contrato número 3921", "3921"),
        ("el contrato Nro. 21-44 vigente", "21-44"),
        ("Contrato de prestación de servicios No. 3921", "3921"),
        ("Otrosí No. 2 · Contrato No. 4410", "4410"),
    ],
)
def test_contract_numbers_are_found_after_their_label(text: str, expected: str) -> None:
    assert normalized_values(EXTRACTOR, text) == [expected]


def test_identifier_is_normalized_to_upper_case() -> None:
    assert normalized_values(EXTRACTOR, "Contrato No. ab-12") == ["AB-12"]


def test_raw_value_keeps_the_identifier_as_written() -> None:
    assert raw_values(EXTRACTOR, "Contrato No. ab-12") == ["ab-12"]


@pytest.mark.parametrize(
    "text",
    [
        "ubicada en la Calle 17 No. 96G-45, Fontibón",
        "Póliza de cumplimiento No. 21-44-101005873",
        "el contrato no. aplica",
    ],
)
def test_numbers_without_contract_label_are_ignored(text: str) -> None:
    assert normalized_values(EXTRACTOR, text) == []


def test_match_covers_label_and_value() -> None:
    text = "del Contrato No. 4587 suscrito"

    (match,) = EXTRACTOR.extract(text)

    assert match.type is EntityType.CONTRACT_ID
    assert text[match.start : match.end] == "Contrato No. 4587"
