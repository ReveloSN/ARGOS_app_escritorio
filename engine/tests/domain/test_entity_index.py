from argus.domain.entity import Entity, EntityType, Occurrence
from argus.domain.entity_index import EntityIndex
from argus.domain.locations import PageLocation, ParagraphLocation


def contract_id(value: str, document_name: str) -> Entity:
    occurrence = Occurrence(document_name, PageLocation(1), f"Contrato No. {value}")
    return Entity(EntityType.CONTRACT_ID, value, value, occurrence)


ENTITIES = [
    contract_id("4857", "Contrato_4857_v3.pdf"),
    contract_id("4857", "Correo_remision_cliente.eml"),
    contract_id("4587", "Anexo_1_condiciones.docx"),
    Entity(
        EntityType.MONEY,
        "$ 18.450.000",
        "COP:18450000",
        Occurrence("Contrato_4857_v3.pdf", PageLocation(2), "Canon mensual: $ 18.450.000"),
    ),
]


def test_entities_are_found_by_type_and_normalized_value() -> None:
    index = EntityIndex(ENTITIES)

    found = index.entities_with(EntityType.CONTRACT_ID, "4857")

    assert [entity.occurrence.document_name for entity in found] == [
        "Contrato_4857_v3.pdf",
        "Correo_remision_cliente.eml",
    ]


def test_distinct_values_of_a_type_are_deduplicated() -> None:
    index = EntityIndex(ENTITIES)

    assert index.values_of(EntityType.CONTRACT_ID) == frozenset({"4857", "4587"})


def test_documents_that_mention_a_value_are_listed() -> None:
    index = EntityIndex(ENTITIES)

    assert index.documents_with(EntityType.CONTRACT_ID, "4587") == frozenset(
        {"Anexo_1_condiciones.docx"}
    )


def test_unknown_type_or_value_returns_nothing() -> None:
    index = EntityIndex(ENTITIES)

    assert index.entities_with(EntityType.DATE, "2026-07-01") == ()
    assert index.entities_with(EntityType.CONTRACT_ID, "9999") == ()
    assert index.values_of(EntityType.PERIOD) == frozenset()


def test_index_counts_every_entity_and_lists_indexed_types() -> None:
    index = EntityIndex(ENTITIES)

    assert len(index) == 4
    assert index.entity_types == frozenset({EntityType.CONTRACT_ID, EntityType.MONEY})


def test_index_keeps_the_original_form_of_each_value() -> None:
    occurrence = Occurrence(
        "Anexo_1_condiciones.docx", ParagraphLocation(3), "Logística Andina SAS"
    )
    entity = Entity(
        EntityType.ORGANIZATION_NAME, "Logística Andina SAS", "logistica andina sas", occurrence
    )

    index = EntityIndex([entity])

    (found,) = index.entities_with(EntityType.ORGANIZATION_NAME, "logistica andina sas")
    assert found.raw_value == "Logística Andina SAS"
