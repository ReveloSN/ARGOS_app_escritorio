"""Respuestas de Supabase Auth → la sesión del dominio."""

from argus.domain.account import Account, AccountSession
from argus.domain.account_errors import AccountError, AccountProblem
from argus.infrastructure.identity.json_fields import Json, as_json_object, text_in

DISPLAY_NAME_FIELD = "display_name"


def session_of(body: Json) -> AccountSession:
    access, refresh = text_in(body, "access_token"), text_in(body, "refresh_token")
    user = as_json_object(body.get("user"))
    account_id, email = text_in(user, "id"), text_in(user, "email")
    if not (access and refresh and account_id and email):
        raise AccountError(AccountProblem.OFFLINE)
    name = text_in(as_json_object(user.get("user_metadata")), DISPLAY_NAME_FIELD)
    return AccountSession(Account(account_id, email, name), access, refresh)


def sign_up_session_of(body: Json) -> AccountSession | None:
    if "access_token" in body:
        return session_of(body)
    # Con la confirmación activa, Supabase disimula un correo ya registrado con esta lista vacía.
    if body.get("identities") == []:
        raise AccountError(AccountProblem.EMAIL_TAKEN)
    if text_in(body, "id"):
        return None
    raise AccountError(AccountProblem.OFFLINE)
