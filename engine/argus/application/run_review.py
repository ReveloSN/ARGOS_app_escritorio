from dataclasses import dataclass

from argus.application.document_limits import MAX_DOCUMENT_BYTES
from argus.application.document_reader_factory import DocumentReaderFactory
from argus.application.ports.document_reader import DocumentSource
from argus.application.review_analyzers import ReviewAnalyzer
from argus.application.review_progress import SILENT_PROGRESS, ReviewProgress
from argus.application.review_recording import ReviewDraft, ReviewRecorder
from argus.domain.alert import NumberedAlert
from argus.domain.errors import UnreadableDocumentError, UnreadableReason
from argus.domain.read_outcome import DocumentReadOutcome
from argus.domain.review_session import ReviewSession

FIRST_ALERT_NUMBER = 1


@dataclass(frozen=True)
class ReviewRequest:
    name: str
    sources: tuple[DocumentSource, ...]


@dataclass(frozen=True)
class ReviewOutcome:
    session: ReviewSession
    documents: tuple[DocumentReadOutcome, ...]
    alerts: tuple[NumberedAlert, ...]


class RunReview:
    """Caso de uso: archivos cargados → lectura → análisis → revisión guardada con sus alertas.

    Un archivo que no se puede leer no detiene la revisión: se informa con su motivo y el
    resto se compara igual (mockup «Confirmar lectura»).
    """

    def __init__(
        self,
        readers: DocumentReaderFactory,
        analyzer: ReviewAnalyzer,
        recorder: ReviewRecorder,
    ) -> None:
        self._readers = readers
        self._analyzer = analyzer
        self._recorder = recorder

    def execute(
        self, request: ReviewRequest, progress: ReviewProgress = SILENT_PROGRESS
    ) -> ReviewOutcome:
        outcomes = tuple(
            self._read_observed(position, source, progress)
            for position, source in enumerate(request.sources)
        )
        progress.analysis_started()
        documents = [outcome.document for outcome in outcomes if outcome.document is not None]
        alerts = self._analyzer.analyze(documents)
        session = self._recorder.record(
            ReviewDraft(request.name, request.sources, outcomes, alerts)
        )
        numbered = tuple(
            NumberedAlert(number, alert)
            for number, alert in enumerate(alerts, start=FIRST_ALERT_NUMBER)
        )
        return ReviewOutcome(session, outcomes, numbered)

    def _read_observed(
        self, position: int, source: DocumentSource, progress: ReviewProgress
    ) -> DocumentReadOutcome:
        progress.document_started(position, source.name)
        outcome = self._read(source)
        progress.document_finished(position, outcome)
        return outcome

    def _read(self, source: DocumentSource) -> DocumentReadOutcome:
        if len(source.content) > MAX_DOCUMENT_BYTES:
            return DocumentReadOutcome(source.name, None, UnreadableReason.TOO_LARGE)
        try:
            document = self._readers.reader_for(source.name).read(source)
        except UnreadableDocumentError as error:
            return DocumentReadOutcome(source.name, None, error.reason)
        return DocumentReadOutcome(source.name, document, None)
