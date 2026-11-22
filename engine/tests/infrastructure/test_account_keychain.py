"""La sesión en el llavero del motor real: en su propio servicio y sin restos al salir."""

import pytest

from argus.api.account_composition import default_account_adapters
from argus.application.account.account_sessions import AccountSessions
from argus.application.account.sign_out import SignOut
from argus.domain.account import Account, AccountSession, StoredSession
from argus.domain.account_errors import AccountProblem
from argus.domain.errors import KeychainUnavailableError
from argus.infrastructure.ai.keyring_secret_store import KeyringSecretStore
from argus.infrastructure.identity.keyring_session_store import KeyringSessionStore
from tests.application.account_doubles import FakeIdentityProvider, InMemoryGatePreference
from tests.infrastructure.keyring_doubles import BoundedKeyring

ACCOUNT = Account("user-1", "ana@example.com", "Ana")
TOKEN = "renovacion-centinela"
# Caracteres del token anterior y del nuevo; 0 es «no había sesión».
RESIZES = {"nace": (0, 2500), "crece": (1500, 4500), "encoge": (4500, 1500)}


@pytest.fixture
def system(monkeypatch: pytest.MonkeyPatch) -> BoundedKeyring:
    keychain = BoundedKeyring()
    keychain.install(monkeypatch)
    return keychain


def session_store() -> KeyringSessionStore:
    store = default_account_adapters().store
    assert isinstance(store, KeyringSessionStore)
    return store


def session_of(characters: int) -> StoredSession:
    return StoredSession(ACCOUNT, TOKEN + "t" * characters)


def writes_to_save(system: BoundedKeyring, resize: str) -> range:
    old, new = RESIZES[resize]
    if old:
        session_store().write(session_of(old))
    system.writes = 0
    session_store().write(session_of(new))
    writes = system.writes
    system.entries.clear()
    return range(1, writes + 1)


def prepare_failing_write(system: BoundedKeyring, old: int, write: int) -> None:
    system.entries.clear()
    system.failing_write = None
    if old:
        session_store().write(session_of(old))
    system.writes, system.failing_write = 0, write


def test_the_session_has_its_own_keychain_service(system: BoundedKeyring) -> None:
    names = ("anthropic-api-key", "deepseek-api-key", "google-document-ai", "account-session")
    for name in names:
        KeyringSecretStore(account=name).store(f"de-{name}")
    others = dict(system.entries)
    system.services_used.clear()
    store, session = session_store(), session_of(3000)

    store.write(session)

    assert store.read() == session
    assert ("ARGUS account", "account-session") in system.entries
    assert ("ARGUS account", "account-session#1") in system.entries
    store.clear()
    # Ni siquiera se lee el servicio de las claves: en Windows, escribir mueve su destino común.
    assert (system.services_used, system.entries) == ({"ARGUS account"}, others)


@pytest.mark.parametrize("resize", RESIZES)
def test_clearing_after_any_failed_write_leaves_nothing(
    system: BoundedKeyring, resize: str
) -> None:
    old, new = RESIZES[resize]
    for write in writes_to_save(system, resize):
        prepare_failing_write(system, old, write)
        store = session_store()
        with pytest.raises(KeychainUnavailableError):
            store.write(session_of(new))

        store.clear()

        assert system.entries == {}, write


@pytest.mark.parametrize("resize", RESIZES)
def test_signing_out_offline_after_a_failed_write_leaves_no_token(
    system: BoundedKeyring, resize: str
) -> None:
    old, new = RESIZES[resize]
    for write in writes_to_save(system, resize):
        prepare_failing_write(system, old, write)
        provider = FakeIdentityProvider()
        provider.fail("sign_out", AccountProblem.OFFLINE)
        sessions = AccountSessions(provider, session_store(), InMemoryGatePreference())
        sessions.start(AccountSession(ACCOUNT, "acceso", session_of(new).refresh_token or ""))

        SignOut(sessions).execute()

        assert system.entries == {}, write
