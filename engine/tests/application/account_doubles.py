"""Dobles de la cuenta: un proveedor sin red, un llavero y una marca de la puerta en memoria."""

from dataclasses import dataclass, field

from argus.api.account_composition import AccountAdapters
from argus.application.account.account_sessions import AccountSessions
from argus.domain.account import Account, AccountSession, Credentials, StoredSession
from argus.domain.account_errors import AccountError, AccountProblem
from argus.domain.errors import KeychainUnavailableError
from tests.application.thread_doubles import Pause

ACCOUNT = Account("user-1", "ana@example.com", "Ana")
SESSION = AccountSession(ACCOUNT, "access-1", "refresh-1")
RENEWED = AccountSession(ACCOUNT, "access-2", "refresh-2")
RECOVERED = AccountSession(ACCOUNT, "access-3", "refresh-3")
STORED = StoredSession(ACCOUNT, "refresh-1")
PREVIOUS = StoredSession(Account("user-0", "luis@example.com", None), "refresh-0")


class FakeIdentityProvider:
    def __init__(self) -> None:
        self.calls: list[tuple[object, ...]] = []
        self.failures: dict[str, Exception] = {}
        self.pauses: dict[str, Pause] = {}
        self.needs_confirmation = False

    def fail(self, operation: str, problem: AccountProblem) -> None:
        self.failures[operation] = AccountError(problem)

    def pause(self, operation: str) -> Pause:
        self.pauses[operation] = Pause()
        return self.pauses[operation]

    def count(self, operation: str) -> int:
        return sum(call[0] == operation for call in self.calls)

    def _answer(self, operation: str, *arguments: object) -> None:
        self.calls.append((operation, *arguments))
        if pause := self.pauses.get(operation):
            pause.hold()
        if failure := self.failures.get(operation):
            raise failure

    def sign_up(self, credentials: Credentials, display_name: str | None) -> AccountSession | None:
        self._answer("sign_up", credentials, display_name)
        return None if self.needs_confirmation else SESSION

    def sign_in(self, credentials: Credentials) -> AccountSession:
        self._answer("sign_in", credentials)
        return SESSION

    def verify_signup(self, email: str, code: str) -> AccountSession:
        self._answer("verify_signup", email, code)
        return SESSION

    def verify_recovery(self, email: str, code: str) -> AccountSession:
        self._answer("verify_recovery", email, code)
        return RECOVERED

    def refresh(self, refresh_token: str) -> AccountSession:
        self._answer("refresh", refresh_token)
        return RENEWED

    def sign_out(self, access_token: str) -> None:
        self._answer("sign_out", access_token)

    def request_password_reset(self, email: str) -> None:
        self._answer("request_password_reset", email)

    def update_password(self, access_token: str, password: str) -> None:
        self._answer("update_password", access_token, password)


class InMemorySessionStore:
    def __init__(self) -> None:
        self.stored: StoredSession | None = None
        self.unavailable: set[str] = set()
        self.calls: list[str] = []

    def _require(self, operation: str) -> None:
        self.calls.append(operation)
        if operation in self.unavailable:
            raise KeychainUnavailableError("Sin llavero en esta prueba.")

    def read(self) -> StoredSession | None:
        self._require("read")
        return self.stored

    def write(self, session: StoredSession) -> None:
        self._require("write")
        self.stored = session

    def clear(self) -> None:
        self._require("clear")
        self.stored = None


class InMemoryGatePreference:
    def __init__(self) -> None:
        self.skipped = False

    def is_skipped(self) -> bool:
        return self.skipped

    def set_skipped(self, value: bool) -> None:
        self.skipped = value


@dataclass
class AccountDoubles:
    provider: FakeIdentityProvider = field(default_factory=FakeIdentityProvider)
    store: InMemorySessionStore = field(default_factory=InMemorySessionStore)
    gate: InMemoryGatePreference = field(default_factory=InMemoryGatePreference)

    def adapters(self) -> AccountAdapters:
        return AccountAdapters(self.provider, self.store)

    def sessions(self) -> AccountSessions:
        """Cada llamada equivale a abrir ARGUS de nuevo: solo se conserva lo guardado."""
        return AccountSessions(self.provider, self.store, self.gate)
