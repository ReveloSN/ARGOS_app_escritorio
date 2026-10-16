"""Búsqueda en el texto de los documentos y apertura del archivo original."""

from argus.api.schemas.review import CamelModel


class DocumentMatchResponse(CamelModel):
    document: str
    location: dict[str, str | int]
    excerpt: str
    # Dónde está, dentro del fragmento, el texto buscado (para resaltarlo).
    highlight_start: int
    highlight_end: int


class OpenDocumentRequest(CamelModel):
    document: str
