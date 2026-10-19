"""Construcción de la comparación de documentos (ADR 018): segmentar, alinear y detectar."""

from dataclasses import dataclass

from argus.application.document_loader import DocumentLoader
from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.ports.clock import Clock
from argus.application.ports.repositories import ComparisonRepository
from argus.application.ports.text_embedder import TextEmbedder
from argus.application.text_comparison.change_detector import ChangeDetector
from argus.application.text_comparison.change_facts import ChangeFactsReader
from argus.application.text_comparison.document_pair_comparer import DocumentPairComparer
from argus.application.text_comparison.run_comparison import (
    ComparisonRecorder,
    OpenComparison,
    RunComparison,
)
from argus.application.text_comparison.segment_aligner import SegmentAligner
from argus.application.text_comparison.segment_similarity import (
    HighestSegmentSimilarity,
    LexicalSegmentSimilarity,
    SegmentSimilarity,
    SemanticSegmentSimilarity,
)
from argus.domain.text_comparison.materiality import MATERIALITY_CLASSIFIER
from argus.domain.text_comparison.modes import DEFAULT_MODES, ComparisonModeFactory
from argus.domain.text_comparison.segmenter import DocumentSegmenter


@dataclass(frozen=True)
class ComparisonServices:
    run: RunComparison
    open: OpenComparison
    modes: ComparisonModeFactory


@dataclass(frozen=True)
class ComparisonDependencies:
    """Lo que la comparación comparte con la revisión: lectores, extractores y modelo."""

    loader: DocumentLoader
    values: EntityExtractionPipeline
    embedder: TextEmbedder | None


def build_segment_similarity(embedder: TextEmbedder | None) -> SegmentSimilarity:
    """Palabras en común siempre; con el modelo, también el significado (reformulaciones).

    Sin modelo la comparación sigue funcionando: solo no reconoce las reformulaciones.
    """
    lexical = LexicalSegmentSimilarity()
    if embedder is None:
        return lexical
    return HighestSegmentSimilarity(lexical, SemanticSegmentSimilarity(embedder))


def build_comparison_services(
    dependencies: ComparisonDependencies, repository: ComparisonRepository, clock: Clock
) -> ComparisonServices:
    detector = ChangeDetector(ChangeFactsReader(dependencies.values), MATERIALITY_CLASSIFIER)
    aligner = SegmentAligner(build_segment_similarity(dependencies.embedder))
    comparer = DocumentPairComparer(DocumentSegmenter(), aligner, detector)
    recorder = ComparisonRecorder(repository, clock)
    return ComparisonServices(
        run=RunComparison(dependencies.loader, comparer, recorder),
        open=OpenComparison(repository),
        modes=ComparisonModeFactory(DEFAULT_MODES),
    )
