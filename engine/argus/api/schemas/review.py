"""Revisión tal como la consume la interfaz: Confirmar lectura, Resultados y Detalle."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Campos en camelCase en el JSON, como los consume TypeScript."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, frozen=True)


class SessionResponse(CamelModel):
    id: str
    name: str
    created_at: datetime
    closed_at: datetime | None


class DocumentResponse(CamelModel):
    name: str
    status: Literal["read", "unreadable"]
    reason: str | None
    fragment_count: int


class OccurrenceResponse(CamelModel):
    document: str
    location: dict[str, str | int]
    excerpt: str


class AlertSideResponse(CamelModel):
    value: str
    normalized_value: str
    occurrences: list[OccurrenceResponse]


class ExplanationPartResponse(CamelModel):
    # Clave del texto en los archivos de idioma de la interfaz («explanation.lead.money»).
    key: str
    params: dict[str, str | int]
    # Cantidad para elegir singular o plural; None si la frase no la necesita.
    count: int | None


class AlertResponse(CamelModel):
    number: int
    risk: str
    entity_type: str
    difference_kind: str
    confidence: float
    # Posiciones distintas entre los dos valores tal como están escritos; vacío si miden distinto.
    highlight_positions: list[int]
    first: AlertSideResponse
    # Sin segundo valor en las verificaciones de un solo dato (fecha imposible, campo vacío).
    second: AlertSideResponse | None
    explanation: list[ExplanationPartResponse]


class DecisionResponse(CamelModel):
    alert_number: int
    kind: str
    correct_side: str | None
    decided_at: datetime


class DecisionsResponse(CamelModel):
    decisions: list[DecisionResponse]
    can_undo: bool


class ReviewResponse(CamelModel):
    session: SessionResponse
    documents: list[DocumentResponse]
    alerts: list[AlertResponse]
    decisions: DecisionsResponse


class DecisionRequestBody(CamelModel):
    alert_number: int
    kind: Literal["correct", "error", "ignored"]
    correct_side: Literal["first", "second"] | None = None


class DocumentStartedEvent(CamelModel):
    position: int
    name: str


class DocumentFinishedEvent(CamelModel):
    position: int
    document: DocumentResponse
