from types import SimpleNamespace
from typing import cast

import pytest
import requests

from argus.application.ai.explanation_provider import ExplanationPrompt
from argus.application.text_comparison.change_explanation import ExplanationSubject
from argus.domain.errors import ExplanationProviderError
from argus.infrastructure.ai.deepseek_explanation_provider import (
    ENDPOINT,
    MODEL,
    DeepSeekExplanationProvider,
)

PROMPT = ExplanationPrompt(
    "en", ExplanationSubject.ALERT, "transposition", ("Contrato No. 4857", "Contrato No. 4587")
)


class RecordingPost:
    """Sustituye a requests.post: anota la petición y responde lo indicado."""

    def __init__(self, status: int = 200, payload: object = None, failure: bool = False) -> None:
        self.status = status
        self.payload = payload
        self.failure = failure
        self.requests: list[dict[str, object]] = []

    def __call__(self, url: str, **options: object) -> requests.Response:
        self.requests.append({"url": url, **options})
        if self.failure:
            raise requests.ConnectionError("sin red")
        response = SimpleNamespace(status_code=self.status, json=lambda: self.payload)
        return cast(requests.Response, response)


def answer(text: str, finish_reason: str = "stop") -> dict[str, object]:
    return {"choices": [{"message": {"content": text}, "finish_reason": finish_reason}]}


def test_asks_deepseek_in_openai_format_with_the_same_prompt_as_claude() -> None:
    post = RecordingPost(payload=answer("  Two digits are swapped.  "))

    text = DeepSeekExplanationProvider(post).explain("sk-deep", PROMPT)

    assert text == "Two digits are swapped."
    (request,) = post.requests
    assert request["url"] == ENDPOINT
    assert request["headers"] == {"Authorization": "Bearer sk-deep"}
    body = cast(dict[str, object], request["json"])
    system, user = cast(list[dict[str, str]], body["messages"])
    assert body["model"] == MODEL
    assert system["role"] == "system"
    assert "English" in system["content"]
    assert "Contrato No. 4587" in user["content"]
    assert "4857" not in system["content"]


@pytest.mark.parametrize(
    ("post", "reason"),
    [
        (RecordingPost(401, {"error": "bad key"}), "invalid_key"),
        (RecordingPost(500, {}), "provider_unavailable"),
        (RecordingPost(failure=True), "provider_unavailable"),
        (RecordingPost(payload=answer("   ")), "provider_unavailable"),
        (RecordingPost(payload={"choices": []}), "provider_unavailable"),
        (RecordingPost(payload=answer("", "content_filter")), "refused"),
    ],
)
def test_every_failure_becomes_a_reason_the_interface_can_explain(
    post: RecordingPost, reason: str
) -> None:
    with pytest.raises(ExplanationProviderError) as raised:
        DeepSeekExplanationProvider(post).explain("sk", PROMPT)

    assert raised.value.reason == reason
