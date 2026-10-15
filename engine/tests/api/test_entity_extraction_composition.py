"""Extracción de punta a punta sobre los fixtures reales del expediente 2026-118."""

import pytest

from argus.api.composition import build_document_reader_factory, build_entity_extraction_pipeline
from argus.domain.document import Document
from argus.domain.entity import EntityType
from argus.domain.entity_index import EntityIndex
from argus.domain.locations import PageLocation, ParagraphLocation, TableCellLocation
from tests.infrastructure.conftest import fixture_source

CASE_FILES = ("Contrato_4857_v3.pdf", "Anexo_1_condiciones.docx", "Correo_remision_cliente.eml")


def read_fixture(file_name: str) -> Document:
    source = fixture_source(file_name)
    return build_document_reader_factory().reader_for(file_name).read(source)


@pytest.fixture(scope="module")
def index() -> EntityIndex:
    documents = [read_fixture(file_name) for file_name in CASE_FILES]
    return build_entity_extraction_pipeline().build_index(documents)


def test_transposed_contract_numbers_are_indexed_with_their_origin(index: EntityIndex) -> None:
    (in_contract,) = index.entities_with(EntityType.CONTRACT_ID, "4857")
    (in_annex,) = index.entities_with(EntityType.CONTRACT_ID, "4587")

    assert in_contract.occurrence.document_name == "Contrato_4857_v3.pdf"
    assert in_contract.occurrence.location == PageLocation(1)
    assert "Contrato No. 4857" in in_contract.occurrence.excerpt
    assert in_annex.occurrence.document_name == "Anexo_1_condiciones.docx"
    assert in_annex.occurrence.location == ParagraphLocation(3)


def test_rent_amounts_with_swapped_digits_are_different_values(index: EntityIndex) -> None:
    (in_annex,) = index.entities_with(EntityType.MONEY, "COP:18540000")

    assert index.documents_with(EntityType.MONEY, "COP:18450000") >= {"Contrato_4857_v3.pdf"}
    assert in_annex.occurrence.location == TableCellLocation(table=1, row=2, column=2)


def test_the_same_nit_is_found_in_both_documents(index: EntityIndex) -> None:
    assert index.documents_with(EntityType.TAX_ID, "NIT:900482315-7") == {
        "Contrato_4857_v3.pdf",
        "Anexo_1_condiciones.docx",
    }


def test_legal_representative_surnames_differ(index: EntityIndex) -> None:
    assert {"maria f rojas perez", "maria f rojas pena"} <= index.values_of(EntityType.PERSON_NAME)


def test_company_names_are_indexed_once_per_normalized_form(index: EntityIndex) -> None:
    assert index.documents_with(EntityType.ORGANIZATION_NAME, "inversiones torres gomez sas") == {
        "Contrato_4857_v3.pdf",
        "Anexo_1_condiciones.docx",
    }


def test_email_period_and_attachment_period_are_both_indexed(index: EntityIndex) -> None:
    assert "Correo_remision_cliente.eml" in index.documents_with(EntityType.PERIOD, "XXXX-06")
    assert "Anexo_2_tarifas.xlsx" in index.documents_with(EntityType.PERIOD, "2026-05")


def test_start_date_and_duration_are_extracted_from_the_contract(index: EntityIndex) -> None:
    assert "Contrato_4857_v3.pdf" in index.documents_with(EntityType.DATE, "2026-07-01")
    assert "Contrato_4857_v3.pdf" in index.documents_with(EntityType.PERIOD, "P36M")


def test_priority_avoids_reading_a_nit_as_money_or_a_date_as_a_period() -> None:
    pipeline = build_entity_extraction_pipeline()
    document = read_fixture("Contrato_4857_v3.pdf")

    values = {(entity.type, entity.normalized_value) for entity in pipeline.extract(document)}

    assert (EntityType.MONEY, "COP:900482315") not in values
    assert not any(
        entity_type is EntityType.PERIOD and value == "2026-07" for entity_type, value in values
    )
