"""Construcción de la IA opcional (ADR 024 y 028): llavero, proveedores y explicación con
respaldo."""

from dataclasses import dataclass

from argus.application.ai.ai_change_explainer import AiChangeExplainer, AiExplanationSources
from argus.application.ai.ai_settings import (
    AiProvider,
    AiSettingsRepository,
    ManageAiSettings,
    ProviderAccess,
    ProviderAccesses,
)
from argus.application.text_comparison.change_explanation import (
    ChangeExplainer,
    TemplateChangeExplainer,
)
from argus.infrastructure.ai import anthropic_explanation_provider, deepseek_explanation_provider
from argus.infrastructure.ai.anthropic_explanation_provider import AnthropicExplanationProvider
from argus.infrastructure.ai.deepseek_explanation_provider import DeepSeekExplanationProvider
from argus.infrastructure.ai.keyring_secret_store import KeyringSecretStore

# Cada proveedor guarda su clave en su propia entrada del llavero: cambiar de proveedor no
# mezcla ni borra la del otro.
KEYCHAIN_ACCOUNTS = {
    AiProvider.ANTHROPIC: "anthropic-api-key",
    AiProvider.DEEPSEEK: "deepseek-api-key",
}


@dataclass(frozen=True)
class AiAdapters:
    """Lo que toca el exterior: el llavero del sistema y los proveedores del modelo de lenguaje.

    Las pruebas los reemplazan para no escribir en el llavero real ni llamar a ninguna API.
    """

    providers: ProviderAccesses


def default_ai_adapters() -> AiAdapters:
    return AiAdapters(
        {
            AiProvider.ANTHROPIC: ProviderAccess(
                KeyringSecretStore(account=KEYCHAIN_ACCOUNTS[AiProvider.ANTHROPIC]),
                AnthropicExplanationProvider(),
                anthropic_explanation_provider.MODEL,
            ),
            AiProvider.DEEPSEEK: ProviderAccess(
                KeyringSecretStore(account=KEYCHAIN_ACCOUNTS[AiProvider.DEEPSEEK]),
                DeepSeekExplanationProvider(),
                deepseek_explanation_provider.MODEL,
            ),
        }
    )


def build_change_explainer(settings: AiSettingsRepository, adapters: AiAdapters) -> ChangeExplainer:
    sources = AiExplanationSources(settings, adapters.providers)
    return AiChangeExplainer(sources, TemplateChangeExplainer())


def build_ai_settings(settings: AiSettingsRepository, adapters: AiAdapters) -> ManageAiSettings:
    return ManageAiSettings(settings, adapters.providers)
