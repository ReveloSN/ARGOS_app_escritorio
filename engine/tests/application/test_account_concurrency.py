from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from threading import Event

import pytest

from argus.application.account.sign_in import SignIn
from argus.application.account.sign_out import SignOut
from argus.domain.account import AccountState, AccountStatus, Credentials, StoredSession
from argus.domain.errors import AccountError, AccountProblem
from tests.application.account_doubles import ACCOUNT, STORED, AccountDoubles
from tests.application.thread_doubles import TIMEOUT_SECONDS, Pause, WatchedLock

SIGNED_IN = AccountState(AccountStatus.SIGNED_IN, ACCOUNT, ACCOUNT.email)


@pytest.fixture
def doubles() -> AccountDoubles:
    doubles = AccountDoubles()
    doubles.store.stored = STORED
    return doubles


@pytest.fixture
def pool() -> Iterator[ThreadPoolExecutor]:
    with ThreadPoolExecutor(max_workers=3) as executor:
        yield executor


def watch_locks(monkeypatch: pytest.MonkeyPatch) -> Event:
    """Avisa cuando un hilo espera un candado de las sesiones."""
    waiting = Event()
    lock_class = "argus.application.account.account_sessions.Lock"
    monkeypatch.setattr(lock_class, lambda: WatchedLock(waiting))
    return waiting


@pytest.mark.parametrize(
    "failure",
    [
        None,
        AccountError(AccountProblem.OFFLINE),
        AccountError(AccountProblem.SESSION_REVOKED),
        AccountError(AccountProblem.RATE_LIMITED),
        RuntimeError("fallo inesperado"),
    ],
    ids=["renewed", "offline", "revoked", "rate_limited", "unexpected"],
)
def test_overlapping_refreshes_make_a_single_call(
    doubles: AccountDoubles, monkeypatch: pytest.MonkeyPatch, failure: Exception | None
) -> None:
    waiting = watch_locks(monkeypatch)
    if failure:
        doubles.provider.failures["refresh"] = failure
    sessions = doubles.sessions()
    with ThreadPoolExecutor(max_workers=2) as pool, doubles.provider.pause("refresh") as pause:
        first = pool.submit(sessions.refresh)
        assert pause.entered.wait(TIMEOUT_SECONDS)
        second = pool.submit(sessions.refresh)
        # La segunda ya leyó el mismo token y espera a que termine la primera.
        assert waiting.wait(TIMEOUT_SECONDS)

    first.exception(TIMEOUT_SECONDS)
    assert second.result(TIMEOUT_SECONDS) == sessions.current()
    assert doubles.provider.calls == [("refresh", "refresh-1")]


def test_current_does_not_wait_for_a_refresh(
    doubles: AccountDoubles, pool: ThreadPoolExecutor
) -> None:
    sessions = doubles.sessions()
    with doubles.provider.pause("refresh") as pause:
        pool.submit(sessions.refresh)
        assert pause.entered.wait(TIMEOUT_SECONDS)

        assert pool.submit(sessions.current).result(TIMEOUT_SECONDS / 2) == SIGNED_IN


@pytest.mark.parametrize("problem", [None, *AccountProblem])
def test_sign_out_during_refresh_wins(
    doubles: AccountDoubles, pool: ThreadPoolExecutor, problem: AccountProblem | None
) -> None:
    if problem:
        doubles.provider.fail("refresh", problem)
    sessions = doubles.sessions()
    with doubles.provider.pause("refresh") as pause:
        renewing = pool.submit(sessions.refresh)
        assert pause.entered.wait(TIMEOUT_SECONDS)
        SignOut(sessions).execute()

    renewing.exception(TIMEOUT_SECONDS)
    assert sessions.current().status is AccountStatus.SIGNED_OUT
    assert doubles.store.stored is None


def test_sign_in_during_refresh_wins(doubles: AccountDoubles, pool: ThreadPoolExecutor) -> None:
    doubles.provider.fail("refresh", AccountProblem.SESSION_REVOKED)
    sessions = doubles.sessions()
    with doubles.provider.pause("refresh") as pause:
        renewing = pool.submit(sessions.refresh)
        assert pause.entered.wait(TIMEOUT_SECONDS)
        SignIn(sessions).execute(Credentials(ACCOUNT.email, "clave"))

    assert renewing.result(TIMEOUT_SECONDS) == SIGNED_IN
    assert doubles.store.stored == STORED


def test_sign_out_while_the_rotation_is_being_saved_wins(
    doubles: AccountDoubles, monkeypatch: pytest.MonkeyPatch
) -> None:
    saving, write = Pause(), doubles.store.write

    def write_slowly(session: StoredSession) -> None:
        saving.hold()
        write(session)

    monkeypatch.setattr(doubles.store, "write", write_slowly)
    waiting = watch_locks(monkeypatch)
    sessions = doubles.sessions()
    with ThreadPoolExecutor(max_workers=2) as pool, saving:
        pool.submit(sessions.refresh)
        assert saving.entered.wait(TIMEOUT_SECONDS)
        leaving = pool.submit(SignOut(sessions).execute)
        assert waiting.wait(TIMEOUT_SECONDS)

    assert leaving.result(TIMEOUT_SECONDS).status is AccountStatus.SIGNED_OUT
    assert doubles.store.stored is None
