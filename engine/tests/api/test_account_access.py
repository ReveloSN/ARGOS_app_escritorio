"""Quién puede usar las rutas de la cuenta: hace falta el token interno y la configuración."""

import pytest
from fastapi.testclient import TestClient

from tests.api.test_account import CONFIRM, SIGNED_OUT
from tests.application.account_doubles import AccountDoubles

POSTS = (
    "refresh",
    "sign-up",
    "verify",
    "sign-in",
    "sign-out",
    "skip",
    "password-reset",
    "password-reset/confirm",
)


@pytest.mark.parametrize("path", ["", *(f"/{post}" for post in POSTS)])
def test_every_route_needs_the_internal_token(
    account_client: TestClient, doubles: AccountDoubles, path: str
) -> None:
    response = account_client.request("POST" if path else "GET", f"/account{path}", json=CONFIRM)

    assert (response.status_code, response.json()) == (401, {"detail": "missing_or_invalid_token"})
    assert (doubles.provider.calls, doubles.store.calls) == ([], [])


def test_without_configuration_it_is_unavailable(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    body = client.get("/account", headers=auth_headers).json()

    assert body == {**SIGNED_OUT, "status": "unavailable"}


@pytest.mark.parametrize("post", POSTS)
def test_without_configuration_nothing_can_be_done(
    client: TestClient, auth_headers: dict[str, str], post: str
) -> None:
    response = client.post(f"/account/{post}", headers=auth_headers, json=CONFIRM)

    assert (response.status_code, response.json()) == (409, {"detail": "account_unavailable"})
