ELLIPSIS = "…"
# Caracteres a cada lado del valor: suficiente para leer la frase sin abrir el documento.
CONTEXT_CHARS = 80


def excerpt_around(text: str, start: int, end: int) -> str:
    """Fragmento del texto alrededor de [start, end), con «…» donde se recorta."""
    excerpt_start = max(0, start - CONTEXT_CHARS)
    excerpt_end = min(len(text), end + CONTEXT_CHARS)
    prefix = ELLIPSIS if excerpt_start > 0 else ""
    suffix = ELLIPSIS if excerpt_end < len(text) else ""
    return f"{prefix}{text[excerpt_start:excerpt_end]}{suffix}"
