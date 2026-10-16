from dataclasses import dataclass

ELLIPSIS = "…"
# Caracteres a cada lado del valor: suficiente para leer la frase sin abrir el documento.
CONTEXT_CHARS = 80


@dataclass(frozen=True)
class Excerpt:
    """Fragmento recortado y dónde queda, dentro de él, el texto que se buscaba."""

    text: str
    highlight_start: int
    highlight_end: int


def excerpt_with_highlight(text: str, start: int, end: int) -> Excerpt:
    """Fragmento alrededor de [start, end), con «…» donde se recorta."""
    excerpt_start = max(0, start - CONTEXT_CHARS)
    excerpt_end = min(len(text), end + CONTEXT_CHARS)
    prefix = ELLIPSIS if excerpt_start > 0 else ""
    suffix = ELLIPSIS if excerpt_end < len(text) else ""
    offset = len(prefix) - excerpt_start
    return Excerpt(
        f"{prefix}{text[excerpt_start:excerpt_end]}{suffix}", start + offset, end + offset
    )


def excerpt_around(text: str, start: int, end: int) -> str:
    return excerpt_with_highlight(text, start, end).text
