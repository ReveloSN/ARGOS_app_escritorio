from collections.abc import Callable

import pytest

from argus.application.account.account_sessions import AccountSessions
from argus.application.account.password_reset import PasswordReset
from argus.application.account.sign_in import SignIn
from argus.application.account.sign_out import SignOut
from argus.application.account.sign_up import SignUp
from argus.domain.account import AccountState, AccountStatus, Credentials
from argus.domain.account_errors import AccountError, AccountProblem
from tests.application.account_doubles import ACCOUNT, STORED, AccountDoubles

EMAIL = "ana@example.com"
TYPED_EMAIL = "  Ana@Example.COM \n"
PASSWORD = "  Clave Secreta  "
CREDENTIALS = Credentials(EMAIL, PASSWORD)

OPERATIONS: dict[str, Callable[[AccountSessions], object]] = {
    "refresh": lambda sessions: sessions.refresh(),
    "skip": lambda sessions: sessions.skip(),
    "sign_up": lambda sessions: SignUp(sessions).execute(CREDENTIALS),
    "verify": lambda sessions: SignUp(sessions).verify(EMAIL, "123456"),
    "sign_in": lambda sessions: SignIn(sessions).execute(CREDENTIALS),
    "sign_out": lambda sessions: SignOut(sessions).execute(),
    "request": lambda sessions: PasswordReset(sessions).request(EMAIL),
    "confirm": lambda sessions: PasswordReset(sessions).confirm(EMAIL, "123456", PASSWORD),
}


@pytest.fixture
def doubles() -> AccountDoubles:
    return AccountDoubles()


def test_without_provider_the_account_is_unavailable(doubles: AccountDoubles) -> None:
    doubles.store.stored = STORED

    state = AccountSessions(None, doubles.store, doubles.gate).current()

    assert state == AccountState(AccountStatus.UNAVAILABLE)
    assert doubles.store.calls == []


@pytest.mark.parametrize("operation", OPERATIONS)
def test_without_provider_operations_fail(doubles: AccountDoubles, operation: str) -> None:
    sessions = AccountSessions(None, doubles.store, doubles.gate)

    with pytest.raises(AccountError) as failure:
        OPERATIONS[operation](sessions)

    assert failure.value.problem is AccountProblem.ACCOUNT_UNAVAILABLE
    assert doubles.store.calls == []
    assert not doubles.gate.skipped


def test_current_without_session_is_signed_out(doubles: AccountDoubles) -> None:
    assert doubles.sessions().current() == AccountState(AccountStatus.SIGNED_OUT)


def test_current_reads_the_saved_session_without_the_provider(doubles: AccountDoubles) -> None:
    doubles.store.stored = STORED

    state = doubles.sessions().current()

    assert state == AccountState(AccountStatus.SIGNED_IN, ACCOUNT, EMAIL)
    assert doubles.provider.calls == []


def test_skip_is_remembered_after_restarting(doubles: AccountDoubles) -> None:
    assert doubles.sessions().skip().gate_skipped

    assert doubles.sessions().current().gate_skipped
    assert doubles.provider.calls == []


def test_sign_up_with_session_signs_in(doubles: AccountDoubles) -> None:
    result = SignUp(doubles.sessions()).execute(CREDENTIALS, "Ana")

    assert not result.needs_confirmation
    assert result.state == AccountState(AccountStatus.SIGNED_IN, ACCOUNT, EMAIL)
    assert doubles.store.stored == STORED
    assert doubles.provider.calls == [("sign_up", CREDENTIALS, "Ana")]


def test_sign_up_without_session_asks_to_confirm_and_saves_nothing(
    doubles: AccountDoubles,
) -> None:
    doubles.provider.needs_confirmation = True

    result = SignUp(doubles.sessions()).execute(CREDENTIALS)

    assert result.needs_confirmation
    assert result.state.status is AccountStatus.SIGNED_OUT
    assert "write" not in doubles.store.calls


def test_verifying_the_email_signs_in(doubles: AccountDoubles) -> None:
    state = SignUp(doubles.sessions()).verify(TYPED_EMAIL, "123456")

    assert state.status is AccountStatus.SIGNED_IN
    assert doubles.store.stored == STORED
    assert doubles.provider.calls == [("verify_signup", EMAIL, "123456")]


def test_sign_in_saves_only_the_account_and_the_refresh_token(doubles: AccountDoubles) -> None:
    state = SignIn(doubles.sessions()).execute(CREDENTIALS)

    assert state == AccountState(AccountStatus.SIGNED_IN, ACCOUNT, EMAIL)
    assert doubles.store.stored == STORED
    assert doubles.sessions().current() == state


def test_failed_sign_in_saves_nothing(doubles: AccountDoubles) -> None:
    doubles.provider.fail("sign_in", AccountProblem.INVALID_CREDENTIALS)
    sessions = doubles.sessions()

    with pytest.raises(AccountError) as failure:
        SignIn(sessions).execute(CREDENTIALS)

    assert failure.value.problem is AccountProblem.INVALID_CREDENTIALS
    assert sessions.current().status is AccountStatus.SIGNED_OUT
    assert "write" not in doubles.store.calls


def test_email_is_trimmed_and_lowercased_and_password_is_untouched() -> None:
    credentials = Credentials(TYPED_EMAIL, PASSWORD)

    assert credentials.email == EMAIL
    assert credentials.password == PASSWORD


def test_provider_receives_the_normalized_credentials(doubles: AccountDoubles) -> None:
    SignIn(doubles.sessions()).execute(Credentials(TYPED_EMAIL, PASSWORD))

    assert doubles.provider.calls == [("sign_in", CREDENTIALS)]
