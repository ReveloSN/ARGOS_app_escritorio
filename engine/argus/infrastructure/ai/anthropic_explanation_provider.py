from collections.abc import Callable
from typing import Final

import anthropic
from anthropic.types.beta import BetaMessage, BetaMessageParam, BetaOutputConfigParam

from argus.application.ai.explanation_provider import ExplanationPrompt
from argus.domain.errors import ExplanationProviderError
from argus.infrastructure.ai.explanation_prompts import system_prompt, user_message

MODEL = "claude-sonnet-5-5"
# Unas pocas frases bastan; un tope corto evita respuestas largas y costosas.
MAX_TOKENS = 1024
EFFORT: Final = "low"
# Si el modelo declina por una de sus categorías de seguridad, el servidor reintenta en el
# modelo que Anthropic recomienda para esa categoría.
FALLBACK_BETA = "server-side-fallback-2026-07-01"
FALLBACK_MODE: Final = "default"
REQUEST_TIMEOUT_SECONDS = 30.0
REFUSAL = "refusal"

type ClientFactory = Callable[[str], anthropic.Anthropic]


def default_client(api_key: str) -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=api_key, timeout=REQUEST_TIMEOUT_SECONDS)


def _text_of(response: BetaMessage) -> str:
    if response.stop_reason == REFUSAL:
        raise ExplanationProviderError("refused")
    text = " ".join(block.text for block in response.content if block.type == "text").strip()
    if not text:
        raise ExplanationProviderError("provider_unavailable")
    return text


class AnthropicExplanationProvider:
    """Adapter del puerto ExplanationProvider con la API de Anthropic (SDK oficial).

    Solo envía el idioma, qué se explica, su tipo y los fragmentos de origen; nunca el documento.
    """

    def __init__(self, client_for: ClientFactory = default_client) -> None:
        self._client_for = client_for

    def explain(self, api_key: str, prompt: ExplanationPrompt) -> str:
        messages: list[BetaMessageParam] = [{"role": "user", "content": user_message(prompt)}]
        output_config: BetaOutputConfigParam = {"effort": EFFORT}
        try:
            response = self._client_for(api_key).beta.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=system_prompt(prompt),
                messages=messages,
                output_config=output_config,
                betas=[FALLBACK_BETA],
                fallbacks=FALLBACK_MODE,
            )
        except anthropic.AuthenticationError:
            raise ExplanationProviderError("invalid_key") from None
        except (anthropic.APIStatusError, anthropic.APIConnectionError):
            raise ExplanationProviderError("provider_unavailable") from None
        return _text_of(response)
