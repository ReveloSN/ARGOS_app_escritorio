"""Dobles de la IA opcional: un llavero en memoria y un proveedor que no sale a la red."""

from argus.api.ai_composition import AiAdapters
from argus.application.ai.ai_change_explainer import ExplanationPrompt
from argus.application.ai.ai_settings import AiProvider, ProviderAccess
from argus.domain.errors import ExplanationProviderError, KeychainUnavailableError


class InMemorySecretStore:
    def __init__(self, secret: str | None = None, is_available: bool = True) -> None:
        self.secret = secret
        self._is_available = is_available

    def _require(self) -> None:
        if not self._is_available:
            raise KeychainUnavailableError("Sin llavero en esta prueba.")

    def read(self) -> str | None:
        self._require()
        return self.secret

    def store(self, secret: str) -> None:
        self._require()
        self.secret = secret

    def remove(self) -> None:
        self._require()
        self.secret = None


class RecordingProvider:
    """Responde un texto fijo o falla con el motivo indicado, y recuerda qué se le envió."""

    def __init__(self, answer: str = "Sugerencia de prueba.", failure: str | None = None) -> None:
        self.answer = answer
        self.failure = failure
        self.calls: list[tuple[str, ExplanationPrompt]] = []

    def explain(self, api_key: str, prompt: ExplanationPrompt) -> str:
        self.calls.append((api_key, prompt))
        if self.failure:
            raise ExplanationProviderError(self.failure)
        return self.answer


MODELS = {AiProvider.ANTHROPIC: "claude-sonnet-5-5", AiProvider.DEEPSEEK: "deepseek-flash"}


def offline_ai(provider: RecordingProvider | None = None, key: str | None = None) -> AiAdapters:
    """Los dos proveedores comparten el mismo doble; cada uno con su llavero en memoria."""
    shared = provider or RecordingProvider()
    return AiAdapters(
        {
            choice: ProviderAccess(InMemorySecretStore(key), shared, model)
            for choice, model in MODELS.items()
        }
    )


def recording_provider(ai: AiAdapters) -> RecordingProvider:
    provider = ai.providers[AiProvider.ANTHROPIC].provider
    assert isinstance(provider, RecordingProvider)
    return provider


def secret_store(ai: AiAdapters, provider: AiProvider) -> InMemorySecretStore:
    secrets = ai.providers[provider].secrets
    assert isinstance(secrets, InMemorySecretStore)
    return secrets
