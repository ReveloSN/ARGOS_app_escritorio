from argus.domain.errors import InvalidValueError


def require_text(field: str, value: str) -> None:
    if not value.strip():
        raise InvalidValueError(f"{field} no puede estar vacío.")


def require_positive(field: str, value: int) -> None:
    if value < 1:
        raise InvalidValueError(f"{field} debe ser mayor que cero (recibido: {value}).")
