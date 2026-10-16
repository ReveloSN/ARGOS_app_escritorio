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
    # Fase 6: cómo se leyó cada archivo y su texto (para volver a la sesión y buscar en ella),
    # ajustes del usuario y casos que no generan alerta.
    """
    CREATE TABLE documents (
        session_id TEXT NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        name TEXT NOT NULL,
        reason TEXT,
        fragment_count INTEGER NOT NULL,
        PRIMARY KEY (session_id, position)
    );
    CREATE TABLE fragments (
        session_id TEXT NOT NULL,
        document_position INTEGER NOT NULL,
        ordinal INTEGER NOT NULL,
        document_name TEXT NOT NULL,
        location TEXT NOT NULL,
        text TEXT NOT NULL,
        search_text TEXT NOT NULL,
        PRIMARY KEY (session_id, document_position, ordinal),
        FOREIGN KEY (session_id, document_position)
            REFERENCES documents (session_id, position) ON DELETE CASCADE
    );
    CREATE TABLE preferences (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    CREATE TABLE suppression_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        first_value TEXT NOT NULL,
        second_value TEXT NOT NULL,
        first_label TEXT NOT NULL,
        second_label TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (entity_type, first_value, second_value)
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
