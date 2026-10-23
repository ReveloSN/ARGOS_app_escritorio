import json
from typing import Any

import pytest
from fastapi.testclient import TestClient

from argus.api.ocr_composition import OcrAdapters
from tests.api.review_stream import REVIEW_NAME, StreamedReview, parse_events, upload
from tests.application.ocr_doubles import ScriptedOcrEngine, offline_ocr
from tests.application.test_ocr_settings import SERVICE_ACCOUNT

SCANNED = "anexo_3.pdf"
RECOGNIZED = ("Anexo 3 del Contrato No. 4587", "Canon mensual $ 18.450.000")


@pytest.fixture
def ocr() -> OcrAdapters:
    return offline_ocr(ScriptedOcrEngine(RECOGNIZED))


def reread(client: TestClient, headers: dict[str, str], form: dict[str, Any]) -> StreamedReview:
    response = client.post(
        "/reviews",
        headers=headers,
        data={"name": REVIEW_NAME, "ocr": [SCANNED], **form},
        files=[upload("Contrato_4857_v3.pdf"), upload(SCANNED)],
    )
    assert response.status_code == 200, response.text
    return StreamedReview(parse_events(response.text))


def test_activar_ocr_reads_the_scanned_file_page_by_page(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    streamed = reread(client, auth_headers, {})

    pages = [payload for name, payload in streamed.events if name == "page_recognized"]
    assert pages == [
        {"position": 1, "done": 1, "total": 2},
        {"position": 1, "done": 2, "total": 2},
    ]
    scanned = streamed.review["documents"][1]
    assert scanned["status"] == "read"
    assert scanned["method"] == "local_ocr"
    assert scanned["pageCount"] == 2
    assert streamed.review["documents"][0]["method"] == "text"


def test_rereading_discards_the_previous_unreviewed_reading(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    first = reread(client, auth_headers, {}).review["session"]["id"]

    second = reread(client, auth_headers, {"replaces": first}).review["session"]["id"]

    assert client.get(f"/reviews/{first}", headers=auth_headers).status_code == 404
    assert client.get(f"/reviews/{second}", headers=auth_headers).status_code == 200


def test_document_ai_without_configuration_falls_back_to_the_local_ocr(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    streamed = reread(client, auth_headers, {"ocrProvider": "cloud"})

    assert streamed.review["documents"][1]["method"] == "local_ocr"


def test_ocr_settings_start_local_and_with_document_ai_off(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    body = client.get("/settings/ocr", headers=auth_headers).json()

    assert body["isLocalAvailable"] is True
    assert body["usesCloud"] is False
    assert body["isCloudReady"] is False


def test_document_ai_is_ready_once_on_configured_and_with_its_key(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    processor = {"projectId": " proyecto-de-prueba", "location": "us", "processorId": "a1b2c3"}
    client.put("/settings/ocr", headers=auth_headers, json={"usesCloud": True})
    client.put("/settings/ocr/processor", headers=auth_headers, json=processor)

    stored = client.put(
        "/settings/ocr/credentials",
        headers=auth_headers,
        json={"credentials": json.dumps(SERVICE_ACCOUNT)},
    ).json()

    assert stored["projectId"] == "proyecto-de-prueba"
    assert stored["isCloudReady"] is True
    assert "credentials" not in stored
    removed = client.delete("/settings/ocr/credentials", headers=auth_headers).json()
    assert removed["hasCredentials"] is False


def test_a_key_that_is_not_a_service_account_is_rejected(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.put(
        "/settings/ocr/credentials", headers=auth_headers, json={"credentials": "{}"}
    )

    assert response.status_code == 422
    assert response.json() == {"detail": "invalid_credentials"}


def test_a_processor_that_would_change_the_url_is_rejected(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    processor = {"projectId": "otro/../proyecto", "location": "us", "processorId": "a1"}

    response = client.put("/settings/ocr/processor", headers=auth_headers, json=processor)

    assert response.status_code == 422
