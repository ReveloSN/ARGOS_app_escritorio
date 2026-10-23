from collections.abc import Sequence

from argus.application.ports.text_embedder import Embedding
from argus.application.text_comparison.segment_aligner import SegmentAligner
from argus.application.text_comparison.segment_similarity import (
    HighestSegmentSimilarity,
    LexicalSegmentSimilarity,
    SemanticSegmentSimilarity,
)
from tests.domain.text_comparison.segment_builders import segments_of

THRESHOLD = 0.5


class FixedSimilarity:
    """Similitud por pares de textos, como la daría un modelo de significado."""

    def __init__(self, scores: dict[tuple[str, str], float]) -> None:
        self._scores = scores

    def scores(self, first: Sequence[str], second: Sequence[str]) -> tuple[tuple[float, ...], ...]:
        return tuple(tuple(self._scores.get((a, b), 0.0) for b in second) for a in first)


def test_identical_segments_pair_by_their_fingerprint_without_asking_the_model() -> None:
    first = segments_of("v1.pdf", "Objeto", "Canon de $ 18.450.000")
    second = segments_of("v2.pdf", "Objeto", "Canon de $ 18.450.000")

    alignment = SegmentAligner(FixedSimilarity({})).align(first, second, THRESHOLD)

    assert [(pair.first.position, pair.second.position) for pair in alignment.pairs] == [
        (1, 1),
        (2, 2),
    ]
    assert all(pair.is_exact for pair in alignment.pairs)


def test_changed_segments_pair_by_similarity_and_the_rest_are_added_or_removed() -> None:
    first = segments_of("v1.pdf", "Objeto", "El plazo es de 12 meses", "Cláusula penal")
    second = segments_of("v2.pdf", "Objeto", "La duración es de un año", "Confidencialidad")
    similarity = FixedSimilarity(
        {
            ("El plazo es de 12 meses", "La duración es de un año"): 0.82,
            ("Cláusula penal", "Confidencialidad"): 0.3,
        }
    )

    alignment = SegmentAligner(similarity).align(first, second, THRESHOLD)

    reworded = alignment.pairs[1]
    assert (reworded.first.text, reworded.second.text, reworded.similarity) == (
        "El plazo es de 12 meses",
        "La duración es de un año",
        0.82,
    )
    assert not reworded.is_exact
    assert [segment.text for segment in alignment.removed] == ["Cláusula penal"]
    assert [segment.text for segment in alignment.added] == ["Confidencialidad"]


def test_the_most_similar_candidate_wins_when_two_compete() -> None:
    first = segments_of("v1.pdf", "Canon mensual de 10")
    second = segments_of("v2.pdf", "Canon trimestral", "Canon mensual de 12")
    similarity = FixedSimilarity(
        {
            ("Canon mensual de 10", "Canon trimestral"): 0.6,
            ("Canon mensual de 10", "Canon mensual de 12"): 0.9,
        }
    )

    alignment = SegmentAligner(similarity).align(first, second, THRESHOLD)

    assert [pair.second.text for pair in alignment.pairs] == ["Canon mensual de 12"]
    assert [segment.text for segment in alignment.added] == ["Canon trimestral"]


def test_repeated_segments_pair_in_reading_order() -> None:
    first = segments_of("v1.pdf", "Firma", "Firma")
    second = segments_of("v2.pdf", "Firma", "Firma", "Firma")

    alignment = SegmentAligner(FixedSimilarity({})).align(first, second, THRESHOLD)

    assert [(pair.first.position, pair.second.position) for pair in alignment.pairs] == [
        (1, 1),
        (2, 2),
    ]
    assert [segment.position for segment in alignment.added] == [3]


VECTORS: dict[str, Embedding] = {"plazo": (1.0, 0.0), "duración": (0.6, 0.8), "multa": (0.0, 1.0)}


class TableEmbedder:
    def embed(self, texts: Sequence[str]) -> tuple[Embedding, ...]:
        return tuple(VECTORS[text] for text in texts)


def test_semantic_similarity_compares_every_pair_with_the_embedder() -> None:
    scores = SemanticSegmentSimilarity(TableEmbedder()).scores(["plazo"], ["duración", "multa"])

    assert scores == ((0.6, 0.0),)
    assert SemanticSegmentSimilarity(TableEmbedder()).scores([], ["multa"]) == ()


def test_the_highest_similarity_keeps_wording_changes_and_rewordings_aligned() -> None:
    combined = HighestSegmentSimilarity(
        LexicalSegmentSimilarity(), FixedSimilarity({("plazo de 12", "duración"): 0.7})
    )

    scores = combined.scores(["plazo de 12"], ["plazo de 13", "duración"])

    assert scores == ((2 / 3, 0.7),)
