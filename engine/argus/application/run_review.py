from dataclasses import dataclass

from argus.application.document_loader import DocumentLoader
from argus.application.ports.document_reader import DocumentSource
from argus.application.review_analyzers import ReviewAnalyzer
from argus.application.review_progress import SILENT_PROGRESS, ReviewProgress
from argus.application.review_recording import ReviewDraft, ReviewRecorder
from argus.domain.alert import NumberedAlert
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
        loader: DocumentLoader,
        analyzer: ReviewAnalyzer,
        recorder: ReviewRecorder,
    ) -> None:
        self._loader = loader
        self._analyzer = analyzer
        self._recorder = recorder

    def execute(
        self, request: ReviewRequest, progress: ReviewProgress = SILENT_PROGRESS
    ) -> ReviewOutcome:
        outcomes = self._loader.load(request.sources, progress)
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
