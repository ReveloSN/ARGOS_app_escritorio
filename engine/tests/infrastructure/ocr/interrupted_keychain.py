"""Un llavero que se corta en el cambio que elija la prueba."""

from collections.abc import Callable
from dataclasses import dataclass

from argus.application.ports.secrets import SecretStore
from argus.domain.errors import KeychainUnavailableError
from tests.application.ai_doubles import InMemorySecretStore


@dataclass(frozen=True)
class Interruption:
    change: int
    # Como un cierre inesperado: el cambio llegó al llavero, pero quien lo hizo no se enteró.
    has_landed: bool = False


class InterruptedKeychain:
    """Cuenta cada escritura y cada borrado; `interruption` dice cuál falla."""

    def __init__(self) -> None:
        self.entries: dict[str, InMemorySecretStore] = {}
        self.changes = 0
        self.interruption: Interruption | None = None

    def entry(self, account: str) -> SecretStore:
        return _Entry(self, self.entries.setdefault(account, InMemorySecretStore()))

    def stored(self) -> dict[str, str]:
        return {
            name: entry.secret for name, entry in self.entries.items() if entry.secret is not None
        }

    def restart(self, interruption: Interruption | None = None) -> None:
        self.changes, self.interruption = 0, interruption

    def change(self, apply: Callable[[], None]) -> None:
        self.changes += 1
        failure = self.interruption
        if failure is None or failure.change != self.changes:
            apply()
            return
        if failure.has_landed:
            apply()
        raise KeychainUnavailableError("Corte en esta prueba.")


class _Entry:
    def __init__(self, keychain: InterruptedKeychain, stored: InMemorySecretStore) -> None:
        self._keychain = keychain
        self._stored = stored

    def read(self) -> str | None:
        return self._stored.read()

    def store(self, secret: str) -> None:
        self._keychain.change(lambda: self._stored.store(secret))

    def remove(self) -> None:
        self._keychain.change(self._stored.remove)
