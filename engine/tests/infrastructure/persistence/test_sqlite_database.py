from pathlib import Path

from argus.infrastructure.persistence.sqlite_database import SCHEMA_VERSION, SqliteDatabase


def test_migration_creates_the_schema_and_records_its_version(tmp_path: Path) -> None:
    database = SqliteDatabase(tmp_path / "argus.sqlite3")

    database.migrate()

    with database.connect() as connection:
        tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master")}
        version = connection.execute("PRAGMA user_version").fetchone()[0]
    assert {"sessions", "alerts", "decisions"} <= tables
    assert version == SCHEMA_VERSION


def test_migrating_twice_keeps_the_existing_schema(tmp_path: Path) -> None:
    database = SqliteDatabase(tmp_path / "argus.sqlite3")
    database.migrate()

    database.migrate()

    with database.connect() as connection:
        assert connection.execute("PRAGMA user_version").fetchone()[0] == SCHEMA_VERSION


def test_connections_enforce_foreign_keys(database: SqliteDatabase) -> None:
    with database.connect() as connection:
        assert connection.execute("PRAGMA foreign_keys").fetchone()[0] == 1


def test_missing_folders_are_created(tmp_path: Path) -> None:
    database = SqliteDatabase(tmp_path / "ARGUS" / "historial" / "argus.sqlite3")

    database.migrate()

    assert (tmp_path / "ARGUS" / "historial" / "argus.sqlite3").is_file()
