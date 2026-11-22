"""Los rechazos de Supabase hasta HTTP, con el adaptador real y sin red."""

import pytest
import requests
from fastapi.testclient import TestClient

from argus.api.account_composition import AccountAdapters
from argus.api.app import create_app
from argus.api.settings import EngineSettings
from argus.infrastructure.identity.account_configuration import AccountConfiguration
from argus.infrastructure.identity.supabase_identity_provider import SupabaseIdentityProvider
from tests.application.account_doubles import InMemorySessionStore
from tests.application.ocr_doubles import offline_adapters
from tests.infrastructure.supabase_doubles import CODE, EMAIL, KEY, PASSWORD, ScriptedRequest

BASE_URL = "https://p.example"
LOGIN = {"email": EMAIL, "password": PASSWORD}
CONFIRM = {**LOGIN, "code": CODE}
CONFIRM_PATH = "/account/password-reset/confirm"


class SupabaseByPath:
    """Responde la sesión de siempre, salvo en las rutas que la prueba rechace."""

    def __init__(self) -> None:
        self.refusals: dict[str, ScriptedRequest] = {}
        self.accepted = ScriptedRequest()
        self.paths: list[str] = []

    def refuse(self, path: str, body: object, status: int = 422) -> None:
        self.refusals[path] = ScriptedRequest(status, body)

    def __call__(self, method: str, url: str, **options: object) -> requests.Response:
        path = url.removeprefix(f"{BASE_URL}/auth/v1")
        self.paths.append(path)
        return self.refusals.get(path, self.accepted)(method, url, **options)


@pytest.fixture
def supabase() -> SupabaseByPath:
    return SupabaseByPath()


@pytest.fixture
def api(
    settings: EngineSettings, auth_headers: dict[str, str], supabase: SupabaseByPath
) -> TestClient:
    configuration = AccountConfiguration(BASE_URL, KEY)
    provider = SupabaseIdentityProvider(configuration, supabase)
    external = offline_adapters(account=AccountAdapters(provider, InMemorySessionStore()))
    return TestClient(create_app(settings, external=external), headers=auth_headers)


@pytest.mark.parametrize(
    "expected",
    [
        ({"code": "validation_failed"}, 422, "invalid_value"),
        ({"code": "email_address_invalid"}, 422, "invalid_value"),
        ({"code": "signup_disabled"}, 502, "service_rejected"),
        ({"message": "Invalid API key"}, 502, "service_rejected"),
    ],
)
def test_a_rejection_is_not_reported_as_offline(
    api: TestClient, supabase: SupabaseByPath, expected: tuple[object, int, str]
) -> None:
    body, status, detail = expected
    supabase.refuse("/signup", body)

    response = api.post("/account/sign-up", json=LOGIN)

    assert (response.status_code, response.json()) == (status, {"detail": detail})


def test_the_same_password_can_be_changed_with_the_same_code(
    api: TestClient, supabase: SupabaseByPath
) -> None:
    supabase.refuse("/user", {"code": "same_password"})
    refused = api.post(CONFIRM_PATH, json=CONFIRM)
    supabase.refusals.clear()

    changed = api.post(CONFIRM_PATH, json={**CONFIRM, "password": "otra-contraseña"})

    assert (refused.status_code, refused.json()) == (422, {"detail": "same_password"})
    assert (changed.status_code, supabase.paths.count("/verify")) == (200, 1)


def test_a_dead_recovery_session_recovers_with_a_new_code(
    api: TestClient, supabase: SupabaseByPath
) -> None:
    supabase.refuse("/user", {"code": "session_expired"}, 403)
    refused = api.post(CONFIRM_PATH, json=CONFIRM)
    supabase.refusals.clear()

    changed = api.post(CONFIRM_PATH, json={**CONFIRM, "code": "99001122"})

    assert (refused.status_code, refused.json()) == (422, {"detail": "invalid_code"})
    assert (changed.status_code, supabase.paths.count("/verify")) == (200, 2)


def test_a_rejected_refresh_keeps_the_session(api: TestClient, supabase: SupabaseByPath) -> None:
    api.post("/account/sign-in", json=LOGIN)
    supabase.refuse("/token", {"code": "validation_failed"}, 400)

    response = api.post("/account/refresh")

    assert response.status_code == 200
    assert (response.json()["status"], response.json()["isOffline"]) == ("signed_in", True)


def test_a_rejected_revocation_still_signs_out(api: TestClient, supabase: SupabaseByPath) -> None:
    api.post("/account/sign-in", json=LOGIN)
    supabase.refuse("/logout", {"code": "bad_jwt"}, 403)

    response = api.post("/account/sign-out")

    assert (response.status_code, response.json()["status"]) == (200, "signed_out")
