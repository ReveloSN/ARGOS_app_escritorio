import sqlite3
from datetime import datetime

from argus.domain.confirmed_fact import ConfirmedFact, FactDraft, FactValue
from argus.domain.entity import EntityType
from argus.domain.errors import FactNotFoundError, SessionNotFoundError
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase
from argus.infrastructure.persistence.timestamps import from_stored_timestamp, to_stored_timestamp

FACT_COLUMNS = "id, label, entity_type, raw_value, normalized_value, confirmed_at, retired_at"

type FactRow = tuple[int, str, str, str, str, str, str | None]


class SqliteConfirmedFactRepository:
    """Datos confirmados de cada revisión; se borran con ella (clave foránea en cascada)."""

    def __init__(self, database: SqliteDatabase) -> None:
        self._database = database

    def add(self, session_id: str, draft: FactDraft, confirmed_at: datetime) -> ConfirmedFact:
        value = draft.value
        try:
            with self._database.connect() as connection:
                cursor = connection.execute(
                    "INSERT INTO confirmed_facts (session_id, label, entity_type, raw_value, "
                    "normalized_value, confirmed_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (
                        session_id,
                        draft.label,
                        value.entity_type,
                        value.raw_value,
                        value.normalized_value,
                        to_stored_timestamp(confirmed_at),
                    ),
                )
        except sqlite3.IntegrityError:
            raise SessionNotFoundError(session_id) from None
        return ConfirmedFact(int(cursor.lastrowid or 0), draft.label, value, confirmed_at)

    def get(self, session_id: str, fact_id: int) -> ConfirmedFact:
        with self._database.connect() as connection:
            row = connection.execute(
                f"SELECT {FACT_COLUMNS} FROM confirmed_facts WHERE session_id = ? AND id = ?",
                (session_id, fact_id),
            ).fetchone()
        if row is None:
            raise FactNotFoundError(session_id, fact_id)
        return _to_fact(row)

    def save(self, session_id: str, fact: ConfirmedFact) -> None:
        value = fact.value
        retired_at = None if fact.retired_at is None else to_stored_timestamp(fact.retired_at)
        with self._database.connect() as connection:
            connection.execute(
                f"INSERT OR REPLACE INTO confirmed_facts (session_id, {FACT_COLUMNS}) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    session_id,
                    fact.id,
                    fact.label,
                    value.entity_type,
                    value.raw_value,
                    value.normalized_value,
                    to_stored_timestamp(fact.confirmed_at),
                    retired_at,
                ),
            )

    def delete(self, session_id: str, fact_id: int) -> None:
        with self._database.connect() as connection:
            connection.execute(
                "DELETE FROM confirmed_facts WHERE session_id = ? AND id = ?",
                (session_id, fact_id),
            )

    def list_for(self, session_id: str) -> tuple[ConfirmedFact, ...]:
        with self._database.connect() as connection:
            rows = connection.execute(
                f"SELECT {FACT_COLUMNS} FROM confirmed_facts WHERE session_id = ? ORDER BY id",
                (session_id,),
            ).fetchall()
        return tuple(_to_fact(row) for row in rows)


def _to_fact(row: FactRow) -> ConfirmedFact:
    fact_id, label, entity_type, raw_value, normalized_value, confirmed_at, retired_at = row
    return ConfirmedFact(
        fact_id,
        label,
        FactValue(EntityType(entity_type), raw_value, normalized_value),
        from_stored_timestamp(confirmed_at),
        None if retired_at is None else from_stored_timestamp(retired_at),
    )
