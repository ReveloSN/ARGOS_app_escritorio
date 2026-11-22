import pytest

from argus.application.account.sign_in import SignIn
from argus.domain.account import (
    Account,
    AccountState,
    AccountStatus,
    Credentials,
    StoredSession,
)
from argus.domain.account_errors import AccountProblem
from tests.application.account_doubles import ACCOUNT, STORED, AccountDoubles

CREDENTIALS = Credentials(ACCOUNT.email, "clave")
SIGNED_IN = AccountState(AccountStatus.SIGNED_IN, ACCOUNT, ACCOUNT.email)
PREVIOUS = StoredSession(Account("user-0", "luis@example.com", None), "refresh-0")
NOT_PERSISTED = AccountState(AccountStatus.SIGNED_IN, ACCOUNT, ACCOUNT.email, is_persisted=False)


@pytest.fixture
def doubles() -> AccountDoubles:
    return AccountDoubles()


def test_unreadable_keychain_is_signed_out(doubles: AccountDoubles) -> None:
    doubles.store.stored = STORED
    doubles.store.unavailable = {"read"}
    sessions = doubles.sessions()

    assert sessions.current() == AccountState(AccountStatus.SIGNED_OUT, is_persisted=False)
    assert sessions.refresh().status is AccountStatus.SIGNED_OUT
    assert doubles.provider.calls == []


def test_keychain_is_read_again_once_it_returns(doubles: AccountDoubles) -> None:
    doubles.store.stored = STORED
    doubles.store.unavailable = {"read"}
    sessions = doubles.sessions()
    sessions.current()

    doubles.store.unavailable.clear()

    assert sessions.current() == SIGNED_IN


def test_unwritable_keychain_leaves_the_session_in_memory(doubles: AccountDoubles) -> None:
    doubles.store.unavailable = {"read", "write"}
    sessions = doubles.sessions()

    assert SignIn(sessions).execute(CREDENTIALS) == NOT_PERSISTED
    assert sessions.current() == NOT_PERSISTED
    assert doubles.store.stored is None


def test_unreadable_keychain_keeps_the_session_in_memory(doubles: AccountDoubles) -> None:
    doubles.store.stored = STORED
    sessions = doubles.sessions()
    sessions.current()

    doubles.store.unavailable = {"read"}

    assert sessions.current() == SIGNED_IN


def test_rotation_that_cannot_be_saved_is_not_reused(doubles: AccountDoubles) -> None:
    doubles.store.stored = STORED
    doubles.store.unavailable = {"write"}
    sessions = doubles.sessions()

    assert sessions.refresh() == NOT_PERSISTED
    doubles.store.unavailable.clear()

    assert sessions.refresh() == SIGNED_IN
    # El token del llavero ya se gastó: reutilizarlo revocaría la sesión.
    assert doubles.provider.calls == [("refresh", "refresh-1"), ("refresh", "refresh-2")]
    assert doubles.store.stored == StoredSession(ACCOUNT, "refresh-2")


def test_offline_does_not_hide_that_the_session_is_not_saved(doubles: AccountDoubles) -> None:
    doubles.store.unavailable = {"write"}
    sessions = doubles.sessions()
    SignIn(sessions).execute(CREDENTIALS)
    doubles.provider.fail("refresh", AccountProblem.OFFLINE)

    state = sessions.refresh()

    assert state.is_offline
    assert not state.is_persisted


def test_expiration_that_cannot_be_saved_holds_in_memory(doubles: AccountDoubles) -> None:
    doubles.store.stored = STORED
    doubles.store.unavailable = {"write"}
    doubles.provider.fail("refresh", AccountProblem.SESSION_REVOKED)
    sessions = doubles.sessions()

    state = sessions.refresh()

    assert state.status is AccountStatus.EXPIRED
    assert not state.is_persisted
    assert sessions.current() == state


def test_failed_write_clears_the_previous_account(doubles: AccountDoubles) -> None:
    doubles.store.stored = PREVIOUS
    doubles.store.unavailable = {"write"}

    assert SignIn(doubles.sessions()).execute(CREDENTIALS) == NOT_PERSISTED

    assert doubles.store.stored is None
    assert doubles.sessions().current().status is AccountStatus.SIGNED_OUT


@pytest.mark.parametrize("problem", [None, AccountProblem.SESSION_REVOKED])
def test_failed_write_clears_the_spent_token(
    doubles: AccountDoubles, problem: AccountProblem | None
) -> None:
    doubles.store.stored = STORED
    doubles.store.unavailable = {"write"}
    if problem:
        doubles.provider.fail("refresh", problem)

    doubles.sessions().refresh()

    assert doubles.store.stored is None
    assert doubles.sessions().current().status is AccountStatus.SIGNED_OUT


def test_failed_write_and_clear_leave_the_session_in_memory(doubles: AccountDoubles) -> None:
    doubles.store.stored = PREVIOUS
    doubles.store.unavailable = {"write", "clear"}
    sessions = doubles.sessions()

    assert SignIn(sessions).execute(CREDENTIALS) == NOT_PERSISTED

    assert sessions.current() == NOT_PERSISTED
    assert doubles.store.calls[-2:] == ["write", "clear"]
    assert doubles.store.stored == PREVIOUS
