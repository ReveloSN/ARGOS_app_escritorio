import pytest

from argus.domain.entity import Entity, EntityType, Occurrence
from argus.domain.errors import InvalidValueError
from argus.domain.locations import PageLocation

ORIGIN = Occurrence(
    "Contrato_4857_v3.pdf", PageLocation(1), "…celebran el presente Contrato No. 4857…"
)


def test_entity_traces_its_value_to_file_page_and_excerpt() -> None:
    entity = Entity(EntityType.CONTRACT_ID, "No. 4857", "4857", ORIGIN)

    assert entity.occurrence.document_name == "Contrato_4857_v3.pdf"
    assert entity.occurrence.location == PageLocation(1)
    assert "4857" in entity.occurrence.excerpt


@pytest.mark.parametrize(("raw", "normalized"), [("", "4857"), ("No. 4857", " ")])
def test_entity_requires_raw_and_normalized_values(raw: str, normalized: str) -> None:
    with pytest.raises(InvalidValueError):
        Entity(EntityType.CONTRACT_ID, raw, normalized, ORIGIN)


@pytest.mark.parametrize(("name", "excerpt"), [("", "Contrato No. 4857"), ("a.pdf", "")])
def test_occurrence_requires_document_and_excerpt(name: str, excerpt: str) -> None:
    with pytest.raises(InvalidValueError):
        Occurrence(name, PageLocation(1), excerpt)


def test_entity_types_cover_the_values_argus_compares() -> None:
    assert {entity_type.value for entity_type in EntityType} == {
        "contract_id",
        "date",
        "money",
        "tax_id",
        "person_name",
        "period",
    }
