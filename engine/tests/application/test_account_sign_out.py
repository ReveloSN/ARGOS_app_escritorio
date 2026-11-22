import pytest

from argus.application.account.sign_in import SignIn
from argus.application.account.sign_out import SignOut
from argus.domain.account import AccountState, AccountStatus, Credentials
from argus.domain.account_errors import AccountProblem
from argus.domain.errors import KeychainUnavailableError
from tests.application.account_doubles import RENEWED, STORED, AccountDoubles

CREDENTIALS = Credentials("ana@example.com", "clave")


@pytest.fixture
def doubles() -> AccountDoubles:
    doubles = AccountDoubles()
    doubles.gate.skipped = True
    return doubles


@pytest.mark.parametrize("problem", [AccountProblem.OFFLINE, AccountProblem.SESSION_REVOKED])
def test_sign_out_without_network_clears_what_is_local(
    doubles: AccountDoubles, problem: AccountProblem
) -> None:
    doubles.provider.fail("sign_out", problem)
    sessions = doubles.sessions()
    SignIn(sessions).execute(CREDENTIALS)

    state = SignOut(sessions).execute()

    assert state == AccountState(AccountStatus.SIGNED_OUT, gate_skipped=False)
    assert doubles.store.stored is None
    assert doubles.sessions().current() == state


def test_local_session_is_cleared_before_using_the_network(doubles: AccountDoubles) -> None:
    doubles.provider.failures["sign_out"] = RuntimeError("fallo inesperado")
    sessions = doubles.sessions()
    SignIn(sessions).execute(CREDENTIALS)

    with pytest.raises(RuntimeError):
        SignOut(sessions).execute()

    assert sessions.current().status is AccountStatus.SIGNED_OUT
    assert doubles.store.stored is None


def test_sign_out_reports_a_keychain_that_cannot_delete(doubles: AccountDoubles) -> None:
    sessions = doubles.sessions()
    SignIn(sessions).execute(CREDENTIALS)
    doubles.store.unavailable = {"clear"}

    with pytest.raises(KeychainUnavailableError):
        SignOut(sessions).execute()

    # Estaba guardada: se olvida en memoria y se avisa de lo que quedó en el llavero.
    assert sessions.current() == AccountState(AccountStatus.SIGNED_OUT, is_persisted=False)
    assert doubles.provider.calls[-1] == ("sign_out", RENEWED.access_token)


def test_sign_out_can_be_retried_when_the_keychain_returns(doubles: AccountDoubles) -> None:
    doubles.store.stored = STORED
    doubles.store.unavailable = {"clear"}
    sessions = doubles.sessions()
    with pytest.raises(KeychainUnavailableError):
        SignOut(sessions).execute()

    doubles.store.unavailable.clear()

    assert SignOut(sessions).execute() == AccountState(AccountStatus.SIGNED_OUT)
    assert doubles.store.stored is None


@pytest.mark.parametrize("failing", [{"write", "clear"}, {"read", "write", "clear"}])
def test_memory_only_session_signs_out_without_error(
    doubles: AccountDoubles, failing: set[str]
) -> None:
    doubles.store.unavailable = failing
    sessions = doubles.sessions()
    SignIn(sessions).execute(CREDENTIALS)

    state = SignOut(sessions).execute()

    assert state == AccountState(AccountStatus.SIGNED_OUT, is_persisted=False)
    assert doubles.provider.calls[-1] == ("sign_out", RENEWED.access_token)


@pytest.mark.parametrize("failing", [{"clear"}, {"read", "clear"}])
def test_without_a_known_session_sign_out_has_no_error(
    doubles: AccountDoubles, failing: set[str]
) -> None:
    doubles.store.unavailable = failing

    state = SignOut(doubles.sessions()).execute()

    assert state == AccountState(AccountStatus.SIGNED_OUT, is_persisted=False)


def test_retrying_still_reports_what_was_left_in_the_keychain(doubles: AccountDoubles) -> None:
    doubles.store.stored = STORED
    doubles.store.unavailable = {"write", "clear"}
    sessions = doubles.sessions()

    for _attempt in range(2):
        with pytest.raises(KeychainUnavailableError):
            SignOut(sessions).execute()
    SignIn(sessions).execute(CREDENTIALS)
    with pytest.raises(KeychainUnavailableError):
        SignOut(sessions).execute()

    assert doubles.store.stored == STORED


@pytest.mark.parametrize("problem", [None, AccountProblem.SESSION_REVOKED])
def test_failed_renewal_does_not_forget_the_saved_session(
    doubles: AccountDoubles, problem: AccountProblem | None
) -> None:
    doubles.store.stored = STORED
    doubles.store.unavailable = {"write", "clear"}
    if problem:
        doubles.provider.fail("refresh", problem)
    sessions = doubles.sessions()
    sessions.refresh()

    with pytest.raises(KeychainUnavailableError):
        SignOut(sessions).execute()
