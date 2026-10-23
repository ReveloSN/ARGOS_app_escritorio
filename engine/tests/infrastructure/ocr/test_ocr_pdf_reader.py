from argus.application.ports.document_reader import DocumentSource
from argus.domain.errors import UnreadableReason
from argus.domain.locations import PageLocation
from argus.domain.ocr import OcrProvider, PageCount, ReadMethod
from argus.infrastructure.ocr.ocr_pdf_reader import OcrPdfReader
from tests.application.ocr_doubles import ScriptedOcrEngine

SCANNED = DocumentSource("anexo_3.pdf", b"%PDF", OcrProvider.LOCAL)


def test_each_recognized_page_is_a_fragment_with_its_page_number() -> None:
    pages: list[PageCount] = []
    engine = ScriptedOcrEngine(("Contrato No. 4587", "  ", "Anexo"))

    outcome = OcrPdfReader({OcrProvider.LOCAL: engine}).read(SCANNED, pages.append)

    assert outcome.document is not None
    locations = [fragment.location for fragment in outcome.document.fragments]
    assert locations == [PageLocation(1), PageLocation(3)]
    assert outcome.method is ReadMethod.LOCAL_OCR
    assert outcome.page_count == 3
    assert pages[-1] == PageCount(3, 3)


def test_pages_without_text_after_ocr_are_still_no_text() -> None:
    reader = OcrPdfReader({OcrProvider.LOCAL: ScriptedOcrEngine(("", " "))})

    outcome = reader.read(SCANNED, lambda pages: None)

    assert outcome.reason is UnreadableReason.NO_TEXT
    assert outcome.method is ReadMethod.LOCAL_OCR


def test_an_ocr_that_cannot_run_explains_it() -> None:
    reader = OcrPdfReader({OcrProvider.LOCAL: ScriptedOcrEngine()})

    outcome = reader.read(SCANNED, lambda pages: None)

    assert outcome.reason is UnreadableReason.OCR_UNAVAILABLE


def test_a_provider_that_is_not_configured_explains_it() -> None:
    cloud = DocumentSource("anexo_3.pdf", b"%PDF", OcrProvider.CLOUD)

    outcome = OcrPdfReader({}).read(cloud, lambda pages: None)

    assert outcome.reason is UnreadableReason.OCR_UNAVAILABLE


def test_only_pdf_files_are_read_with_ocr() -> None:
    reader = OcrPdfReader({OcrProvider.LOCAL: ScriptedOcrEngine(("texto",))})

    for name in ("notas.docx", "sin_extension"):
        outcome = reader.read(DocumentSource(name, b"x", OcrProvider.LOCAL), lambda pages: None)
        assert outcome.reason is UnreadableReason.UNSUPPORTED_FORMAT
