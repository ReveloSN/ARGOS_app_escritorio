import pytest

from argus.application.ports.document_reader import DocumentSource
from argus.application.review_recording import ReviewDraft, StoredReviewRecorder
from argus.application.review_session_use_cases import StartReviewSession
from argus.domain.alert import Alert
from argus.domain.document import Document, DocumentFormat, TextFragment
from argus.domain.entity import EntityType
from argus.domain.errors import InvalidValueError, UnreadableReason
from argus.domain.locations import LineLocation
from argus.domain.read_outcome import DocumentReadOutcome
from argus.domain.risk import RiskLevel
from tests.application.in_memory_repositories import (
    InMemoryAlertRepository,
    InMemoryDocumentArchive,
    InMemoryDocumentRepository,
    InMemorySessionRepository,
    SteppingClock,
)
from tests.domain.alert_builders import candidate

CONTRACT = DocumentSource("contrato.txt", b"Contrato No. 4857")
SCANNED = DocumentSource("escaneado.pdf", b"%PDF")
READ = DocumentReadOutcome(
    "contrato.txt",
    Document(
        "contrato.txt", DocumentFormat.TEXT, (TextFragment("Contrato No. 4857", LineLocation(1)),)
    ),
    None,
)
UNREAD = DocumentReadOutcome("escaneado.pdf", None, UnreadableReason.NO_TEXT)
ALERT = Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH)


def test_recording_saves_the_session_how_each_file_was_read_and_a_copy_of_the_read_ones() -> None:
    sessions, documents, archive = (
        InMemorySessionRepository(),
        InMemoryDocumentRepository(),
        InMemoryDocumentArchive(),
    )
    start = StartReviewSession(sessions, InMemoryAlertRepository(), SteppingClock())
    recorder = StoredReviewRecorder(start, documents, archive)

    session = recorder.record(
        ReviewDraft("Revisión", (CONTRACT, SCANNED), (READ, UNREAD), (ALERT,))
    )

    assert sessions.get(session.id).document_names == ("contrato.txt", "escaneado.pdf")
    assert [summary.name for summary in documents.list_for(session.id)] == [
        "contrato.txt",
        "escaneado.pdf",
    ]
    assert list(archive.files) == [(session.id, 0)]
    assert archive.files[(session.id, 0)].source == CONTRACT


def test_each_uploaded_file_needs_its_read_outcome() -> None:
    with pytest.raises(InvalidValueError):
        ReviewDraft("Revisión", (CONTRACT, SCANNED), (READ,), ())
