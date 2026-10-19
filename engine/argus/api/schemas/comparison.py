"""Comparación de documentos tal como la consume la interfaz (pantalla Comparar documentos)."""

from datetime import datetime

from argus.api.schemas.review import CamelModel, DocumentResponse


class TextSpanResponse(CamelModel):
    start: int
    end: int


class SegmentResponse(CamelModel):
    position: int
    kind: str
    text: str
    document: str
    location: dict[str, str | int]
    # Tramo dentro del fragmento leído; None en una fila de tabla (reúne varias celdas).
    span: TextSpanResponse | None


class CharacterEditResponse(CamelModel):
    kind: str
    # Tramos sobre el texto de cada segmento.
    first: TextSpanResponse | None
    second: TextSpanResponse | None


class WordEditResponse(CamelModel):
    kind: str
    first: TextSpanResponse | None
    second: TextSpanResponse | None
    first_text: str
    second_text: str
    characters: list[CharacterEditResponse]


class ChangeResponse(CamelModel):
    # Número del cambio en toda la comparación, en orden de lectura de cada par.
    number: int
    kind: str
    risk: str
    materialities: list[str]
    is_moved: bool
    first: SegmentResponse | None
    second: SegmentResponse | None
    edits: list[WordEditResponse]


class ChangeSummaryResponse(CamelModel):
    by_kind: dict[str, int]
    by_risk: dict[str, int]


class PairComparisonResponse(CamelModel):
    first_document: str
    second_document: str
    summary: ChangeSummaryResponse
    changes: list[ChangeResponse]


class ComparisonResponse(CamelModel):
    id: str
    name: str
    mode: str
    created_at: datetime
    documents: list[DocumentResponse]
    summary: ChangeSummaryResponse
    pairs: list[PairComparisonResponse]


class PairComparedEvent(CamelModel):
    position: int
    total: int
