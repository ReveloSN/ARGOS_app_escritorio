from argus.application.ai.ai_change_explainer import AiChangeExplainer, AiExplanationSources
from argus.application.ai.ai_settings import (
    AiProvider,
    AiSettings,
    ManageAiSettings,
    ProviderAccess,
    ProviderAccesses,
)
from argus.application.alert_explanation import ExplanationPart
from argus.application.text_comparison.change_explanation import (
    ExplanationRequest,
    ExplanationSource,
    ExplanationSubject,
    TemplateChangeExplainer,
)
from tests.application.ai_doubles import InMemorySecretStore, RecordingProvider

REQUEST = ExplanationRequest(
    ExplanationSubject.ALERT,
    "transposition",
    ("Contrato No. 4857", "Contrato No. 4587"),
    (ExplanationPart("explanation.lead.contract_id"),),
    "es",
)


class InMemoryAiSettings:
    def __init__(self, settings: AiSettings) -> None:
        self.settings = settings

    def get(self) -> AiSettings:
        return self.settings

    def save(self, settings: AiSettings) -> None:
        self.settings = settings


def two_providers() -> tuple[ProviderAccesses, RecordingProvider, RecordingProvider]:
    claude = RecordingProvider("Respuesta de Claude.")
    deepseek = RecordingProvider("Respuesta de DeepSeek.")
    providers: ProviderAccesses = {
        AiProvider.ANTHROPIC: ProviderAccess(InMemorySecretStore(), claude, "claude-sonnet-5-5"),
        AiProvider.DEEPSEEK: ProviderAccess(InMemorySecretStore(), deepseek, "deepseek-flash"),
    }
    return providers, claude, deepseek


def test_each_provider_has_its_own_key_and_model() -> None:
    providers, _, _ = two_providers()
    manage = ManageAiSettings(InMemoryAiSettings(AiSettings()), providers)
    manage.store_key("sk-ant")

    switched = manage.set_provider(AiProvider.DEEPSEEK)

    assert (switched.model, switched.has_key) == ("deepseek-flash", False)
    assert manage.store_key("sk-deep").has_key
    assert manage.set_provider(AiProvider.ANTHROPIC).has_key
    assert manage.available() == (
        (AiProvider.ANTHROPIC, "claude-sonnet-5-5"),
        (AiProvider.DEEPSEEK, "deepseek-flash"),
    )


def test_the_chosen_provider_answers_with_its_own_key() -> None:
    providers, claude, deepseek = two_providers()
    providers[AiProvider.DEEPSEEK].secrets.store("sk-deep")
    settings = InMemoryAiSettings(AiSettings(explains_changes=True, provider=AiProvider.DEEPSEEK))
    explainer = AiChangeExplainer(
        AiExplanationSources(settings, providers), TemplateChangeExplainer()
    )

    explanation = explainer.explain(REQUEST)

    assert explanation.source is ExplanationSource.AI
    assert explanation.text == "Respuesta de DeepSeek."
    assert deepseek.calls[0][0] == "sk-deep"
    assert claude.calls == []
