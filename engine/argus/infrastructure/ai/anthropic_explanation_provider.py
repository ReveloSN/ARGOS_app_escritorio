from collections.abc import Callable
from typing import Final

import anthropic
from anthropic.types.beta import BetaMessage, BetaMessageParam, BetaOutputConfigParam

from argus.application.ai.ai_change_explainer import ExplanationPrompt
from argus.domain.errors import ExplanationProviderError

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
LANGUAGES = {"es": "español", "en": "English"}
DEFAULT_LANGUAGE = "español"

SYSTEM_PROMPT = (
    "Eres el asistente de ARGUS, una herramienta que compara versiones de documentos antes de "
    "firmarlos o enviarlos. Recibes la versión anterior y la nueva de un mismo fragmento. "
    "Explica en dos o tres frases, sin viñetas ni formato, qué cambia en lo que el texto "
    "permite, obliga, cobra o fecha, o di que solo cambia la redacción si el sentido es el "
    "mismo. Usa solo lo que dicen los fragmentos: no supongas hechos ni des asesoría legal. "
    "Responde en {language}."
)

type ClientFactory = Callable[[str], anthropic.Anthropic]


def default_client(api_key: str) -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=api_key, timeout=REQUEST_TIMEOUT_SECONDS)


def _user_message(prompt: ExplanationPrompt) -> str:
    before = prompt.before or "(no existe en la versión anterior)"
    after = prompt.after or "(no existe en la versión nueva)"
    return (
        f"Tipo de cambio: {prompt.kind}\n\nVersión anterior:\n{before}\n\nVersión nueva:\n{after}"
    )


def _text_of(response: BetaMessage) -> str:
    if response.stop_reason == REFUSAL:
        raise ExplanationProviderError("refused")
    text = " ".join(block.text for block in response.content if block.type == "text").strip()
    if not text:
        raise ExplanationProviderError("provider_unavailable")
    return text


class AnthropicExplanationProvider:
    """Adapter del puerto ExplanationProvider con la API de Anthropic (SDK oficial).

    Solo envía el idioma, el tipo de cambio y los dos fragmentos alineados; nunca el documento.
    """

    def __init__(self, client_for: ClientFactory = default_client) -> None:
        self._client_for = client_for

    def explain(self, api_key: str, prompt: ExplanationPrompt) -> str:
        language = LANGUAGES.get(prompt.locale, DEFAULT_LANGUAGE)
        messages: list[BetaMessageParam] = [{"role": "user", "content": _user_message(prompt)}]
        output_config: BetaOutputConfigParam = {"effort": EFFORT}
        try:
            response = self._client_for(api_key).beta.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=SYSTEM_PROMPT.format(language=language),
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
