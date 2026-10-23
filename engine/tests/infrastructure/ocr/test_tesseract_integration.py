from io import BytesIO

from PIL import Image
from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas

from argus.domain.ocr import ReadMethod
from argus.infrastructure.ocr.pdfium_page_renderer import PdfiumPageRenderer
from argus.infrastructure.ocr.tesseract import TesseractLocator
from argus.infrastructure.ocr.tesseract_ocr_engine import TesseractOcrEngine
from tests.tesseract_availability import requires_tesseract

LINES = ("CONTRATO DE ARRENDAMIENTO No. 4857", "Canon mensual: $ 18.450.000")
FONT_SIZE = 20
LEFT_MARGIN = 72
TOP_LINE = 680
LINE_GAP = 40


def scanned_pdf() -> bytes:
    """Un PDF solo con la imagen de una página, como el que entrega un escáner."""
    text_pdf = BytesIO()
    page = canvas.Canvas(text_pdf, pagesize=LETTER)
    page.setFont("Helvetica", FONT_SIZE)
    for index, line in enumerate(LINES):
        page.drawString(LEFT_MARGIN, TOP_LINE - index * LINE_GAP, line)
    page.save()
    png = PdfiumPageRenderer().render(text_pdf.getvalue())[0]
    scanned = BytesIO()
    Image.open(BytesIO(png)).convert("RGB").save(scanned, format="PDF")
    return scanned.getvalue()


@requires_tesseract
def test_tesseract_reads_the_contract_number_of_a_scanned_page() -> None:
    engine = TesseractOcrEngine(PdfiumPageRenderer(), TesseractLocator())

    result = engine.recognize(scanned_pdf(), lambda pages: None)

    assert result.method is ReadMethod.LOCAL_OCR
    assert "4857" in result.page_texts[0]
    assert "18.450.000" in result.page_texts[0]
