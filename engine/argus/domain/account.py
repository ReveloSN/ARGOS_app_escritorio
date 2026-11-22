from dataclasses import dataclass, field
from enum import StrEnum


class AccountStatus(StrEnum):
    UNAVAILABLE = "unavailable"
    SIGNED_OUT = "signed_out"
    SIGNED_IN = "signed_in"
    EXPIRED = "expired"


def normalize_email(email: str) -> str:
    return email.strip().lower()


@dataclass(frozen=True)
class Account:
    id: str
    email: str
    display_name: str | None


@dataclass(frozen=True)
class Credentials:
    email: str
    password: str = field(repr=False)

    def __post_init__(self) -> None:
        # La contraseña no se toca: sus espacios y mayúsculas cuentan.
        object.__setattr__(self, "email", normalize_email(self.email))


@dataclass(frozen=True)
class StoredSession:
    """Lo único que va al llavero. Sin token de renovación, la sesión está vencida."""

    account: Account
    refresh_token: str | None = field(repr=False)


@dataclass(frozen=True)
class AccountSession:
    account: Account
    access_token: str = field(repr=False)
    refresh_token: str = field(repr=False)

    def to_stored(self) -> StoredSession:
        return StoredSession(self.account, self.refresh_token)


@dataclass(frozen=True)
class AccountState:
    """Lo que se puede mostrar de la cuenta: nunca lleva tokens.

    Vencida no tiene `account`: solo conserva `email`, para rellenar el formulario.
    """

    status: AccountStatus
    account: Account | None = None
    email: str | None = None
    gate_skipped: bool = False
    is_offline: bool = False
    is_persisted: bool = True
