from contextlib import suppress

from argus.application.account.account_sessions import AccountSessions
from argus.application.account.held_session import HeldSession
from argus.application.ports.identity_provider import IdentityProvider
from argus.domain.account import AccountState
from argus.domain.account_errors import AccountError


class SignOut:
    """Primero sale del equipo y después avisa al proveedor: no necesita internet."""

    def __init__(self, sessions: AccountSessions) -> None:
        self._sessions = sessions

    def execute(self) -> AccountState:
        provider = self._sessions.require_provider()
        # Recibe la sesión tal como estaba al salir, también si el llavero falló al borrarla.
        self._sessions.end(lambda ended: _revoke(provider, ended))
        return self._sessions.current()


def _revoke(provider: IdentityProvider, ended: HeldSession) -> None:
    access_token = _renewed_access_token(provider, ended) or ended.access_token
    if access_token:
        # Sin red o con la sesión ya revocada, salir del equipo es suficiente.
        with suppress(AccountError):
            provider.sign_out(access_token)


def _renewed_access_token(provider: IdentityProvider, ended: HeldSession) -> str | None:
    # El de acceso dura una hora. La sesión renovada solo sirve para revocar: nunca se guarda.
    refresh_token = ended.stored.refresh_token if ended.stored else None
    if refresh_token:
        with suppress(AccountError):
            return provider.refresh(refresh_token).access_token
    return None
