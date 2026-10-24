from typing import Annotated

from fastapi import APIRouter, Query

from argus.api.composition import EngineServices
from argus.api.schemas.ai import (
    AiKeyBody,
    AiProviderResponse,
    AiSettingsResponse,
    AiSettingsUpdate,
    ChangeExplanationResponse,
)
from argus.api.schemas.review import ExplanationPartResponse
from argus.application.ai.ai_settings import AiSettingsState, ManageAiSettings
from argus.application.text_comparison.change_explanation import ChangeExplanation

DEFAULT_LOCALE = "es"


def _settings(ai: ManageAiSettings, state: AiSettingsState) -> AiSettingsResponse:
    return AiSettingsResponse(
        explains_changes=state.settings.explains_changes,
        provider=state.settings.provider,
        model=state.model,
        has_key=state.has_key,
        is_keychain_available=state.is_keychain_available,
        providers=[AiProviderResponse(id=id, model=model) for id, model in ai.available()],
    )


def _explanation(explanation: ChangeExplanation) -> ChangeExplanationResponse:
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


def build_change_explanation_router(services: EngineServices) -> APIRouter:
    """«Explicar este cambio» en la pantalla Comparar."""
    router = APIRouter(prefix="/comparisons")

    @router.get("/{comparison_id}/changes/{number}/explanation")
    def explain_change(
        comparison_id: str, number: int, locale: Annotated[str, Query()] = DEFAULT_LOCALE
    ) -> ChangeExplanationResponse:
        return _explanation(services.comparisons.explain.execute(comparison_id, number, locale))

    return router


def build_alert_explanation_router(services: EngineServices) -> APIRouter:
    """«Explicar esta alerta» en el detalle de la alerta: el mismo flujo que los cambios."""
    router = APIRouter(prefix="/reviews")

    @router.get("/{session_id}/alerts/{number}/explanation")
    def explain_alert(
        session_id: str, number: int, locale: Annotated[str, Query()] = DEFAULT_LOCALE
    ) -> ChangeExplanationResponse:
        return _explanation(services.explain_alert.execute(session_id, number, locale))

    return router


def _apply(ai: ManageAiSettings, body: AiSettingsUpdate) -> AiSettingsState:
    """Cambia solo lo que viene en el cuerpo: el proveedor, el interruptor o los dos."""
    if body.provider is not None:
        ai.set_provider(body.provider)
    if body.explains_changes is not None:
        ai.set_explains_changes(body.explains_changes)
    return ai.state()


def build_ai_settings_router(services: EngineServices) -> APIRouter:
    """Activar la IA y guardar la clave en el llavero; la clave nunca se devuelve."""
    router = APIRouter(prefix="/settings/ai")
    ai = services.ai_settings

    @router.get("")
    def ai_settings() -> AiSettingsResponse:
        return _settings(ai, ai.state())

    @router.put("")
    def update_ai_settings(body: AiSettingsUpdate) -> AiSettingsResponse:
        return _settings(ai, _apply(ai, body))

    @router.put("/key")
    def store_key(body: AiKeyBody) -> AiSettingsResponse:
        return _settings(ai, ai.store_key(body.key))

    @router.delete("/key")
    def remove_key() -> AiSettingsResponse:
        return _settings(ai, ai.remove_key())

    return router
