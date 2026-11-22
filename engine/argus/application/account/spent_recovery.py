from collections.abc import Callable
from dataclasses import dataclass, field

from argus.domain.account import AccountSession


@dataclass(frozen=True)
class _SpentCode:
    email: str
    code: str = field(repr=False)
    session: AccountSession


class SpentRecovery:
    """El código de recuperación ya gastado, solo en memoria: permite repetir el cambio de
    contraseña sin pedir otro correo."""

    def __init__(self) -> None:
        self._spent: _SpentCode | None = None

    def session_for(
        self, email: str, code: str, verify: Callable[[str, str], AccountSession]
    ) -> AccountSession:
        spent = self._spent
        if spent and (spent.email, spent.code) == (email, code):
            return spent.session
        session = verify(email, code)
        self._spent = _SpentCode(email, code, session)
        return session
