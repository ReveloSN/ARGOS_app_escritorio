import pytest

from argus.application.open_review import OpenReview, StoredReviewRepositories
from argus.application.review_session_use_cases import StartReviewSession
from argus.domain.alert import Alert
from argus.domain.entity import EntityType
from argus.domain.errors import SessionNotFoundError, UnreadableReason
from argus.domain.read_outcome import DocumentReadOutcome, ReadSummary
from argus.domain.risk import RiskLevel
from tests.application.in_memory_repositories import (
    InMemoryAlertRepository,
    InMemoryDocumentRepository,
    InMemorySessionRepository,
    SteppingClock,
)
from tests.domain.alert_builders import candidate

ALERT = Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH)


def test_opening_a_stored_review_returns_its_files_and_numbered_alerts() -> None:
    repositories = StoredReviewRepositories(
        InMemorySessionRepository(), InMemoryAlertRepository(), InMemoryDocumentRepository()
    )
    start = StartReviewSession(repositories.sessions, repositories.alerts, SteppingClock())
    session = start.execute("Expediente", ("escaneado.pdf",), [ALERT])
    repositories.documents.save_all(
        session.id, [DocumentReadOutcome("escaneado.pdf", None, UnreadableReason.NO_TEXT)]
    )

    review = OpenReview(repositories).execute(session.id)

    assert review.session == session
    assert review.documents == (ReadSummary("escaneado.pdf", UnreadableReason.NO_TEXT, 0),)
    assert [(item.number, item.alert) for item in review.alerts] == [(1, ALERT)]


def test_opening_an_unknown_review_fails_explicitly() -> None:
    repositories = StoredReviewRepositories(
        InMemorySessionRepository(), InMemoryAlertRepository(), InMemoryDocumentRepository()
    )

    with pytest.raises(SessionNotFoundError):
        OpenReview(repositories).execute("no-existe")
