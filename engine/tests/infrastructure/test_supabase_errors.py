"""Una prueba por fila del mapeo de Supabase, en cada operación del puerto."""

from collections.abc import Callable

import pytest

from argus.domain.account import Credentials
from argus.domain.account_errors import AccountError, AccountProblem
from argus.infrastructure.identity.account_configuration import AccountConfiguration
from argus.infrastructure.identity.supabase_identity_provider import SupabaseIdentityProvider
from tests.infrastructure.supabase_doubles import (
    ACCESS,
    CODE,
    EMAIL,
    KEY,
    PASSWORD,
    REFRESH,
    ScriptedRequest,
)

type Call = Callable[[SupabaseIdentityProvider], object]

CREDENTIALS = Credentials(EMAIL, PASSWORD)
CALLS: dict[str, Call] = {
    "sign_up": lambda it: it.sign_up(CREDENTIALS, None),
    "sign_in": lambda it: it.sign_in(CREDENTIALS),
    "verify_signup": lambda it: it.verify_signup(EMAIL, CODE),
    "verify_recovery": lambda it: it.verify_recovery(EMAIL, CODE),
    "refresh": lambda it: it.refresh(REFRESH),
    "sign_out": lambda it: it.sign_out(ACCESS),
    "request_password_reset": lambda it: it.request_password_reset(EMAIL),
    "update_password": lambda it: it.update_password(ACCESS, PASSWORD),
}
REVOCATIONS = (
    "refresh_token_not_found",
    "refresh_token_already_used",
    "session_not_found",
    "session_expired",
    "user_not_found",
    "user_banned",
)


def failure_of(request: ScriptedRequest, operation: str = "sign_in") -> AccountError:
    provider = SupabaseIdentityProvider(AccountConfiguration("https://p.example", KEY), request)
    with pytest.raises(AccountError) as raised:
        CALLS[operation](provider)
    return raised.value


@pytest.mark.parametrize("operation", CALLS)
@pytest.mark.parametrize(
    ("answer", "problem"),
    [
        ((400, "invalid_credentials"), AccountProblem.INVALID_CREDENTIALS),
        ((400, "email_not_confirmed"), AccountProblem.EMAIL_NOT_CONFIRMED),
        ((403, "otp_expired"), AccountProblem.INVALID_CODE),
        ((422, "user_already_exists"), AccountProblem.EMAIL_TAKEN),
        ((422, "email_exists"), AccountProblem.EMAIL_TAKEN),
        ((422, "weak_password"), AccountProblem.WEAK_PASSWORD),
        ((400, "over_email_send_rate_limit"), AccountProblem.RATE_LIMITED),
        ((400, "over_request_rate_limit"), AccountProblem.RATE_LIMITED),
        ((429, "otro_motivo"), AccountProblem.RATE_LIMITED),
        ((400, "email_address_not_authorized"), AccountProblem.EMAIL_UNAVAILABLE),
        ((400, "algo_desconocido"), AccountProblem.OFFLINE),
        ((500, "unexpected_failure"), AccountProblem.OFFLINE),
        ((503, "weak_password"), AccountProblem.OFFLINE),
    ],
)
def test_each_code_becomes_its_problem(
    operation: str, answer: tuple[int, str], problem: AccountProblem
) -> None:
    status, code = answer
    request = ScriptedRequest(status, {"code": code, "message": "texto"})

    assert failure_of(request, operation).problem is problem


@pytest.mark.parametrize(
    "body",
    [
        {"code": "weak_password", "error_code": "otp_expired"},
        {"code": 422, "error_code": "weak_password", "msg": "texto"},
        {"error_code": "weak_password"},
    ],
)
def test_the_code_is_read_in_both_formats(body: object) -> None:
    assert failure_of(ScriptedRequest(422, body)).problem is AccountProblem.WEAK_PASSWORD


@pytest.mark.parametrize("body", [{"code": ["x"]}, {"code": None, "error_code": {"a": 1}}, [1]])
def test_a_code_that_is_not_text_is_offline(body: object) -> None:
    assert failure_of(ScriptedRequest(400, body)).problem is AccountProblem.OFFLINE


def test_a_sign_up_without_identities_is_a_taken_email() -> None:
    request = ScriptedRequest(200, {"id": "oculto", "email": EMAIL, "identities": []})

    assert failure_of(request, "sign_up").problem is AccountProblem.EMAIL_TAKEN


@pytest.mark.parametrize("operation", CALLS)
@pytest.mark.parametrize("code", REVOCATIONS)
def test_only_a_refresh_says_the_session_was_revoked(operation: str, code: str) -> None:
    problem = failure_of(ScriptedRequest(400, {"code": code}), operation).problem

    revokes = operation == "refresh"
    assert problem is (AccountProblem.SESSION_REVOKED if revokes else AccountProblem.OFFLINE)


@pytest.mark.parametrize("status", [500, 502, 503, 504])
def test_a_server_failure_never_revokes_the_session(status: int) -> None:
    request = ScriptedRequest(status, {"code": "session_not_found"})

    assert failure_of(request, "refresh").problem is AccountProblem.OFFLINE


def test_a_429_that_is_not_json_is_a_rate_limit() -> None:
    assert failure_of(ScriptedRequest(429, b"<html>")).problem is AccountProblem.RATE_LIMITED
