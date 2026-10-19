from collections.abc import Sequence

from argus.application.embedding_similarity import EmbeddingTextSimilarity, cosine_similarity
from argus.application.ports.text_embedder import Embedding

VECTORS: dict[str, Embedding] = {
    "informe de junio": (1.0, 0.0),
    "reporte de junio": (0.8, 0.6),
    "reunión": (0.0, 1.0),
    "opuesto": (-1.0, 0.0),
}


class TableEmbedder:
    def embed(self, texts: Sequence[str]) -> tuple[Embedding, ...]:
        return tuple(VECTORS[text] for text in texts)


def test_similarity_is_the_cosine_of_each_candidate_against_the_text() -> None:
    similarity = EmbeddingTextSimilarity(TableEmbedder())

    scores = similarity.similarities("informe de junio", ["reporte de junio", "reunión"])

    assert scores == (0.8, 0.0)
    assert similarity.similarities("informe de junio", []) == ()


def test_opposite_vectors_do_not_count_as_negative_similarity() -> None:
    assert cosine_similarity(VECTORS["informe de junio"], VECTORS["opuesto"]) == 0.0
