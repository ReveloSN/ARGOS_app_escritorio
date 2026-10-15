from pathlib import Path

from argus.application.document_limits import MAX_DOCUMENT_BYTES
from argus.application.ports.document_reader import DocumentSource
from argus.domain.errors import UnreadableDocumentError, UnreadableReason


class FileSourceLoader:
    """Carga un archivo del disco como DocumentSource, comprobando el tamaño antes de leerlo."""

    def __init__(self, max_bytes: int = MAX_DOCUMENT_BYTES) -> None:
        self._max_bytes = max_bytes

    def load(self, path: Path) -> DocumentSource:
        try:
            size = path.stat().st_size
            if size > self._max_bytes:
                raise UnreadableDocumentError(path.name, UnreadableReason.TOO_LARGE)
            return DocumentSource(path.name, path.read_bytes())
        except FileNotFoundError:
            raise UnreadableDocumentError(path.name, UnreadableReason.NOT_FOUND) from None
