"""Errores del dominio → respuestas HTTP con un código estable que la interfaz traduce."""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from argus.domain.account_errors import AccountError, AccountProblem
from argus.domain.errors import (
    AlertNotFoundError,
    ArchivedFileMissingError,
    ArgusDomainError,
    ClosedSessionError,
    ComparisonItemNotFoundError,
    ComparisonNotFoundError,
    DocumentNotFoundError,
    FactNotFoundError,
    HistoryFolderError,
    InvalidOcrCredentialsError,
    InvalidValueError,
    KeychainUnavailableError,
    NotADraftEmailError,
    NotEnoughDocumentsError,
    ReportNotFoundError,
    SendIssueNotFoundError,
    SendReviewNotFoundError,
    SessionNotFoundError,
    UnreadableDocumentError,
    UnrecognizedFactValueError,
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
    ComparisonNotFoundError: ErrorResponse(404, "comparison_not_found"),
    ComparisonItemNotFoundError: ErrorResponse(404, "comparison_item_not_found"),
    NotEnoughDocumentsError: ErrorResponse(422, "not_enough_documents"),
    FactNotFoundError: ErrorResponse(404, "fact_not_found"),
    UnrecognizedFactValueError: ErrorResponse(422, "unrecognized_fact_value"),
    SendReviewNotFoundError: ErrorResponse(404, "send_review_not_found"),
    SendIssueNotFoundError: ErrorResponse(404, "send_issue_not_found"),
    NotADraftEmailError: ErrorResponse(422, "not_a_draft_email"),
    ReportNotFoundError: ErrorResponse(404, "report_not_found"),
    KeychainUnavailableError: ErrorResponse(503, "keychain_unavailable"),
    InvalidOcrCredentialsError: ErrorResponse(422, "invalid_credentials"),
    # Solo llega hasta aquí el borrador de «Revisar antes de enviar»: en una revisión, un
    # archivo ilegible se informa sin detener el resto.
    UnreadableDocumentError: ErrorResponse(422, "unreadable_draft"),
}

# En la cuenta el detalle es el motivo. `invalid_credentials` se repite con el OCR a propósito: la
# interfaz traduce por función. SESSION_REVOKED no está porque nunca sale por HTTP.
ACCOUNT_ERROR_STATUS: dict[AccountProblem, int] = {
    AccountProblem.INVALID_CREDENTIALS: 401,
    AccountProblem.EMAIL_NOT_CONFIRMED: 403,
    AccountProblem.INVALID_CODE: 422,
    AccountProblem.EMAIL_TAKEN: 409,
    AccountProblem.WEAK_PASSWORD: 422,
    AccountProblem.RATE_LIMITED: 429,
    AccountProblem.EMAIL_UNAVAILABLE: 503,
    AccountProblem.OFFLINE: 503,
    AccountProblem.ACCOUNT_UNAVAILABLE: 409,
}


def register_error_handlers(app: FastAPI) -> None:
    for error_type, response in ERROR_RESPONSES.items():
        app.add_exception_handler(error_type, _handler_for(response))
    app.add_exception_handler(HistoryFolderError, _history_folder_handler)
    app.add_exception_handler(AccountError, _account_error_handler)


async def _history_folder_handler(_request: Request, error: Exception) -> JSONResponse:
    # El motivo («folder_not_writable», «folder_has_history»…) elige el mensaje en la interfaz.
    problem = error.problem if isinstance(error, HistoryFolderError) else "invalid_value"
    return JSONResponse({"detail": problem}, status_code=UNPROCESSABLE)


async def _account_error_handler(_request: Request, error: Exception) -> JSONResponse:
    problem = error.problem if isinstance(error, AccountError) else AccountProblem.OFFLINE
    if problem not in ACCOUNT_ERROR_STATUS:
        problem = AccountProblem.OFFLINE
    return JSONResponse({"detail": problem}, status_code=ACCOUNT_ERROR_STATUS[problem])


def _handler_for(response: ErrorResponse) -> ErrorHandler:
    async def handle(_request: Request, _error: Exception) -> JSONResponse:
        return JSONResponse({"detail": response.detail}, status_code=response.status)

    return handle
