"""Errores del dominio → respuestas HTTP con un código estable que la interfaz traduce."""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from argus.domain.errors import (
    AlertNotFoundError,
    ArchivedFileMissingError,
    ArgusDomainError,
    ClosedSessionError,
    DocumentNotFoundError,
    HistoryFolderError,
    InvalidValueError,
    SessionNotFoundError,
)

UNPROCESSABLE = 422

type ErrorHandler = Callable[[Request, Exception], Awaitable[JSONResponse]]


@dataclass(frozen=True)
class ErrorResponse:
    status: int
    detail: str


ERROR_RESPONSES: dict[type[ArgusDomainError], ErrorResponse] = {
    SessionNotFoundError: ErrorResponse(404, "session_not_found"),
    AlertNotFoundError: ErrorResponse(404, "alert_not_found"),
    DocumentNotFoundError: ErrorResponse(404, "document_not_found"),
    ArchivedFileMissingError: ErrorResponse(410, "archived_file_missing"),
    ClosedSessionError: ErrorResponse(409, "session_closed"),
    InvalidValueError: ErrorResponse(422, "invalid_value"),
}


def register_error_handlers(app: FastAPI) -> None:
    for error_type, response in ERROR_RESPONSES.items():
        app.add_exception_handler(error_type, _handler_for(response))
    app.add_exception_handler(HistoryFolderError, _history_folder_handler)


async def _history_folder_handler(_request: Request, error: Exception) -> JSONResponse:
    # El motivo («folder_not_writable», «folder_has_history»…) elige el mensaje en la interfaz.
    problem = error.problem if isinstance(error, HistoryFolderError) else "invalid_value"
    return JSONResponse({"detail": problem}, status_code=UNPROCESSABLE)


def _handler_for(response: ErrorResponse) -> ErrorHandler:
    async def handle(_request: Request, _error: Exception) -> JSONResponse:
        return JSONResponse({"detail": response.detail}, status_code=response.status)

    return handle
