"""Dobles de la IA opcional: un llavero en memoria y un proveedor que no sale a la red."""

from argus.api.ai_composition import AiAdapters
from argus.application.ai.ai_change_explainer import ExplanationPrompt
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


def offline_ai() -> AiAdapters:
    return AiAdapters(InMemorySecretStore(), RecordingProvider())
