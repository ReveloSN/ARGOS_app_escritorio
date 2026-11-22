from typing import Protocol

from argus.domain.account import AccountSession, Credentials


class IdentityProvider(Protocol):
    """Quien verifica la cuenta fuera del equipo.

    Cada método lanza AccountError con su motivo; sin red, OFFLINE. SESSION_REVOKED solo sale de
    `refresh`. Los correos llegan ya normalizados.
    """

    def sign_up(self, credentials: Credentials, display_name: str | None) -> AccountSession | None:
        """None significa que falta confirmar el correo con el código."""
        ...

    def sign_in(self, credentials: Credentials) -> AccountSession: ...

    def verify_signup(self, email: str, code: str) -> AccountSession: ...

    def verify_recovery(self, email: str, code: str) -> AccountSession:
        """Gasta el código: la sesión que devuelve es la única forma de cambiar la contraseña."""
        ...

    def refresh(self, refresh_token: str) -> AccountSession:
        """El token recibido queda gastado: usarlo otra vez revoca la sesión completa."""
        ...

    def sign_out(self, access_token: str) -> None: ...

    def request_password_reset(self, email: str) -> None: ...

    def update_password(self, access_token: str, password: str) -> None: ...
