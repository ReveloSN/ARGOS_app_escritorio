from collections.abc import Callable, Mapping, Sequence

import requests

from argus.application.ai.explanation_provider import ExplanationPrompt
from argus.domain.errors import ExplanationProviderError
from argus.infrastructure.ai.explanation_prompts import system_prompt, user_message

ENDPOINT = "https://api.deepseek.com/chat/completions"
# El nombre vigente del modelo Flash en la API de DeepSeek (hoy sirve DeepSeek-V4.1-Flash); el
# nombre heredado «deepseek-v4-flash» lo atiende el mismo modelo.
MODEL = "deepseek-flash"
MAX_TOKENS = 1024
REQUEST_TIMEOUT_SECONDS = 30
HTTP_OK = 200
UNAUTHORIZED = (401, 403)
CONTENT_FILTER = "content_filter"

type Json = Mapping[str, object]
# requests.post, o un doble en las pruebas; la firma abierta evita atar el adaptador a la suya.
type HttpPost = Callable[..., requests.Response]


def _mapping(value: object) -> Json:
    return value if isinstance(value, dict) else {}


def _text_of(payload: Json) -> str:
    """El texto de la primera respuesta (formato de OpenAI): choices[0].message.content."""
    choices = payload.get("choices")
    first = _mapping(choices[0]) if isinstance(choices, Sequence) and choices else {}
    if first.get("finish_reason") == CONTENT_FILTER:
        raise ExplanationProviderError("refused")
    content = _mapping(first.get("message")).get("content")
    text = content.strip() if isinstance(content, str) else ""
    if not text:
        raise ExplanationProviderError("provider_unavailable")
    return text


class DeepSeekExplanationProvider:
    """Adapter del puerto ExplanationProvider con la API de DeepSeek (formato de OpenAI, por
    HTTP con `requests`, sin otro SDK). Mismo encargo y mismos límites que con Anthropic."""

    def __init__(self, post: HttpPost = requests.post) -> None:
        self._post = post

    def explain(self, api_key: str, prompt: ExplanationPrompt) -> str:
        body = {
            "model": MODEL,
            "messages": [
                {"role": "system", "content": system_prompt(prompt)},
                {"role": "user", "content": user_message(prompt)},
            ],
            "max_tokens": MAX_TOKENS,
        }
        try:
            response = self._post(
                ENDPOINT,
                headers={"Authorization": f"Bearer {api_key}"},
                json=body,
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            payload = response.json() if response.status_code == HTTP_OK else None
        except (requests.RequestException, ValueError):
            raise ExplanationProviderError("provider_unavailable") from None
        if response.status_code in UNAUTHORIZED:
            raise ExplanationProviderError("invalid_key")
        if payload is None:
            raise ExplanationProviderError("provider_unavailable")
        return _text_of(_mapping(payload))
