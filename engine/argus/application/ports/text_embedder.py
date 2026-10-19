from collections.abc import Sequence
from typing import Protocol

# Vector de significado de un texto, normalizado a longitud 1.
type Embedding = tuple[float, ...]


class TextEmbedder(Protocol):
    """Convierte textos en vectores de significado (CLAUDE.md §8, capa 3).

    El adaptador por defecto es local y no usa internet; otros modelos se conectan detrás de
    este mismo puerto sin cambiar a quien compara.
    """

    def embed(self, texts: Sequence[str]) -> tuple[Embedding, ...]:
        """Un vector normalizado por texto, en el mismo orden."""
        ...
