from collections.abc import Iterable, Sequence

from argus.application.excerpt import excerpt_around
from argus.application.ports.entity_extractor import EntityExtractor, EntityMatch
from argus.domain.document import Document, TextFragment
from argus.domain.entity import Entity, Occurrence
from argus.domain.entity_index import EntityIndex


class EntityExtractionPipeline:
    """Cadena de extractores aplicada a cada fragmento, en orden de prioridad.

    Un tramo de texto reconocido por un extractor queda reservado: los siguientes no lo vuelven
    a leer. Así «NIT 900.482.315-7» no aparece también como monto, ni «1 de julio de 2026» como
    el periodo «julio de 2026». El orden lo fija la raíz de composición.
    """

    def __init__(self, extractors: Sequence[EntityExtractor]) -> None:
        self._extractors = tuple(extractors)

    def extract(self, document: Document) -> tuple[Entity, ...]:
        own = (
            entity
            for fragment in document.fragments
            for entity in self._extract_fragment(document.name, fragment)
        )
        nested = (
            entity for attachment in document.attachments for entity in self.extract(attachment)
        )
        return (*own, *nested)

    def build_index(self, documents: Iterable[Document]) -> EntityIndex:
        return EntityIndex(entity for document in documents for entity in self.extract(document))

    def matches(self, text: str) -> list[EntityMatch]:
        """Valores reconocidos en un texto suelto, en orden de aparición."""
        claimed: list[EntityMatch] = []
        for extractor in self._extractors:
            claim_free_matches(extractor.extract(text), claimed)
        return sorted(claimed, key=lambda match: match.start)

    def _extract_fragment(self, document_name: str, fragment: TextFragment) -> list[Entity]:
        return [to_entity(document_name, fragment, match) for match in self.matches(fragment.text)]


def claim_free_matches(candidates: Iterable[EntityMatch], claimed: list[EntityMatch]) -> None:
    for candidate in candidates:
        if not any(candidate.overlaps(match) for match in claimed):
            claimed.append(candidate)


def to_entity(document_name: str, fragment: TextFragment, match: EntityMatch) -> Entity:
    excerpt = excerpt_around(fragment.text, match.start, match.end)
    occurrence = Occurrence(document_name, fragment.location, excerpt)
    return Entity(match.type, match.raw_value, match.normalized_value, occurrence)
