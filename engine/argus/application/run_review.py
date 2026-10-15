from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

from argus.application.detect_inconsistencies import DetectInconsistencies
from argus.application.document_limits import MAX_DOCUMENT_BYTES
from argus.application.document_reader_factory import DocumentReaderFactory
from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.ports.document_reader import DocumentSource
from argus.application.review_session_use_cases import StartReviewSession
from argus.domain.alert import Alert, NumberedAlert
from argus.domain.document import Document
from argus.domain.errors import UnreadableDocumentError, UnreadableReason
from argus.domain.review_session import ReviewSession

FIRST_ALERT_NUMBER = 1


@dataclass(frozen=True)
class ReviewRequest:
    name: str
    sources: tuple[DocumentSource, ...]


@dataclass(frozen=True)
class DocumentReadOutcome:
    """Cómo se leyó cada archivo: el documento leído o el motivo por el que no se pudo leer."""

    name: str
    document: Document | None
    reason: UnreadableReason | None

    @property
    def is_read(self) -> bool:
        return self.document is not None

    @property
    def fragment_count(self) -> int:
        return 0 if self.document is None else _count_fragments(self.document)


@dataclass(frozen=True)
class ReviewOutcome:
    session: ReviewSession
    documents: tuple[DocumentReadOutcome, ...]
    alerts: tuple[NumberedAlert, ...]


class ReviewAnalyzer(Protocol):
    def analyze(self, documents: Sequence[Document]) -> tuple[Alert, ...]: ...


class EntityReviewAnalyzer:
    """Extrae las entidades de todos los documentos y detecta las inconsistencias entre ellos."""

    def __init__(self, pipeline: EntityExtractionPipeline, detector: DetectInconsistencies) -> None:
        self._pipeline = pipeline
        self._detector = detector

    def analyze(self, documents: Sequence[Document]) -> tuple[Alert, ...]:
        return self._detector.execute(self._pipeline.build_index(documents))


class RunReview:
    """Caso de uso: archivos cargados → lectura → análisis → sesión guardada con sus alertas.

    Un archivo que no se puede leer no detiene la revisión: se informa con su motivo y el
    resto se compara igual (mockup «Confirmar lectura»).
    """

    def __init__(
        self,
        readers: DocumentReaderFactory,
        analyzer: ReviewAnalyzer,
        start_session: StartReviewSession,
    ) -> None:
        self._readers = readers
        self._analyzer = analyzer
        self._start_session = start_session

    def execute(self, request: ReviewRequest) -> ReviewOutcome:
        outcomes = tuple(self._read(source) for source in request.sources)
        documents = [outcome.document for outcome in outcomes if outcome.document is not None]
        alerts = self._analyzer.analyze(documents)
        names = [outcome.name for outcome in outcomes]
        session = self._start_session.execute(request.name, names, alerts)
        numbered = tuple(
            NumberedAlert(number, alert)
            for number, alert in enumerate(alerts, start=FIRST_ALERT_NUMBER)
        )
        return ReviewOutcome(session, outcomes, numbered)

    def _read(self, source: DocumentSource) -> DocumentReadOutcome:
        if len(source.content) > MAX_DOCUMENT_BYTES:
            return DocumentReadOutcome(source.name, None, UnreadableReason.TOO_LARGE)
        try:
            document = self._readers.reader_for(source.name).read(source)
        except UnreadableDocumentError as error:
            return DocumentReadOutcome(source.name, None, error.reason)
        return DocumentReadOutcome(source.name, document, None)


def _count_fragments(document: Document) -> int:
    return len(document.fragments) + sum(_count_fragments(item) for item in document.attachments)
