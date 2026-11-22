import json

from argus.infrastructure.persistence.sqlite_database import SqliteDatabase

GATE_SKIPPED_KEY = "account_gate_skipped"


class SqliteGatePreference:
    """«Continuar sin cuenta» en su propia clave: guardar otros Ajustes no la toca."""

    def __init__(self, database: SqliteDatabase) -> None:
        self._database = database

    def is_skipped(self) -> bool:
        with self._database.connect() as connection:
            row = connection.execute(
                "SELECT value FROM preferences WHERE key = ?", (GATE_SKIPPED_KEY,)
            ).fetchone()
        return row is not None and row[0] == json.dumps(True)

    def set_skipped(self, value: bool) -> None:
        with self._database.connect() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)",
                (GATE_SKIPPED_KEY, json.dumps(value)),
            )
