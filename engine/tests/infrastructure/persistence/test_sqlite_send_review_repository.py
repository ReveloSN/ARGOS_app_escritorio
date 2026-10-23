import pytest

from argus.domain.errors import SendReviewNotFoundError
from argus.domain.risk import RiskLevel
from argus.domain.send_review import (
    DraftPart,
    SendFix,
    SendFixKind,
    SendIssue,
    SendIssueKind,
    SendReview,
)
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase
from argus.infrastructure.persistence.sqlite_send_review_repository import (
    SqliteSendReviewRepository,
)
from argus.infrastructure.persistence.sqlite_session_repository import SqliteSessionRepository
from tests.application.send_doubles import draft_content
from tests.infrastructure.persistence.conftest import STARTED, new_session

ISSUE = SendIssue(
    1,
    SendIssueKind.FOREIGN_RECIPIENT,
    RiskLevel.MEDIUM,
    DraftPart.CC,
    "contabilidad@inmobiliariaprisma.co",
    {"recipient": "contabilidad@inmobiliariaprisma.co"},
    SendFix(SendFixKind.REMOVE_RECIPIENT, "contabilidad@inmobiliariaprisma.co"),
)


def test_a_reviewed_draft_comes_back_with_its_original(database: SqliteDatabase) -> None:
    session = new_session()
    SqliteSessionRepository(database).save(session)
    repository = SqliteSendReviewRepository(database)
    review = SendReview("r1", session.id, STARTED, draft_content().draft, (ISSUE,))

    repository.save(review, b"original")

    assert repository.get("r1") == review
    assert repository.original_of("r1") == b"original"


def test_deleting_the_case_file_keeps_the_draft_review(database: SqliteDatabase) -> None:
    session = new_session()
    sessions = SqliteSessionRepository(database)
    sessions.save(session)
    repository = SqliteSendReviewRepository(database)
    repository.save(SendReview("r1", session.id, STARTED, draft_content().draft, ()), b"x")

    sessions.delete(session.id)

    assert repository.get("r1").session_id is None


def test_an_unknown_draft_review_is_not_found(database: SqliteDatabase) -> None:
    repository = SqliteSendReviewRepository(database)

    with pytest.raises(SendReviewNotFoundError):
        repository.get("no-existe")
    with pytest.raises(SendReviewNotFoundError):
        repository.original_of("no-existe")
