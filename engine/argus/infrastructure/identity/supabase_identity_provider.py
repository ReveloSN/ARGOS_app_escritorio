from collections.abc import Callable
from dataclasses import dataclass, field
from http import HTTPStatus

import requests

from argus.domain.account import AccountSession, Credentials
from argus.domain.account_errors import AccountError, AccountProblem
from argus.infrastructure.identity.account_configuration import AccountConfiguration
from argus.infrastructure.identity.json_fields import Json, parse_json_object
from argus.infrastructure.identity.supabase_errors import (
    DEFAULT_RULES,
    PASSWORD_CHANGE_RULES,
    REFRESH_RULES,
    RefusalRules,
)
from argus.infrastructure.identity.supabase_sessions import (
    DISPLAY_NAME_FIELD,
    session_of,
    sign_up_session_of,
)

API_PATH = "/auth/v1"
REQUEST_TIMEOUT_SECONDS = 8
# requests.request, o un doble en las pruebas.
type HttpRequest = Callable[..., requests.Response]


@dataclass(frozen=True)
class _Call:
    path: str
    body: Json | None = field(default=None, repr=False)
    query: dict[str, str] | None = None
    access_token: str | None = field(default=None, repr=False)
    method: str = "POST"
    rules: RefusalRules = field(default_factory=lambda: DEFAULT_RULES)


def _proxies() -> dict[str, str]:
    # Sin cifrar solo se habla con este equipo: un proxy vería la contraseña. Un diccionario
    # nuevo por petición, porque requests lo completa con el entorno.
    return {"http": ""}


def _keep_headers(request: requests.PreparedRequest) -> requests.PreparedRequest:
    # Sin un `auth` propio, requests cambia Authorization por lo que haya en ~/.netrc.
    return request


class SupabaseIdentityProvider:
    """Adapter del puerto IdentityProvider con la API REST de Supabase Auth.

    Los errores se lanzan fuera de cada `except`: los de requests guardan la petición entera,
    con la contraseña dentro, y quedarían encadenados.
    """

    def __init__(
        self, configuration: AccountConfiguration, request: HttpRequest = requests.request
    ) -> None:
        self._configuration = configuration
        self._request = request

    def sign_up(self, credentials: Credentials, display_name: str | None) -> AccountSession | None:
        body: dict[str, object] = {"email": credentials.email, "password": credentials.password}
        if name := (display_name or "").strip():
            body["data"] = {DISPLAY_NAME_FIELD: name}
        return sign_up_session_of(self._read(_Call("/signup", body)))

    def sign_in(self, credentials: Credentials) -> AccountSession:
        body = {"email": credentials.email, "password": credentials.password}
        return session_of(self._read(_Call("/token", body, {"grant_type": "password"})))

    def verify_signup(self, email: str, code: str) -> AccountSession:
        body = {"type": "signup", "email": email, "token": code}
        return session_of(self._read(_Call("/verify", body)))

    def verify_recovery(self, email: str, code: str) -> AccountSession:
        body = {"type": "recovery", "email": email, "token": code}
        return session_of(self._read(_Call("/verify", body)))

    def refresh(self, refresh_token: str) -> AccountSession:
        body = {"refresh_token": refresh_token}
        call = _Call("/token", body, {"grant_type": "refresh_token"}, rules=REFRESH_RULES)
        return session_of(self._read(call))

    def sign_out(self, access_token: str) -> None:
        # `local`: salir aquí no cierra la sesión de los otros equipos.
        self._send(_Call("/logout", query={"scope": "local"}, access_token=access_token))

    def request_password_reset(self, email: str) -> None:
        self._read(_Call("/recover", {"email": email}))

    def update_password(self, access_token: str, password: str) -> None:
        call = _Call(
            "/user",
            {"password": password},
            access_token=access_token,
            method="PUT",
            rules=PASSWORD_CHANGE_RULES,
        )
        self._read(call)

    def _read(self, call: _Call) -> Json:
        body = parse_json_object(self._send(call).content)
        if body is None:
            # Por ejemplo, la página de un portal cautivo con estado 200.
            raise AccountError(AccountProblem.OFFLINE)
        return body

    def _send(self, call: _Call) -> requests.Response:
        response = self._exchange(call)
        if response is None:
            raise AccountError(AccountProblem.OFFLINE)
        if HTTPStatus.OK <= response.status_code < HTTPStatus.MULTIPLE_CHOICES:
            return response
        refusal = parse_json_object(response.content)
        raise AccountError(call.rules.problem_of(response.status_code, refusal))

    def _exchange(self, call: _Call) -> requests.Response | None:
        try:
            return self._request(
                call.method,
                f"{self._configuration.url}{API_PATH}{call.path}",
                params=call.query,
                json=call.body,
                headers=self._headers(call.access_token),
                timeout=REQUEST_TIMEOUT_SECONDS,
                allow_redirects=False,
                proxies=_proxies(),
                auth=_keep_headers,
            )
        except (requests.RequestException, OSError, ValueError):
            return None

    def _headers(self, access_token: str | None) -> dict[str, str]:
        headers = {"apikey": self._configuration.publishable_key}
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"
        return headers
