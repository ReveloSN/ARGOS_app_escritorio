"""Comparación de documentos tal como la consume la interfaz (pantalla Comparar documentos)."""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import Field

from argus.api.schemas.review import (
    AlertResponse,
    CamelModel,
    DecisionsResponse,
    DocumentResponse,
)
from argus.domain.text_comparison.modes import ComparisonModeName


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


class MeaningResponse(CamelModel):
    """«IA: Reformulado» o «IA: Cambio de sentido», con su confianza (0 a 1)."""

    meaning: str
    confidence: float


class ChangeResponse(CamelModel):
    # Número del cambio en toda la comparación, en orden de lectura de cada par.
    number: int
    kind: str
    risk: str
    materialities: list[str]
    is_moved: bool
    # De qué trata el cambio («negation», «amount», «added»…): la interfaz elige su explicación.
    topic: str
    first: SegmentResponse | None
    second: SegmentResponse | None
    edits: list[WordEditResponse]
    meaning: MeaningResponse | None


class SessionComparisonBody(CamelModel):
    """Comparar archivos de una revisión guardada, sin volver a cargarlos."""

    session_id: str
    name: Annotated[str, Field(min_length=1)]
    mode: ComparisonModeName
    documents: list[str]


class ChangeSummaryResponse(CamelModel):
    by_kind: dict[str, int]
    by_risk: dict[str, int]


class PairComparisonResponse(CamelModel):
    first_document: str
    second_document: str
    summary: ChangeSummaryResponse
    changes: list[ChangeResponse]
    # Texto completo de cada lado, segmento por segmento, para los dos paneles.
    first_segments: list[SegmentResponse]
    second_segments: list[SegmentResponse]
    match_ratio: float
    # Coinciden menos del 20 %: la interfaz sugiere «Buscar inconsistencias».
    seems_unrelated: bool


class ComparisonResponse(CamelModel):
    id: str
    name: str
    mode: str
    created_at: datetime
    documents: list[DocumentResponse]
    summary: ChangeSummaryResponse
    pairs: list[PairComparisonResponse]
    # Alertas de la revisión por entidades; su número sigue al último cambio.
    inconsistencies: list[AlertResponse]
    decisions: DecisionsResponse


class ComparisonDecisionBody(CamelModel):
    # Número de un cambio o de una inconsistencia de la comparación.
    number: int
    kind: Literal["correct", "error", "ignored"]
    correct_side: Literal["first", "second"] | None = None


class PairComparedEvent(CamelModel):
    position: int
    total: int
