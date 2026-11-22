from dataclasses import replace

from argus.application.account.held_session import HeldSession
from argus.application.ports.identity_provider import IdentityProvider
from argus.domain.account import StoredSession
from argus.domain.account_errors import AccountError, AccountProblem


def request_renewal(provider: IdentityProvider, held: HeldSession) -> HeldSession:
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
