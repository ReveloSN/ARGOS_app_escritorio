from fastapi.testclient import TestClient

from tests.api.review_stream import REVIEW_NAME, post_review, stream_review, upload


def test_progress_is_streamed_file_by_file_before_the_review(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    streamed = stream_review(client, auth_headers, "Contrato_4857_v3.pdf", "anexo_3.pdf")

    assert streamed.names == [
        "document_started",
        "document_finished",
        "document_started",
        "document_finished",
        "analysis_started",
        "review",
    ]
    assert streamed.events[0][1] == {"position": 0, "name": "Contrato_4857_v3.pdf"}
    assert streamed.events[3][1] == {
        "position": 1,
        "document": {
            "name": "anexo_3.pdf",
            "status": "unreadable",
            "reason": "no_text",
            "fragmentCount": 0,
            "method": "text",
            "pageCount": 1,
        },
    }


def test_review_returns_the_session_and_how_each_file_was_read(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    body = post_review(client, auth_headers, "Contrato_4857_v3.pdf", "anexo_3.pdf")

    assert body["session"]["name"] == REVIEW_NAME
    assert body["session"]["closedAt"] is None
    assert body["documents"] == [
        {
            "name": "Contrato_4857_v3.pdf",
            "status": "read",
            "reason": None,
            "fragmentCount": 2,
            "method": "text",
            "pageCount": None,
        },
        {
            "name": "anexo_3.pdf",
            "status": "unreadable",
            "reason": "no_text",
            "fragmentCount": 0,
            "method": "text",
            "pageCount": 1,
        },
    ]
    assert body["decisions"] == {"decisions": [], "canUndo": False}


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


def test_a_stored_review_can_be_opened_again(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    created = post_review(client, auth_headers, "Contrato_4857_v3.pdf", "Anexo_1_condiciones.docx")

    response = client.get(f"/reviews/{created['session']['id']}", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == created


def test_closing_a_review_records_when_and_makes_it_read_only(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    session_id = post_review(client, auth_headers, "Contrato_4857_v3.pdf")["session"]["id"]

    closed = client.post(f"/reviews/{session_id}/close", headers=auth_headers)
    closed_again = client.post(f"/reviews/{session_id}/close", headers=auth_headers)

    assert closed.status_code == 200
    assert closed.json()["closedAt"] is not None
    assert closed_again.status_code == 409
    assert closed_again.json() == {"detail": "session_closed"}


def test_unknown_review_is_reported(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.get("/reviews/no-existe", headers=auth_headers)

    assert response.status_code == 404
    assert response.json() == {"detail": "session_not_found"}


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
