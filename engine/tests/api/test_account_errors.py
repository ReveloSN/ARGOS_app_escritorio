from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from argus.domain.account import StoredSession
from argus.domain.account_errors import AccountProblem
from tests.application.account_doubles import ACCOUNT, STORED, AccountDoubles
from tests.application.thread_doubles import TIMEOUT_SECONDS

LOGIN = {"email": "ana@example.com", "password": "contraseña-privada"}
CONFIRM = {**LOGIN, "code": "80417236"}
CONFIRM_PATH = "/account/password-reset/confirm"


@pytest.mark.parametrize(
    "expected",
    [
        ("invalid_credentials", 401),
        ("email_not_confirmed", 403),
        ("invalid_code", 422),
        ("email_taken", 409),
        ("weak_password", 422),
        ("rate_limited", 429),
        ("email_unavailable", 503),
        ("offline", 503),
        ("account_unavailable", 409),
    ],
)
def test_each_problem_has_its_status_and_code(
    account_api: TestClient, doubles: AccountDoubles, expected: tuple[str, int]
) -> None:
    problem, status = expected
    doubles.provider.fail("sign_in", AccountProblem(problem))

    response = account_api.post("/account/sign-in", json=LOGIN)

    assert (response.status_code, response.json()) == (status, {"detail": problem})


def test_a_revoked_session_never_reaches_http(
    account_api: TestClient, doubles: AccountDoubles
) -> None:
    doubles.provider.fail("sign_in", AccountProblem.SESSION_REVOKED)

    response = account_api.post("/account/sign-in", json=LOGIN)

    assert (response.status_code, response.json()) == (503, {"detail": "offline"})


def test_a_revoked_refresh_is_an_expired_session(
    account_api: TestClient, doubles: AccountDoubles
) -> None:
    doubles.store.stored = STORED
    doubles.provider.fail("refresh", AccountProblem.SESSION_REVOKED)

    body = account_api.post("/account/refresh").json()

    assert (body["status"], body["account"], body["email"]) == ("expired", None, ACCOUNT.email)
    assert doubles.store.stored == StoredSession(ACCOUNT, None)


def test_an_offline_refresh_keeps_the_session(
    account_api: TestClient, doubles: AccountDoubles
) -> None:
    doubles.store.stored = STORED
    doubles.provider.fail("refresh", AccountProblem.OFFLINE)

    response = account_api.post("/account/refresh")

    assert response.status_code == 200
    assert (response.json()["status"], response.json()["isOffline"]) == ("signed_in", True)


def test_sign_out_warns_if_the_keychain_keeps_the_session(
    account_api: TestClient, doubles: AccountDoubles
) -> None:
    account_api.post("/account/sign-in", json=LOGIN)
    doubles.store.unavailable.add("clear")

    response = account_api.post("/account/sign-out")

    assert (response.status_code, response.json()) == (503, {"detail": "keychain_unavailable"})


def test_one_memory_for_every_request(account_api: TestClient, doubles: AccountDoubles) -> None:
    doubles.store.unavailable |= {"read", "write", "clear"}

    account_api.post("/account/sign-in", json=LOGIN)

    body = account_api.get("/account").json()
    assert (body["status"], body["isPersisted"]) == ("signed_in", False)


def test_a_spent_code_is_retried_in_another_request(
    account_api: TestClient, doubles: AccountDoubles
) -> None:
    doubles.provider.fail("update_password", AccountProblem.WEAK_PASSWORD)
    assert account_api.post(CONFIRM_PATH, json=CONFIRM).status_code == 422
    doubles.provider.failures.clear()

    response = account_api.post(CONFIRM_PATH, json={**CONFIRM, "password": "otra"})

    assert response.status_code == 200
    assert doubles.provider.count("verify_recovery") == 1


def test_reading_the_account_does_not_wait_for_the_network(
    account_api: TestClient, doubles: AccountDoubles
) -> None:
    doubles.store.stored = STORED
    executor = ThreadPoolExecutor(max_workers=1)
    # Con el cliente abierto, las dos peticiones comparten el bucle de eventos, como en uvicorn.
    with account_api, executor as threads, doubles.provider.pause("refresh") as pause:
        renewing = threads.submit(account_api.post, "/account/refresh")
        assert pause.entered.wait(TIMEOUT_SECONDS)
        assert account_api.get("/account").json()["status"] == "signed_in"
        assert not renewing.done()
        pause.release()
        assert renewing.result().status_code == 200
