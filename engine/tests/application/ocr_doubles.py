"""Dobles del OCR: un motor que responde páginas fijas y una nube que nunca sale a la red."""

from argus.api.ai_composition import AiAdapters
from argus.api.ocr_composition import ExternalAdapters, OcrAdapters
from argus.application.ports.ocr_engine import OcrResult, PageProgress
from argus.domain.errors import OcrUnavailableError
from argus.domain.ocr import PageCount, ReadMethod
from argus.infrastructure.ocr.document_ai_ocr_engine import Json
from tests.application.ai_doubles import InMemorySecretStore, offline_ai


class ScriptedOcrEngine:
    """Devuelve el texto de cada página indicado, avisando el avance; sin páginas, no está."""

    def __init__(
        self, page_texts: tuple[str, ...] | None = None, method: ReadMethod = ReadMethod.LOCAL_OCR
    ) -> None:
        self.page_texts = page_texts
        self.method = method
        self.calls = 0

    def recognize(self, content: bytes, on_page: PageProgress) -> OcrResult:
        self.calls += 1
        if self.page_texts is None:
            raise OcrUnavailableError("Sin OCR en esta prueba.")
        for done in range(1, len(self.page_texts) + 1):
            on_page(PageCount(done, len(self.page_texts)))
        return OcrResult(self.page_texts, self.method)


class FixedProbe:
    def __init__(self, is_available: bool) -> None:
        self._is_available = is_available

    def is_available(self) -> bool:
        return self._is_available


class RecordingCloudSession:
    """Responde lo indicado y recuerda a qué URL se envió; sin respuesta, la red falla."""

    sent: list[tuple[str, Json]]

    def __init__(self, response: Json | None = None) -> None:
        self.response = response
        self.sent = []

    def process(self, url: str, body: Json) -> Json:
        self.sent.append((url, body))
        if self.response is None:
            raise OcrUnavailableError("Sin red en esta prueba.")
        return self.response


def refuse_cloud(credentials: str) -> RecordingCloudSession:
    return RecordingCloudSession()


def offline_ocr(local: ScriptedOcrEngine | None = None) -> OcrAdapters:
    engine = local or ScriptedOcrEngine()
    return OcrAdapters(
        engine, FixedProbe(engine.page_texts is not None), InMemorySecretStore(), refuse_cloud
    )


def offline_adapters(
    ai: AiAdapters | None = None, ocr: OcrAdapters | None = None
) -> ExternalAdapters:
    return ExternalAdapters(ai or offline_ai(), ocr or offline_ocr())
