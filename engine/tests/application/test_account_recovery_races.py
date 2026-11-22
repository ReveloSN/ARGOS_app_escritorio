"""Un cambio de contraseña lento no pisa a quien entró mientras tanto."""

from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor

import pytest

from argus.application.account.account_sessions import AccountSessions
from argus.application.account.password_reset import PasswordReset
from argus.application.account.sign_in import SignIn
from argus.application.account.sign_up import SignUp
from argus.domain.account import Account, AccountSession, AccountState, Credentials, StoredSession
from argus.domain.account_errors import AccountError, AccountProblem
from tests.application.account_doubles import ACCOUNT, RECOVERED, AccountDoubles
from tests.application.thread_doubles import TIMEOUT_SECONDS

type Entering = Callable[[AccountSessions], object]

OTHER = AccountSession(Account("user-2", "bea@example.com", "Bea"), "access-b", "refresh-b")
CREDENTIALS = Credentials(OTHER.account.email, "clave de Bea")
ENTERING: dict[str, Entering] = {
    "sign_in": lambda it: SignIn(it).execute(CREDENTIALS),
    "sign_up": lambda it: SignUp(it).execute(CREDENTIALS),
    "verify": lambda it: SignUp(it).verify(OTHER.account.email, "654321"),
}


@pytest.fixture
def doubles(monkeypatch: pytest.MonkeyPatch) -> AccountDoubles:
    doubles = AccountDoubles()
    for operation in ("sign_in", "sign_up", "verify_signup"):
        monkeypatch.setattr(doubles.provider, operation, lambda *_arguments: OTHER)
    return doubles


def confirm(sessions: AccountSessions) -> AccountState:
    return PasswordReset(sessions).confirm(ACCOUNT.email, "123456", "una clave nueva")


@pytest.mark.parametrize("entering", ENTERING)
@pytest.mark.parametrize("step", ["verify_recovery", "update_password"])
def test_entering_during_a_slow_recovery_wins(
    doubles: AccountDoubles, entering: str, step: str
) -> None:
    sessions = doubles.sessions()
    with ThreadPoolExecutor() as pool, doubles.provider.pause(step) as pause:
        confirming = pool.submit(confirm, sessions)
        assert pause.entered.wait(TIMEOUT_SECONDS)
        ENTERING[entering](sessions)

    assert confirming.result(TIMEOUT_SECONDS).account == OTHER.account
    assert doubles.store.stored == OTHER.to_stored()


def test_entering_forgets_the_spent_code(doubles: AccountDoubles) -> None:
    sessions = doubles.sessions()
    doubles.provider.fail("update_password", AccountProblem.WEAK_PASSWORD)
    with pytest.raises(AccountError):
        confirm(sessions)
    doubles.provider.failures.clear()

    SignIn(sessions).execute(CREDENTIALS)
    confirm(sessions)

    assert doubles.provider.count("verify_recovery") == 2


def test_a_recovery_started_after_entering_still_signs_in(doubles: AccountDoubles) -> None:
    sessions = doubles.sessions()
    SignIn(sessions).execute(CREDENTIALS)

    assert confirm(sessions).account == ACCOUNT
    assert doubles.store.stored == StoredSession(ACCOUNT, RECOVERED.refresh_token)
