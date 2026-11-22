"""Rechazos que no son falta de conexión, y la guarda de la renovación, que nunca pierde sesiones.

Los motivos se comparan por su valor, que es el `detail` que recibe la interfaz.
"""

import pytest

from tests.infrastructure.supabase_doubles import ScriptedRequest
from tests.infrastructure.test_supabase_errors import CALLS, REVOCATIONS, failure_of

OUTSIDE_REFRESH = [name for name in CALLS if name != "refresh"]
OUTSIDE_PASSWORD_CHANGE = [name for name in OUTSIDE_REFRESH if name != "update_password"]
DEAD_RECOVERY = ("session_not_found", "session_expired", "bad_jwt")
NEW_CODES = ("same_password", "validation_failed", "email_address_invalid", "bad_jwt")


@pytest.mark.parametrize("operation", OUTSIDE_REFRESH)
@pytest.mark.parametrize(
    ("code", "problem"),
    [
        ("same_password", "same_password"),
        ("validation_failed", "invalid_value"),
        ("email_address_invalid", "invalid_value"),
        ("signup_disabled", "service_rejected"),
    ],
)
def test_a_rejection_has_its_own_problem(operation: str, code: str, problem: str) -> None:
    request = ScriptedRequest(422, {"code": code})

    assert failure_of(request, operation).problem.value == problem


@pytest.mark.parametrize("code", DEAD_RECOVERY)
def test_a_dead_recovery_session_asks_for_a_new_code(code: str) -> None:
    request = ScriptedRequest(403, {"code": code})

    assert failure_of(request, "update_password").problem.value == "invalid_code"


@pytest.mark.parametrize("operation", OUTSIDE_PASSWORD_CHANGE)
@pytest.mark.parametrize("code", DEAD_RECOVERY)
def test_only_a_password_change_asks_for_a_new_code(operation: str, code: str) -> None:
    request = ScriptedRequest(403, {"code": code})

    assert failure_of(request, operation).problem.value == "service_rejected"


@pytest.mark.parametrize("code", sorted(set(REVOCATIONS) - set(DEAD_RECOVERY)))
def test_the_other_revocations_reject_a_password_change(code: str) -> None:
    request = ScriptedRequest(403, {"code": code})

    assert failure_of(request, "update_password").problem.value == "service_rejected"


@pytest.mark.parametrize("operation", OUTSIDE_REFRESH)
@pytest.mark.parametrize("status", [400, 401, 403, 404, 422, 499])
def test_a_json_4xx_without_a_code_is_rejected(operation: str, status: int) -> None:
    # Así responde la puerta de enlace de Supabase con una clave publicable incorrecta.
    request = ScriptedRequest(status, {"message": "Invalid API key"})

    assert failure_of(request, operation).problem.value == "service_rejected"


@pytest.mark.parametrize("code", [*NEW_CODES, "signup_disabled", ""])
@pytest.mark.parametrize("status", [400, 401, 403, 422])
def test_a_refresh_keeps_every_unknown_rejection_offline(status: int, code: str) -> None:
    request = ScriptedRequest(status, {"code": code})

    assert failure_of(request, "refresh").problem.value == "offline"


@pytest.mark.parametrize("operation", CALLS)
@pytest.mark.parametrize("code", NEW_CODES)
@pytest.mark.parametrize(
    "answer", [(302, "offline"), (429, "rate_limited"), (500, "offline"), (503, "offline")]
)
def test_redirects_limits_and_server_failures_do_not_change(
    operation: str, code: str, answer: tuple[int, str]
) -> None:
    status, problem = answer

    assert failure_of(ScriptedRequest(status, {"code": code}), operation).problem.value == problem


@pytest.mark.parametrize("operation", CALLS)
@pytest.mark.parametrize(
    "body", [b"<html>bloqueado</html>", b"", [1]], ids=["html", "vacio", "lista"]
)
def test_a_4xx_that_is_not_a_json_object_is_still_offline(operation: str, body: object) -> None:
    assert failure_of(ScriptedRequest(403, body), operation).problem.value == "offline"
