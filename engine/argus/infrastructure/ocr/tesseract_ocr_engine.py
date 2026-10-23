from typing import Protocol

from argus.application.ports.ocr_engine import OcrResult, PageProgress
from argus.domain.errors import OcrUnavailableError
from argus.domain.ocr import PageCount, ReadMethod
from argus.infrastructure.ocr.tesseract import TesseractCommand, TesseractLocator


class PageRenderer(Protocol):
    def render(self, content: bytes) -> tuple[bytes, ...]: ...


class TesseractOcrEngine:
    """OCR local (por defecto): cada página como imagen y Tesseract sobre ella, en este equipo."""

    def __init__(self, renderer: PageRenderer, locator: TesseractLocator) -> None:
        self._renderer = renderer
        self._locator = locator

    def recognize(self, content: bytes, on_page: PageProgress) -> OcrResult:
        executable = self._locator.locate()
        if executable is None:
            raise OcrUnavailableError("No se encontró Tesseract en este equipo.")
        command = TesseractCommand(executable)
        pages = self._renderer.render(content)
        texts: list[str] = []
        for page in pages:
            texts.append(command.recognize(page))
            on_page(PageCount(len(texts), len(pages)))
        return OcrResult(tuple(texts), ReadMethod.LOCAL_OCR)
