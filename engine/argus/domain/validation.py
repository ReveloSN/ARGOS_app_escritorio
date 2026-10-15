from datetime import datetime

from argus.domain.errors import InvalidValueError


def require_text(field: str, value: str) -> None:
    if not value.strip():
        raise InvalidValueError(f"{field} no puede estar vacío.")


def require_positive(field: str, value: int) -> None:
    if value < 1:
        raise InvalidValueError(f"{field} debe ser mayor que cero (recibido: {value}).")


def require_time_zone(field: str, value: datetime) -> None:
    # Sin zona horaria, una revisión guardada en un equipo y abierta en otro mediría mal.
    if value.tzinfo is None:
        raise InvalidValueError(f"{field} debe incluir la zona horaria.")
