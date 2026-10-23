from collections.abc import Sequence

from argus.application.document_limits import MAX_DOCUMENT_BYTES
from argus.application.document_loader import DocumentLoader
from argus.application.document_reader_factory import DocumentReaderFactory
from argus.application.ports.document_reader import DocumentSource
from argus.application.review_recording import StoredReviewRecorder
from argus.application.review_session_use_cases import StartReviewSession
from argus.application.run_review import ReviewRequest, RunReview
from argus.domain.alert import Alert
from argus.domain.document import Document, DocumentFormat, TextFragment
from argus.domain.entity import EntityType
from argus.domain.errors import UnreadableDocumentError, UnreadableReason
from argus.domain.locations import LineLocation
from argus.domain.ocr import PageCount
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

CONTRACT_ALERT = Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH)


class LineReader:
    """Lector de prueba: cada línea del texto es un fragmento; «escaneado» no tiene texto."""

    def read(self, source: DocumentSource) -> Document:
        text = source.content.decode()
        if not text:
            raise UnreadableDocumentError(source.name, UnreadableReason.NO_TEXT)
        fragments = tuple(
            TextFragment(line, LineLocation(n)) for n, line in enumerate(text.splitlines(), 1)
        )
        return Document(source.name, DocumentFormat.TEXT, fragments)


class RecordingAnalyzer:
    """Analizador de prueba: guarda qué documentos recibió y devuelve alertas fijas."""

    def __init__(self, alerts: Sequence[Alert]) -> None:
        self.received: list[str] = []
        self._alerts = tuple(alerts)

    def analyze(self, documents: Sequence[Document]) -> tuple[Alert, ...]:
        self.received = [document.name for document in documents]
        return self._alerts


class RecordingProgress:
    """Observer de prueba: anota cada aviso en el orden en que llega."""

    def __init__(self) -> None:
        self.events: list[str] = []

    def document_started(self, position: int, name: str) -> None:
        self.events.append(f"inicia {position} {name}")

    def document_finished(self, position: int, outcome: DocumentReadOutcome) -> None:
        self.events.append(f"termina {position} {'leído' if outcome.is_read else outcome.reason}")

    def page_recognized(self, position: int, pages: PageCount) -> None:
        self.events.append(f"página {pages.done} de {pages.total} del {position}")

    def analysis_started(self) -> None:
        self.events.append("analiza")


def build_run_review(
    analyzer: RecordingAnalyzer,
) -> tuple[RunReview, InMemorySessionRepository, InMemoryAlertRepository]:
    sessions, alerts = InMemorySessionRepository(), InMemoryAlertRepository()
    readers = DocumentReaderFactory({DocumentFormat.TEXT: LineReader()})
    start = StartReviewSession(sessions, alerts, SteppingClock())
    recorder = StoredReviewRecorder(start, InMemoryDocumentRepository(), InMemoryDocumentArchive())
    return RunReview(DocumentLoader(readers), analyzer, recorder), sessions, alerts


def request(*sources: DocumentSource) -> ReviewRequest:
    return ReviewRequest("Expediente de prueba", sources)


def test_readable_documents_are_analyzed_and_the_session_is_saved() -> None:
    analyzer = RecordingAnalyzer([CONTRACT_ALERT])
    run_review, sessions, alerts = build_run_review(analyzer)

    outcome = run_review.execute(
        request(
            DocumentSource("a.txt", b"Contrato 4857"), DocumentSource("b.txt", b"Contrato 4587")
        )
    )

    assert analyzer.received == ["a.txt", "b.txt"]
    assert sessions.get(outcome.session.id).alert_count == 1
    assert [(item.number, item.alert) for item in outcome.alerts] == [(1, CONTRACT_ALERT)]
    assert alerts.list_for(outcome.session.id) == outcome.alerts


def test_unreadable_documents_are_reported_and_left_out_of_the_analysis() -> None:
    analyzer = RecordingAnalyzer([])
    run_review, _, _ = build_run_review(analyzer)

    outcome = run_review.execute(
        request(
            DocumentSource("a.txt", b"Contrato 4857"),
            DocumentSource("escaneado.txt", b""),
            DocumentSource("acta.pages", b"binario"),
        )
    )

    reasons = {document.name: document.reason for document in outcome.documents}
    assert reasons == {
        "a.txt": None,
        "escaneado.txt": UnreadableReason.NO_TEXT,
        "acta.pages": UnreadableReason.UNSUPPORTED_FORMAT,
    }
    assert analyzer.received == ["a.txt"]
    assert outcome.session.document_names == ("a.txt", "escaneado.txt", "acta.pages")


def test_files_over_the_size_limit_are_not_read() -> None:
    run_review, _, _ = build_run_review(RecordingAnalyzer([]))

    outcome = run_review.execute(
        request(DocumentSource("grande.txt", b"x" * (MAX_DOCUMENT_BYTES + 1)))
    )

    (document,) = outcome.documents
    assert document.reason is UnreadableReason.TOO_LARGE
    assert not document.is_read


def test_read_outcome_counts_fragments_including_attachments() -> None:
    run_review, _, _ = build_run_review(RecordingAnalyzer([]))

    outcome = run_review.execute(request(DocumentSource("a.txt", b"uno\ndos\ntres")))

    assert outcome.documents[0].fragment_count == 3


def test_progress_is_reported_file_by_file_before_the_analysis() -> None:
    run_review, _, _ = build_run_review(RecordingAnalyzer([]))
    progress = RecordingProgress()

    run_review.execute(
        request(DocumentSource("a.txt", b"Contrato 4857"), DocumentSource("vacio.txt", b"")),
        progress,
    )

    assert progress.events == [
        "inicia 0 a.txt",
        "termina 0 leído",
        "inicia 1 vacio.txt",
        "termina 1 no_text",
        "analiza",
    ]
