"""Supabase de mentira: un doble de `requests.request` y un servidor en 127.0.0.1."""

import json
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, HTTPServer
from threading import Thread
from types import SimpleNamespace
from typing import cast
from urllib.parse import parse_qs, urlsplit

import requests

KEY = "sb_publishable_clave-de-prueba"
EMAIL = "ana@example.com"
# ASCII y sin símbolos: json y las URL escapan el resto y la búsqueda no lo encontraría.
PASSWORD = "contrasena-privada-7f3a"
CODE = "80417236"
ACCESS = "acceso-secreto"
REFRESH = "renovacion-secreta"
USER: dict[str, object] = {"id": "user-1", "email": EMAIL, "user_metadata": {"display_name": "Ana"}}
SESSION_BODY: dict[str, object] = {
    "access_token": ACCESS,
    "token_type": "bearer",
    "expires_in": 3600,
    "refresh_token": REFRESH,
    "user": USER,
}
UNCONFIRMED: dict[str, object] = {"id": "user-1", "email": EMAIL, "identities": [{"id": "i-1"}]}


def encoded(body: object) -> bytes:
    return body if isinstance(body, bytes) else json.dumps(body).encode()


class ScriptedRequest:
    """Sustituye a requests.request: anota la petición y responde o falla como se le diga."""

    def __init__(
        self, status: int = 200, body: object = SESSION_BODY, failure: Exception | None = None
    ) -> None:
        self.status = status
        self.body = body
        self.failure = failure
        self.options: list[dict[str, object]] = []

    def __call__(self, method: str, url: str, **options: object) -> requests.Response:
        self.options.append({"method": method, "url": url, **options})
        if self.failure:
            raise self.failure
        response = SimpleNamespace(status_code=self.status, content=encoded(self.body))
        return cast(requests.Response, response)


@dataclass(frozen=True)
class Received:
    method: str
    path: str
    query: dict[str, list[str]]
    headers: dict[str, str]
    body: object


@dataclass
class LoopbackSupabase:
    url: str = ""
    status: int = 200
    body: object = field(default_factory=lambda: dict(SESSION_BODY))
    location: str | None = None
    received: list[Received] = field(default_factory=list)

    def answer(self, status: int, body: object) -> None:
        self.status, self.body = status, body


class LoopbackServer(HTTPServer):
    def __init__(self, supabase: LoopbackSupabase) -> None:
        self.supabase = supabase
        super().__init__(("127.0.0.1", 0), LoopbackHandler)


class LoopbackHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        supabase = cast(LoopbackServer, self.server).supabase
        supabase.received.append(self._received())
        content = encoded(supabase.body)
        self.send_response(supabase.status)
        if supabase.location:
            self.send_header("Location", supabase.location)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self) -> None:
        self.do_GET()

    def do_PUT(self) -> None:
        self.do_GET()

    def _received(self) -> Received:
        sent = self.rfile.read(int(self.headers.get("content-length") or 0))
        target = urlsplit(self.path)
        headers = {name.lower(): value for name, value in self.headers.items()}
        body = json.loads(sent) if sent else None
        return Received(self.command, target.path, parse_qs(target.query), headers, body)

    def log_message(self, *_arguments: object) -> None:
        return


@contextmanager
def loopback_supabase() -> Iterator[LoopbackSupabase]:
    supabase = LoopbackSupabase()
    with LoopbackServer(supabase) as server:
        supabase.url = f"http://127.0.0.1:{server.server_port}"
        serving = Thread(target=lambda: server.serve_forever(0.02), daemon=True)
        serving.start()
        try:
            yield supabase
        finally:
            server.shutdown()
            serving.join()
