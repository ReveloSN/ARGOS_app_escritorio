import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

# Cada migración lleva el esquema de la versión N a la N + 1; nunca se edita una ya publicada.
MIGRATIONS: tuple[str, ...] = (
    """
    CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        document_names TEXT NOT NULL,
        created_at TEXT NOT NULL,
        alert_count INTEGER NOT NULL,
        closed_at TEXT
    );
    CREATE INDEX sessions_by_creation ON sessions (created_at);
    CREATE TABLE alerts (
        session_id TEXT NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
        number INTEGER NOT NULL,
        entity_type TEXT NOT NULL,
        risk TEXT NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (session_id, number)
    );
    CREATE TABLE decisions (
        session_id TEXT NOT NULL,
        alert_number INTEGER NOT NULL,
        kind TEXT NOT NULL,
        decided_at TEXT NOT NULL,
        correct_side TEXT,
        PRIMARY KEY (session_id, alert_number),
        FOREIGN KEY (session_id, alert_number)
            REFERENCES alerts (session_id, number) ON DELETE CASCADE
    );
    """,
)
SCHEMA_VERSION = len(MIGRATIONS)


class SqliteDatabase:
    """Archivo SQLite del historial: abre conexiones y aplica las migraciones pendientes.

    Cada operación usa su propia conexión, porque FastAPI atiende peticiones en varios hilos y
    una conexión de sqlite3 no debe compartirse entre ellos.
    """

    def __init__(self, path: Path) -> None:
        self._path = path

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        """Conexión con claves foráneas activas; confirma al salir o revierte si hubo un error."""
        connection = sqlite3.connect(self._path)
        try:
            connection.execute("PRAGMA foreign_keys = ON")
            with connection:
                yield connection
        finally:
            connection.close()

    def migrate(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as connection:
            current = connection.execute("PRAGMA user_version").fetchone()[0]
            for version, script in enumerate(MIGRATIONS[current:], start=current + 1):
                connection.executescript(script)
                connection.execute(f"PRAGMA user_version = {version}")
