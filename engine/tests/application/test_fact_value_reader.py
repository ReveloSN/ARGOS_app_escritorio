import pytest

from argus.application.fact_value_reader import FactValueReader
from argus.domain.confirmed_fact import FactValue
from argus.domain.entity import EntityType
from argus.domain.errors import UnrecognizedFactValueError
from tests.application.fact_doubles import fact_pipeline

READER = FactValueReader(fact_pipeline())


def test_reads_the_value_with_the_same_extractors_as_the_documents() -> None:
    assert READER.read(EntityType.MONEY, " $ 18.450.000 ") == FactValue(
        EntityType.MONEY, "$ 18.450.000", "18450000"
    )


def test_a_contract_number_is_recognized_without_writing_its_label() -> None:
    assert READER.read(EntityType.CONTRACT_ID, "4857").normalized_value == "4857"


def test_a_text_without_a_value_of_that_type_is_rejected() -> None:
    with pytest.raises(UnrecognizedFactValueError) as raised:
        READER.read(EntityType.MONEY, "dieciocho")

    assert raised.value.entity_type == EntityType.MONEY
    assert raised.value.text == "dieciocho"
