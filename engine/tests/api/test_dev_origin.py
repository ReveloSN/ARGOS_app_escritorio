from dataclasses import replace
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from argus.api.app import create_app
from argus.api.ocr_composition import ExternalAdapters
from argus.api.settings import (
    DEV_ORIGIN_ENV_VAR,
    TAURI_ORIGINS,
    EngineSettings,
    InvalidDevOriginError,
    read_dev_origins,
)
from tests.api.conftest import TEST_TOKEN

SECOND_DEV_SERVER = "http://localhost:1421"


def test_no_dev_origin_by_default() -> None:
    assert read_dev_origins({}) == ()
    assert read_dev_origins({DEV_ORIGIN_ENV_VAR: "  "}) == ()


@pytest.mark.parametrize("origin", [SECOND_DEV_SERVER, "http://127.0.0.1:5173"])
def test_a_loopback_origin_is_accepted(origin: str) -> None:
    assert read_dev_origins({DEV_ORIGIN_ENV_VAR: origin}) == (origin,)


@pytest.mark.parametrize(
    "origin",
    [
        "https://example.com",
        "http://evil.localhost:1421",
        "http://localhost",
        "*",
        "localhost:1421",
    ],
)
def test_an_origin_outside_the_loopback_is_refused(origin: str) -> None:
    with pytest.raises(InvalidDevOriginError):
        read_dev_origins({DEV_ORIGIN_ENV_VAR: origin})


def test_the_dev_origin_is_added_to_the_desktop_origins() -> None:
    settings = EngineSettings.from_installed_package(
        TEST_TOKEN, Path("argus.sqlite3"), (SECOND_DEV_SERVER,)
    )

    assert settings.allowed_origins == (*TAURI_ORIGINS, SECOND_DEV_SERVER)


def preflight(settings: EngineSettings, external: ExternalAdapters, origin: str) -> str | None:
    client = TestClient(create_app(settings, external=external))
    response = client.options(
        "/health",
        headers={"Origin": origin, "Access-Control-Request-Method": "GET"},
    )
    return response.headers.get("access-control-allow-origin")


def test_the_engine_answers_the_dev_origin_only_when_configured(
    settings: EngineSettings, external: ExternalAdapters
) -> None:
    configured = replace(settings, allowed_origins=(*TAURI_ORIGINS, SECOND_DEV_SERVER))

    assert preflight(settings, external, SECOND_DEV_SERVER) is None
    assert preflight(configured, external, SECOND_DEV_SERVER) == SECOND_DEV_SERVER
