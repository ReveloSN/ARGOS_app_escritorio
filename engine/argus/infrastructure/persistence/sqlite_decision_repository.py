import sqlite3
from collections.abc import Callable
from dataclasses import dataclass

from argus.domain.decision import CorrectSide, Decision, DecisionKind
from argus.domain.errors import (
    AlertNotFoundError,
    ArgusDomainError,
    ClosedSessionError,
    ComparisonNotFoundError,
    SendReviewNotFoundError,
)
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase
from argus.infrastructure.persistence.timestamps import from_stored_timestamp, to_stored_timestamp

DECISION_COLUMNS = "alert_number, kind, decided_at, correct_side"


@dataclass(frozen=True)
class DecisionTable:
    """Dónde se guardan las decisiones: tabla, columna del dueño (revisión o comparación) y el
    error si la clave foránea rechaza la decisión."""

    name: str
    owner_column: str
    missing: Callable[[str, int], ArgusDomainError]
    # Si el dueño se puede cerrar: la escritura comprueba que sigue abierto en la misma sentencia,
    # así un cierre simultáneo no deja colar una decisión (SQLite serializa las escrituras).
    open_owner: str | None = None


REVIEW_DECISIONS = DecisionTable(
    "decisions",
    "session_id",
    AlertNotFoundError,
    open_owner="EXISTS (SELECT 1 FROM sessions WHERE id = ? AND closed_at IS NULL)",
)
COMPARISON_DECISIONS = DecisionTable(
    "comparison_decisions", "comparison_id", lambda owner, _number: ComparisonNotFoundError(owner)
)
SEND_DECISIONS = DecisionTable(
    "send_decisions", "send_review_id", lambda owner, _number: SendReviewNotFoundError(owner)
)


class SqliteDecisionRepository:
    """Guarda la decisión vigente de cada elemento; la clave foránea impide decidir ajenos."""

    def __init__(self, database: SqliteDatabase, table: DecisionTable = REVIEW_DECISIONS) -> None:
        self._database = database
        self._table = table
        self._where = f"{table.owner_column} = ?"

    def get(self, session_id: str, alert_number: int) -> Decision | None:
        with self._database.connect() as connection:
            row = connection.execute(
                f"SELECT {DECISION_COLUMNS} FROM {self._table.name} "
                f"WHERE {self._where} AND alert_number = ?",
                (session_id, alert_number),
            ).fetchone()
        return None if row is None else _to_decision(row)

    def save(self, session_id: str, decision: Decision) -> None:
        values = (
            session_id,
            decision.alert_number,
            decision.kind,
            to_stored_timestamp(decision.decided_at),
            decision.correct_side,
        )
        try:
            with self._database.connect() as connection:
                self._insert(connection, values)
        except sqlite3.IntegrityError:
            raise self._table.missing(session_id, decision.alert_number) from None

    def _insert(self, connection: sqlite3.Connection, values: tuple[object, ...]) -> None:
        insert = (
            f"INSERT OR REPLACE INTO {self._table.name} "
            f"({self._table.owner_column}, {DECISION_COLUMNS}) SELECT ?, ?, ?, ?, ?"
        )
        guard = self._table.open_owner
        if guard is None:
            connection.execute(insert, values)
            return
        session_id = str(values[0])
        if not connection.execute(f"{insert} WHERE {guard}", (*values, session_id)).rowcount:
            raise ClosedSessionError(session_id)

    def delete(self, session_id: str, alert_number: int) -> None:
        guard = self._table.open_owner
        condition = f"{self._where} AND alert_number = ?"
        with self._database.connect() as connection:
            if guard is None:
                connection.execute(
                    f"DELETE FROM {self._table.name} WHERE {condition}", (session_id, alert_number)
                )
                return
            connection.execute(
                f"DELETE FROM {self._table.name} WHERE {condition} AND {guard}",
                (session_id, alert_number, session_id),
            )
            # Misma transacción: si no se borró porque la sesión ya estaba cerrada, se dice.
            if _is_closed(connection, session_id):
                raise ClosedSessionError(session_id)

    def list_for(self, session_id: str) -> tuple[Decision, ...]:
        with self._database.connect() as connection:
            rows = connection.execute(
                f"SELECT {DECISION_COLUMNS} FROM {self._table.name} WHERE {self._where} "
                "ORDER BY alert_number",
                (session_id,),
            ).fetchall()
        return tuple(_to_decision(row) for row in rows)


def _is_closed(connection: sqlite3.Connection, session_id: str) -> bool:
    row = connection.execute(
        "SELECT 1 FROM sessions WHERE id = ? AND closed_at IS NOT NULL", (session_id,)
    ).fetchone()
    return row is not None


def _to_decision(row: tuple[int, str, str, str | None]) -> Decision:
    alert_number, kind, decided_at, correct_side = row
    return Decision(
        alert_number,
        DecisionKind(kind),
        from_stored_timestamp(decided_at),
        CorrectSide(correct_side) if correct_side else None,
    )
