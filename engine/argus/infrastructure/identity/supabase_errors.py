"""Códigos de error de Supabase Auth → motivos de ARGUS."""

from http import HTTPStatus

from argus.domain.account_errors import AccountProblem
from argus.infrastructure.identity.json_fields import Json

PROBLEMS_BY_CODE: dict[str, AccountProblem] = {
    "invalid_credentials": AccountProblem.INVALID_CREDENTIALS,
    "email_not_confirmed": AccountProblem.EMAIL_NOT_CONFIRMED,
    "otp_expired": AccountProblem.INVALID_CODE,
    "user_already_exists": AccountProblem.EMAIL_TAKEN,
    "email_exists": AccountProblem.EMAIL_TAKEN,
    "weak_password": AccountProblem.WEAK_PASSWORD,
    "over_email_send_rate_limit": AccountProblem.RATE_LIMITED,
    "over_request_rate_limit": AccountProblem.RATE_LIMITED,
    "email_address_not_authorized": AccountProblem.EMAIL_UNAVAILABLE,
}
REVOCATION_CODES = frozenset(
    {
        "refresh_token_not_found",
        "refresh_token_already_used",
        "session_not_found",
        "session_expired",
        "user_not_found",
        "user_banned",
    }
)


def problem_of(status: int, body: Json, can_revoke: bool) -> AccountProblem:
    if status >= HTTPStatus.INTERNAL_SERVER_ERROR:
        # Un proyecto caído o en pausa no cierra la sesión de nadie.
        return AccountProblem.OFFLINE
    code = _code_of(body)
    if can_revoke and code in REVOCATION_CODES:
        return AccountProblem.SESSION_REVOKED
    is_limited = status == HTTPStatus.TOO_MANY_REQUESTS
    unknown = AccountProblem.RATE_LIMITED if is_limited else AccountProblem.OFFLINE
    return PROBLEMS_BY_CODE.get(code, unknown)


def _code_of(body: Json) -> str:
    # Según la versión de la API, `code` es el motivo o repite el estado HTTP.
    code = body.get("code")
    if not isinstance(code, str):
        code = body.get("error_code")
    return code if isinstance(code, str) else ""
