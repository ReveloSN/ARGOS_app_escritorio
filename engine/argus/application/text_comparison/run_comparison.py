from dataclasses import dataclass
from typing import Protocol

from argus.application.document_loader import DocumentLoader
from argus.application.ports.clock import Clock
from argus.application.ports.document_reader import DocumentSource
from argus.application.ports.repositories import ComparisonRepository
from argus.application.review_progress import ReviewProgress, SilentReviewProgress
from argus.application.text_comparison.document_pair_comparer import DocumentPairComparer
from argus.domain.errors import NotEnoughDocumentsError
from argus.domain.text_comparison.modes import ComparisonMode
from argus.domain.text_comparison.report import ComparisonContent, ComparisonReport


class ComparisonProgress(ReviewProgress, Protocol):
    """Observer: además de la lectura, avisa cada par de documentos ya comparado."""

    def pair_compared(self, position: int, total: int) -> None: ...


class SilentComparisonProgress(SilentReviewProgress):
    def pair_compared(self, position: int, total: int) -> None:
        pass


SILENT_COMPARISON_PROGRESS = SilentComparisonProgress()


@dataclass(frozen=True)
class ComparisonRequest:
    name: str
    mode: ComparisonMode
    sources: tuple[DocumentSource, ...]

    def __post_init__(self) -> None:
        # Se valida al recibir los archivos, antes de empezar a leerlos.
        if len(self.sources) < self.mode.minimum_documents:
            raise NotEnoughDocumentsError(self.mode.minimum_documents, len(self.sources))


class ComparisonRecorder:
    """Guarda la comparación con su identificador y fecha para volver a abrirla."""

    def __init__(self, repository: ComparisonRepository, clock: Clock) -> None:
        self._repository = repository
        self._clock = clock

    def record(self, content: ComparisonContent) -> ComparisonReport:
        report = ComparisonReport.start(content, self._clock.now())
        self._repository.save(report)
        return report


class RunComparison:
    """Caso de uso: archivos cargados → lectura → pares según el modo → cambios guardados.

    Un archivo que no se puede leer no detiene la comparación: queda con su motivo y los
    pares se arman con los que sí se leyeron.
    """

    def __init__(
        self, loader: DocumentLoader, comparer: DocumentPairComparer, recorder: ComparisonRecorder
    ) -> None:
        self._loader = loader
        self._comparer = comparer
        self._recorder = recorder

    def execute(
        self,
        request: ComparisonRequest,
        progress: ComparisonProgress = SILENT_COMPARISON_PROGRESS,
    ) -> ComparisonReport:
        outcomes = self._loader.load(request.sources, progress)
        progress.analysis_started()
        documents = [outcome.document for outcome in outcomes if outcome.document is not None]
        pairs = request.mode.pairs(documents)
        compared = []
        for position, pair in enumerate(pairs):
            compared.append(self._comparer.compare(pair, request.mode.similarity_threshold))
            progress.pair_compared(position, len(pairs))
        summaries = tuple(outcome.summary for outcome in outcomes)
        content = ComparisonContent(request.name, request.mode.name, summaries, tuple(compared))
        return self._recorder.record(content)


class OpenComparison:
    """Caso de uso: volver a una comparación guardada (GET /comparisons/{id})."""

    def __init__(self, repository: ComparisonRepository) -> None:
        self._repository = repository

    def execute(self, comparison_id: str) -> ComparisonReport:
        return self._repository.get(comparison_id)
