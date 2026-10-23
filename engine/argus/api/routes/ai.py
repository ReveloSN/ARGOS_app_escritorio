from typing import Annotated

from fastapi import APIRouter, Query

from argus.api.composition import EngineServices
from argus.api.schemas.ai import (
    AiKeyBody,
    AiSettingsResponse,
    AiSettingsUpdate,
    ChangeExplanationResponse,
)
from argus.api.schemas.review import ExplanationPartResponse
from argus.application.ai.ai_settings import AiSettingsState
from argus.infrastructure.ai.anthropic_explanation_provider import MODEL

PROVIDER = "anthropic"
DEFAULT_LOCALE = "es"


def _settings(state: AiSettingsState) -> AiSettingsResponse:
    return AiSettingsResponse(
        explains_changes=state.settings.explains_changes,
        has_key=state.has_key,
        is_keychain_available=state.is_keychain_available,
        provider=PROVIDER,
        model=MODEL,
    )


def build_change_explanation_router(services: EngineServices) -> APIRouter:
    """«Explicar este cambio» en la pantalla Comparar."""
    router = APIRouter(prefix="/comparisons")

    @router.get("/{comparison_id}/changes/{number}/explanation")
    def explain_change(
        comparison_id: str, number: int, locale: Annotated[str, Query()] = DEFAULT_LOCALE
    ) -> ChangeExplanationResponse:
        explanation = services.comparisons.explain.execute(comparison_id, number, locale)
        parts = [
            ExplanationPartResponse(key=part.key, params=dict(part.params), count=part.count)
            for part in explanation.parts
        ]
        return ChangeExplanationResponse(
            source=explanation.source,
            parts=parts,
            text=explanation.text,
            fallback_reason=explanation.fallback_reason,
        )

    return router


def build_ai_settings_router(services: EngineServices) -> APIRouter:
    """Activar la IA y guardar la clave en el llavero; la clave nunca se devuelve."""
    router = APIRouter(prefix="/settings/ai")
    ai = services.ai_settings

    @router.get("")
    def ai_settings() -> AiSettingsResponse:
        return _settings(ai.state())

    @router.put("")
    def update_ai_settings(body: AiSettingsUpdate) -> AiSettingsResponse:
        return _settings(ai.set_explains_changes(body.explains_changes))

    @router.put("/key")
    def store_key(body: AiKeyBody) -> AiSettingsResponse:
        return _settings(ai.store_key(body.key))

    @router.delete("/key")
    def remove_key() -> AiSettingsResponse:
        return _settings(ai.remove_key())

    return router
