from collections.abc import Sequence
from typing import Protocol


class TextSimilarity(Protocol):
    """Comparación semántica de textos (CLAUDE.md §8, capa 3), sin internet."""

    def similarities(self, text: str, candidates: Sequence[str]) -> tuple[float, ...]:
        """Similitud de significado entre el texto y cada candidato, de 0 a 1."""
        ...
