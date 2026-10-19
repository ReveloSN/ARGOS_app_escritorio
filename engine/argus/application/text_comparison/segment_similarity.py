"""Cuánto se parecen dos listas de segmentos, todos contra todos (de 0 a 1)."""

from collections.abc import Sequence
from typing import Protocol

from argus.application.embedding_similarity import cosine_similarity
from argus.application.ports.text_embedder import TextEmbedder
from argus.domain.text_comparison.alignment import word_similarity

type ScoreMatrix = tuple[tuple[float, ...], ...]


class SegmentSimilarity(Protocol):
    def scores(self, first: Sequence[str], second: Sequence[str]) -> ScoreMatrix:
        """Una fila por texto de `first` con su similitud frente a cada texto de `second`."""
        ...


class LexicalSegmentSimilarity:
    """Palabras en común: alinea cambios puntuales (4857 por 4587) sin ningún modelo."""

    def scores(self, first: Sequence[str], second: Sequence[str]) -> ScoreMatrix:
        return tuple(tuple(word_similarity(a, b) for b in second) for a in first)


class SemanticSegmentSimilarity:
    """Significado con un `TextEmbedder`: alinea también las reformulaciones."""

    def __init__(self, embedder: TextEmbedder) -> None:
        self._embedder = embedder

    def scores(self, first: Sequence[str], second: Sequence[str]) -> ScoreMatrix:
        if not first or not second:
            return tuple(() for _ in first)
        vectors = self._embedder.embed([*first, *second])
        first_vectors, second_vectors = vectors[: len(first)], vectors[len(first) :]
        return tuple(tuple(cosine_similarity(a, b) for b in second_vectors) for a in first_vectors)


class HighestSegmentSimilarity:
    """La mayor de varias similitudes: basta con que una reconozca el par."""

    def __init__(self, *similarities: SegmentSimilarity) -> None:
        self._similarities = similarities

    def scores(self, first: Sequence[str], second: Sequence[str]) -> ScoreMatrix:
        matrices = [similarity.scores(first, second) for similarity in self._similarities]
        return tuple(
            tuple(max(values) for values in zip(*rows, strict=True))
            for rows in zip(*matrices, strict=True)
        )
