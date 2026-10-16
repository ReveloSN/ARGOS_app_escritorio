import shutil
from pathlib import Path

from fastapi.testclient import TestClient

from argus.api.composition import ARCHIVE_FOLDER_NAME
from tests.api.review_stream import post_review
from tests.application.in_memory_repositories import RecordingFileOpener

FILES = ("Contrato_4857_v3.pdf", "anexo_3.pdf", "Correo_remision_cliente.eml")


def test_search_finds_text_in_the_documents_ignoring_accents(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    session_id = post_review(client, auth_headers, *FILES)["session"]["id"]

    response = client.get(
        f"/reviews/{session_id}/search", params={"q": "fontibon"}, headers=auth_headers
    )

    assert response.status_code == 200
    (match,) = response.json()
    assert match["document"] == "Contrato_4857_v3.pdf"
    assert match["location"] == {"kind": "page", "page": 1}
    assert match["excerpt"][match["highlightStart"] : match["highlightEnd"]] == "Fontibón"


def test_opening_a_document_opens_its_stored_copy(
    client: TestClient, auth_headers: dict[str, str], opener: RecordingFileOpener
) -> None:
    session_id = post_review(client, auth_headers, *FILES)["session"]["id"]

    response = client.post(
        f"/reviews/{session_id}/documents/open",
        headers=auth_headers,
        json={"document": "Contrato_4857_v3.pdf"},
    )

    assert response.status_code == 204
    (opened,) = opener.opened
    assert opened.name == "Contrato_4857_v3.pdf"
    assert opened.read_bytes().startswith(b"%PDF")


def test_a_file_that_could_not_be_read_cannot_be_opened(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    session_id = post_review(client, auth_headers, *FILES)["session"]["id"]

    response = client.post(
        f"/reviews/{session_id}/documents/open",
        headers=auth_headers,
        json={"document": "anexo_3.pdf"},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "document_not_found"}


def test_a_copy_removed_from_the_history_folder_is_reported(
    client: TestClient, auth_headers: dict[str, str], tmp_path: Path
) -> None:
    session_id = post_review(client, auth_headers, *FILES)["session"]["id"]
    shutil.rmtree(tmp_path / ARCHIVE_FOLDER_NAME / session_id)

    response = client.post(
        f"/reviews/{session_id}/documents/open",
        headers=auth_headers,
        json={"document": "Contrato_4857_v3.pdf"},
    )

    assert response.status_code == 410
    assert response.json() == {"detail": "archived_file_missing"}
