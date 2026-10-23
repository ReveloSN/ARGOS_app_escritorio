from collections.abc import Callable
from dataclasses import dataclass
from typing import Protocol

from argus.application.ports.document_reader import DocumentSource
from argus.domain.ocr import PageCount, ReadMethod
from argus.domain.read_outcome import DocumentReadOutcome

type PageProgress = Callable[[PageCount], None]


@dataclass(frozen=True)
class OcrResult:
    """El texto de cada página, en orden, y quién lo leyó (la nube puede caer al OCR local)."""

    page_texts: tuple[str, ...]
    method: ReadMethod


class OcrEngine(Protocol):
    """Reconoce el texto de un PDF escaneado página por página (CLAUDE.md §15).

    Lanza OcrUnavailableError si no se puede usar (falta Tesseract, sin red, sin credenciales).
    """

    def recognize(self, content: bytes, on_page: PageProgress) -> OcrResult: ...


class OcrReader(Protocol):
    """Lee con OCR un archivo que el usuario pidió leer así («Activar OCR»)."""

    def read(self, source: DocumentSource, on_page: PageProgress) -> DocumentReadOutcome: ...
