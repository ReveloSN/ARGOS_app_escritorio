"""El 422 de FastAPI copia lo recibido; en la cuenta eso sería la contraseña."""

import logging

import pytest
from fastapi.testclient import TestClient

from argus.api.schemas.account import PasswordResetBody, SignInBody, SignUpBody
from tests.application.account_doubles import AccountDoubles

EMAIL = "ana@example.com"
PASSWORD = "contraseña-privada"
CODE = "80417236"
TOKEN = "renovacion-pegada"
SECRETS = (PASSWORD, CODE, TOKEN)
LOGIN = {"email": EMAIL, "password": PASSWORD}
WITH_BODY = ("sign-up", "verify", "sign-in", "password-reset", "password-reset/confirm")
JSON = "application/json"
MALFORMED = {
    "cortado": (f'{{"password": "{PASSWORD}", "code": "{CODE}", "token": "{TOKEN}"', JSON),
    "lista": (f'["{PASSWORD}", "{CODE}", "{TOKEN}"]', JSON),
    "texto": (f'"{PASSWORD} {CODE} {TOKEN}"', JSON),
    "sin campos": (f'{{"otro": "{PASSWORD} {CODE} {TOKEN}"}}', JSON),
    "tipos": (f'{{"email": 7, "password": ["{PASSWORD}"], "code": ["{CODE}"]}}', JSON),
    "surrogado": (f'{{"email": "\\ud800", "password": "{PASSWORD}", "code": "{CODE}"}}', JSON),
    "formulario": (f"password={PASSWORD}&code={CODE}", "application/x-www-form-urlencoded"),
    "sin tipo": (f'{{"password": "{PASSWORD}", "token": "{TOKEN}"}}', "text/plain"),
}


@pytest.mark.parametrize("post", WITH_BODY)
@pytest.mark.parametrize("case", MALFORMED)
def test_a_malformed_body_is_never_echoed(account_api: TestClient, post: str, case: str) -> None:
    content, media_type = MALFORMED[case]

    response = account_api.post(
        f"/account/{post}", content=content.encode(), headers={"Content-Type": media_type}
    )

    assert (response.status_code, response.json()) == (422, {"detail": "invalid_value"})


@pytest.mark.parametrize("case", MALFORMED)
def test_a_malformed_body_is_never_logged(
    account_api: TestClient, caplog: pytest.LogCaptureFixture, case: str
) -> None:
    caplog.set_level(logging.DEBUG)
    content, media_type = MALFORMED[case]

    account_api.post(
        "/account/sign-in", content=content.encode(), headers={"Content-Type": media_type}
    )

    assert not [secret for secret in SECRETS if secret in caplog.text]


@pytest.mark.parametrize("post", WITH_BODY)
def test_a_body_that_is_not_utf8_is_never_echoed(account_api: TestClient, post: str) -> None:
    content = b'{"password": "' + PASSWORD.encode("latin-1") + b'"}'

    response = account_api.post(f"/account/{post}", content=content, headers={"Content-Type": JSON})

    assert (response.status_code, response.json()) == (422, {"detail": "invalid_value"})


@pytest.mark.parametrize(
    "case",
    [
        ("sign-in", {**LOGIN, "password": ""}),
        ("sign-in", {**LOGIN, "email": "   "}),
        ("sign-in", {**LOGIN, "password": PASSWORD * 100}),
        ("verify", {"email": EMAIL, "code": CODE * 20}),
        ("sign-up", {**LOGIN, "displayName": PASSWORD * 100}),
    ],
    ids=["sin contraseña", "sin correo", "contraseña", "codigo", "nombre"],
)
def test_values_out_of_range_are_never_echoed(
    account_api: TestClient, doubles: AccountDoubles, case: tuple[str, dict[str, str]]
) -> None:
    post, body = case

    response = account_api.post(f"/account/{post}", json=body)

    assert (response.status_code, response.json()) == (422, {"detail": "invalid_value"})
    assert doubles.provider.calls == []


def test_the_bodies_do_not_show_secrets_in_their_repr() -> None:
    sign_in = SignInBody(email=EMAIL, password=PASSWORD)
    sign_up = SignUpBody(email=EMAIL, password=PASSWORD)
    confirm = PasswordResetBody(email=EMAIL, password=PASSWORD, code=CODE)

    shown = repr((sign_in, sign_up, confirm))

    assert not [secret for secret in SECRETS if secret in shown]


def test_the_rest_of_the_engine_keeps_its_validation(account_api: TestClient) -> None:
    response = account_api.put("/settings/ai", json={"provider": "otro"})

    assert response.status_code == 422
    assert isinstance(response.json()["detail"], list)
