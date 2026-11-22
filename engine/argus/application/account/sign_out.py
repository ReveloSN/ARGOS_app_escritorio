from contextlib import suppress

from argus.application.account.account_sessions import AccountSessions
from argus.application.ports.identity_provider import IdentityProvider
from argus.domain.account import AccountState
from argus.domain.account_errors import AccountError


class SignOut:
    """Primero sale del equipo y después avisa al proveedor: no necesita internet."""

    def __init__(self, sessions: AccountSessions) -> None:
        self._sessions = sessions

    def execute(self) -> AccountState:
        provider = self._sessions.require_provider()
        access_token = self._sessions.access_token()
        try:
            self._sessions.end()
        finally:
            # También si el llavero falló: revocar inutiliza el token que haya quedado.
            if access_token:
                _revoke(provider, access_token)
        return self._sessions.current()


def _revoke(provider: IdentityProvider, access_token: str) -> None:
    # Sin red o con la sesión ya revocada, salir del equipo es suficiente.
    with suppress(AccountError):
        provider.sign_out(access_token)
