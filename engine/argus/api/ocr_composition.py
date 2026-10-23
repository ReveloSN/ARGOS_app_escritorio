"""Construcción del OCR (ADR 026): Tesseract local y Document AI opcional con respaldo local."""

from collections.abc import Callable
from dataclasses import dataclass

from argus.api.ai_composition import AiAdapters, default_ai_adapters
from argus.application.ocr_fallback import FallbackOcrEngine
from argus.application.ocr_settings import (
    LocalOcrProbe,
    ManageOcrSettings,
    OcrSettingsRepository,
    OcrSettingsSources,
)
from argus.application.ports.ocr_engine import OcrEngine, OcrReader
from argus.application.ports.secrets import SecretStore
from argus.domain.ocr import OcrProvider
from argus.infrastructure.ai.keyring_secret_store import KeyringSecretStore
from argus.infrastructure.ocr.chunked_secret_store import ChunkedSecretStore
from argus.infrastructure.ocr.document_ai_ocr_engine import (
    CloudOcrSession,
    DocumentAiOcrEngine,
    DocumentAiSources,
    GoogleCloudSession,
)
from argus.infrastructure.ocr.ocr_pdf_reader import OcrPdfReader
from argus.infrastructure.ocr.pdfium_page_renderer import PdfiumPageRenderer
from argus.infrastructure.ocr.tesseract import TesseractLocator
from argus.infrastructure.ocr.tesseract_ocr_engine import TesseractOcrEngine

CLOUD_CREDENTIALS_ACCOUNT = "google-document-ai"


@dataclass(frozen=True)
class OcrAdapters:
    """Lo que toca el exterior: Tesseract, el llavero y Document AI.

    Las pruebas los reemplazan para no depender de Tesseract instalado, no escribir en el
    llavero real ni llamar a Google.
    """

    local: OcrEngine
    local_probe: LocalOcrProbe
    credentials: SecretStore
    connect: Callable[[str], CloudOcrSession]


@dataclass(frozen=True)
class ExternalAdapters:
    """Todo lo que sale del motor: la IA opcional y el OCR."""

    ai: AiAdapters
    ocr: OcrAdapters


def default_ocr_adapters() -> OcrAdapters:
    locator = TesseractLocator()
    credentials = ChunkedSecretStore(
        lambda account: KeyringSecretStore(account=account), CLOUD_CREDENTIALS_ACCOUNT
    )
    return OcrAdapters(
        TesseractOcrEngine(PdfiumPageRenderer(), locator), locator, credentials, GoogleCloudSession
    )


def default_external_adapters() -> ExternalAdapters:
    return ExternalAdapters(default_ai_adapters(), default_ocr_adapters())


def build_ocr_reader(settings: OcrSettingsRepository, adapters: OcrAdapters) -> OcrReader:
    cloud = DocumentAiOcrEngine(DocumentAiSources(settings, adapters.credentials, adapters.connect))
    return OcrPdfReader(
        {
            OcrProvider.LOCAL: adapters.local,
            OcrProvider.CLOUD: FallbackOcrEngine(cloud, adapters.local),
        }
    )


def build_ocr_settings(settings: OcrSettingsRepository, adapters: OcrAdapters) -> ManageOcrSettings:
    return ManageOcrSettings(
        OcrSettingsSources(settings, adapters.credentials, adapters.local_probe)
    )
