from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from argus.api.app import create_app
from argus.api.settings import EngineSettings
from tests.application.in_memory_repositories import RecordingFileOpener

TEST_VERSION = "9.9.9"
TEST_TOKEN = "test-token-0123456789"
TAURI_WINDOWS_ORIGIN = "http://tauri.localhost"


@pytest.fixture
def settings(tmp_path: Path) -> EngineSettings:
    # El puntero de la carpeta del historial nunca se escribe en la carpeta real del sistema.
    return EngineSettings(
        version=TEST_VERSION,
        access_token=TEST_TOKEN,
        data_directory=tmp_path / "historial",
        pointer_directory=tmp_path / "sistema",
    )


@pytest.fixture
def opener() -> RecordingFileOpener:
    return RecordingFileOpener()


@pytest.fixture
def client(settings: EngineSettings, opener: RecordingFileOpener) -> TestClient:
    return TestClient(create_app(settings, opener))


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {TEST_TOKEN}"}
