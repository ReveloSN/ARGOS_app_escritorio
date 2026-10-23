"""Construcción de la IA opcional (ADR 024): llavero, proveedor y explicación con respaldo."""

from dataclasses import dataclass

from argus.application.ai.ai_change_explainer import (
    AiChangeExplainer,
    AiExplanationSources,
    ExplanationProvider,
)
from argus.application.ai.ai_settings import AiSettingsRepository, ManageAiSettings
from argus.application.ports.secrets import SecretStore
from argus.application.text_comparison.change_explanation import (
    ChangeExplainer,
    TemplateChangeExplainer,
)
from argus.infrastructure.ai.anthropic_explanation_provider import AnthropicExplanationProvider
from argus.infrastructure.ai.keyring_secret_store import KeyringSecretStore


@dataclass(frozen=True)
class AiAdapters:
    """Lo que toca el exterior: el llavero del sistema y el proveedor del modelo de lenguaje.

    Las pruebas los reemplazan para no escribir en el llavero real ni llamar a la API.
    """

    secrets: SecretStore
    provider: ExplanationProvider


def default_ai_adapters() -> AiAdapters:
    return AiAdapters(KeyringSecretStore(), AnthropicExplanationProvider())


def build_change_explainer(settings: AiSettingsRepository, adapters: AiAdapters) -> ChangeExplainer:
    sources = AiExplanationSources(settings, adapters.secrets, adapters.provider)
    return AiChangeExplainer(sources, TemplateChangeExplainer())


def build_ai_settings(settings: AiSettingsRepository, adapters: AiAdapters) -> ManageAiSettings:
    return ManageAiSettings(settings, adapters.secrets)
