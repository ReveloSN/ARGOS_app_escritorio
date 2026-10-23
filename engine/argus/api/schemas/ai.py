"""«Explicar este cambio» y Ajustes > Inteligencia artificial."""

from typing import Annotated

from pydantic import Field

from argus.api.schemas.review import CamelModel, ExplanationPartResponse


class ChangeExplanationResponse(CamelModel):
    # «ai»: redactada por el modelo («Sugerencia de IA»); «template»: plantilla local.
    source: str
    parts: list[ExplanationPartResponse]
    text: str
    # Por qué se usó la plantilla con la IA activada; None si no hubo problema.
    fallback_reason: str | None


class AiSettingsResponse(CamelModel):
    explains_changes: bool
    has_key: bool
    is_keychain_available: bool
    provider: str
    model: str


class AiSettingsUpdate(CamelModel):
    explains_changes: bool


class AiKeyBody(CamelModel):
    key: Annotated[str, Field(min_length=1, max_length=400)]
