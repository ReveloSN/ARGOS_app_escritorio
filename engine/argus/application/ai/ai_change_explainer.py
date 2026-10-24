from dataclasses import dataclass
from typing import Protocol

from argus.application.ai.ai_settings import AiSettingsRepository
from argus.application.ports.secrets import SecretStore
from argus.application.text_comparison.change_explanation import (
    ChangeExplanation,
    ExplanationRequest,
    ExplanationSource,
    ExplanationSubject,
    FallbackReason,
    TemplateChangeExplainer,
)
from argus.domain.errors import ExplanationProviderError, KeychainUnavailableError


@dataclass(frozen=True)
class ExplanationPrompt:
    """Lo único que sale del equipo: el idioma, qué se explica, su tipo y los fragmentos."""

    locale: str
    subject: ExplanationSubject
    kind: str
    fragments: tuple[str, ...]


class ExplanationProvider(Protocol):
    def explain(self, api_key: str, prompt: ExplanationPrompt) -> str:
        """El texto de la explicación; ExplanationProviderError si no se pudo obtener."""
        ...


@dataclass(frozen=True)
class AiExplanationSources:
    settings: AiSettingsRepository
    secrets: SecretStore
    provider: ExplanationProvider


def _fallback_reason(error: ExplanationProviderError) -> FallbackReason:
    try:
        return FallbackReason(error.reason)
    except ValueError:
        return FallbackReason.PROVIDER_UNAVAILABLE


class AiChangeExplainer:
    """Adapter con respaldo: si el usuario activó la IA y hay clave, pide la explicación al
    proveedor; si no, o si falla, devuelve la plantilla y dice por qué (nunca se queda sin
    explicación). La salida de la IA se muestra siempre como «Sugerencia de IA»."""

    def __init__(self, sources: AiExplanationSources, fallback: TemplateChangeExplainer) -> None:
        self._sources = sources
        self._fallback = fallback

    def explain(self, request: ExplanationRequest) -> ChangeExplanation:
        if not self._sources.settings.get().explains_changes:
            return self._fallback.explain(request)
        try:
            key = self._sources.secrets.read()
        except KeychainUnavailableError:
            return self._template(request, FallbackReason.KEYCHAIN_UNAVAILABLE)
        if not key:
            return self._template(request, FallbackReason.NO_KEY)
        return self._ask(request, key)

    def _ask(self, request: ExplanationRequest, key: str) -> ChangeExplanation:
        prompt = ExplanationPrompt(request.locale, request.subject, request.kind, request.fragments)
        try:
            text = self._sources.provider.explain(key, prompt)
        except ExplanationProviderError as error:
            return self._template(request, _fallback_reason(error))
        return ChangeExplanation(ExplanationSource.AI, text=text)

    def _template(self, request: ExplanationRequest, reason: FallbackReason) -> ChangeExplanation:
        template = self._fallback.explain(request)
        return ChangeExplanation(template.source, template.parts, fallback_reason=reason)
