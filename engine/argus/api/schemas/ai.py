"""«Explicar este cambio» y Ajustes > Inteligencia artificial."""

from typing import Annotated

from pydantic import Field

from argus.api.schemas.review import CamelModel, ExplanationPartResponse
from argus.application.ai.ai_settings import AiProvider


class ExplanationStructureResponse(CamelModel):
    summary: str
    what_changed: str
    why_it_matters: str
    what_to_do: str


class ChangeExplanationResponse(CamelModel):
    # «ai»: redactada por el modelo («Sugerencia de IA»); «template»: plantilla local.
    source: str
    parts: list[ExplanationPartResponse]
    text: str
    # Por qué se usó la plantilla con la IA activada; None si no hubo problema.
    fallback_reason: str | None
    # Los cuatro bloques cortos si la IA los entregó; None con la plantilla o con texto libre.
    structure: ExplanationStructureResponse | None


class AiProviderResponse(CamelModel):
    id: AiProvider
    model: str


class AiSettingsResponse(CamelModel):
    explains_changes: bool
    # El proveedor elegido y su modelo; la clave y el llavero se refieren a ese proveedor.
    provider: AiProvider
    model: str
    has_key: bool
    is_keychain_available: bool
    providers: list[AiProviderResponse]


class AiSettingsUpdate(CamelModel):
    """Cada campo es opcional: se cambia solo lo que viene."""

    explains_changes: bool | None = None
    provider: AiProvider | None = None


class AiKeyBody(CamelModel):
    key: Annotated[str, Field(min_length=1, max_length=400)]
