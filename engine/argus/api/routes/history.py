from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Query

from argus.api.composition import EngineServices
from argus.api.schemas.history import (
    HistoryRecordResponse,
    HistoryResponse,
    HistorySessionResponse,
    MetricsResponse,
)
from argus.application.review_history import HistoryEntry, HistoryRecord
from argus.domain.usage_metrics import UsageMetrics

DEFAULT_PERIOD_DAYS = 30
MAX_PERIOD_DAYS = 3650

type PeriodDays = Annotated[int, Query(ge=1, le=MAX_PERIOD_DAYS)]


def build_history_router(services: EngineServices) -> APIRouter:
    router = APIRouter(prefix="/history")

    @router.get("")
    def get_history(days: PeriodDays = DEFAULT_PERIOD_DAYS) -> HistoryResponse:
        overview = services.history.overview(_start_of_period(days))
        return HistoryResponse(
            metrics=_metrics(overview.metrics),
            sessions=[_session(entry) for entry in overview.entries],
        )

    @router.get("/records")
    def get_records(days: PeriodDays = DEFAULT_PERIOD_DAYS) -> list[HistoryRecordResponse]:
        return [_record(record) for record in services.history.records(_start_of_period(days))]

    return router


def _start_of_period(days: int) -> datetime:
    return datetime.now(UTC) - timedelta(days=days)


def _metrics(metrics: UsageMetrics) -> MetricsResponse:
    duration = metrics.mean_review_duration
    return MetricsResponse(
        session_count=metrics.session_count,
        resolved_alerts=metrics.resolved_alerts,
        real_error_count=metrics.real_error_count,
        real_error_rate=metrics.real_error_rate,
        mean_review_seconds=None if duration is None else duration.total_seconds(),
    )


def _session(entry: HistoryEntry) -> HistorySessionResponse:
    session = entry.session
    return HistorySessionResponse(
        id=session.id,
        name=session.name,
        created_at=session.created_at,
        closed_at=session.closed_at,
        status=session.status,
        document_count=len(session.document_names),
        alert_count=session.alert_count,
        decided_count=entry.decided_count,
    )


def _record(record: HistoryRecord) -> HistoryRecordResponse:
    alert, decision = record.alert.alert, record.decision
    return HistoryRecordResponse(
        session_name=record.session.name,
        session_created_at=record.session.created_at,
        alert_number=record.alert.number,
        risk=alert.risk,
        entity_type=alert.entity_type,
        first_value=alert.first.representative.raw_value,
        second_value=alert.second.representative.raw_value,
        decision=None if decision is None else decision.kind,
        correct_side=None if decision is None else decision.correct_side,
        decided_at=None if decision is None else decision.decided_at,
    )
