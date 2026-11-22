from concurrent.futures import ThreadPoolExecutor

import pytest

from argus.application.account.password_reset import PasswordReset
from argus.application.account.sign_out import SignOut
from argus.domain.account import AccountStatus, StoredSession
from argus.domain.errors import AccountError, AccountProblem
from tests.application.account_doubles import ACCOUNT, RECOVERED, AccountDoubles
from tests.application.thread_doubles import TIMEOUT_SECONDS

EMAIL = ACCOUNT.email
CODE = "123456"


@pytest.fixture
def doubles() -> AccountDoubles:
    return AccountDoubles()


def fail_with_weak_password(doubles: AccountDoubles, reset: PasswordReset) -> None:
    doubles.provider.fail("update_password", AccountProblem.WEAK_PASSWORD)
    with pytest.raises(AccountError) as failure:
        reset.confirm(EMAIL, CODE, "123")
    assert failure.value.problem is AccountProblem.WEAK_PASSWORD
    doubles.provider.failures.clear()


def test_request_sends_the_normalized_email(doubles: AccountDoubles) -> None:
    PasswordReset(doubles.sessions()).request(" Ana@Example.com ")

    assert doubles.provider.calls == [("request_password_reset", EMAIL)]


def test_confirm_changes_the_password_and_signs_in(doubles: AccountDoubles) -> None:
    state = PasswordReset(doubles.sessions()).confirm(" Ana@Example.com ", CODE, " Nueva Clave ")

    assert state.status is AccountStatus.SIGNED_IN
    assert doubles.store.stored == StoredSession(ACCOUNT, RECOVERED.refresh_token)
    assert doubles.provider.calls == [
        ("verify_recovery", EMAIL, CODE),
        ("update_password", RECOVERED.access_token, " Nueva Clave "),
    ]


def test_weak_password_is_retried_with_the_same_code(doubles: AccountDoubles) -> None:
    sessions = doubles.sessions()
    fail_with_weak_password(doubles, PasswordReset(sessions))
    assert sessions.current().status is AccountStatus.SIGNED_OUT
    assert "write" not in doubles.store.calls

    # Otro caso de uso sobre las mismas sesiones, como en otra petición HTTP.
    state = PasswordReset(sessions).confirm(" ANA@example.com", CODE, "una clave mejor")

    assert state.status is AccountStatus.SIGNED_IN
    assert doubles.provider.count("verify_recovery") == 1
    assert doubles.provider.count("update_password") == 2


@pytest.mark.parametrize(("email", "code"), [("otra@example.com", CODE), (EMAIL, "654321")])
def test_spent_code_only_serves_its_own_email_and_code(
    doubles: AccountDoubles, email: str, code: str
) -> None:
    reset = PasswordReset(doubles.sessions())
    fail_with_weak_password(doubles, reset)

    reset.confirm(email, code, "una clave mejor")

    assert doubles.provider.calls[-2] == ("verify_recovery", email, code)


def test_success_forgets_the_spent_code(doubles: AccountDoubles) -> None:
    reset = PasswordReset(doubles.sessions())
    reset.confirm(EMAIL, CODE, "una clave")

    reset.confirm(EMAIL, CODE, "otra clave")

    assert doubles.provider.count("verify_recovery") == 2


def test_sign_out_forgets_the_spent_code(doubles: AccountDoubles) -> None:
    sessions = doubles.sessions()
    fail_with_weak_password(doubles, PasswordReset(sessions))

    SignOut(sessions).execute()
    PasswordReset(sessions).confirm(EMAIL, CODE, "una clave mejor")

    assert doubles.provider.count("verify_recovery") == 2


def test_sign_out_while_verifying_does_not_keep_the_code(doubles: AccountDoubles) -> None:
    doubles.provider.fail("update_password", AccountProblem.WEAK_PASSWORD)
    sessions = doubles.sessions()
    reset = PasswordReset(sessions)
    with ThreadPoolExecutor() as pool, doubles.provider.pause("verify_recovery") as pause:
        confirming = pool.submit(reset.confirm, EMAIL, CODE, "123")
        assert pause.entered.wait(TIMEOUT_SECONDS)
        SignOut(sessions).execute()
    assert isinstance(confirming.exception(TIMEOUT_SECONDS), AccountError)
    doubles.provider.failures.clear()

    reset.confirm(EMAIL, CODE, "una clave mejor")

    assert doubles.provider.count("verify_recovery") == 2


def test_sign_out_during_the_password_change_wins(doubles: AccountDoubles) -> None:
    sessions = doubles.sessions()
    reset = PasswordReset(sessions)
    with ThreadPoolExecutor() as pool, doubles.provider.pause("update_password") as pause:
        confirming = pool.submit(reset.confirm, EMAIL, CODE, "una clave")
        assert pause.entered.wait(TIMEOUT_SECONDS)
        SignOut(sessions).execute()

    assert confirming.result(TIMEOUT_SECONDS).status is AccountStatus.SIGNED_OUT
    assert doubles.store.stored is None
