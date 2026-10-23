from collections.abc import Mapping
from types import MappingProxyType

from argus.application.ports.document_reader import DocumentSource
from argus.application.ports.ocr_engine import OcrEngine, PageProgress
from argus.domain.document import Document, DocumentFormat
from argus.domain.errors import OcrUnavailableError, UnreadableReason, UnsupportedFormatError
from argus.domain.locations import PageLocation
from argus.domain.ocr import OcrProvider
from argus.domain.read_outcome import DocumentReadOutcome
from argus.infrastructure.readers.fragments import build_fragments

FIRST_PAGE = 1


class OcrPdfReader:
    """Lee con OCR un PDF escaneado; un fragmento por página, como el lector de texto."""

    def __init__(self, engines: Mapping[OcrProvider, OcrEngine]) -> None:
        self._engines: Mapping[OcrProvider, OcrEngine] = MappingProxyType(dict(engines))

    def read(self, source: DocumentSource, on_page: PageProgress) -> DocumentReadOutcome:
        if not _is_pdf(source.name):
            return DocumentReadOutcome(source.name, None, UnreadableReason.UNSUPPORTED_FORMAT)
        engine = self._engines.get(source.ocr or OcrProvider.LOCAL)
        if engine is None:
            return DocumentReadOutcome(source.name, None, UnreadableReason.OCR_UNAVAILABLE)
        try:
            result = engine.recognize(source.content, on_page)
        except OcrUnavailableError:
            return DocumentReadOutcome(source.name, None, UnreadableReason.OCR_UNAVAILABLE)
        fragments = build_fragments(
            (text, PageLocation(number))
            for number, text in enumerate(result.page_texts, start=FIRST_PAGE)
        )
        page_count = len(result.page_texts)
        if not fragments:
            return DocumentReadOutcome(
                source.name, None, UnreadableReason.NO_TEXT, result.method, page_count
            )
        document = Document(source.name, DocumentFormat.PDF, fragments)
        return DocumentReadOutcome(source.name, document, None, result.method, page_count)


def _is_pdf(name: str) -> bool:
    try:
        return DocumentFormat.from_file_name(name) is DocumentFormat.PDF
    except UnsupportedFormatError:
        return False
