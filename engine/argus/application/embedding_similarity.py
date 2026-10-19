from collections.abc import Sequence
from math import sumprod

from argus.application.ports.text_embedder import Embedding, TextEmbedder


def cosine_similarity(first: Embedding, second: Embedding) -> float:
    """Coseno entre vectores ya normalizados; los opuestos cuentan como 0, no como negativos."""
    return max(0.0, sumprod(first, second))


class EmbeddingTextSimilarity:
    """Similitud de significado (puerto `TextSimilarity`) con cualquier `TextEmbedder`."""

    def __init__(self, embedder: TextEmbedder) -> None:
        self._embedder = embedder

    def similarities(self, text: str, candidates: Sequence[str]) -> tuple[float, ...]:
        if not candidates:
            return ()
        reference, *others = self._embedder.embed([text, *candidates])
        return tuple(cosine_similarity(reference, other) for other in others)
