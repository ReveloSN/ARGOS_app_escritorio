from fastapi.testclient import TestClient

from argus.api.app import create_app
from argus.api.settings import EngineSettings
from argus.domain.account import Credentials
from tests.application.account_doubles import ACCOUNT, AccountDoubles
from tests.application.ocr_doubles import offline_adapters

SIGNED_OUT = {
    "status": "signed_out",
    "account": None,
    "email": None,
    "gateSkipped": False,
    "isOffline": False,
    "isPersisted": True,
}
SIGNED_IN = {
    **SIGNED_OUT,
    "status": "signed_in",
    "account": {"id": ACCOUNT.id, "email": ACCOUNT.email, "displayName": ACCOUNT.display_name},
    "email": ACCOUNT.email,
}
EMAIL = {"email": "  Ana@Example.com "}
PASSWORD = " Clave con espacios "
CREDENTIALS = Credentials("ana@example.com", PASSWORD)
LOGIN = {**EMAIL, "password": PASSWORD}
CONFIRM = {**LOGIN, "code": "80417236"}


def test_without_a_session_it_is_signed_out(account_api: TestClient) -> None:
    response = account_api.get("/account")

    assert (response.status_code, response.json()) == (200, SIGNED_OUT)


def test_sign_in(account_api: TestClient, doubles: AccountDoubles) -> None:
    response = account_api.post("/account/sign-in", json=LOGIN)

    assert (response.status_code, response.json()) == (200, SIGNED_IN)
    assert doubles.provider.calls == [("sign_in", CREDENTIALS)]
    assert account_api.get("/account").json() == SIGNED_IN


def test_sign_up_enters_directly(account_api: TestClient, doubles: AccountDoubles) -> None:
    response = account_api.post("/account/sign-up", json={**LOGIN, "displayName": "Ana"})

    assert response.status_code == 200
    assert response.json() == {"state": SIGNED_IN, "needsConfirmation": False}
    assert doubles.provider.calls == [("sign_up", CREDENTIALS, "Ana")]


def test_sign_up_may_wait_for_the_code(account_api: TestClient, doubles: AccountDoubles) -> None:
    doubles.provider.needs_confirmation = True

    response = account_api.post("/account/sign-up", json=LOGIN)

    assert response.json() == {"state": SIGNED_OUT, "needsConfirmation": True}
    assert doubles.provider.calls == [("sign_up", CREDENTIALS, None)]


def test_verify(account_api: TestClient, doubles: AccountDoubles) -> None:
    response = account_api.post("/account/verify", json={**EMAIL, "code": " 80417236 "})

    assert (response.status_code, response.json()) == (200, SIGNED_IN)
    assert doubles.provider.calls == [("verify_signup", "ana@example.com", "80417236")]


def test_refresh(account_api: TestClient, doubles: AccountDoubles) -> None:
    account_api.post("/account/sign-in", json=LOGIN)

    response = account_api.post("/account/refresh")

    assert (response.status_code, response.json()) == (200, SIGNED_IN)
    assert doubles.provider.calls[-1] == ("refresh", "refresh-1")


def test_sign_out_forgets_the_session_and_the_mark(
    account_api: TestClient, doubles: AccountDoubles
) -> None:
    account_api.post("/account/skip")
    account_api.post("/account/sign-in", json=LOGIN)

    response = account_api.post("/account/sign-out")

    assert (response.status_code, response.json()) == (200, SIGNED_OUT)
    assert doubles.provider.calls[-1] == ("sign_out", "access-1")
    assert doubles.store.stored is None


def test_skip(account_api: TestClient) -> None:
    response = account_api.post("/account/skip")

    assert (response.status_code, response.json()) == (200, {**SIGNED_OUT, "gateSkipped": True})


def test_asking_for_a_reset_code(account_api: TestClient, doubles: AccountDoubles) -> None:
    response = account_api.post("/account/password-reset", json=EMAIL)

    assert (response.status_code, response.content) == (204, b"")
    assert doubles.provider.calls == [("request_password_reset", "ana@example.com")]


def test_confirming_the_reset_signs_in(account_api: TestClient, doubles: AccountDoubles) -> None:
    response = account_api.post("/account/password-reset/confirm", json=CONFIRM)

    assert (response.status_code, response.json()) == (200, SIGNED_IN)
    assert doubles.provider.calls == [
        ("verify_recovery", "ana@example.com", "80417236"),
        ("update_password", "access-3", PASSWORD),
    ]


def test_the_mark_survives_other_preferences_and_a_restart(
    account_api: TestClient, settings: EngineSettings, doubles: AccountDoubles
) -> None:
    account_api.post("/account/skip")
    preferences = {"sensitivity": "strict", "comparedCategories": ["amounts"]}

    saved = account_api.put("/preferences", json={**preferences, "hasRetentionLimit": False})

    assert saved.status_code == 200
    reopened = create_app(settings, external=offline_adapters(account=doubles.adapters()))
    state = TestClient(reopened).get("/account", headers=account_api.headers).json()
    assert state["gateSkipped"] is True
