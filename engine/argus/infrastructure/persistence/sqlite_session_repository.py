import json
import sqlite3
from datetime import datetime

from argus.domain.errors import SessionNotFoundError
from argus.domain.review_session import ReviewSession
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase
from argus.infrastructure.persistence.timestamps import from_stored_timestamp, to_stored_timestamp

SESSION_COLUMNS = "id, name, document_names, created_at, alert_count, closed_at"


class SqliteSessionRepository:
    def __init__(self, database: SqliteDatabase) -> None:
        self._database = database

    def save(self, session: ReviewSession) -> None:
        closed_at = to_stored_timestamp(session.closed_at) if session.closed_at else None
        with self._database.connect() as connection:
            connection.execute(
                f"INSERT INTO sessions ({SESSION_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?) "
                "ON CONFLICT (id) DO UPDATE SET name = excluded.name, "
                "alert_count = excluded.alert_count, closed_at = excluded.closed_at",
                (
                    session.id,
                    session.name,
                    json.dumps(session.document_names, ensure_ascii=False),
                    to_stored_timestamp(session.created_at),
                    session.alert_count,
                    closed_at,
                ),
            )

    def get(self, session_id: str) -> ReviewSession:
        with self._database.connect() as connection:
            row = connection.execute(
                f"SELECT {SESSION_COLUMNS} FROM sessions WHERE id = ?", (session_id,)
            ).fetchone()
        if row is None:
            raise SessionNotFoundError(session_id)
        return _to_session(row)

    def list_created_since(self, since: datetime) -> tuple[ReviewSession, ...]:
        with self._database.connect() as connection:
            rows = connection.execute(
                f"SELECT {SESSION_COLUMNS} FROM sessions WHERE created_at >= ? "
                "ORDER BY created_at DESC",
                (to_stored_timestamp(since),),
            ).fetchall()
        return tuple(_to_session(row) for row in rows)


def _to_session(row: sqlite3.Row | tuple[str, str, str, str, int, str | None]) -> ReviewSession:
    session_id, name, document_names, created_at, alert_count, closed_at = row
    return ReviewSession(
        id=session_id,
        name=name,
        document_names=tuple(json.loads(document_names)),
        created_at=from_stored_timestamp(created_at),
        alert_count=alert_count,
        closed_at=from_stored_timestamp(closed_at) if closed_at else None,
    )
