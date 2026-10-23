import base64
import json
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from typing import Protocol

from google.auth.exceptions import GoogleAuthError
from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import service_account
from requests import RequestException

from argus.application.ocr_settings import CloudOcrProcessor, OcrSettingsRepository
from argus.application.ports.ocr_engine import OcrResult, PageProgress
from argus.application.ports.secrets import SecretStore
from argus.domain.errors import KeychainUnavailableError, OcrUnavailableError
from argus.domain.ocr import PageCount, ReadMethod

ENDPOINT = (
    "https://{location}-documentai.googleapis.com/v1/projects/{project}"
    "/locations/{location}/processors/{processor}:process"
)
SCOPES = ("https://www.googleapis.com/auth/cloud-platform",)
PDF_MIME_TYPE = "application/pdf"
HTTP_OK = 200
# Document AI responde en segundos; más de dos minutos es una red que no llega.
REQUEST_TIMEOUT_SECONDS = 120

type Json = Mapping[str, object]


class CloudOcrSession(Protocol):
    def process(self, url: str, body: Json) -> Json: ...


class GoogleCloudSession:
    """Sesión autenticada con la cuenta de servicio guardada en el llavero."""

    def __init__(self, credentials_json: str) -> None:
        try:
            credentials = service_account.Credentials.from_service_account_info(
                json.loads(credentials_json), scopes=SCOPES
            )
        except (ValueError, GoogleAuthError):
            raise OcrUnavailableError("La clave de la cuenta de servicio no es válida.") from None
        self._session = AuthorizedSession(credentials)

    def process(self, url: str, body: Json) -> Json:
        try:
            response = self._session.post(url, json=body, timeout=REQUEST_TIMEOUT_SECONDS)
            payload = response.json() if response.status_code == HTTP_OK else None
        except (GoogleAuthError, RequestException, ValueError):
            raise OcrUnavailableError("Document AI no respondió.") from None
        if not isinstance(payload, dict):
            raise OcrUnavailableError("Document AI no aceptó el documento.")
        return payload


@dataclass(frozen=True)
class DocumentAiSources:
    settings: OcrSettingsRepository
    credentials: SecretStore
    connect: Callable[[str], CloudOcrSession] = GoogleCloudSession


class DocumentAiOcrEngine:
    """OCR en Google Document AI: solo si el usuario lo activó y lo configuró, y solo para el
    archivo que confirmó enviar. Sin red o sin credenciales lanza OcrUnavailableError."""

    def __init__(self, sources: DocumentAiSources) -> None:
        self._sources = sources

    def recognize(self, content: bytes, on_page: PageProgress) -> OcrResult:
        settings = self._sources.settings.get()
        if not settings.uses_cloud or not settings.processor.is_complete:
            raise OcrUnavailableError("Document AI está apagado o sin configurar.")
        session = self._sources.connect(self._credentials())
        response = session.process(endpoint_for(settings.processor), request_body(content))
        texts = page_texts(response)
        on_page(PageCount(len(texts), len(texts)))
        return OcrResult(texts, ReadMethod.CLOUD_OCR)

    def _credentials(self) -> str:
        try:
            credentials = self._sources.credentials.read()
        except KeychainUnavailableError:
            raise OcrUnavailableError("No se pudo leer el llavero del sistema.") from None
        if not credentials:
            raise OcrUnavailableError("Falta la clave de la cuenta de servicio.")
        return credentials


def endpoint_for(processor: CloudOcrProcessor) -> str:
    return ENDPOINT.format(
        location=processor.location,
        project=processor.project_id,
        processor=processor.processor_id,
    )


def request_body(content: bytes) -> Json:
    encoded = base64.b64encode(content).decode("ascii")
    return {"rawDocument": {"content": encoded, "mimeType": PDF_MIME_TYPE}}


def page_texts(response: Json) -> tuple[str, ...]:
    """El texto de cada página: Document AI da el texto completo y, por página, sus tramos."""
    document = _mapping(response.get("document"))
    text = document.get("text")
    full_text = text if isinstance(text, str) else ""
    return tuple(_page_text(full_text, page) for page in _sequence(document.get("pages")))


def _page_text(full_text: str, page: object) -> str:
    layout = _mapping(_mapping(page).get("layout"))
    segments = _sequence(_mapping(layout.get("textAnchor")).get("textSegments"))
    return "".join(full_text[slice(*_bounds(segment))] for segment in segments)


def _bounds(segment: object) -> tuple[int, int]:
    # Los índices llegan como texto (int64 en JSON) y startIndex se omite cuando es 0.
    values = _mapping(segment)
    return int(str(values.get("startIndex", 0))), int(str(values.get("endIndex", 0)))


def _mapping(value: object) -> Json:
    return value if isinstance(value, dict) else {}


def _sequence(value: object) -> Sequence[object]:
    return value if isinstance(value, list) else []
