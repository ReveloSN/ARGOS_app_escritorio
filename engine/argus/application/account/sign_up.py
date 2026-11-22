from dataclasses import dataclass

from argus.application.account.account_sessions import AccountSessions
from argus.domain.account import AccountState, Credentials, normalize_email


@dataclass(frozen=True)
class SignUpResult:
    state: AccountState
    needs_confirmation: bool


class SignUp:
    """Crear la cuenta; con la confirmación por correo apagada, entra directo."""

    def __init__(self, sessions: AccountSessions) -> None:
        self._sessions = sessions

    def execute(self, credentials: Credentials, display_name: str | None = None) -> SignUpResult:
        session = self._sessions.require_provider().sign_up(credentials, display_name)
        if session is None:
            return SignUpResult(self._sessions.current(), needs_confirmation=True)
        return SignUpResult(self._sessions.start(session), needs_confirmation=False)

    def verify(self, email: str, code: str) -> AccountState:
        session = self._sessions.require_provider().verify_signup(normalize_email(email), code)
        return self._sessions.start(session)
