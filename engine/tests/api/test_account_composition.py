"""El motor con los adaptadores reales: Supabase en 127.0.0.1 y un llavero en memoria."""

import json
import logging
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from httpx2 import Response

from argus.api import account_composition
from argus.api.account_composition import default_account_adapters
from argus.api.app import create_app
from argus.api.ocr_composition import default_external_adapters
from argus.api.settings import EngineSettings
from argus.infrastructure.identity.account_configuration import KEY_VARIABLE, URL_VARIABLE
from argus.infrastructure.identity.supabase_identity_provider import SupabaseIdentityProvider
from tests.application.ocr_doubles import offline_adapters
from tests.infrastructure.keyring_doubles import BoundedKeyring
from tests.infrastructure.supabase_doubles import (
    ACCESS,
    CODE,
    EMAIL,
    KEY,
    PASSWORD,
    REFRESH,
    SESSION_BODY,
    USER,
    LoopbackSupabase,
    loopback_supabase,
)

SECRETS = (PASSWORD, CODE, ACCESS, REFRESH)
LOGIN = {"email": EMAIL, "password": PASSWORD}


@dataclass(frozen=True)
class RunningEngine:
    settings: EngineSettings
    supabase: LoopbackSupabase

    def open(self) -> TestClient:
        external = offline_adapters(account=default_account_adapters())
        headers = {"Authorization": f"Bearer {self.settings.access_token}"}
        return TestClient(create_app(self.settings, external=external), headers=headers)


@pytest.fixture(autouse=True)
def system(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> BoundedKeyring:
    # Ni el llavero, ni las variables, ni el archivo empaquetado de este equipo.
    keychain = BoundedKeyring()
    keychain.install(monkeypatch)
    for name in (URL_VARIABLE, KEY_VARIABLE):
        monkeypatch.delenv(name, raising=False)
    file = tmp_path / "account-config.json"
    monkeypatch.setattr(account_composition, "bundled_configuration_file", lambda: file)
    return keychain


@pytest.fixture
def engine(settings: EngineSettings, monkeypatch: pytest.MonkeyPatch) -> Iterator[RunningEngine]:
    with loopback_supabase() as supabase:
        monkeypatch.setenv(URL_VARIABLE, supabase.url)
        monkeypatch.setenv(KEY_VARIABLE, KEY)
        yield RunningEngine(settings, supabase)


def test_without_configuration_there_is_no_provider() -> None:
    assert default_account_adapters().provider is None
    assert default_external_adapters().account.provider is None


def test_the_bundled_file_is_enough(tmp_path: Path) -> None:
    content = {"url": "https://proyecto.supabase.co", "publishableKey": KEY}
    (tmp_path / "account-config.json").write_text(json.dumps(content), encoding="utf-8")

    assert isinstance(default_account_adapters().provider, SupabaseIdentityProvider)


def test_reading_the_account_uses_no_network(engine: RunningEngine) -> None:
    assert engine.open().get("/account").json()["status"] == "signed_out"
    assert engine.supabase.received == []


def test_secrets_stay_out_of_responses_logs_and_disk(
    engine: RunningEngine, caplog: pytest.LogCaptureFixture, tmp_path: Path
) -> None:
    caplog.set_level(logging.DEBUG)

    responses = use_every_route(engine)

    assert [response.status_code for response in responses] == [200] * 5 + [401, 200, 200]
    assert "/auth/v1/token" in caplog.text  # La captura sí ve los registros de urllib3.
    shown = caplog.text + "".join(response.text for response in responses)
    assert not [secret for secret in SECRETS if secret in shown]
    files = [file.read_bytes() for file in tmp_path.rglob("*") if file.is_file()]
    assert files
    assert not [secret for secret in SECRETS if any(secret.encode() in file for file in files)]


def use_every_route(engine: RunningEngine) -> list[Response]:
    client, supabase = engine.open(), engine.supabase
    responses = [
        client.post("/account/sign-up", json=LOGIN),
        client.post("/account/verify", json={"email": EMAIL, "code": CODE}),
        client.post("/account/sign-in", json=LOGIN),
        client.post("/account/refresh"),
        client.get("/account"),
    ]
    supabase.answer(400, {"code": "invalid_credentials", "message": PASSWORD})
    responses.append(client.post("/account/sign-in", json=LOGIN))
    supabase.answer(200, {**SESSION_BODY, **USER})
    responses.append(client.post("/account/password-reset/confirm", json={**LOGIN, "code": CODE}))
    responses.append(client.post("/account/sign-out"))
    return responses


@pytest.mark.parametrize("token", ["r" * 3000, "ñ" * 700, chr(0x1F600) * 700])
def test_a_long_session_is_chunked_and_survives_a_restart(
    engine: RunningEngine, system: BoundedKeyring, token: str
) -> None:
    engine.supabase.answer(200, {**SESSION_BODY, "refresh_token": token})

    body = engine.open().post("/account/sign-in", json=LOGIN).json()

    assert (body["status"], body["isPersisted"]) == ("signed_in", True)
    assert ("ARGUS", "account-session") in system.entries
    assert len(system.entries) > 2
    assert not any(ACCESS in value for value in system.entries.values())
    reopened = engine.open()
    assert reopened.get("/account").json()["status"] == "signed_in"
    reopened.post("/account/refresh")
    assert engine.supabase.received[-1].body == {"refresh_token": token}


@pytest.mark.parametrize(
    "answer", [(500, {}), (200, b"<html>"), (401, {"message": "Invalid API key"})]
)
def test_a_paused_project_keeps_the_session(
    engine: RunningEngine, answer: tuple[int, object]
) -> None:
    client = engine.open()
    client.post("/account/sign-in", json=LOGIN)
    engine.supabase.answer(*answer)

    body = client.post("/account/refresh").json()

    assert (body["status"], body["isOffline"]) == ("signed_in", True)
