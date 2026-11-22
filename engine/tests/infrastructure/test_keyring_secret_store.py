"""Un borrado que el llavero niega no puede pasar por hecho.

macOS lanza PasswordDeleteError tanto si la entrada no existe como si no la deja borrar.
"""

import keyring
import pytest
from keyring.errors import KeyringLocked, PasswordDeleteError

from argus.api.account_composition import default_account_adapters
from argus.application.account.account_sessions import AccountSessions
from argus.application.account.sign_out import SignOut
from argus.domain.errors import KeychainUnavailableError
from argus.infrastructure.ai.keyring_secret_store import KeyringSecretStore
from argus.infrastructure.ocr.chunked_secret_store import ChunkedSecretStore
from tests.application.account_doubles import (
    STORED,
    FakeIdentityProvider,
    InMemoryGatePreference,
)
from tests.infrastructure.keyring_doubles import BoundedKeyring

AI_ACCOUNTS = ("anthropic-api-key", "deepseek-api-key")


def deny_delete(_service: str, _account: str) -> None:
    raise PasswordDeleteError("denegado")


@pytest.fixture
def system(monkeypatch: pytest.MonkeyPatch) -> BoundedKeyring:
    keychain = BoundedKeyring()
    keychain.install(monkeypatch)
    return keychain


@pytest.mark.parametrize("account", AI_ACCOUNTS)
def test_removing_what_is_absent_is_silent(system: BoundedKeyring, account: str) -> None:
    KeyringSecretStore(account=account).remove()

    assert system.entries == {}


@pytest.mark.usefixtures("system")
@pytest.mark.parametrize("account", AI_ACCOUNTS)
def test_a_denied_delete_is_not_a_success(monkeypatch: pytest.MonkeyPatch, account: str) -> None:
    store = KeyringSecretStore(account=account)
    store.store("sk-prueba")
    monkeypatch.setattr(keyring, "delete_password", deny_delete)

    with pytest.raises(KeychainUnavailableError):
        store.remove()

    assert store.read() == "sk-prueba"


@pytest.mark.usefixtures("system")
@pytest.mark.parametrize("failure", [KeyringLocked("cerrado"), OSError(5, "CredRead")])
def test_a_delete_that_cannot_be_checked_is_not_a_success(
    monkeypatch: pytest.MonkeyPatch, failure: Exception
) -> None:
    def unreadable(_service: str, _account: str) -> str:
        raise failure

    monkeypatch.setattr(keyring, "delete_password", deny_delete)
    monkeypatch.setattr(keyring, "get_password", unreadable)

    with pytest.raises(KeychainUnavailableError):
        KeyringSecretStore().remove()


@pytest.mark.usefixtures("system")
def test_a_denied_delete_of_ocr_credentials_is_reported(monkeypatch: pytest.MonkeyPatch) -> None:
    store = ChunkedSecretStore(lambda name: KeyringSecretStore(account=name), "google-document-ai")
    store.store("c" * 2500)
    monkeypatch.setattr(keyring, "delete_password", deny_delete)

    with pytest.raises(KeychainUnavailableError):
        store.remove()

    assert store.read() == "c" * 2500


@pytest.mark.usefixtures("system")
def test_signing_out_reports_a_session_that_would_return(monkeypatch: pytest.MonkeyPatch) -> None:
    store = default_account_adapters().store
    store.write(STORED)
    monkeypatch.setattr(keyring, "delete_password", deny_delete)
    sessions = AccountSessions(FakeIdentityProvider(), store, InMemoryGatePreference())

    with pytest.raises(KeychainUnavailableError):
        SignOut(sessions).execute()

    assert store.read() == STORED
