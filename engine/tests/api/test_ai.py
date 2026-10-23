from fastapi.testclient import TestClient

from argus.api.ai_composition import AiAdapters
from tests.api.test_comparisons import compare_versions
from tests.application.ai_doubles import InMemorySecretStore, RecordingProvider


def first_change_url(client: TestClient, headers: dict[str, str]) -> str:
    comparison = compare_versions(client, headers)
    number = comparison["pairs"][0]["changes"][0]["number"]
    return f"/comparisons/{comparison['id']}/changes/{number}/explanation"


def test_explains_a_change_with_the_local_template_by_default(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.get(first_change_url(client, auth_headers), headers=auth_headers)

    body = response.json()
    assert body["source"] == "template"
    assert body["parts"][0]["key"].startswith("changeExplanation.")
    assert body["fallbackReason"] is None


def test_with_ai_on_and_a_key_the_change_is_explained_by_the_model(
    client: TestClient, auth_headers: dict[str, str], ai: AiAdapters
) -> None:
    client.put("/settings/ai/key", headers=auth_headers, json={"key": "sk-prueba"})
    settings = client.put(
        "/settings/ai", headers=auth_headers, json={"explainsChanges": True}
    ).json()

    body = client.get(
        f"{first_change_url(client, auth_headers)}?locale=en", headers=auth_headers
    ).json()

    assert settings == {
        "explainsChanges": True,
        "hasKey": True,
        "isKeychainAvailable": True,
        "provider": "anthropic",
        "model": "claude-sonnet-5-5",
    }
    assert body["source"] == "ai"
    assert body["text"] == "Sugerencia de prueba."
    assert isinstance(ai.provider, RecordingProvider)
    assert ai.provider.calls[0][1].locale == "en"


def test_the_key_can_be_removed_and_is_never_returned(
    client: TestClient, auth_headers: dict[str, str], ai: AiAdapters
) -> None:
    client.put("/settings/ai/key", headers=auth_headers, json={"key": "sk-prueba"})

    removed = client.delete("/settings/ai/key", headers=auth_headers)

    assert removed.json()["hasKey"] is False
    assert "sk-prueba" not in removed.text
    assert isinstance(ai.secrets, InMemorySecretStore)
    assert ai.secrets.secret is None


def test_an_unknown_change_is_not_found(client: TestClient, auth_headers: dict[str, str]) -> None:
    comparison = compare_versions(client, auth_headers)

    response = client.get(
        f"/comparisons/{comparison['id']}/changes/999/explanation", headers=auth_headers
    )

    assert response.status_code == 404
