from enum import StrEnum

from argus.domain.errors import ArgusDomainError


class AccountProblem(StrEnum):
    """Por qué falló una operación de la cuenta; la interfaz lo traduce a un mensaje de 3 partes."""

    INVALID_CREDENTIALS = "invalid_credentials"
    EMAIL_NOT_CONFIRMED = "email_not_confirmed"
    INVALID_CODE = "invalid_code"
    EMAIL_TAKEN = "email_taken"
    WEAK_PASSWORD = "weak_password"
    SAME_PASSWORD = "same_password"
    INVALID_VALUE = "invalid_value"
    RATE_LIMITED = "rate_limited"
    EMAIL_UNAVAILABLE = "email_unavailable"
    OFFLINE = "offline"
    # Hay conexión: el servicio respondió que no, por un motivo sin mensaje propio.
    SERVICE_REJECTED = "service_rejected"
    ACCOUNT_UNAVAILABLE = "account_unavailable"
    # Interno: solo sale de una renovación, y la cuenta lo informa como sesión vencida.
    SESSION_REVOKED = "session_revoked"


class AccountError(ArgusDomainError):
    """El mensaje solo lleva el motivo: nunca la contraseña, el código ni los tokens."""

    def __init__(self, problem: AccountProblem) -> None:
        super().__init__(f"No se pudo completar la operación de la cuenta: {problem}.")
        self.problem = problem
