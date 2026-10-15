from fastapi.testclient import TestClient

from tests.api.conftest import TAURI_WINDOWS_ORIGIN

UNKNOWN_ORIGIN = "https://example.com"


def preflight_headers(origin: str) -> dict[str, str]:
    return {
        "Origin": origin,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization",
    }


def test_request_without_token_is_rejected(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 401


def test_request_with_wrong_token_is_rejected(client: TestClient) -> None:
    response = client.get("/health", headers={"Authorization": "Bearer otro-token"})

    assert response.status_code == 401


def test_request_with_non_ascii_token_is_rejected(client: TestClient) -> None:
    response = client.get("/health", headers={b"Authorization": "Bearer contraseña".encode()})

    assert response.status_code == 401


def test_request_with_valid_token_is_accepted(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.get("/health", headers=auth_headers)

    assert response.status_code == 200


def test_preflight_from_tauri_origin_is_allowed(client: TestClient) -> None:
    response = client.options("/health", headers=preflight_headers(TAURI_WINDOWS_ORIGIN))

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == TAURI_WINDOWS_ORIGIN


def test_preflight_from_unknown_origin_is_not_allowed(client: TestClient) -> None:
    response = client.options("/health", headers=preflight_headers(UNKNOWN_ORIGIN))

    assert "access-control-allow-origin" not in response.headers


def test_rejection_is_readable_by_the_tauri_webview(client: TestClient) -> None:
    response = client.get("/health", headers={"Origin": TAURI_WINDOWS_ORIGIN})

    assert response.status_code == 401
    assert response.headers["access-control-allow-origin"] == TAURI_WINDOWS_ORIGIN
