import pytest

from argus.domain.account import AccountState, AccountStatus, StoredSession
from argus.domain.account_errors import AccountError, AccountProblem
from tests.application.account_doubles import ACCOUNT, RENEWED, STORED, AccountDoubles

SIGNED_IN = AccountState(AccountStatus.SIGNED_IN, ACCOUNT, ACCOUNT.email)
EXPIRED = AccountState(AccountStatus.EXPIRED, email=ACCOUNT.email)


@pytest.fixture
def doubles() -> AccountDoubles:
    doubles = AccountDoubles()
    doubles.store.stored = STORED
    return doubles


def test_refresh_rotates_the_saved_token(doubles: AccountDoubles) -> None:
    sessions = doubles.sessions()

    assert sessions.refresh() == SIGNED_IN
    assert doubles.store.stored == StoredSession(ACCOUNT, RENEWED.refresh_token)

    sessions.refresh()
    assert doubles.provider.calls == [("refresh", "refresh-1"), ("refresh", "refresh-2")]


def test_offline_keeps_the_session_until_it_can_renew(doubles: AccountDoubles) -> None:
    doubles.provider.fail("refresh", AccountProblem.OFFLINE)
    sessions = doubles.sessions()

    state = sessions.refresh()

    assert state == AccountState(AccountStatus.SIGNED_IN, ACCOUNT, ACCOUNT.email, is_offline=True)
    assert sessions.current() == state
    assert doubles.store.calls == ["read"]

    doubles.provider.failures.clear()
    assert sessions.refresh() == SIGNED_IN


def test_revoked_session_expires_with_email_and_without_token(doubles: AccountDoubles) -> None:
    doubles.provider.fail("refresh", AccountProblem.SESSION_REVOKED)

    assert doubles.sessions().refresh() == EXPIRED
    assert doubles.store.stored == StoredSession(ACCOUNT, None)


def test_expired_survives_a_restart_and_is_not_renewed(doubles: AccountDoubles) -> None:
    doubles.store.stored = StoredSession(ACCOUNT, None)

    assert doubles.sessions().current() == EXPIRED
    assert doubles.sessions().refresh() == EXPIRED
    assert doubles.provider.calls == []


def test_refresh_without_session_does_not_use_the_network(doubles: AccountDoubles) -> None:
    doubles.store.stored = None

    assert doubles.sessions().refresh().status is AccountStatus.SIGNED_OUT
    assert doubles.provider.calls == []


def test_other_problems_are_reported_and_keep_the_session(doubles: AccountDoubles) -> None:
    doubles.provider.fail("refresh", AccountProblem.RATE_LIMITED)
    sessions = doubles.sessions()

    with pytest.raises(AccountError) as failure:
        sessions.refresh()

    assert failure.value.problem is AccountProblem.RATE_LIMITED
    assert sessions.current() == SIGNED_IN
    assert doubles.store.stored == STORED
