from collections.abc import Iterable

from argus.domain.document import TextFragment
from argus.domain.errors import UnreadableDocumentError, UnreadableReason
from argus.domain.locations import SourceLocation


def build_fragments(texts: Iterable[tuple[str, SourceLocation]]) -> tuple[TextFragment, ...]:
    """Convierte (texto, ubicación) en fragmentos, descartando los que solo tienen espacios."""
    return tuple(TextFragment(text.strip(), location) for text, location in texts if text.strip())


def require_text_found(
    document_name: str, fragments: tuple[TextFragment, ...]
) -> tuple[TextFragment, ...]:
    if not fragments:
        raise UnreadableDocumentError(document_name, UnreadableReason.NO_TEXT)
    return fragments
