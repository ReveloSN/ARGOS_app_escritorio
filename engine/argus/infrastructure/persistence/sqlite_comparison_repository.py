from argus.domain.errors import ComparisonNotFoundError
from argus.domain.text_comparison.report import ComparisonReport
from argus.infrastructure.persistence.comparison_serialization import (
    content_from_json,
    content_to_json,
)
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase
from argus.infrastructure.persistence.timestamps import from_stored_timestamp, to_stored_timestamp


class SqliteComparisonRepository:
    """Comparaciones guardadas: el informe va completo en JSON porque siempre se lee entero."""

    def __init__(self, database: SqliteDatabase) -> None:
        self._database = database

    def save(self, report: ComparisonReport) -> None:
        content = report.content
        with self._database.connect() as connection:
            connection.execute(
                "INSERT INTO comparisons (id, name, mode, created_at, payload) "
                "VALUES (?, ?, ?, ?, ?)",
                (
                    report.id,
                    content.name,
                    content.mode,
                    to_stored_timestamp(report.created_at),
                    content_to_json(content),
                ),
            )

    def get(self, comparison_id: str) -> ComparisonReport:
        with self._database.connect() as connection:
            row = connection.execute(
                "SELECT created_at, payload FROM comparisons WHERE id = ?", (comparison_id,)
            ).fetchone()
        if row is None:
            raise ComparisonNotFoundError(comparison_id)
        created_at, payload = row
        return ComparisonReport(
            comparison_id, from_stored_timestamp(created_at), content_from_json(payload)
        )
