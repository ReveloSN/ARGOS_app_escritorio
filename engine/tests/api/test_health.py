from importlib.metadata import version

from fastapi.testclient import TestClient

from argus.api.app import create_app
from argus.api.settings import PACKAGE_NAME, EngineSettings

TEST_VERSION = "9.9.9"


def build_client() -> TestClient:
    return TestClient(create_app(EngineSettings(version=TEST_VERSION)))


def test_health_responds_with_success_status_code() -> None:
    response = build_client().get("/health")

    assert response.status_code == 200


def test_health_reports_status_and_injected_version() -> None:
    body = build_client().get("/health").json()

    assert body == {"status": "ok", "version": TEST_VERSION}


def test_settings_read_version_from_installed_package() -> None:
    settings = EngineSettings.from_installed_package()

    assert settings.version == version(PACKAGE_NAME)


def test_app_without_explicit_settings_uses_installed_package_version() -> None:
    body = TestClient(create_app()).get("/health").json()

    assert body["version"] == version(PACKAGE_NAME)
