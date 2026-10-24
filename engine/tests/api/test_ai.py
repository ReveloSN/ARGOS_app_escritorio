from fastapi.testclient import TestClient

from argus.api.ai_composition import AiAdapters
from argus.application.ai.ai_settings import AiProvider
from tests.api.test_comparisons import compare_versions
from tests.application.ai_doubles import recording_provider, secret_store


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
        "provider": "anthropic",
        "model": "claude-sonnet-5-5",
        "hasKey": True,
        "isKeychainAvailable": True,
        "providers": [
            {"id": "anthropic", "model": "claude-sonnet-5-5"},
            {"id": "deepseek", "model": "deepseek-flash"},
        ],
    }
    assert body["source"] == "ai"
    assert body["text"] == "Sugerencia de prueba."
    assert recording_provider(ai).calls[0][1].locale == "en"


def test_the_key_can_be_removed_and_is_never_returned(
    client: TestClient, auth_headers: dict[str, str], ai: AiAdapters
) -> None:
    client.put("/settings/ai/key", headers=auth_headers, json={"key": "sk-prueba"})

    removed = client.delete("/settings/ai/key", headers=auth_headers)

    assert removed.json()["hasKey"] is False
    assert "sk-prueba" not in removed.text
    assert secret_store(ai, AiProvider.ANTHROPIC).secret is None


def test_each_provider_keeps_its_own_key_and_the_chosen_one_answers(
    client: TestClient, auth_headers: dict[str, str], ai: AiAdapters
) -> None:
    client.put("/settings/ai/key", headers=auth_headers, json={"key": "sk-ant"})

    switched = client.put(
        "/settings/ai", headers=auth_headers, json={"provider": "deepseek"}
    ).json()
    assert (switched["provider"], switched["model"]) == ("deepseek", "deepseek-flash")
    assert switched["hasKey"] is False

    client.put("/settings/ai/key", headers=auth_headers, json={"key": "sk-deep"})
    client.put("/settings/ai", headers=auth_headers, json={"explainsChanges": True})
    client.get(first_change_url(client, auth_headers), headers=auth_headers)

    assert recording_provider(ai).calls[-1][0] == "sk-deep"
    assert secret_store(ai, AiProvider.ANTHROPIC).secret == "sk-ant"
    back = client.put("/settings/ai", headers=auth_headers, json={"provider": "anthropic"}).json()
    assert back["hasKey"] is True


def test_an_unknown_provider_is_rejected(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.put("/settings/ai", headers=auth_headers, json={"provider": "otro"})

    assert response.status_code == 422


def test_an_unknown_change_is_not_found(client: TestClient, auth_headers: dict[str, str]) -> None:
    comparison = compare_versions(client, auth_headers)

    response = client.get(
        f"/comparisons/{comparison['id']}/changes/999/explanation", headers=auth_headers
    )

    assert response.status_code == 404
