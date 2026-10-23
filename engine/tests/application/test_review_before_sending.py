import pytest

from argus.application.decision_history import DecisionHistories, DecisionRequest
from argus.application.draft_checks import ForeignRecipientCheck, MissingAttachmentCheck
from argus.application.period_mismatch_check import PeriodMismatchCheck
from argus.application.ports.document_reader import DocumentSource
from argus.application.review_before_sending import (
    CaseFileAccess,
    ReviewBeforeSending,
    SendRequest,
    SendReviewTools,
)
from argus.application.review_session_use_cases import StartReviewSession
from argus.application.send_checks import SendCheck
from argus.application.send_decisions import CorrectionSources, OpenCorrectedDraft, SendDecisions
from argus.domain.decision import DecisionKind
from argus.domain.errors import NotADraftEmailError, SendIssueNotFoundError, SessionNotFoundError
from argus.domain.send_review import SendIssueKind, SendReview
from tests.application.in_memory_repositories import (
    InMemoryAlertRepository,
    InMemoryDecisionRepository,
    InMemorySessionRepository,
    SteppingClock,
)
from tests.application.send_doubles import (
    FixedDraftReader,
    InMemoryCaseFileLibrary,
    InMemorySendReviewRepository,
    RecordingDraftWriter,
    RecordingOutbox,
    draft_content,
    month_pipeline,
)

DRAFT = DocumentSource("Remision_contrato_4857.eml", b"borrador")


class SendingFixture:
    def __init__(self) -> None:
        self.sessions, self.clock = InMemorySessionRepository(), SteppingClock()
        self.reviews = InMemorySendReviewRepository()
        self.decision_repository = InMemoryDecisionRepository()
        self.session = StartReviewSession(
            self.sessions, InMemoryAlertRepository(), self.clock
        ).execute("Expediente 2026-118", ("a.pdf",), [])
        checks: list[SendCheck] = [
            PeriodMismatchCheck(month_pipeline()),
            MissingAttachmentCheck(),
            ForeignRecipientCheck(),
        ]
        tools = SendReviewTools(FixedDraftReader(draft_content()), checks, self.clock)
        library = InMemoryCaseFileLibrary()
        self.review = ReviewBeforeSending(
            tools, CaseFileAccess(self.sessions, library), self.reviews
        )
        self.decisions = SendDecisions(
            self.reviews, DecisionHistories(self.decision_repository, self.clock)
        )
        self.writer, self.outbox = RecordingDraftWriter(), RecordingOutbox()
        sources = CorrectionSources(self.reviews, self.decision_repository, library)
        self.open = OpenCorrectedDraft(sources, self.writer, self.outbox)

    def reviewed(self) -> SendReview:
        return self.review.execute(SendRequest(DRAFT, self.session.id))


def test_the_draft_is_checked_against_the_case_file_and_numbered() -> None:
    review = SendingFixture().reviewed()

    assert [issue.kind for issue in review.issues] == [
        SendIssueKind.PERIOD_MISMATCH,
        SendIssueKind.MISSING_ATTACHMENT,
        SendIssueKind.FOREIGN_RECIPIENT,
    ]
    assert [issue.number for issue in review.issues] == [1, 2, 3]


def test_only_an_email_can_be_reviewed_before_sending() -> None:
    fixture = SendingFixture()

    with pytest.raises(NotADraftEmailError):
        fixture.review.execute(
            SendRequest(DocumentSource("Contrato.docx", b""), fixture.session.id)
        )
    with pytest.raises(SessionNotFoundError):
        fixture.review.execute(SendRequest(DRAFT, "no-existe"))


def test_without_a_case_file_only_the_draft_itself_is_checked() -> None:
    review = SendingFixture().review.execute(SendRequest(DRAFT))

    assert review.session_id is None
    assert {issue.kind for issue in review.issues} == {
        SendIssueKind.PERIOD_MISMATCH,
        SendIssueKind.MISSING_ATTACHMENT,
    }


def test_deciding_and_undoing_each_problem() -> None:
    fixture = SendingFixture()
    review = fixture.reviewed()

    state = fixture.decisions.decide(review.id, DecisionRequest(3, DecisionKind.ERROR))
    assert state.can_undo
    assert fixture.decisions.undo(review.id).decisions == ()
    with pytest.raises(SendIssueNotFoundError):
        fixture.decisions.decide(review.id, DecisionRequest(9, DecisionKind.CORRECT))


def test_the_corrected_copy_applies_only_the_problems_marked_as_errors() -> None:
    fixture = SendingFixture()
    review = fixture.reviewed()
    for number in (1, 2, 3):
        fixture.decisions.decide(review.id, DecisionRequest(number, DecisionKind.ERROR))
    fixture.decisions.decide(review.id, DecisionRequest(2, DecisionKind.IGNORED))

    fixture.open.execute(review.id)

    (corrections,) = fixture.writer.corrections
    assert corrections.removed_recipients == {"contabilidad@inmobiliariaprisma.co"}
    assert corrections.removed_attachments == {"Informe_gestion_mayo_2026.pdf"}
    assert [source.name for source in corrections.added_attachments] == [
        "Informe_gestion_junio_2026.pdf"
    ]
    assert fixture.outbox.delivered == [
        (review.id, "Remision_contrato_4857.eml", b"borrador-corregido")
    ]
