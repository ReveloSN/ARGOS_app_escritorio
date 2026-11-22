"""Cortes a mitad de una escritura: sin mezclas y sin restos que no se puedan borrar."""

from concurrent.futures import ThreadPoolExecutor, wait

import pytest

from argus.application.ports.secrets import SecretStore
from argus.domain.errors import KeychainUnavailableError
from argus.infrastructure.ocr.chunked_secret_store import CHUNK_CHARACTERS, ChunkedSecretStore
from tests.application.thread_doubles import TIMEOUT_SECONDS, Pause
from tests.infrastructure.ocr.interrupted_keychain import InterruptedKeychain, Interruption
from tests.infrastructure.ocr.test_chunked_secret_store import ACCOUNT, InMemoryKeychain

RESIZES = {"nace": (0, 3), "crece": (2, 5), "encoge": (5, 2), "igual": (3, 3)}


def saved_before(parts: int) -> tuple[InterruptedKeychain, str | None]:
    keychain = InterruptedKeychain()
    if not parts:
        return keychain, None
    secret = "v" * (CHUNK_CHARACTERS * parts)
    ChunkedSecretStore(keychain.entry, ACCOUNT).store(secret)
    keychain.restart()
    return keychain, secret


def changes_to_store(old_parts: int, secret: str) -> range:
    keychain, _old = saved_before(old_parts)
    ChunkedSecretStore(keychain.entry, ACCOUNT).store(secret)
    return range(1, keychain.changes + 1)


@pytest.mark.parametrize("has_landed", [False, True], ids=["falla", "cierre"])
@pytest.mark.parametrize("resize", RESIZES)
def test_an_interrupted_store_never_mixes_and_can_always_be_cleared(
    resize: str, has_landed: bool
) -> None:
    old_parts, new_parts = RESIZES[resize]
    new = "n" * (CHUNK_CHARACTERS * new_parts)
    for change in changes_to_store(old_parts, new):
        keychain, old = saved_before(old_parts)
        keychain.restart(Interruption(change, has_landed))
        with pytest.raises(KeychainUnavailableError):
            ChunkedSecretStore(keychain.entry, ACCOUNT).store(new)
        keychain.restart()
        reopened = ChunkedSecretStore(keychain.entry, ACCOUNT)

        assert reopened.read() in (None, old, new), change
        reopened.remove()
        assert keychain.stored() == {}, change


@pytest.mark.parametrize("change", [1, 2, 3, 4])
def test_an_interrupted_removal_can_be_repeated(change: int) -> None:
    keychain, old = saved_before(3)
    keychain.restart(Interruption(change))
    with pytest.raises(KeychainUnavailableError):
        ChunkedSecretStore(keychain.entry, ACCOUNT).remove()
    keychain.restart()
    reopened = ChunkedSecretStore(keychain.entry, ACCOUNT)

    assert reopened.read() in (None, old)
    reopened.remove()
    assert keychain.stored() == {}


def test_parts_left_by_an_older_version_are_never_mixed_with_new_ones() -> None:
    # Antes el número se escribía al final: un corte dejaba partes sin número.
    for change in changes_to_store(0, "n" * CHUNK_CHARACTERS * 3):
        keychain = InterruptedKeychain()
        for index in range(3):
            keychain.entry(f"{ACCOUNT}#{index}").store("v" * CHUNK_CHARACTERS)
        keychain.restart(Interruption(change))
        store = ChunkedSecretStore(keychain.entry, ACCOUNT)
        with pytest.raises(KeychainUnavailableError):
            store.store("n" * CHUNK_CHARACTERS * 3)

        assert store.read() is None, change


def test_what_was_saved_in_the_previous_format_is_still_read() -> None:
    keychain = InMemoryKeychain()
    for name, value in ((ACCOUNT, "2"), (f"{ACCOUNT}#0", "ab"), (f"{ACCOUNT}#1", "cd")):
        keychain.entry(name).store(value)

    assert ChunkedSecretStore(keychain.entry, ACCOUNT).read() == "abcd"


class PausedKeychain(InMemoryKeychain):
    """Detiene una vez la lectura, entre el número de partes y la primera parte."""

    def __init__(self) -> None:
        super().__init__()
        self.pause: Pause | None = None

    def entry(self, account: str) -> SecretStore:
        if account.endswith("#0") and (pause := self.pause):
            self.pause = None
            pause.hold()
        return super().entry(account)


def test_a_read_during_a_rewrite_returns_one_whole_value() -> None:
    keychain = PausedKeychain()
    store = ChunkedSecretStore(keychain.entry, ACCOUNT)
    old, new = "v" * CHUNK_CHARACTERS * 2, "n" * CHUNK_CHARACTERS * 3
    store.store(old)
    keychain.pause = Pause()
    with ThreadPoolExecutor(2) as threads, keychain.pause as pause:
        reading = threads.submit(store.read)
        assert pause.entered.wait(TIMEOUT_SECONDS)
        writing = threads.submit(store.store, new)
        wait([writing], timeout=0.2)

    assert reading.result() in (old, new)
    assert store.read() == new
