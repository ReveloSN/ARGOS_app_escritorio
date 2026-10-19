from argus.application.text_comparison.change_detector import ChangeDetector
from argus.application.text_comparison.segment_aligner import SegmentAligner
from argus.domain.text_comparison.modes import DocumentPair
from argus.domain.text_comparison.report import PairComparison
from argus.domain.text_comparison.segmenter import DocumentSegmenter


class DocumentPairComparer:
    """Segmenta los dos documentos, alinea sus segmentos y detecta los cambios entre ellos."""

    def __init__(
        self, segmenter: DocumentSegmenter, aligner: SegmentAligner, detector: ChangeDetector
    ) -> None:
        self._segmenter = segmenter
        self._aligner = aligner
        self._detector = detector

    def compare(self, pair: DocumentPair, threshold: float) -> PairComparison:
        alignment = self._aligner.align(
            self._segmenter.segment(pair.first), self._segmenter.segment(pair.second), threshold
        )
        changes = self._detector.detect(alignment)
        return PairComparison(pair.first.name, pair.second.name, changes)
