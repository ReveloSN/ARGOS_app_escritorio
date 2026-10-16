from datetime import timedelta

import pytest

from argus.application.ports.document_archive import ArchivedFile
from argus.application.ports.document_reader import DocumentSource
from argus.application.review_history import (
    HistoryRepositories,
    PurgeExpiredHistory,
    ReviewHistory,
)
from argus.application.review_session_use_cases import CloseReviewSession, StartReviewSession
from argus.domain.alert import Alert
from argus.domain.decision import Decision, DecisionKind
from argus.domain.entity import EntityType
from argus.domain.risk import RiskLevel
from tests.application.in_memory_repositories import (
    START,
    InMemoryAlertRepository,
    InMemoryDecisionRepository,
    InMemoryDocumentArchive,
    InMemorySessionRepository,
    SteppingClock,
)
from tests.domain.alert_builders import candidate

DOCUMENTS = ("Contrato_4857_v3.pdf", "Anexo_1_condiciones.docx")
CONTRACT_ALERT = Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH)
MONEY_ALERT = Alert.from_candidate(candidate(EntityType.MONEY), RiskLevel.HIGH)


def history_repositories() -> HistoryRepositories:
    return HistoryRepositories(
        InMemorySessionRepository(), InMemoryAlertRepository(), InMemoryDecisionRepository()
    )


def test_overview_lists_sessions_with_their_decided_alerts_and_metrics() -> None:
    repositories, clock = history_repositories(), SteppingClock()
    start = StartReviewSession(repositories.sessions, repositories.alerts, clock)
    old = start.execute("Antigua", DOCUMENTS, [CONTRACT_ALERT])
    recent = start.execute("Reciente", DOCUMENTS, [CONTRACT_ALERT, MONEY_ALERT])
    repositories.decisions.save(old.id, Decision(1, DecisionKind.ERROR, START))
    repositories.decisions.save(recent.id, Decision(1, DecisionKind.ERROR, START))
    repositories.decisions.save(recent.id, Decision(2, DecisionKind.CORRECT, START))
    CloseReviewSession(repositories.sessions, clock).execute(recent.id)

    overview = ReviewHistory(repositories).overview(since=recent.created_at)

    assert [(e.session.name, e.decided_count) for e in overview.entries] == [("Reciente", 2)]
    assert overview.metrics.session_count == 1
    assert overview.metrics.resolved_alerts == 2
    assert overview.metrics.real_error_rate == pytest.approx(0.5)
    assert overview.metrics.mean_review_duration == timedelta(minutes=1)


def test_records_include_every_alert_with_its_decision_or_pending() -> None:
    repositories = history_repositories()
    start = StartReviewSession(repositories.sessions, repositories.alerts, SteppingClock())
    session = start.execute("Expediente", DOCUMENTS, [CONTRACT_ALERT, MONEY_ALERT])
    decision = Decision(2, DecisionKind.IGNORED, START)
    repositories.decisions.save(session.id, decision)

    records = ReviewHistory(repositories).records(since=START)

    assert [(r.alert.number, r.decision) for r in records] == [(1, None), (2, decision)]
    assert {r.session.name for r in records} == {"Expediente"}


def test_purge_deletes_sessions_older_than_the_retention_with_their_files() -> None:
    sessions, archive = InMemorySessionRepository(), InMemoryDocumentArchive()
    days = SteppingClock(step=timedelta(days=60))
    start = StartReviewSession(sessions, InMemoryAlertRepository(), days)
    old = start.execute("Antigua", DOCUMENTS, [])
    recent = start.execute("Reciente", DOCUMENTS, [])
    archive.store(ArchivedFile(old.id, 0, DocumentSource("a.pdf", b"%PDF")))
    archive.store(ArchivedFile(recent.id, 0, DocumentSource("b.pdf", b"%PDF")))

    # El reloj marca 120 días desde el inicio: la primera sesión tiene 120 días y la otra, 60.
    deleted = PurgeExpiredHistory(sessions, archive, days).execute(timedelta(days=90))

    assert deleted == 1
    assert list(sessions.sessions) == [recent.id]
    assert list(archive.files) == [(recent.id, 0)]
