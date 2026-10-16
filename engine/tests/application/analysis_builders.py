"""Documentos e índices de entidades armados a mano para probar las fuentes de alertas."""

from collections.abc import Sequence

from argus.application.review_analyzers import AnalysisContext
from argus.domain.document import Document, DocumentFormat, TextFragment
from argus.domain.entity import Entity, EntityType, Occurrence
from argus.domain.entity_index import EntityIndex
from argus.domain.locations import LineLocation
from argus.domain.preferences import UserPreferences


def found(entity_type: EntityType, values: tuple[str, str], document: str) -> Entity:
    """Una entidad con su valor original y normalizado, leída en la línea 1 del documento."""
    raw, normalized = values
    occurrence = Occurrence(document, LineLocation(1), f"…{raw}…")
    return Entity(entity_type, raw, normalized, occurrence)


def text_document(name: str, *lines: str, attachments: Sequence[Document] = ()) -> Document:
    fragments = tuple(TextFragment(line, LineLocation(n)) for n, line in enumerate(lines, 1))
    document_format = DocumentFormat.EML if attachments else DocumentFormat.TEXT
    return Document(name, document_format, fragments, tuple(attachments))


def context_with(documents: Sequence[Document], entities: Sequence[Entity]) -> AnalysisContext:
    return AnalysisContext(tuple(documents), EntityIndex(entities), UserPreferences())
