import re
from collections.abc import Iterator

from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.excerpt import CONTEXT_CHARS, ELLIPSIS, excerpt_around
from argus.application.ports.entity_extractor import EntityMatch
from argus.domain.document import Document, DocumentFormat, TextFragment
from argus.domain.entity import EntityType
from argus.domain.locations import LineLocation, PageLocation


class PatternExtractor:
    """Extractor de prueba: reconoce un patrón y lo reporta con el tipo indicado."""

    def __init__(self, entity_type: EntityType, pattern: str) -> None:
        self._entity_type = entity_type
        self._pattern = re.compile(pattern)

    def extract(self, text: str) -> Iterator[EntityMatch]:
        for match in self._pattern.finditer(text):
            yield EntityMatch(
                self._entity_type, match.group(), match.group().upper(), match.start(), match.end()
            )


CONTRACTS = PatternExtractor(EntityType.CONTRACT_ID, r"\d{4}")
NUMBERS = PatternExtractor(EntityType.MONEY, r"\d+")


def document_with(*texts: str, name: str = "Contrato_4857_v3.pdf") -> Document:
    fragments = tuple(
        TextFragment(text, PageLocation(page)) for page, text in enumerate(texts, start=1)
    )
    return Document(name, DocumentFormat.PDF, fragments)


def test_each_entity_keeps_document_location_and_excerpt() -> None:
    pipeline = EntityExtractionPipeline([CONTRACTS])

    (entity,) = pipeline.extract(document_with("Portada", "Contrato No. 4857"))

    assert entity.type is EntityType.CONTRACT_ID
    assert entity.raw_value == "4857"
    assert entity.occurrence.document_name == "Contrato_4857_v3.pdf"
    assert entity.occurrence.location == PageLocation(2)
    assert entity.occurrence.excerpt == "Contrato No. 4857"


def test_earlier_extractors_claim_text_before_later_ones() -> None:
    pipeline = EntityExtractionPipeline([CONTRACTS, NUMBERS])

    entities = pipeline.extract(document_with("Contrato 4857 por 12 meses"))

    assert [(entity.type, entity.raw_value) for entity in entities] == [
        (EntityType.CONTRACT_ID, "4857"),
        (EntityType.MONEY, "12"),
    ]


def test_entities_are_ordered_by_position_within_a_fragment() -> None:
    pipeline = EntityExtractionPipeline([NUMBERS, CONTRACTS])

    entities = pipeline.extract(document_with("12 y 4857"))

    assert [entity.raw_value for entity in entities] == ["12", "4857"]


def test_attachments_are_extracted_with_their_own_name() -> None:
    attachment = document_with("Contrato 4587", name="notas.txt")
    email = Document(
        "Correo_remision_cliente.eml",
        DocumentFormat.EML,
        (TextFragment("Ref. 4857", LineLocation(1)),),
        attachments=(attachment,),
    )

    entities = EntityExtractionPipeline([CONTRACTS]).extract(email)

    assert {(e.raw_value, e.occurrence.document_name) for e in entities} == {
        ("4857", "Correo_remision_cliente.eml"),
        ("4587", "notas.txt"),
    }


def test_index_groups_entities_from_all_documents() -> None:
    pipeline = EntityExtractionPipeline([CONTRACTS])
    documents = [document_with("4857"), document_with("4857", name="Correo.eml")]

    index = pipeline.build_index(documents)

    assert index.documents_with(EntityType.CONTRACT_ID, "4857") == frozenset(
        {"Contrato_4857_v3.pdf", "Correo.eml"}
    )


def test_short_text_is_used_whole_as_excerpt() -> None:
    assert excerpt_around("Contrato No. 4857", 13, 17) == "Contrato No. 4857"


def test_long_text_is_trimmed_around_the_value_with_ellipsis() -> None:
    before, after = "a" * (CONTEXT_CHARS + 20), "b" * (CONTEXT_CHARS + 20)
    text = f"{before}4857{after}"

    excerpt = excerpt_around(text, len(before), len(before) + 4)

    expected = f"{'a' * CONTEXT_CHARS}4857{'b' * CONTEXT_CHARS}"
    assert excerpt == f"{ELLIPSIS}{expected}{ELLIPSIS}"
