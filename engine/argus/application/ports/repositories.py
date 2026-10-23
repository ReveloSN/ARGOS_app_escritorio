"""Puertos de persistencia (Repository): pequeños y separados por lo que guarda cada uno."""

from collections.abc import Sequence
from datetime import datetime
from typing import Protocol

from argus.domain.alert import Alert, NumberedAlert
from argus.domain.confirmed_fact import ConfirmedFact, FactDraft
from argus.domain.decision import Decision
from argus.domain.document import NamedFragment
from argus.domain.read_outcome import DocumentReadOutcome, ReadSummary
from argus.domain.review_session import ReviewSession
from argus.domain.text_comparison.report import ComparisonReport


class SessionRepository(Protocol):
    def save(self, session: ReviewSession) -> None: ...

    def get(self, session_id: str) -> ReviewSession:
        """La sesión, o SessionNotFoundError si no existe."""
        ...

    def list_created_since(self, since: datetime) -> tuple[ReviewSession, ...]:
        """Las sesiones desde esa fecha, de la más reciente a la más antigua."""
        ...

    def list_created_before(self, moment: datetime) -> tuple[ReviewSession, ...]: ...

    def delete(self, session_id: str) -> None:
        """Borra la sesión con sus alertas, decisiones y documentos."""
        ...


class AlertRepository(Protocol):
    def save_all(self, session_id: str, alerts: Sequence[Alert]) -> tuple[NumberedAlert, ...]:
        """Guarda las alertas ya ordenadas y las numera desde 1 en ese orden."""
        ...

    def list_for(self, session_id: str) -> tuple[NumberedAlert, ...]: ...


class DecisionRepository(Protocol):
    def get(self, session_id: str, alert_number: int) -> Decision | None: ...

    def save(self, session_id: str, decision: Decision) -> None:
        """Guarda o reemplaza la decisión; AlertNotFoundError si la alerta no existe."""
        ...

    def delete(self, session_id: str, alert_number: int) -> None: ...

    def list_for(self, session_id: str) -> tuple[Decision, ...]: ...


class DocumentRepository(Protocol):
    def save_all(self, session_id: str, documents: Sequence[DocumentReadOutcome]) -> None:
        """Guarda cómo se leyó cada archivo, en orden, y el texto de los que se leyeron."""
        ...

    def list_for(self, session_id: str) -> tuple[ReadSummary, ...]: ...

    def position_of(self, session_id: str, document_name: str) -> int | None:
        """Posición del archivo leído con ese nombre, o del que lo trae como adjunto."""
        ...

    def fragments_matching(
        self, session_id: str, folded_query: str, limit: int
    ) -> tuple[NamedFragment, ...]:
        """Fragmentos cuyo texto, sin tildes ni mayúsculas, contiene la consulta ya plegada."""
        ...

    def fragments_for(self, session_id: str) -> tuple[NamedFragment, ...]:
        """Todo el texto leído de la sesión, en orden, con el archivo de cada fragmento."""
        ...


class ConfirmedFactRepository(Protocol):
    def add(self, session_id: str, draft: FactDraft, confirmed_at: datetime) -> ConfirmedFact:
        """Guarda el dato nuevo y lo devuelve con su número."""
        ...

    def get(self, session_id: str, fact_id: int) -> ConfirmedFact:
        """El dato, o FactNotFoundError si la sesión no lo tiene."""
        ...

    def save(self, session_id: str, fact: ConfirmedFact) -> None:
        """Guarda el dato con su número, reemplazando el que hubiera."""
        ...

    def delete(self, session_id: str, fact_id: int) -> None: ...

    def list_for(self, session_id: str) -> tuple[ConfirmedFact, ...]:
        """Los datos de la sesión en el orden en que se agregaron."""
        ...


class ComparisonRepository(Protocol):
    def save(self, report: ComparisonReport) -> None: ...

    def get(self, comparison_id: str) -> ComparisonReport:
        """La comparación, o ComparisonNotFoundError si no existe."""
        ...
