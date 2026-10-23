from types import SimpleNamespace
from typing import cast

import anthropic
import httpx2
import keyring
import pytest
from keyring.errors import NoKeyringError, PasswordDeleteError

from argus.application.ai.ai_change_explainer import ExplanationPrompt
from argus.domain.errors import ExplanationProviderError, KeychainUnavailableError
from argus.infrastructure.ai.anthropic_explanation_provider import (
    FALLBACK_BETA,
    MODEL,
    AnthropicExplanationProvider,
)
from argus.infrastructure.ai.keyring_secret_store import KeyringSecretStore

PROMPT = ExplanationPrompt("es", "modified", "podrá terminar", "no podrá terminar")
REQUEST = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")


class FakeMessages:
    def __init__(self, outcome: object) -> None:
        self.outcome = outcome
        self.requests: list[dict[str, object]] = []

    def create(self, **request: object) -> object:
        self.requests.append(request)
        if isinstance(self.outcome, Exception):
            raise self.outcome
        return self.outcome


def provider_with(outcome: object) -> tuple[AnthropicExplanationProvider, FakeMessages]:
    messages = FakeMessages(outcome)
    client = SimpleNamespace(beta=SimpleNamespace(messages=messages))
    return AnthropicExplanationProvider(lambda _key: cast(anthropic.Anthropic, client)), messages


def reply(text: str, stop_reason: str = "end_turn") -> SimpleNamespace:
    return SimpleNamespace(
        stop_reason=stop_reason, content=[SimpleNamespace(type="text", text=text)]
    )


def test_asks_claude_with_the_fragments_the_language_and_the_server_fallback() -> None:
    provider, messages = provider_with(reply("Se agrega una negación."))

    assert provider.explain("sk-prueba", PROMPT) == "Se agrega una negación."
    (request,) = messages.requests
    assert request["model"] == MODEL
    assert request["fallbacks"] == "default"
    assert request["betas"] == [FALLBACK_BETA]
    assert "español" in str(request["system"])
    assert "no podrá terminar" in str(request["messages"])


@pytest.mark.parametrize(
    ("outcome", "reason"),
    [
        (reply("", "refusal"), "refused"),
        (reply("   "), "provider_unavailable"),
        (
            anthropic.AuthenticationError(
                "clave", response=httpx2.Response(401, request=REQUEST), body=None
            ),
            "invalid_key",
        ),
        (anthropic.APIConnectionError(request=REQUEST), "provider_unavailable"),
    ],
)
def test_every_failure_becomes_a_reason_the_interface_can_explain(
    outcome: object, reason: str
) -> None:
    provider, _ = provider_with(outcome)

    with pytest.raises(ExplanationProviderError) as raised:
        provider.explain("sk", PROMPT)

    assert raised.value.reason == reason


def test_the_key_lives_in_the_system_keychain(monkeypatch: pytest.MonkeyPatch) -> None:
    stored: dict[tuple[str, str], str] = {}
    monkeypatch.setattr(keyring, "get_password", lambda s, a: stored.get((s, a)))
    monkeypatch.setattr(keyring, "set_password", lambda s, a, v: stored.update({(s, a): v}))

    def delete(service: str, account: str) -> None:
        if (service, account) not in stored:
            raise PasswordDeleteError("no existe")
        del stored[(service, account)]

    monkeypatch.setattr(keyring, "delete_password", delete)
    store = KeyringSecretStore()

    store.store("sk-prueba")
    assert store.read() == "sk-prueba"
    store.remove()
    store.remove()
    assert store.read() is None


def test_without_a_keychain_it_says_so(monkeypatch: pytest.MonkeyPatch) -> None:
    def unavailable(*_args: str) -> None:
        raise NoKeyringError("sin llavero")

    for name in ("get_password", "set_password", "delete_password"):
        monkeypatch.setattr(keyring, name, unavailable)
    store = KeyringSecretStore()

    for action in (store.read, lambda: store.store("sk"), store.remove):
        with pytest.raises(KeychainUnavailableError):
            action()
