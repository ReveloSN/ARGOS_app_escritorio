from dataclasses import dataclass, replace
from datetime import datetime, timedelta
from enum import StrEnum
from uuid import uuid4

from argus.domain.errors import InvalidValueError
from argus.domain.validation import require_text, require_time_zone


class SessionStatus(StrEnum):
    """Estados del historial de los mockups: «En curso», «Cerrada», «Sin inconsistencias»."""

    IN_PROGRESS = "in_progress"
    CLOSED = "closed"
    NO_INCONSISTENCIES = "no_inconsistencies"


@dataclass(frozen=True)
class NewReviewSession:
    """Lo que se sabe al iniciar una revisión, antes de tener identificador y fechas."""

    name: str
    document_names: tuple[str, ...]
    alert_count: int


@dataclass(frozen=True)
class ReviewSession:
    """Una revisión: los archivos que se compararon, cuántas alertas dio y cuándo se cerró."""

    id: str
    name: str
    document_names: tuple[str, ...]
    created_at: datetime
    alert_count: int
    closed_at: datetime | None = None

    def __post_init__(self) -> None:
        require_text("El nombre de la sesión", self.name)
        require_time_zone("La fecha de inicio", self.created_at)
        if self.closed_at is not None and self.closed_at < self.created_at:
            raise InvalidValueError("Una sesión no puede cerrarse antes de empezar.")

    @classmethod
    def start(cls, new_session: NewReviewSession, started_at: datetime) -> "ReviewSession":
        return cls(
            uuid4().hex,
            new_session.name,
            new_session.document_names,
            started_at,
            new_session.alert_count,
        )

    @property
    def status(self) -> SessionStatus:
        if self.closed_at is None:
            return SessionStatus.IN_PROGRESS
        return SessionStatus.CLOSED if self.alert_count else SessionStatus.NO_INCONSISTENCIES

    @property
    def review_duration(self) -> timedelta | None:
        """Tiempo desde cargar hasta cerrar, la métrica de eficiencia del historial."""
        return None if self.closed_at is None else self.closed_at - self.created_at

    def close(self, closed_at: datetime) -> "ReviewSession":
        require_time_zone("La fecha de cierre", closed_at)
        return replace(self, closed_at=closed_at)
