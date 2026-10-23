from argus.application.ports.ocr_engine import OcrEngine, OcrResult, PageProgress
from argus.domain.errors import OcrUnavailableError


class FallbackOcrEngine:
    """Document AI con respaldo local: sin red, sin credenciales o con un documento que la nube
    no acepta, se lee con Tesseract y el resultado dice que fue local."""

    def __init__(self, primary: OcrEngine, fallback: OcrEngine) -> None:
        self._primary = primary
        self._fallback = fallback

    def recognize(self, content: bytes, on_page: PageProgress) -> OcrResult:
        try:
            return self._primary.recognize(content, on_page)
        except OcrUnavailableError:
            return self._fallback.recognize(content, on_page)
