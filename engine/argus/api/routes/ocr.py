from fastapi import APIRouter

from argus.api.composition import EngineServices
from argus.api.schemas.ocr import (
    OcrCloudUpdate,
    OcrCredentialsBody,
    OcrProcessorBody,
    OcrSettingsResponse,
)
from argus.application.ocr_settings import CloudOcrProcessor, OcrSettingsState


def _settings(state: OcrSettingsState) -> OcrSettingsResponse:
    processor = state.settings.processor
    return OcrSettingsResponse(
        is_local_available=state.is_local_available,
        uses_cloud=state.settings.uses_cloud,
        project_id=processor.project_id,
        location=processor.location,
        processor_id=processor.processor_id,
        has_credentials=state.has_credentials,
        is_keychain_available=state.is_keychain_available,
        is_cloud_ready=state.is_cloud_ready,
    )


def build_ocr_settings_router(services: EngineServices) -> APIRouter:
    """Ajustes > OCR: Document AI apagado o encendido y su procesador."""
    router = APIRouter(prefix="/settings/ocr")
    ocr = services.ocr_settings

    @router.get("")
    def ocr_settings() -> OcrSettingsResponse:
        return _settings(ocr.state())

    @router.put("")
    def update_ocr_settings(body: OcrCloudUpdate) -> OcrSettingsResponse:
        return _settings(ocr.set_uses_cloud(body.uses_cloud))

    @router.put("/processor")
    def update_processor(body: OcrProcessorBody) -> OcrSettingsResponse:
        processor = CloudOcrProcessor.from_input(body.project_id, body.location, body.processor_id)
        return _settings(ocr.set_processor(processor))

    return router


def build_ocr_credentials_router(services: EngineServices) -> APIRouter:
    """La clave de la cuenta de servicio de Document AI: se guarda o se quita, nunca se lee."""
    router = APIRouter(prefix="/settings/ocr/credentials")
    ocr = services.ocr_settings

    @router.put("")
    def store_credentials(body: OcrCredentialsBody) -> OcrSettingsResponse:
        return _settings(ocr.store_credentials(body.credentials))

    @router.delete("")
    def remove_credentials() -> OcrSettingsResponse:
        return _settings(ocr.remove_credentials())

    return router
