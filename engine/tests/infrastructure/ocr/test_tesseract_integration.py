from argus.domain.ocr import ReadMethod
from argus.infrastructure.ocr.pdfium_page_renderer import PdfiumPageRenderer
from argus.infrastructure.ocr.tesseract import TesseractLocator
from argus.infrastructure.ocr.tesseract_ocr_engine import TesseractOcrEngine
from tests.infrastructure.conftest import FIXTURES_DIR
from tests.tesseract_availability import requires_tesseract

# Imagen de una página, sin capa de texto (tests/fixtures/generate_fixtures.py).
SCANNED = FIXTURES_DIR / "Anexo_4_escaneado.pdf"


@requires_tesseract
def test_tesseract_reads_the_contract_number_of_a_scanned_page() -> None:
    engine = TesseractOcrEngine(PdfiumPageRenderer(), TesseractLocator())

    result = engine.recognize(SCANNED.read_bytes(), lambda pages: None)

    assert result.method is ReadMethod.LOCAL_OCR
    assert "4587" in result.page_texts[0]
    assert "18.450.000" in result.page_texts[0]
