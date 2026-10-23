"""Ajustes > OCR: Tesseract local y Google Document AI opcional."""

from typing import Annotated

from pydantic import Field

from argus.api.schemas.review import CamelModel

# Una clave de cuenta de servicio mide unos 2,3 KB; el límite evita guardar cualquier cosa.
MAX_CREDENTIALS_CHARACTERS = 20_000
MAX_IDENTIFIER_CHARACTERS = 120


class OcrSettingsResponse(CamelModel):
    is_local_available: bool
    uses_cloud: bool
    project_id: str
    location: str
    processor_id: str
    has_credentials: bool
    is_keychain_available: bool
    # Document AI activado, con procesador y clave: se puede ofrecer al pulsar «Activar OCR».
    is_cloud_ready: bool


class OcrCloudUpdate(CamelModel):
    uses_cloud: bool


class OcrProcessorBody(CamelModel):
    project_id: Annotated[str, Field(max_length=MAX_IDENTIFIER_CHARACTERS)]
    location: Annotated[str, Field(max_length=MAX_IDENTIFIER_CHARACTERS)]
    processor_id: Annotated[str, Field(max_length=MAX_IDENTIFIER_CHARACTERS)]


class OcrCredentialsBody(CamelModel):
    credentials: Annotated[str, Field(min_length=1, max_length=MAX_CREDENTIALS_CHARACTERS)]
