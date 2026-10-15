"""Respuesta de POST /reviews: lo que la interfaz necesita para Confirmar lectura y Resultados."""

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


class AlertResponse(CamelModel):
    number: int
    risk: str
    entity_type: str
    difference_kind: str
    confidence: float
    # Posiciones distintas entre los dos valores tal como están escritos; vacío si miden distinto.
    highlight_positions: list[int]
    first: AlertSideResponse
    second: AlertSideResponse


class ReviewResponse(CamelModel):
    session: SessionResponse
    documents: list[DocumentResponse]
    alerts: list[AlertResponse]
