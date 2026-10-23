from datetime import UTC, datetime

from argus.application.ports.document_reader import DocumentSource
from argus.application.reread_review import RereadReview
from argus.application.review_history import DiscardUnreviewedSession
from argus.application.review_progress import SILENT_PROGRESS, ReviewProgress
from argus.application.run_review import ReviewOutcome, ReviewRequest
from argus.domain.decision import Decision, DecisionKind
from argus.domain.review_session import ReviewSession
from tests.application.in_memory_repositories import (
    InMemoryDecisionRepository,
    InMemoryDocumentArchive,
    InMemorySessionRepository,
)

CREATED = datetime(2026, 10, 23, 9, 0, tzinfo=UTC)
PREVIOUS = ReviewSession("s-anterior", "Revisión", ("anexo_3.pdf",), CREATED, 0)
NEW = ReviewSession("s-nueva", "Revisión", ("anexo_3.pdf",), CREATED, 0)


class FixedRunner:
    def execute(
        self, request: ReviewRequest, progress: ReviewProgress = SILENT_PROGRESS
    ) -> ReviewOutcome:
        return ReviewOutcome(NEW, (), ())


def reread(
    decisions: InMemoryDecisionRepository | None = None,
) -> tuple[RereadReview, InMemorySessionRepository]:
    sessions = InMemorySessionRepository()
    sessions.save(PREVIOUS)
    discard = DiscardUnreviewedSession(
        sessions, decisions or InMemoryDecisionRepository(), InMemoryDocumentArchive()
    )
    return RereadReview(FixedRunner(), discard), sessions


def request(replaces: str | None) -> ReviewRequest:
    return ReviewRequest("Revisión", (DocumentSource("anexo_3.pdf", b"%PDF"),), replaces)


def test_rereading_with_ocr_discards_the_previous_unreviewed_reading() -> None:
    use_case, sessions = reread()

    outcome = use_case.execute(request(PREVIOUS.id))

    assert outcome.session == NEW
    assert sessions.list_created_since(CREATED) == ()


def test_a_reading_with_decisions_is_kept_in_the_history() -> None:
    decisions = InMemoryDecisionRepository()
    decisions.save(PREVIOUS.id, Decision(1, DecisionKind.ERROR, CREATED))
    use_case, sessions = reread(decisions)

    use_case.execute(request(PREVIOUS.id))

    assert sessions.get(PREVIOUS.id) == PREVIOUS


def test_a_normal_review_discards_nothing_and_an_unknown_one_is_ignored() -> None:
    use_case, sessions = reread()

    use_case.execute(request(None))
    use_case.execute(request("s-que-no-existe"))

    assert sessions.get(PREVIOUS.id) == PREVIOUS
