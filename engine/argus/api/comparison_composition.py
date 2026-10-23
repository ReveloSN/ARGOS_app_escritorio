"""Construcción de la comparación de documentos (ADR 018): segmentar, alinear y detectar."""

from dataclasses import dataclass

from argus.application.decision_history import DecisionHistories
from argus.application.document_loader import DocumentLoader
from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.ports.clock import Clock
from argus.application.ports.repositories import ComparisonRepository, DecisionRepository
from argus.application.ports.text_embedder import TextEmbedder
from argus.application.review_analyzers import ReviewAnalyzer
from argus.application.text_comparison.change_detector import ChangeDetector
from argus.application.text_comparison.change_explanation import ChangeExplainer, ExplainChange
from argus.application.text_comparison.change_facts import ChangeFactsReader
from argus.application.text_comparison.comparison_decisions import ComparisonDecisions
from argus.application.text_comparison.document_pair_comparer import DocumentPairComparer
from argus.application.text_comparison.meaning_classifier import (
    RuleAndSimilarityMeaningClassifier,
)
from argus.application.text_comparison.run_comparison import (
    ComparisonAnalyzer,
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
    decisions: ComparisonDecisions
    modes: ComparisonModeFactory
    explain: ExplainChange


@dataclass(frozen=True)
class ComparisonDependencies:
    """Lo que la comparación comparte con la revisión: lectores, extractores, modelo y el
    análisis por entidades que encuentra las inconsistencias."""

    loader: DocumentLoader
    values: EntityExtractionPipeline
    embedder: TextEmbedder | None
    inconsistencies: ReviewAnalyzer
    # «Explicar este cambio»: plantillas o, si el usuario lo activó, el modelo de lenguaje.
    explainer: ChangeExplainer


@dataclass(frozen=True)
class ComparisonRepositories:
    comparisons: ComparisonRepository
    decisions: DecisionRepository


def build_segment_similarity(embedder: TextEmbedder | None) -> SegmentSimilarity:
    """Palabras en común siempre; con el modelo, también el significado (reformulaciones).

    Sin modelo la comparación sigue funcionando: solo no reconoce las reformulaciones.
    """
    lexical = LexicalSegmentSimilarity()
    if embedder is None:
        return lexical
    return HighestSegmentSimilarity(lexical, SemanticSegmentSimilarity(embedder))


def build_comparison_services(
    dependencies: ComparisonDependencies, repositories: ComparisonRepositories, clock: Clock
) -> ComparisonServices:
    meaning = RuleAndSimilarityMeaningClassifier(
        SemanticSegmentSimilarity(dependencies.embedder) if dependencies.embedder else None
    )
    detector = ChangeDetector(
        ChangeFactsReader(dependencies.values), MATERIALITY_CLASSIFIER, meaning
    )
    aligner = SegmentAligner(build_segment_similarity(dependencies.embedder))
    comparer = DocumentPairComparer(DocumentSegmenter(), aligner, detector)
    analyzer = ComparisonAnalyzer(comparer, dependencies.inconsistencies)
    recorder = ComparisonRecorder(repositories.comparisons, clock)
    histories = DecisionHistories(repositories.decisions, clock)
    return ComparisonServices(
        run=RunComparison(dependencies.loader, analyzer, recorder),
        open=OpenComparison(repositories.comparisons),
        decisions=ComparisonDecisions(repositories.comparisons, histories),
        modes=ComparisonModeFactory(DEFAULT_MODES),
        explain=ExplainChange(repositories.comparisons, dependencies.explainer),
    )
