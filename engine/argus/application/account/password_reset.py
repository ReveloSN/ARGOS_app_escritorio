from argus.application.account.account_sessions import AccountSessions
from argus.domain.account import AccountState, normalize_email


class PasswordReset:
    """Pedir el código por correo y cambiar la contraseña con él."""

    def __init__(self, sessions: AccountSessions) -> None:
        self._sessions = sessions

    def request(self, email: str) -> None:
        self._sessions.require_provider().request_password_reset(normalize_email(email))

    def confirm(self, email: str, code: str, password: str) -> AccountState:
        provider = self._sessions.require_provider()
        # Se toma antes de usar la red: cerrar sesión lo reemplaza y este queda sin efecto.
        recovery = self._sessions.recovery
        session = recovery.session_for(normalize_email(email), code, provider.verify_recovery)
        provider.update_password(session.access_token, password)
        return self._sessions.finish_recovery(session, recovery)
