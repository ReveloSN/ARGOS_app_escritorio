from dataclasses import dataclass

from argus.application.ai.ai_settings import AiSettingsRepository, ProviderAccess, ProviderAccesses
from argus.application.ai.explanation_provider import ExplanationPrompt, ExplanationProvider
from argus.application.text_comparison.change_explanation import (
    ChangeExplanation,
    ExplanationRequest,
    ExplanationSource,
    FallbackReason,
    TemplateChangeExplainer,
)
from argus.domain.errors import ExplanationProviderError, KeychainUnavailableError

__all__ = [
    "AiChangeExplainer",
    "AiExplanationSources",
    "ExplanationPrompt",
    "ExplanationProvider",
]


@dataclass(frozen=True)
class AiExplanationSources:
    settings: AiSettingsRepository
    providers: ProviderAccesses


def _fallback_reason(error: ExplanationProviderError) -> FallbackReason:
    try:
        return FallbackReason(error.reason)
    except ValueError:
        return FallbackReason.PROVIDER_UNAVAILABLE


class AiChangeExplainer:
    """Adapter con respaldo: si el usuario activó la IA y hay clave para el proveedor elegido,
    le pide la explicación; si no, o si falla, devuelve la plantilla y dice por qué (nunca se
    queda sin explicación). La salida de la IA se muestra siempre como «Sugerencia de IA»."""

    def __init__(self, sources: AiExplanationSources, fallback: TemplateChangeExplainer) -> None:
        self._sources = sources
        self._fallback = fallback

    def explain(self, request: ExplanationRequest) -> ChangeExplanation:
        settings = self._sources.settings.get()
        if not settings.explains_changes:
            return self._fallback.explain(request)
        access = self._sources.providers[settings.provider]
        try:
            key = access.secrets.read()
        except KeychainUnavailableError:
            return self._template(request, FallbackReason.KEYCHAIN_UNAVAILABLE)
        if not key:
            return self._template(request, FallbackReason.NO_KEY)
        return self._ask(request, access, key)

    def _ask(
        self, request: ExplanationRequest, access: ProviderAccess, key: str
    ) -> ChangeExplanation:
        prompt = ExplanationPrompt(request.locale, request.subject, request.kind, request.fragments)
        try:
            text = access.provider.explain(key, prompt)
        except ExplanationProviderError as error:
            return self._template(request, _fallback_reason(error))
        return ChangeExplanation(ExplanationSource.AI, text=text)

    def _template(self, request: ExplanationRequest, reason: FallbackReason) -> ChangeExplanation:
        template = self._fallback.explain(request)
        return ChangeExplanation(template.source, template.parts, fallback_reason=reason)
