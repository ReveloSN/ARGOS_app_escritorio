import pytest

from argus.application.document_loader import DocumentLoader
from argus.application.document_reader_factory import DocumentReaderFactory
from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.ports.document_reader import DocumentSource
from argus.application.text_comparison.change_detector import ChangeDetector
from argus.application.text_comparison.change_facts import ChangeFactsReader
from argus.application.text_comparison.document_pair_comparer import DocumentPairComparer
from argus.application.text_comparison.run_comparison import (
    ComparisonRecorder,
    ComparisonRequest,
    OpenComparison,
    RunComparison,
)
from argus.application.text_comparison.segment_aligner import SegmentAligner
from argus.application.text_comparison.segment_similarity import LexicalSegmentSimilarity
from argus.domain.document import DocumentFormat
from argus.domain.errors import ComparisonNotFoundError, NotEnoughDocumentsError
from argus.domain.text_comparison.change import ChangeKind, Materiality
from argus.domain.text_comparison.materiality import MATERIALITY_CLASSIFIER
from argus.domain.text_comparison.modes import (
    DEFAULT_MODES,
    ComparisonModeFactory,
    ComparisonModeName,
)
from argus.domain.text_comparison.segmenter import DocumentSegmenter
from argus.infrastructure.extraction.contract_id_extractor import ContractIdExtractor
from tests.application.in_memory_repositories import InMemoryComparisonRepository, SteppingClock
from tests.application.test_run_review import LineReader, RecordingProgress

VERSION_1 = "Contrato No. 4857 de arrendamiento\nEl canon se paga cada mes"
VERSION_2 = "Contrato No. 4587 de arrendamiento\nEl canon se paga cada mes"
VERSIONS = ComparisonModeFactory(DEFAULT_MODES).mode_for(ComparisonModeName.VERSIONS)


class PairRecordingProgress(RecordingProgress):
    def pair_compared(self, position: int, total: int) -> None:
        self.events.append(f"compara {position + 1} de {total}")


def build_run_comparison() -> tuple[RunComparison, InMemoryComparisonRepository]:
    repository = InMemoryComparisonRepository()
    detector = ChangeDetector(
        ChangeFactsReader(EntityExtractionPipeline([ContractIdExtractor()])),
        MATERIALITY_CLASSIFIER,
    )
    comparer = DocumentPairComparer(
        DocumentSegmenter(), SegmentAligner(LexicalSegmentSimilarity()), detector
    )
    loader = DocumentLoader(DocumentReaderFactory({DocumentFormat.TEXT: LineReader()}))
    run = RunComparison(loader, comparer, ComparisonRecorder(repository, SteppingClock()))
    return run, repository


def sources(*texts: str) -> tuple[DocumentSource, ...]:
    return tuple(
        DocumentSource(f"v{number}.txt", text.encode())
        for number, text in enumerate(texts, start=1)
    )


def test_two_versions_are_read_compared_and_saved_with_their_progress() -> None:
    run, repository = build_run_comparison()
    progress = PairRecordingProgress()

    report = run.execute(
        ComparisonRequest("Arrendamiento", VERSIONS, sources(VERSION_1, VERSION_2)), progress
    )

    (pair,) = report.content.pairs
    (change,) = pair.changes
    assert (pair.first_document, pair.second_document) == ("v1.txt", "v2.txt")
    assert (change.kind, change.materialities) == (ChangeKind.MODIFIED, (Materiality.NUMBER,))
    assert progress.events == [
        "inicia 0 v1.txt",
        "termina 0 leído",
        "inicia 1 v2.txt",
        "termina 1 leído",
        "analiza",
        "compara 1 de 1",
    ]
    assert OpenComparison(repository).execute(report.id) == report


def test_an_unreadable_file_is_reported_and_left_out_of_the_pairs() -> None:
    run, _ = build_run_comparison()

    report = run.execute(
        ComparisonRequest("Arrendamiento", VERSIONS, sources(VERSION_1, "", VERSION_2))
    )

    assert [summary.is_read for summary in report.content.documents] == [True, False, True]
    assert [(p.first_document, p.second_document) for p in report.content.pairs] == [
        ("v1.txt", "v3.txt")
    ]


def test_a_mode_rejects_fewer_files_than_it_needs() -> None:
    with pytest.raises(NotEnoughDocumentsError):
        ComparisonRequest("Arrendamiento", VERSIONS, sources(VERSION_1))


def test_an_unknown_comparison_is_reported() -> None:
    with pytest.raises(ComparisonNotFoundError):
        OpenComparison(InMemoryComparisonRepository()).execute("no-existe")
