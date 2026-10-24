from typing import Any

from fastapi.testclient import TestClient

from tests.api.review_stream import parse_events, post_review, upload
from tests.api.test_comparisons import VERSION_1, VERSION_2, text_file

SESSION_NAME = "Expediente de arrendamiento"


def review_with_texts(client: TestClient, headers: dict[str, str]) -> str:
    """Una revisión con dos versiones del contrato ya guardada (sus archivos quedan archivados)."""
    response = client.post(
        "/reviews",
        headers=headers,
        data={"name": SESSION_NAME},
        files=[text_file("v1.txt", VERSION_1), text_file("v2.txt", VERSION_2)],
    )
    assert response.status_code == 200, response.text
    return str(parse_events(response.text)[-1][1]["session"]["id"])


def compare_from_session(
    client: TestClient, headers: dict[str, str], body: dict[str, Any]
) -> tuple[int, Any]:
    response = client.post("/comparisons/from-session", headers=headers, json=body)
    if response.status_code != 200:
        return response.status_code, response.json()
    return response.status_code, parse_events(response.text)


def test_the_documents_of_a_session_are_compared_without_loading_them_again(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    session_id = review_with_texts(client, auth_headers)

    status, events = compare_from_session(
        client,
        auth_headers,
        {
            "sessionId": session_id,
            "name": "v1 · v2",
            "mode": "versions",
            "documents": ["v1.txt", "v2.txt"],
        },
    )

    assert status == 200
    comparison = events[-1][1]
    assert events[-1][0] == "comparison"
    assert [doc["name"] for doc in comparison["documents"]] == ["v1.txt", "v2.txt"]
    pair = comparison["pairs"][0]
    assert (pair["firstDocument"], pair["secondDocument"]) == ("v1.txt", "v2.txt")
    assert pair["changes"]


def test_the_comparison_can_be_reopened_like_any_other(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    session_id = review_with_texts(client, auth_headers)
    body = {
        "sessionId": session_id,
        "name": "v1 · v2",
        "mode": "versions",
        "documents": ["v1.txt", "v2.txt"],
    }
    _, events = compare_from_session(client, auth_headers, body)
    comparison_id = events[-1][1]["id"]

    reopened = client.get(f"/comparisons/{comparison_id}", headers=auth_headers)

    assert reopened.status_code == 200
    assert reopened.json()["name"] == "v1 · v2"


def test_a_document_that_is_not_in_the_session_is_reported(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    session_id = review_with_texts(client, auth_headers)

    status, payload = compare_from_session(
        client,
        auth_headers,
        {
            "sessionId": session_id,
            "name": "x",
            "mode": "versions",
            "documents": ["v1.txt", "otro.txt"],
        },
    )

    assert status == 404
    assert payload == {"detail": "document_not_found"}


def test_an_unknown_session_is_reported(client: TestClient, auth_headers: dict[str, str]) -> None:
    status, payload = compare_from_session(
        client,
        auth_headers,
        {"sessionId": "no-existe", "name": "x", "mode": "versions", "documents": ["a", "b"]},
    )

    assert status == 404
    assert payload == {"detail": "session_not_found"}


def test_comparing_versions_needs_two_documents(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    session_id = review_with_texts(client, auth_headers)

    status, payload = compare_from_session(
        client,
        auth_headers,
        {"sessionId": session_id, "name": "x", "mode": "versions", "documents": ["v1.txt"]},
    )

    assert status == 422
    assert payload == {"detail": "not_enough_documents"}


def test_unreadable_files_of_the_session_are_not_offered(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    created = post_review(client, auth_headers, "Contrato_4857_v3.pdf", "anexo_3.pdf")
    session_id = created["session"]["id"]

    status, payload = compare_from_session(
        client,
        auth_headers,
        {
            "sessionId": session_id,
            "name": "x",
            "mode": "versions",
            "documents": ["Contrato_4857_v3.pdf", "anexo_3.pdf"],
        },
    )

    # «anexo_3.pdf» no se pudo leer en la revisión: no tiene copia guardada.
    assert (status, payload) == (404, {"detail": "document_not_found"})
    assert upload("anexo_3.pdf")[0] == "files"
