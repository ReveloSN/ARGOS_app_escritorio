import json
from pathlib import Path

import pytest

from argus.domain.account import Account, StoredSession
from argus.domain.errors import KeychainUnavailableError
from argus.domain.preferences import UserPreferences
from argus.infrastructure.identity.keyring_session_store import KeyringSessionStore
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase
from argus.infrastructure.persistence.sqlite_gate_preference import SqliteGatePreference
from argus.infrastructure.persistence.sqlite_preference_repositories import (
    SqlitePreferencesRepository,
)
from tests.application.ai_doubles import InMemorySecretStore

ACCOUNT = Account("user-1", "ana@example.com", "Ana")
STORED = StoredSession(ACCOUNT, "renovacion-secreta")
RECORD = {
    "account": {"id": "user-1", "email": "ana@example.com", "display_name": "Ana"},
    "refresh_token": "renovacion-secreta",
}


@pytest.mark.parametrize(
    "session",
    [STORED, StoredSession(ACCOUNT, None), StoredSession(Account("u", "a@b.co", None), "t")],
)
def test_the_session_comes_back_as_it_was_saved(session: StoredSession) -> None:
    secrets = InMemorySecretStore()

    KeyringSessionStore(secrets).write(session)

    assert KeyringSessionStore(secrets).read() == session


def test_only_the_account_and_the_refresh_token_are_saved() -> None:
    secrets = InMemorySecretStore()

    KeyringSessionStore(secrets).write(STORED)

    assert json.loads(secrets.secret or "") == RECORD


@pytest.mark.parametrize(
    "secret",
    [
        None,
        "",
        "{no es json",
        "[]",
        "null",
        "{}",
        "[" * 9000,
        json.dumps({"account": RECORD["account"]}),
        json.dumps({**RECORD, "refresh_token": 7}),
        json.dumps({**RECORD, "refresh_token": ""}),
        json.dumps({**RECORD, "account": {"id": "user-1"}}),
        json.dumps({**RECORD, "account": "ana"}),
    ],
)
def test_what_cannot_be_read_counts_as_no_session(secret: str | None) -> None:
    assert KeyringSessionStore(InMemorySecretStore(secret)).read() is None


def test_clearing_leaves_nothing() -> None:
    secrets = InMemorySecretStore(json.dumps(RECORD))

    KeyringSessionStore(secrets).clear()

    assert secrets.secret is None


class BrokenSecrets:
    def __init__(self, failure: Exception) -> None:
        self.failure = failure

    def read(self) -> str | None:
        raise self.failure

    def store(self, secret: str) -> None:
        raise self.failure

    def remove(self) -> None:
        raise self.failure


@pytest.mark.parametrize(
    "failure",
    [
        KeychainUnavailableError("sin llavero"),
        OSError(1783, "CredWrite"),
        # Los llaveros de Windows y de Linux lanzan errores propios, ajenos a KeyringError.
        Exception("error del sistema"),
        UnicodeEncodeError("utf-16", "renovacion-secreta", 0, 1, "no cabe"),
    ],
)
def test_every_keychain_failure_is_the_same_error_and_drags_nothing(failure: Exception) -> None:
    store = KeyringSessionStore(BrokenSecrets(failure))

    for action in (store.read, lambda: store.write(STORED), store.clear):
        with pytest.raises(KeychainUnavailableError) as raised:
            action()
        assert (raised.value.__cause__, raised.value.__context__) == (None, None)


@pytest.fixture
def database(tmp_path: Path) -> SqliteDatabase:
    database = SqliteDatabase(tmp_path / "argus.sqlite3")
    database.migrate()
    return database


def test_the_gate_is_not_skipped_by_default(database: SqliteDatabase) -> None:
    assert SqliteGatePreference(database).is_skipped() is False


@pytest.mark.parametrize("value", [True, False])
def test_the_gate_mark_is_remembered(database: SqliteDatabase, value: bool) -> None:
    SqliteGatePreference(database).set_skipped(not value)
    SqliteGatePreference(database).set_skipped(value)

    assert SqliteGatePreference(database).is_skipped() is value


def test_saving_other_preferences_keeps_the_mark(database: SqliteDatabase) -> None:
    SqliteGatePreference(database).set_skipped(True)

    SqlitePreferencesRepository(database).save(UserPreferences(has_retention_limit=False))

    assert SqliteGatePreference(database).is_skipped() is True
    assert SqlitePreferencesRepository(database).get().has_retention_limit is False
