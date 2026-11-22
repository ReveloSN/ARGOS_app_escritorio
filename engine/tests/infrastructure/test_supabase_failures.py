"""Red, tiempo agotado y respuestas que no sirven: sin conexión y sin arrastrar secretos."""

import pytest
import requests

from argus.domain.account_errors import AccountProblem
from tests.infrastructure.supabase_doubles import ACCESS, PASSWORD, SESSION_BODY, ScriptedRequest
from tests.infrastructure.test_supabase_errors import CALLS, failure_of

NEEDS_JSON = [name for name in CALLS if name != "sign_out"]


@pytest.mark.parametrize("operation", NEEDS_JSON)
@pytest.mark.parametrize(
    "body",
    [b"<html>portal</html>", b"", [1, 2], b"\xff\xfe\x00", b"[" * 9000],
    ids=["html", "vacio", "lista", "bytes", "anidado"],
)
def test_a_success_that_is_not_a_json_object_is_offline(operation: str, body: object) -> None:
    assert failure_of(ScriptedRequest(200, body), operation).problem is AccountProblem.OFFLINE


@pytest.mark.parametrize("operation", ["sign_up", "sign_in", "refresh"])
@pytest.mark.parametrize(
    "change",
    [{"access_token": ""}, {"refresh_token": None}, {"user": {}}, {"user": {"id": "u"}}],
)
def test_a_session_with_missing_parts_is_offline(operation: str, change: dict[str, object]) -> None:
    request = ScriptedRequest(200, {**SESSION_BODY, **change})

    assert failure_of(request, operation).problem is AccountProblem.OFFLINE


def test_a_sign_up_that_says_nothing_is_offline() -> None:
    assert failure_of(ScriptedRequest(200, {}), "sign_up").problem is AccountProblem.OFFLINE


@pytest.mark.parametrize("operation", CALLS)
@pytest.mark.parametrize(
    "failure",
    [
        requests.ConnectionError(PASSWORD),
        requests.Timeout(PASSWORD),
        requests.exceptions.InvalidHeader(ACCESS),
        OSError("certificados"),
        UnicodeEncodeError("latin-1", PASSWORD, 0, 1, "fuera de rango"),
    ],
    ids=["red", "timeout", "cabecera", "certificados", "codificacion"],
)
def test_a_network_failure_is_offline_and_drags_nothing(operation: str, failure: Exception) -> None:
    error = failure_of(ScriptedRequest(failure=failure), operation)

    assert error.problem is AccountProblem.OFFLINE
    # Un error de requests guarda la petición entera, con la contraseña dentro.
    assert (error.__cause__, error.__context__) == (None, None)


def test_a_body_that_cannot_be_read_is_not_chained() -> None:
    error = failure_of(ScriptedRequest(200, b'{"access_token": "cortado'))

    assert (error.__cause__, error.__context__) == (None, None)


@pytest.mark.parametrize("operation", CALLS)
def test_every_request_waits_8_seconds_and_follows_no_redirect(operation: str) -> None:
    request = ScriptedRequest(503, {})

    failure_of(request, operation)

    (options,) = request.options
    assert options["timeout"] == 8
    assert options["allow_redirects"] is False
    assert str(options["url"]).startswith("https://p.example/auth/v1/")
