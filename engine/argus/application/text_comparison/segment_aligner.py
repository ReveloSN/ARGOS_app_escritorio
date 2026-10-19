from collections import defaultdict, deque
from collections.abc import Sequence
from dataclasses import dataclass

from argus.application.text_comparison.segment_similarity import ScoreMatrix, SegmentSimilarity
from argus.domain.text_comparison.alignment import AlignedPair, Alignment
from argus.domain.text_comparison.segment import Segment

EXACT_SIMILARITY = 1.0


@dataclass(frozen=True)
class _Candidate:
    similarity: float
    distance: int
    first: int
    second: int


@dataclass(frozen=True)
class _Unpaired:
    """Segmentos que no encontraron su idéntico en el otro documento."""

    first: Sequence[Segment]
    second: Sequence[Segment]

    def candidates(self, scores: ScoreMatrix, threshold: float) -> list[_Candidate]:
        # A igual similitud gana el par más cercano en el documento.
        candidates = [
            _Candidate(score, abs(self.first[i].position - self.second[j].position), i, j)
            for i, row in enumerate(scores)
            for j, score in enumerate(row)
            if score >= threshold
        ]
        return sorted(candidates, key=lambda candidate: (-candidate.similarity, candidate.distance))


class SegmentAligner:
    """Empareja los segmentos de dos documentos.

    Primero los idénticos por su huella (sin consultar ningún modelo); después, entre los que
    quedan, los pares más parecidos a partir del umbral. Lo que sobra se eliminó (primer
    documento) o se agregó (segundo).
    """

    def __init__(self, similarity: SegmentSimilarity) -> None:
        self._similarity = similarity

    def align(
        self, first: Sequence[Segment], second: Sequence[Segment], threshold: float
    ) -> Alignment:
        exact = _exact_pairs(first, second)
        paired_first = {pair.first.position for pair in exact}
        paired_second = {pair.second.position for pair in exact}
        unpaired = _Unpaired(
            [segment for segment in first if segment.position not in paired_first],
            [segment for segment in second if segment.position not in paired_second],
        )
        similar = self._similar_pairs(unpaired, threshold)
        pairs = sorted([*exact, *similar], key=lambda pair: pair.first.position)
        return Alignment(tuple(pairs), *_leftovers(first, second, pairs))

    def _similar_pairs(self, unpaired: _Unpaired, threshold: float) -> list[AlignedPair]:
        scores = self._similarity.scores(
            [segment.text for segment in unpaired.first],
            [segment.text for segment in unpaired.second],
        )
        chosen = _greedy_matches(unpaired.candidates(scores, threshold))
        return [
            AlignedPair(
                unpaired.first[match.first], unpaired.second[match.second], match.similarity
            )
            for match in chosen
        ]


def _exact_pairs(first: Sequence[Segment], second: Sequence[Segment]) -> list[AlignedPair]:
    # Los repetidos se emparejan en orden de lectura: la primera «Firma» con la primera.
    waiting: defaultdict[str, deque[Segment]] = defaultdict(deque)
    for segment in second:
        waiting[segment.fingerprint].append(segment)
    return [
        AlignedPair(segment, waiting[segment.fingerprint].popleft(), EXACT_SIMILARITY)
        for segment in first
        if waiting[segment.fingerprint]
    ]


def _greedy_matches(candidates: Sequence[_Candidate]) -> list[_Candidate]:
    used_first: set[int] = set()
    used_second: set[int] = set()
    chosen: list[_Candidate] = []
    for candidate in candidates:
        if candidate.first in used_first or candidate.second in used_second:
            continue
        used_first.add(candidate.first)
        used_second.add(candidate.second)
        chosen.append(candidate)
    return chosen


def _leftovers(
    first: Sequence[Segment], second: Sequence[Segment], pairs: Sequence[AlignedPair]
) -> tuple[tuple[Segment, ...], tuple[Segment, ...]]:
    paired_first = {pair.first.position for pair in pairs}
    paired_second = {pair.second.position for pair in pairs}
    removed = tuple(segment for segment in first if segment.position not in paired_first)
    added = tuple(segment for segment in second if segment.position not in paired_second)
    return removed, added
