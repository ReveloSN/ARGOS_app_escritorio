from contextlib import suppress
from dataclasses import replace
from threading import Lock

from argus.application.account.held_session import HeldSession
from argus.application.account.session_renewal import request_renewal
from argus.application.account.spent_recovery import SpentRecovery
from argus.application.ports.account_storage import GatePreference, SessionStore
from argus.application.ports.identity_provider import IdentityProvider
from argus.domain.account import AccountSession, AccountState, AccountStatus
from argus.domain.account_errors import AccountError, AccountProblem
from argus.domain.errors import KeychainUnavailableError


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
        """Olvida la sesión siempre. Si estaba en el llavero y no se deja borrar, lanza
        KeychainUnavailableError."""
        with self._state_lock:
            was_saved = self._load().is_in_keychain
            self._held = HeldSession(is_persisted=False, is_left_in_keychain=was_saved)
            self._recovery = SpentRecovery()
            try:
                self._clear_saved(was_saved)
            finally:
                self._gate.set_skipped(False)

    def _clear_saved(self, was_saved: bool) -> None:
        try:
            self._store.clear()
        except KeychainUnavailableError:
            # La que solo vivía en memoria ya se olvidó: no hay de qué avisar.
            if was_saved:
                raise
        else:
            self._held = HeldSession()

    def _snapshot(self) -> HeldSession:
        with self._state_lock:
            return self._load()

    def _load(self) -> HeldSession:
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
            outcome = request_renewal(provider, started_from)
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
        try:
            self._store.write(held.stored)
        except KeychainUnavailableError:
            # Lo que quedó es de otra cuenta o un token gastado: no debe volver al reabrir.
            with suppress(KeychainUnavailableError):
                self._store.clear()
        else:
            self._held = replace(held, is_persisted=True)
