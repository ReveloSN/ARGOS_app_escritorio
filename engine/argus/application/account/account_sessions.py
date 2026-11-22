from contextlib import suppress
from dataclasses import replace
from threading import Lock

from argus.application.account.held_session import HeldSession
from argus.application.account.spent_recovery import SpentRecovery
from argus.application.ports.account_storage import GatePreference, SessionStore
from argus.application.ports.identity_provider import IdentityProvider
from argus.domain.account import AccountSession, AccountState, AccountStatus, StoredSession
from argus.domain.errors import AccountError, AccountProblem, KeychainUnavailableError


class AccountSessions:
    """La única dueña de la sesión: debe haber una por motor.

    El candado de estado nunca se retiene durante una llamada a la red, así `current()` no espera
    a internet. Cada cambio crea otro HeldSession y se compara por identidad: así una renovación
    sabe si alguien salió, entró o renovó mientras ella esperaba.
    """

    def __init__(
        self, provider: IdentityProvider | None, store: SessionStore, gate: GatePreference
    ) -> None:
        self._provider = provider
        self._store = store
        self._gate = gate
        self._state_lock = Lock()
        self._refresh_lock = Lock()
        self._held: HeldSession | None = None
        self._recovery = SpentRecovery()

    @property
    def recovery(self) -> SpentRecovery:
        return self._recovery

    def require_provider(self) -> IdentityProvider:
        if self._provider is None:
            raise AccountError(AccountProblem.ACCOUNT_UNAVAILABLE)
        return self._provider

    def current(self) -> AccountState:
        if self._provider is None:
            return AccountState(AccountStatus.UNAVAILABLE, gate_skipped=self._gate.is_skipped())
        return self._snapshot().to_state(self._gate.is_skipped())

    def access_token(self) -> str | None:
        return self._snapshot().access_token

    def skip(self) -> AccountState:
        self.require_provider()
        self._gate.set_skipped(True)
        return self.current()

    def refresh(self) -> AccountState:
        provider = self.require_provider()
        started_from = self._snapshot()
        with self._refresh_lock:
            if self._is_unchanged(started_from):
                self._renew(provider, started_from)
        return self.current()

    def start(self, session: AccountSession) -> AccountState:
        with self._state_lock:
            self._save(HeldSession.from_session(session))
        return self.current()

    def finish_recovery(self, session: AccountSession, recovery: SpentRecovery) -> AccountState:
        with self._state_lock:
            # Si alguien cerró sesión durante el cambio de contraseña, gana la salida.
            if recovery is self._recovery:
                self._recovery = SpentRecovery()
                self._save(HeldSession.from_session(session))
        return self.current()

    def end(self) -> None:
        """Olvida la sesión aunque el llavero falle; en ese caso lanza KeychainUnavailableError."""
        with self._state_lock:
            self._held = HeldSession(is_persisted=False)
            self._recovery = SpentRecovery()
            try:
                self._store.clear()
            finally:
                self._gate.set_skipped(False)
            self._held = HeldSession()

    def _snapshot(self) -> HeldSession:
        with self._state_lock:
            if self._held is not None:
                return self._held
            try:
                stored = self._store.read()
            except KeychainUnavailableError:
                # No se recuerda el fallo: el llavero puede volver sin reabrir ARGUS.
                return HeldSession(is_persisted=False)
            self._held = HeldSession(stored)
            return self._held

    def _is_unchanged(self, seen: HeldSession) -> bool:
        with self._state_lock:
            return self._held is seen

    def _renew(self, provider: IdentityProvider, started_from: HeldSession) -> None:
        # También un fallo cuenta como cambio: quien esperaba no repite el mismo token.
        outcome = replace(started_from)
        try:
            outcome = _request_renewal(provider, started_from)
        finally:
            self._replace_if_unchanged(started_from, outcome)

    def _replace_if_unchanged(self, seen: HeldSession, outcome: HeldSession) -> None:
        with self._state_lock:
            if self._held is not seen:
                return
            if outcome.stored is seen.stored:
                self._held = outcome
            else:
                self._save(outcome)

    def _save(self, held: HeldSession) -> None:
        # Primero en memoria: si el llavero falla, el token anterior ya no sirve.
        self._held = replace(held, is_persisted=False)
        if held.stored is None:
            return
        with suppress(KeychainUnavailableError):
            self._store.write(held.stored)
            self._held = replace(held, is_persisted=True)


def _request_renewal(provider: IdentityProvider, held: HeldSession) -> HeldSession:
    stored = held.stored
    if stored is None or stored.refresh_token is None:
        return held
    try:
        return HeldSession.from_session(provider.refresh(stored.refresh_token))
    except AccountError as error:
        if error.problem is AccountProblem.OFFLINE:
            return replace(held, is_offline=True)
        if error.problem is AccountProblem.SESSION_REVOKED:
            return HeldSession(StoredSession(stored.account, None))
        raise
