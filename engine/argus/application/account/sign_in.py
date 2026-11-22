from argus.application.account.account_sessions import AccountSessions
from argus.domain.account import AccountState, Credentials


class SignIn:
    def __init__(self, sessions: AccountSessions) -> None:
        self._sessions = sessions

    def execute(self, credentials: Credentials) -> AccountState:
        session = self._sessions.require_provider().sign_in(credentials)
        return self._sessions.start(session)
