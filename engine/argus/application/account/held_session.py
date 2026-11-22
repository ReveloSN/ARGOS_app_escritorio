from dataclasses import dataclass, field

from argus.domain.account import AccountSession, AccountState, AccountStatus, StoredSession


@dataclass(frozen=True)
class HeldSession:
    """La sesión en la memoria del motor; es el respaldo cuando el llavero falla."""

    stored: StoredSession | None = None
    access_token: str | None = field(default=None, repr=False)
    is_persisted: bool = True
    is_offline: bool = False
    # Se salió y el llavero no dejó borrar: reintentar debe seguir avisando.
    is_left_in_keychain: bool = False

    @property
    def is_in_keychain(self) -> bool:
        return self.is_left_in_keychain or (self.stored is not None and self.is_persisted)

    @classmethod
    def from_session(cls, session: AccountSession) -> "HeldSession":
        return cls(session.to_stored(), session.access_token)

    def to_state(self, gate_skipped: bool) -> AccountState:
        status = self._status()
        known = self.stored.account if self.stored else None
        return AccountState(
            status=status,
            account=known if status is AccountStatus.SIGNED_IN else None,
            email=known.email if known else None,
            gate_skipped=gate_skipped,
            is_offline=self.is_offline,
            is_persisted=self.is_persisted,
        )

    def _status(self) -> AccountStatus:
        if self.stored is None:
            return AccountStatus.SIGNED_OUT
        if self.stored.refresh_token is None:
            return AccountStatus.EXPIRED
        return AccountStatus.SIGNED_IN
