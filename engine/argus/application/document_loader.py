from collections.abc import Sequence
from typing import Protocol

from argus.application.document_limits import MAX_DOCUMENT_BYTES
from argus.application.document_reader_factory import DocumentReaderFactory
from argus.application.ports.document_reader import DocumentSource
from argus.application.ports.ocr_engine import OcrReader
from argus.domain.errors import UnreadableDocumentError, UnreadableReason
from argus.domain.ocr import PageCount
from argus.domain.read_outcome import DocumentReadOutcome


class ReadingProgress(Protocol):
    """Observer: el avance de la lectura, archivo por archivo."""

    def document_started(self, position: int, name: str) -> None: ...

    def document_finished(self, position: int, outcome: DocumentReadOutcome) -> None: ...

    def page_recognized(self, position: int, pages: PageCount) -> None:
        """Con OCR, cada página leída del archivo en `position`."""
        ...


class DocumentLoader:
    """Lee los archivos cargados para una revisión o una comparación.

    Un archivo que no se puede leer no detiene el resto: queda con su motivo (mockup
    «Confirmar lectura»).
    """

    def __init__(self, readers: DocumentReaderFactory, ocr: OcrReader | None = None) -> None:
        self._readers = readers
        self._ocr = ocr

    def load(
        self, sources: Sequence[DocumentSource], progress: ReadingProgress
    ) -> tuple[DocumentReadOutcome, ...]:
        return tuple(
            self._read_observed(position, source, progress)
            for position, source in enumerate(sources)
        )

    def _read_observed(
        self, position: int, source: DocumentSource, progress: ReadingProgress
    ) -> DocumentReadOutcome:
        progress.document_started(position, source.name)
        if source.ocr is not None and len(source.content) <= MAX_DOCUMENT_BYTES:
            outcome = self._read_with_ocr(position, source, progress)
        else:
            outcome = self._read(source)
        progress.document_finished(position, outcome)
        return outcome

    def _read_with_ocr(
        self, position: int, source: DocumentSource, progress: ReadingProgress
    ) -> DocumentReadOutcome:
        if self._ocr is None:
            return DocumentReadOutcome(source.name, None, UnreadableReason.OCR_UNAVAILABLE)
        return self._ocr.read(source, lambda pages: progress.page_recognized(position, pages))

    def _read(self, source: DocumentSource) -> DocumentReadOutcome:
        if len(source.content) > MAX_DOCUMENT_BYTES:
            return DocumentReadOutcome(source.name, None, UnreadableReason.TOO_LARGE)
        try:
            document = self._readers.reader_for(source.name).read(source)
        except UnreadableDocumentError as error:
            return DocumentReadOutcome(source.name, None, error.reason, page_count=error.page_count)
        return DocumentReadOutcome(source.name, document, None)
