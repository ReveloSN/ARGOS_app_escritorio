"""Historial: sesiones del periodo, métricas de uso y registro exportable."""

from datetime import datetime

from argus.api.schemas.review import CamelModel


class MetricsResponse(CamelModel):
    session_count: int
    resolved_alerts: int
    real_error_count: int
    # None cuando aún no hay datos: «0 %» o «0 s» sugerirían un resultado que no existe.
    real_error_rate: float | None
    mean_review_seconds: float | None


class HistorySessionResponse(CamelModel):
    id: str
    name: str
    created_at: datetime
    closed_at: datetime | None
    status: str
    document_count: int
    alert_count: int
    decided_count: int


class HistoryResponse(CamelModel):
    metrics: MetricsResponse
    sessions: list[HistorySessionResponse]


class HistoryRecordResponse(CamelModel):
    session_name: str
    session_created_at: datetime
    alert_number: int
    risk: str
    entity_type: str
    first_value: str
    second_value: str
    decision: str | None
    correct_side: str | None
    decided_at: datetime | None
