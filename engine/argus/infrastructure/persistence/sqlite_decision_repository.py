import sqlite3

from argus.domain.decision import CorrectSide, Decision, DecisionKind
from argus.domain.errors import AlertNotFoundError
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase
from argus.infrastructure.persistence.timestamps import from_stored_timestamp, to_stored_timestamp

DECISION_COLUMNS = "alert_number, kind, decided_at, correct_side"


class SqliteDecisionRepository:
    """Guarda la decisión vigente de cada alerta; la clave foránea impide decidir alertas ajenas."""

    def __init__(self, database: SqliteDatabase) -> None:
        self._database = database

    def get(self, session_id: str, alert_number: int) -> Decision | None:
        with self._database.connect() as connection:
            row = connection.execute(
                f"SELECT {DECISION_COLUMNS} FROM decisions "
                "WHERE session_id = ? AND alert_number = ?",
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
                connection.execute(
                    f"INSERT OR REPLACE INTO decisions (session_id, {DECISION_COLUMNS}) "
                    "VALUES (?, ?, ?, ?, ?)",
                    values,
                )
        except sqlite3.IntegrityError:
            raise AlertNotFoundError(session_id, decision.alert_number) from None

    def delete(self, session_id: str, alert_number: int) -> None:
        with self._database.connect() as connection:
            connection.execute(
                "DELETE FROM decisions WHERE session_id = ? AND alert_number = ?",
                (session_id, alert_number),
            )

    def list_for(self, session_id: str) -> tuple[Decision, ...]:
        with self._database.connect() as connection:
            rows = connection.execute(
                f"SELECT {DECISION_COLUMNS} FROM decisions WHERE session_id = ? "
                "ORDER BY alert_number",
                (session_id,),
            ).fetchall()
        return tuple(_to_decision(row) for row in rows)


def _to_decision(row: tuple[int, str, str, str | None]) -> Decision:
    alert_number, kind, decided_at, correct_side = row
    return Decision(
        alert_number,
        DecisionKind(kind),
        from_stored_timestamp(decided_at),
        CorrectSide(correct_side) if correct_side else None,
    )
