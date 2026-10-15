from secrets import compare_digest

from starlette.datastructures import Headers
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

AUTHORIZATION_HEADER = "authorization"
BEARER_PREFIX = "Bearer "
UNAUTHORIZED_STATUS = 401
UNAUTHORIZED_DETAIL = "missing_or_invalid_token"


class AccessTokenMiddleware:
    """Rechaza peticiones sin el token de esta ejecución: solo la app que lanzó el motor lo usa.

    Es ASGI puro (no BaseHTTPMiddleware) para no interferir con las respuestas en streaming (SSE).
    """

    def __init__(self, app: ASGIApp, access_token: str) -> None:
        self._app = app
        self._expected_header = f"{BEARER_PREFIX}{access_token}".encode()

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or self._is_authorized(scope):
            await self._app(scope, receive, send)
            return
        response = JSONResponse({"detail": UNAUTHORIZED_DETAIL}, status_code=UNAUTHORIZED_STATUS)
        await response(scope, receive, send)

    def _is_authorized(self, scope: Scope) -> bool:
        received = Headers(scope=scope).get(AUTHORIZATION_HEADER, "")
        return compare_digest(received.encode("utf-8", "surrogateescape"), self._expected_header)
