from collections.abc import Callable, Coroutine
from typing import Any

from fastapi import Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from starlette.exceptions import HTTPException

from argus.api.error_handlers import ERROR_RESPONSES
from argus.domain.errors import InvalidValueError


class SecretSafeRoute(APIRoute):
    """Para rutas que reciben contraseñas o códigos: el 422 de FastAPI copia lo recibido.

    Va en el router y no por ruta: una ruta nueva del router queda cubierta sin acordarse.
    """

    def get_route_handler(self) -> Callable[[Request], Coroutine[Any, Any, Response]]:
        handle = super().get_route_handler()
        refusal = ERROR_RESPONSES[InvalidValueError]

        async def handle_without_echo(request: Request) -> Response:
            try:
                return await handle(request)
            except (RequestValidationError, HTTPException):
                # HTTPException es el cuerpo que FastAPI no pudo decodificar. Ambos errores lo
                # llevan dentro: aquí mueren, sin responderlo, registrarlo ni encadenarlo.
                return JSONResponse({"detail": refusal.detail}, status_code=refusal.status)

        return handle_without_echo
