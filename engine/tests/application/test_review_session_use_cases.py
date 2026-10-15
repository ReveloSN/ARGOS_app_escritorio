from datetime import timedelta

import pytest

from argus.application.review_session_use_cases import (
    CloseReviewSession,
    ComputeUsageMetrics,
    StartReviewSession,
)
from argus.domain.alert import Alert
from argus.domain.decision import Decision, DecisionKind
from argus.domain.entity import EntityType
from argus.domain.errors import SessionNotFoundError
from argus.domain.review_session import SessionStatus
from argus.domain.risk import RiskLevel
from tests.application.in_memory_repositories import (
    START,
    InMemoryAlertRepository,
    InMemoryDecisionRepository,
    InMemorySessionRepository,
    SteppingClock,
)
from tests.domain.alert_builders import candidate

DOCUMENTS = ("Contrato_4857_v3.pdf", "Anexo_1_condiciones.docx")
CONTRACT_ALERT = Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH)
MONEY_ALERT = Alert.from_candidate(candidate(EntityType.MONEY), RiskLevel.HIGH)


def test_starting_a_review_saves_the_session_and_numbers_alerts_in_priority_order() -> None:
    sessions, alerts = InMemorySessionRepository(), InMemoryAlertRepository()
    start = StartReviewSession(sessions, alerts, SteppingClock())

    session = start.execute("Expediente 2026-118", DOCUMENTS, [CONTRACT_ALERT, MONEY_ALERT])

    assert sessions.get(session.id) == session
    assert session.alert_count == 2
    assert session.created_at == START
    assert [(a.number, a.alert) for a in alerts.list_for(session.id)] == [
        (1, CONTRACT_ALERT),
        (2, MONEY_ALERT),
    ]


def test_closing_a_review_records_the_closing_time() -> None:
    sessions, clock = InMemorySessionRepository(), SteppingClock()
    session = StartReviewSession(sessions, InMemoryAlertRepository(), clock).execute(
        "Expediente", DOCUMENTS, [CONTRACT_ALERT]
    )

    closed = CloseReviewSession(sessions, clock).execute(session.id)

    assert closed.status is SessionStatus.CLOSED
    assert closed.review_duration == timedelta(minutes=1)
    assert sessions.get(session.id) == closed


def test_closing_an_unknown_session_fails_explicitly() -> None:
    with pytest.raises(SessionNotFoundError):
        CloseReviewSession(InMemorySessionRepository(), SteppingClock()).execute("no-existe")


def test_metrics_cover_sessions_created_since_the_given_date() -> None:
    sessions, decisions, clock = (
        InMemorySessionRepository(),
        InMemoryDecisionRepository(),
        SteppingClock(),
    )
    start = StartReviewSession(sessions, InMemoryAlertRepository(), clock)
    old = start.execute("Antigua", DOCUMENTS, [CONTRACT_ALERT])
    recent = start.execute("Reciente", DOCUMENTS, [CONTRACT_ALERT, MONEY_ALERT])
    decisions.save(old.id, Decision(1, DecisionKind.ERROR, START))
    decisions.save(recent.id, Decision(1, DecisionKind.ERROR, START))
    decisions.save(recent.id, Decision(2, DecisionKind.CORRECT, START))

    metrics = ComputeUsageMetrics(sessions, decisions).execute(since=recent.created_at)

    assert metrics.session_count == 1
    assert metrics.resolved_alerts == 2
    assert metrics.real_error_rate == pytest.approx(0.5)
