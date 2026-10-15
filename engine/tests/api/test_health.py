from importlib.metadata import version

from fastapi.testclient import TestClient

from argus.api.settings import PACKAGE_NAME, EngineSettings
from tests.api.conftest import TEST_TOKEN, TEST_VERSION


def test_health_responds_with_success_status_code(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.get("/health", headers=auth_headers)

    assert response.status_code == 200


def test_health_reports_status_and_injected_version(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    body = client.get("/health", headers=auth_headers).json()

    assert body == {"status": "ok", "version": TEST_VERSION}


def test_settings_read_version_from_installed_package() -> None:
    settings = EngineSettings.from_installed_package(access_token=TEST_TOKEN)

    assert settings.version == version(PACKAGE_NAME)
    assert settings.access_token == TEST_TOKEN
