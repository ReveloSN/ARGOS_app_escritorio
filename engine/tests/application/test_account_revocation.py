"""Al salir se revoca también fuera, aunque el token de acceso ya no sirva (dura una hora)."""

from concurrent.futures import ThreadPoolExecutor
from threading import Event

import pytest

from argus.application.account.sign_in import SignIn
from argus.application.account.sign_out import SignOut
from argus.domain.account import AccountState, AccountStatus, Credentials, StoredSession
from argus.domain.account_errors import AccountProblem
from argus.domain.errors import KeychainUnavailableError
from tests.application.account_doubles import ACCOUNT, RENEWED, SESSION, STORED, AccountDoubles
from tests.application.thread_doubles import TIMEOUT_SECONDS, Pause, WatchedLock

CREDENTIALS = Credentials(ACCOUNT.email, "clave")
SIGNED_OUT = AccountState(AccountStatus.SIGNED_OUT)
RENEW = ("refresh", SESSION.refresh_token)
REVOKE_RENEWED = ("sign_out", RENEWED.access_token)


@pytest.fixture
def doubles() -> AccountDoubles:
    doubles = AccountDoubles()
    doubles.store.stored = STORED
    return doubles


def test_after_a_restart_it_renews_and_revokes(doubles: AccountDoubles) -> None:
    assert SignOut(doubles.sessions()).execute() == SIGNED_OUT

    assert doubles.provider.calls == [RENEW, REVOKE_RENEWED]


def test_an_old_access_token_is_not_trusted(doubles: AccountDoubles) -> None:
    sessions = doubles.sessions()
    SignIn(sessions).execute(CREDENTIALS)

    SignOut(sessions).execute()

    assert doubles.provider.calls[1:] == [RENEW, REVOKE_RENEWED]


@pytest.mark.parametrize("problem", list(AccountProblem))
def test_without_renewal_it_tries_the_token_in_memory(
    doubles: AccountDoubles, problem: AccountProblem
) -> None:
    sessions = doubles.sessions()
    SignIn(sessions).execute(CREDENTIALS)
    doubles.provider.fail("refresh", problem)
    doubles.provider.fail("sign_out", problem)

    assert SignOut(sessions).execute() == SIGNED_OUT

    assert doubles.provider.calls[1:] == [RENEW, ("sign_out", SESSION.access_token)]
    assert doubles.store.stored is None


def test_without_renewal_or_token_it_only_leaves_this_computer(doubles: AccountDoubles) -> None:
    doubles.provider.fail("refresh", AccountProblem.OFFLINE)

    assert SignOut(doubles.sessions()).execute() == SIGNED_OUT

    assert doubles.provider.calls == [RENEW]
    assert doubles.store.stored is None


def test_an_expired_session_has_nothing_to_revoke(doubles: AccountDoubles) -> None:
    doubles.store.stored = StoredSession(ACCOUNT, None)

    assert SignOut(doubles.sessions()).execute() == SIGNED_OUT

    assert (doubles.provider.calls, doubles.store.stored) == ([], None)


def test_the_renewed_session_is_never_saved(doubles: AccountDoubles) -> None:
    sessions = doubles.sessions()

    SignOut(sessions).execute()

    assert "write" not in doubles.store.calls
    assert sessions.current() == SIGNED_OUT
    assert doubles.sessions().current() == SIGNED_OUT


def test_it_is_signed_out_before_renewing(doubles: AccountDoubles) -> None:
    sessions = doubles.sessions()
    with ThreadPoolExecutor() as pool, doubles.provider.pause("refresh") as pause:
        leaving = pool.submit(SignOut(sessions).execute)
        assert pause.entered.wait(TIMEOUT_SECONDS)

        assert (sessions.current(), doubles.store.stored) == (SIGNED_OUT, None)
        assert sessions.refresh() == SIGNED_OUT

    assert leaving.result(TIMEOUT_SECONDS) == SIGNED_OUT
    assert doubles.provider.calls == [RENEW, REVOKE_RENEWED]


def test_entering_while_revoking_is_kept(doubles: AccountDoubles) -> None:
    sessions = doubles.sessions()
    with ThreadPoolExecutor() as pool, doubles.provider.pause("refresh") as pause:
        leaving = pool.submit(SignOut(sessions).execute)
        assert pause.entered.wait(TIMEOUT_SECONDS)
        SignIn(sessions).execute(CREDENTIALS)

    leaving.result(TIMEOUT_SECONDS)
    assert sessions.current().status is AccountStatus.SIGNED_IN
    assert doubles.store.stored == STORED


def test_it_renews_the_token_that_was_current_when_it_left(
    doubles: AccountDoubles, monkeypatch: pytest.MonkeyPatch
) -> None:
    waiting, saving, write = Event(), Pause(), doubles.store.write

    def write_slowly(session: StoredSession) -> None:
        saving.hold()
        write(session)

    monkeypatch.setattr(doubles.store, "write", write_slowly)
    lock_class = "argus.application.account.account_sessions.Lock"
    monkeypatch.setattr(lock_class, lambda: WatchedLock(waiting))
    sessions = doubles.sessions()
    with ThreadPoolExecutor(max_workers=2) as pool, saving:
        pool.submit(sessions.refresh)
        assert saving.entered.wait(TIMEOUT_SECONDS)
        leaving = pool.submit(SignOut(sessions).execute)
        assert waiting.wait(TIMEOUT_SECONDS)

    assert leaving.result(TIMEOUT_SECONDS) == SIGNED_OUT
    assert doubles.provider.calls == [RENEW, ("refresh", RENEWED.refresh_token), REVOKE_RENEWED]


def test_a_keychain_failure_still_revokes(doubles: AccountDoubles) -> None:
    doubles.store.unavailable = {"clear"}

    with pytest.raises(KeychainUnavailableError):
        SignOut(doubles.sessions()).execute()

    assert doubles.provider.calls == [RENEW, REVOKE_RENEWED]
