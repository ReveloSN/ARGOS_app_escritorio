"""Códigos de error de Supabase Auth → motivos de ARGUS."""

from collections.abc import Mapping
from dataclasses import dataclass
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
REJECTIONS_BY_CODE: dict[str, AccountProblem] = {
    "same_password": AccountProblem.SAME_PASSWORD,
    "validation_failed": AccountProblem.INVALID_VALUE,
    "email_address_invalid": AccountProblem.INVALID_VALUE,
}
# Al cambiar la contraseña, una sesión de recuperación muerta se arregla pidiendo otro código.
DEAD_RECOVERY_CODES = ("session_not_found", "session_expired", "bad_jwt")


@dataclass(frozen=True)
class RefusalRules:
    """Qué significa un rechazo según la operación.

    `known` vale con cualquier estado menor que 500. `rejected` y `unknown`, solo en un 4xx con
    JSON que no sea un 429: lo demás es falta de conexión o un límite.
    """

    known: Mapping[str, AccountProblem]
    rejected: Mapping[str, AccountProblem]
    unknown: AccountProblem

    def problem_of(self, status: int, body: Json | None) -> AccountProblem:
        if status >= HTTPStatus.INTERNAL_SERVER_ERROR:
            # Un proyecto caído o en pausa no cierra la sesión de nadie.
            return AccountProblem.OFFLINE
        code = _code_of(body or {})
        if code in self.known:
            return self.known[code]
        if status == HTTPStatus.TOO_MANY_REQUESTS:
            return AccountProblem.RATE_LIMITED
        is_rejection = body is not None and status >= HTTPStatus.BAD_REQUEST
        return self.rejected.get(code, self.unknown) if is_rejection else AccountProblem.OFFLINE


DEFAULT_RULES = RefusalRules(PROBLEMS_BY_CODE, REJECTIONS_BY_CODE, AccountProblem.SERVICE_REJECTED)
PASSWORD_CHANGE_RULES = RefusalRules(
    PROBLEMS_BY_CODE,
    {**REJECTIONS_BY_CODE, **dict.fromkeys(DEAD_RECOVERY_CODES, AccountProblem.INVALID_CODE)},
    AccountProblem.SERVICE_REJECTED,
)
# Renovar nunca pierde la sesión ni la convierte en error: lo desconocido es falta de conexión.
REFRESH_RULES = RefusalRules(
    {**PROBLEMS_BY_CODE, **dict.fromkeys(REVOCATION_CODES, AccountProblem.SESSION_REVOKED)},
    {},
    AccountProblem.OFFLINE,
)


def _code_of(body: Json) -> str:
    # Según la versión de la API, `code` es el motivo o repite el estado HTTP.
    code = body.get("code")
    if not isinstance(code, str):
        code = body.get("error_code")
    return code if isinstance(code, str) else ""
