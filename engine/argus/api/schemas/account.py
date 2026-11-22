"""La cuenta (ADR 033): estado y formularios. Ninguna respuesta lleva contraseña ni tokens."""

from typing import Annotated

from pydantic import Field, StringConstraints

from argus.api.schemas.review import CamelModel
from argus.domain.account import AccountStatus

MAX_EMAIL_CHARACTERS = 320
MAX_PASSWORD_CHARACTERS = 1024
MAX_CODE_CHARACTERS = 64
MAX_NAME_CHARACTERS = 200

Email = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_EMAIL_CHARACTERS)
]
# La contraseña no se recorta: sus espacios cuentan.
Password = Annotated[str, Field(min_length=1, max_length=MAX_PASSWORD_CHARACTERS, repr=False)]
Code = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_CODE_CHARACTERS),
    Field(repr=False),
]
DisplayName = Annotated[str, StringConstraints(max_length=MAX_NAME_CHARACTERS)]


class AccountResponse(CamelModel):
    id: str
    email: str
    display_name: str | None


class AccountStateResponse(CamelModel):
    status: AccountStatus
    account: AccountResponse | None
    # Para rellenar el formulario si la sesión venció.
    email: str | None
    gate_skipped: bool
    is_offline: bool
    # False: sin llavero, la sesión dura mientras la app esté abierta.
    is_persisted: bool


class SignUpResponse(CamelModel):
    state: AccountStateResponse
    needs_confirmation: bool


class EmailBody(CamelModel):
    email: Email


class SignInBody(EmailBody):
    password: Password


class SignUpBody(SignInBody):
    display_name: DisplayName | None = None


class VerifyBody(EmailBody):
    code: Code


class PasswordResetBody(SignInBody):
    code: Code
