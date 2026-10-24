from typing import Any

from fastapi.testclient import TestClient

from argus.api.ai_composition import AiAdapters
from argus.api.app import create_app
from argus.api.settings import EngineSettings
from tests.api.review_stream import post_review
from tests.application.ai_doubles import RecordingProvider, offline_ai, recording_provider
from tests.application.in_memory_repositories import RecordingFileOpener
from tests.application.ocr_doubles import offline_adapters

TWO_DOCUMENTS = ("Contrato_4857_v3.pdf", "Anexo_1_condiciones.docx")
ONE_DOCUMENT = ("Borrador_contrato.txt",)


def alert_of_kind(review: dict[str, Any], kind: str) -> dict[str, Any]:
    return next(alert for alert in review["alerts"] if alert["differenceKind"] == kind)


def explanation_url(review: dict[str, Any], alert: dict[str, Any], locale: str = "es") -> str:
    return (
        f"/reviews/{review['session']['id']}/alerts/{alert['number']}/explanation?locale={locale}"
    )


def turn_ai_on(client: TestClient, headers: dict[str, str], key: str | None = "sk-prueba") -> None:
    if key:
        client.put("/settings/ai/key", headers=headers, json={"key": key})
    client.put("/settings/ai", headers=headers, json={"explainsChanges": True})


def test_without_ai_the_alert_keeps_its_local_explanation(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    review = post_review(client, auth_headers, *TWO_DOCUMENTS)
    alert = alert_of_kind(review, "transposition")

    body = client.get(explanation_url(review, alert), headers=auth_headers).json()

    assert body["source"] == "template"
    assert body["parts"] == alert["explanation"]
    assert body["fallbackReason"] is None


def test_a_two_value_alert_sends_only_its_two_origin_fragments(
    client: TestClient, auth_headers: dict[str, str], ai: AiAdapters
) -> None:
    review = post_review(client, auth_headers, *TWO_DOCUMENTS)
    alert = alert_of_kind(review, "transposition")
    turn_ai_on(client, auth_headers)

    body = client.get(explanation_url(review, alert, "en"), headers=auth_headers).json()

    assert body["source"] == "ai"
    assert body["text"] == "Sugerencia de prueba."
    ((_, prompt),) = recording_provider(ai).calls
    assert (prompt.locale, prompt.subject, prompt.kind) == ("en", "alert", "transposition")
    assert prompt.fragments == (
        alert["first"]["occurrences"][0]["excerpt"],
        alert["second"]["occurrences"][0]["excerpt"],
    )


def test_a_single_value_alert_sends_one_fragment(
    client: TestClient, auth_headers: dict[str, str], ai: AiAdapters
) -> None:
    review = post_review(client, auth_headers, *ONE_DOCUMENT)
    alert = alert_of_kind(review, "impossible_date")
    turn_ai_on(client, auth_headers)

    body = client.get(explanation_url(review, alert), headers=auth_headers).json()

    assert body["source"] == "ai"
    ((_, prompt),) = recording_provider(ai).calls
    assert prompt.kind == "impossible_date"
    assert prompt.fragments == (alert["first"]["occurrences"][0]["excerpt"],)


def test_with_ai_on_but_no_key_the_local_explanation_says_why(
    client: TestClient, auth_headers: dict[str, str], ai: AiAdapters
) -> None:
    review = post_review(client, auth_headers, *TWO_DOCUMENTS)
    alert = alert_of_kind(review, "transposition")
    turn_ai_on(client, auth_headers, key=None)

    body = client.get(explanation_url(review, alert), headers=auth_headers).json()

    assert body["source"] == "template"
    assert body["fallbackReason"] == "no_key"
    assert body["parts"] == alert["explanation"]
    assert recording_provider(ai).calls == []


def test_when_the_network_fails_the_local_explanation_says_why(
    settings: EngineSettings, opener: RecordingFileOpener, auth_headers: dict[str, str]
) -> None:
    offline = offline_ai(RecordingProvider(failure="provider_unavailable"), key="sk-prueba")
    client = TestClient(create_app(settings, opener, offline_adapters(offline)))
    review = post_review(client, auth_headers, *TWO_DOCUMENTS)
    alert = alert_of_kind(review, "transposition")
    turn_ai_on(client, auth_headers)

    body = client.get(explanation_url(review, alert), headers=auth_headers).json()

    assert body["source"] == "template"
    assert body["fallbackReason"] == "provider_unavailable"
    assert body["parts"] == alert["explanation"]


def test_an_unknown_alert_is_not_found(client: TestClient, auth_headers: dict[str, str]) -> None:
    review = post_review(client, auth_headers, *TWO_DOCUMENTS)

    response = client.get(
        f"/reviews/{review['session']['id']}/alerts/999/explanation", headers=auth_headers
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "alert_not_found"}
