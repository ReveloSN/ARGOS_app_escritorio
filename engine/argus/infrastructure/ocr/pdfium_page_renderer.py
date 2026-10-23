from io import BytesIO

import pypdfium2 as pdfium

from argus.domain.errors import OcrUnavailableError

# 300 ppp: la resolución que recomienda Tesseract; los PDF miden en puntos de 1/72 pulgadas.
OCR_DPI = 300
POINTS_PER_INCH = 72
PNG = "PNG"


class PdfiumPageRenderer:
    """Convierte cada página del PDF en una imagen PNG con pdfium (sin programas externos)."""

    def render(self, content: bytes) -> tuple[bytes, ...]:
        try:
            pdf = pdfium.PdfDocument(content)
        except pdfium.PdfiumError:
            raise OcrUnavailableError("pdfium no pudo abrir el PDF.") from None
        try:
            return tuple(_page_png(pdf[index]) for index in range(len(pdf)))
        finally:
            pdf.close()


def _page_png(page: pdfium.PdfPage) -> bytes:
    image = page.render(scale=OCR_DPI / POINTS_PER_INCH).to_pil()
    buffer = BytesIO()
    image.save(buffer, format=PNG)
    return buffer.getvalue()
