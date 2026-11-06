from collections.abc import Iterable, Iterator, Sequence
from itertools import accumulate, groupby

from argus.application.excerpt import excerpt_around
from argus.application.ports.entity_extractor import EntityExtractor, EntityMatch
from argus.domain.document import Document, NamedFragment, TextFragment
from argus.domain.entity import Entity, Occurrence
from argus.domain.entity_index import EntityIndex
from argus.domain.text_comparison.segmenter import row_key

# Las celdas de una fila se leen como una frase: «Contrato No.» y «4857» son «Contrato No. 4857».
ROW_SEPARATOR = " "


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
        return (*own, *self._across_cells(document), *nested)

    def _across_cells(self, document: Document) -> Iterator[Entity]:
        """Valores escritos a caballo entre celdas de una fila de tabla u hoja, con la etiqueta en una
        celda y el valor en la siguiente. Se ubican en la celda donde termina el valor."""
        for key, group in groupby(document.fragments, key=lambda item: row_key(item.location)):
            cells = tuple(group)
            if key is not None and len(cells) > 1:
                yield from self._spanning(document.name, cells)

    def _spanning(self, document_name: str, cells: tuple[TextFragment, ...]) -> Iterator[Entity]:
        text = ROW_SEPARATOR.join(cell.text for cell in cells)
        ends = list(accumulate(len(cell.text) + len(ROW_SEPARATOR) for cell in cells))
        for match in self.matches(text):
            first = next(i for i, end in enumerate(ends) if match.start < end)
            last = next(i for i, end in enumerate(ends) if match.end <= end)
            if first != last:
                row = TextFragment(text, cells[last].location)
                yield to_entity(document_name, row, match)

    def build_index(self, documents: Iterable[Document]) -> EntityIndex:
        return EntityIndex(entity for document in documents for entity in self.extract(document))

    def index_fragments(self, fragments: Iterable[NamedFragment]) -> EntityIndex:
        """Índice del texto ya guardado de una revisión, fragmento por fragmento."""
        return EntityIndex(
            entity
            for named in fragments
            for entity in self._extract_fragment(named.document_name, named.fragment)
        )

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
