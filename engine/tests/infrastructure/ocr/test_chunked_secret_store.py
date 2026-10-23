from argus.application.ports.secrets import SecretStore
from argus.infrastructure.ocr.chunked_secret_store import CHUNK_CHARACTERS, ChunkedSecretStore
from tests.application.ai_doubles import InMemorySecretStore

ACCOUNT = "google-document-ai"


class InMemoryKeychain:
    """Un llavero con varias cuentas, como el del sistema."""

    def __init__(self) -> None:
        self.entries: dict[str, InMemorySecretStore] = {}

    def entry(self, account: str) -> SecretStore:
        return self.entries.setdefault(account, InMemorySecretStore())

    def stored(self) -> dict[str, str]:
        return {
            name: entry.secret for name, entry in self.entries.items() if entry.secret is not None
        }


def test_a_long_secret_is_split_into_entries_that_fit_the_windows_limit() -> None:
    keychain = InMemoryKeychain()
    store = ChunkedSecretStore(keychain.entry, ACCOUNT)
    secret = "k" * (CHUNK_CHARACTERS * 2 + 300)

    store.store(secret)

    assert store.read() == secret
    assert keychain.stored()[ACCOUNT] == "3"
    assert all(len(value) <= CHUNK_CHARACTERS for value in keychain.stored().values())


def test_storing_again_replaces_every_part_and_removing_leaves_nothing() -> None:
    keychain = InMemoryKeychain()
    store = ChunkedSecretStore(keychain.entry, ACCOUNT)
    store.store("a" * (CHUNK_CHARACTERS * 3))

    store.store("corta")
    assert store.read() == "corta"
    assert len(keychain.stored()) == 2

    store.remove()
    assert store.read() is None
    assert keychain.stored() == {}


def test_a_missing_part_reads_as_no_secret() -> None:
    keychain = InMemoryKeychain()
    store = ChunkedSecretStore(keychain.entry, ACCOUNT)
    store.store("b" * (CHUNK_CHARACTERS + 1))

    keychain.entry(f"{ACCOUNT}#1").remove()

    assert store.read() is None
