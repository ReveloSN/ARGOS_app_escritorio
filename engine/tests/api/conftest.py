import pytest
from fastapi.testclient import TestClient

from argus.api.app import create_app
from argus.api.settings import EngineSettings

TEST_VERSION = "9.9.9"
TEST_TOKEN = "test-token-0123456789"
TAURI_WINDOWS_ORIGIN = "http://tauri.localhost"


@pytest.fixture
def settings() -> EngineSettings:
    return EngineSettings(version=TEST_VERSION, access_token=TEST_TOKEN)


@pytest.fixture
def client(settings: EngineSettings) -> TestClient:
    return TestClient(create_app(settings))


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {TEST_TOKEN}"}
