from dataclasses import dataclass

from fastapi.testclient import TestClient
from httpx2 import Response

from tests.api.review_stream import post_review

FILES = ("Contrato_4857_v3.pdf", "Anexo_1_condiciones.docx")


@dataclass(frozen=True)
class OpenReview:
    client: TestClient
    headers: dict[str, str]
    session_id: str

    def decide(self, body: dict[str, object]) -> Response:
        url = f"/reviews/{self.session_id}/decisions"
        return self.client.post(url, headers=self.headers, json=body)


def open_review(client: TestClient, headers: dict[str, str]) -> OpenReview:
    return OpenReview(client, headers, post_review(client, headers, *FILES)["session"]["id"])


def test_deciding_returns_the_current_decisions(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    review = open_review(client, auth_headers)

    response = review.decide({"alertNumber": 1, "kind": "error", "correctSide": "first"})

    assert response.status_code == 200
    body = response.json()
    assert body["canUndo"] is True
    (decision,) = body["decisions"]
    assert decision["alertNumber"] == 1
    assert decision["kind"] == "error"
    assert decision["correctSide"] == "first"
    assert decision["decidedAt"]


def test_undo_leaves_the_alert_pending_again(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    review = open_review(client, auth_headers)
    review.decide({"alertNumber": 1, "kind": "correct"})

    response = client.post(f"/reviews/{review.session_id}/decisions/undo", headers=auth_headers)

    assert response.json() == {"decisions": [], "canUndo": False}
    reopened = client.get(f"/reviews/{review.session_id}", headers=auth_headers).json()
    assert reopened["decisions"]["decisions"] == []


def test_only_an_error_says_which_value_is_correct(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    review = open_review(client, auth_headers)

    response = review.decide({"alertNumber": 1, "kind": "correct", "correctSide": "second"})

    assert response.status_code == 422
    assert response.json() == {"detail": "invalid_value"}


def test_deciding_an_unknown_alert_is_reported(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    review = open_review(client, auth_headers)

    response = review.decide({"alertNumber": 99, "kind": "correct"})

    assert response.status_code == 404
    assert response.json() == {"detail": "alert_not_found"}


def test_a_closed_review_does_not_accept_decisions(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    review = open_review(client, auth_headers)
    client.post(f"/reviews/{review.session_id}/close", headers=auth_headers)

    response = review.decide({"alertNumber": 1, "kind": "correct"})

    assert response.status_code == 409
