"""Flujo completo sobre SQLite: iniciar, decidir, deshacer, rehacer, cerrar y medir."""

from datetime import timedelta
from pathlib import Path

import pytest

from argus.api.composition import ReviewStorage, build_review_storage
from argus.application.decision_history import DecisionHistory, DecisionRequest
from argus.application.review_session_use_cases import (
    CloseReviewSession,
    ComputeUsageMetrics,
    StartReviewSession,
)
from argus.domain.alert import Alert
from argus.domain.decision import CorrectSide, DecisionKind
from argus.domain.entity import EntityType
from argus.domain.risk import RiskLevel
from tests.application.in_memory_repositories import START, SteppingClock
from tests.domain.alert_builders import candidate

ALERTS = [
    Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH),
    Alert.from_candidate(candidate(EntityType.MONEY), RiskLevel.HIGH),
    Alert.from_candidate(candidate(EntityType.PERSON_NAME), RiskLevel.MEDIUM),
]
DOCUMENTS = ("Contrato_4857_v3.pdf", "Anexo_1_condiciones.docx")


@pytest.fixture
def storage(tmp_path: Path) -> ReviewStorage:
    return build_review_storage(tmp_path / "argus.sqlite3")


def test_decide_undo_and_redo_are_persisted(storage: ReviewStorage) -> None:
    clock = SteppingClock()
    session = StartReviewSession(storage.sessions, storage.alerts, clock).execute(
        "Expediente 2026-118", DOCUMENTS, ALERTS
    )
    history = DecisionHistory(session.id, storage.decisions, clock)

    history.decide(DecisionRequest(1, DecisionKind.ERROR, CorrectSide.FIRST))
    history.decide(DecisionRequest(1, DecisionKind.CORRECT))
    history.undo()
    restored = storage.decisions.get(session.id, 1)
    history.undo()
    pending = storage.decisions.get(session.id, 1)
    history.redo()

    assert restored is not None
    assert restored.kind is DecisionKind.ERROR
    assert restored.correct_side is CorrectSide.FIRST
    assert pending is None
    assert storage.decisions.get(session.id, 1) == restored


def test_usage_metrics_are_computed_from_the_stored_history(storage: ReviewStorage) -> None:
    clock = SteppingClock(step=timedelta(minutes=2))
    start = StartReviewSession(storage.sessions, storage.alerts, clock)
    close = CloseReviewSession(storage.sessions, clock)
    first = start.execute("Expediente 2026-118", DOCUMENTS, ALERTS)
    second = start.execute("Informe de gestión junio 2026", DOCUMENTS, ALERTS[:1])
    first_history = DecisionHistory(first.id, storage.decisions, clock)
    first_history.decide(DecisionRequest(1, DecisionKind.ERROR))
    first_history.decide(DecisionRequest(2, DecisionKind.CORRECT))
    first_history.decide(DecisionRequest(3, DecisionKind.IGNORED))
    DecisionHistory(second.id, storage.decisions, clock).decide(
        DecisionRequest(1, DecisionKind.ERROR)
    )
    close.execute(first.id)
    close.execute(second.id)

    metrics = ComputeUsageMetrics(storage.sessions, storage.decisions).execute(since=START)

    assert metrics.session_count == 2
    assert metrics.resolved_alerts == 4
    assert metrics.real_error_count == 2
    assert metrics.real_error_rate == pytest.approx(0.5)
    # Se abrieron en los minutos 0 y 2 y se cerraron en los minutos 12 y 14.
    assert metrics.mean_review_duration == timedelta(minutes=12)
