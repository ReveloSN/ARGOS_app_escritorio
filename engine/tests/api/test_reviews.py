from typing import Any

from fastapi.testclient import TestClient

from tests.infrastructure.conftest import FIXTURES_DIR


def upload(name: str) -> tuple[str, tuple[str, bytes]]:
    return ("files", (name, (FIXTURES_DIR / name).read_bytes()))


def post_review(client: TestClient, headers: dict[str, str], *names: str) -> dict[str, Any]:
    response = client.post(
        "/reviews",
        headers=headers,
        data={"name": "Revisión de prueba"},
        files=[upload(name) for name in names],
    )
    assert response.status_code == 200, response.text
    body: dict[str, Any] = response.json()
    return body


def test_review_returns_the_session_and_how_each_file_was_read(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    body = post_review(client, auth_headers, "Contrato_4857_v3.pdf", "anexo_3.pdf")

    assert body["session"]["name"] == "Revisión de prueba"
    assert body["documents"] == [
        {"name": "Contrato_4857_v3.pdf", "status": "read", "reason": None, "fragmentCount": 2},
        {"name": "anexo_3.pdf", "status": "unreadable", "reason": "no_text", "fragmentCount": 0},
    ]


def test_review_returns_real_alerts_with_both_values_and_their_origin(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    body = post_review(client, auth_headers, "Contrato_4857_v3.pdf", "Anexo_1_condiciones.docx")

    contract = body["alerts"][0]
    assert contract["number"] == 1
    assert contract["risk"] == "high"
    assert contract["entityType"] == "contract_id"
    assert {contract["first"]["value"], contract["second"]["value"]} == {"4857", "4587"}
    assert contract["highlightPositions"] == [2, 3]
    origin = contract["second"]["occurrences"][0]
    assert origin["document"] == "Contrato_4857_v3.pdf"
    assert origin["location"] == {"kind": "page", "page": 1}
    assert "Contrato No. 4857" in origin["excerpt"]


def test_amount_highlight_is_computed_on_the_values_as_written(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    body = post_review(client, auth_headers, "Contrato_4857_v3.pdf", "Anexo_1_condiciones.docx")

    money = next(alert for alert in body["alerts"] if alert["entityType"] == "money")
    assert {money["first"]["value"], money["second"]["value"]} == {"$ 18.450.000", "$ 18.540.000"}
    assert money["highlightPositions"] == [6, 7]


def test_review_without_name_is_rejected(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.post(
        "/reviews",
        headers=auth_headers,
        data={"name": ""},
        files=[upload("Contrato_4857_v3.pdf")],
    )

    assert response.status_code == 422


def test_review_requires_the_access_token(client: TestClient) -> None:
    response = client.post("/reviews", data={"name": "x"}, files=[upload("Contrato_4857_v3.pdf")])

    assert response.status_code == 401
