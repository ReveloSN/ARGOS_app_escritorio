from argus.application.document_limits import MAX_DOCUMENT_BYTES
from argus.application.document_loader import DocumentLoader
from argus.application.document_reader_factory import DocumentReaderFactory
from argus.application.ocr_fallback import FallbackOcrEngine
from argus.application.ports.document_reader import DocumentSource
from argus.application.ports.ocr_engine import PageProgress
from argus.domain.document import Document, DocumentFormat
from argus.domain.errors import UnreadableDocumentError, UnreadableReason
from argus.domain.ocr import OcrProvider, PageCount, ReadMethod
from argus.domain.read_outcome import DocumentReadOutcome
from tests.application.ocr_doubles import ScriptedOcrEngine
from tests.application.test_run_review import LineReader, RecordingProgress

SCANNED_PAGES = 3


class ScannedPdfReader:
    def read(self, source: DocumentSource) -> Document:
        raise UnreadableDocumentError(source.name, UnreadableReason.NO_TEXT, SCANNED_PAGES)


class PageCountingOcrReader:
    """Lee cualquier archivo como «leído con OCR» después de avisar dos páginas."""

    def read(self, source: DocumentSource, on_page: PageProgress) -> DocumentReadOutcome:
        on_page(PageCount(1, 2))
        on_page(PageCount(2, 2))
        return DocumentReadOutcome(
            source.name, None, UnreadableReason.NO_TEXT, ReadMethod.LOCAL_OCR
        )


def readers() -> DocumentReaderFactory:
    return DocumentReaderFactory(
        {DocumentFormat.TEXT: LineReader(), DocumentFormat.PDF: ScannedPdfReader()}
    )


def test_only_the_files_asked_for_are_read_with_ocr_and_each_page_is_reported() -> None:
    progress = RecordingProgress()
    loader = DocumentLoader(readers(), PageCountingOcrReader())
    sources = (
        DocumentSource("notas.txt", b"Contrato No. 4857"),
        DocumentSource("anexo_3.pdf", b"%PDF", OcrProvider.LOCAL),
    )

    outcomes = loader.load(sources, progress)

    assert outcomes[0].is_read
    assert outcomes[1].method is ReadMethod.LOCAL_OCR
    assert "página 1 de 2 del 1" in progress.events
    assert "página 2 de 2 del 1" in progress.events


def test_a_scanned_pdf_reports_how_many_pages_it_has() -> None:
    outcome = DocumentLoader(readers()).load(
        (DocumentSource("anexo_3.pdf", b"%PDF"),), RecordingProgress()
    )[0]

    assert outcome.reason is UnreadableReason.NO_TEXT
    assert outcome.page_count == SCANNED_PAGES


def test_without_ocr_the_file_explains_that_ocr_is_not_available() -> None:
    source = DocumentSource("anexo_3.pdf", b"%PDF", OcrProvider.LOCAL)

    outcome = DocumentLoader(readers()).load((source,), RecordingProgress())[0]

    assert outcome.reason is UnreadableReason.OCR_UNAVAILABLE


def test_a_file_too_large_is_not_sent_to_ocr() -> None:
    source = DocumentSource("anexo_3.pdf", b"x" * (MAX_DOCUMENT_BYTES + 1), OcrProvider.CLOUD)

    outcome = DocumentLoader(readers(), PageCountingOcrReader()).load(
        (source,), RecordingProgress()
    )[0]

    assert outcome.reason is UnreadableReason.TOO_LARGE


def test_the_cloud_falls_back_to_the_local_ocr_and_says_it_was_local() -> None:
    cloud = ScriptedOcrEngine(None, ReadMethod.CLOUD_OCR)
    local = ScriptedOcrEngine(("Contrato No. 4857",))

    result = FallbackOcrEngine(cloud, local).recognize(b"%PDF", lambda pages: None)

    assert cloud.calls == 1
    assert result.method is ReadMethod.LOCAL_OCR


def test_when_the_cloud_answers_the_local_ocr_is_not_used() -> None:
    cloud = ScriptedOcrEngine(("Contrato",), ReadMethod.CLOUD_OCR)
    local = ScriptedOcrEngine(("Contrato",))

    result = FallbackOcrEngine(cloud, local).recognize(b"%PDF", lambda pages: None)

    assert result.method is ReadMethod.CLOUD_OCR
    assert local.calls == 0
