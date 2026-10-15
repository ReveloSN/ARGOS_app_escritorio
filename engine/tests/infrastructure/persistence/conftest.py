from datetime import UTC, datetime
from pathlib import Path

import pytest

from argus.domain.review_session import NewReviewSession, ReviewSession
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase

STARTED = datetime(2026, 10, 13, 9, 42, tzinfo=UTC)


@pytest.fixture
def database(tmp_path: Path) -> SqliteDatabase:
    database = SqliteDatabase(tmp_path / "argus.sqlite3")
    database.migrate()
    return database


def new_session(name: str = "Expediente 2026-118", alert_count: int = 2) -> ReviewSession:
    documents = ("Contrato_4857_v3.pdf", "Anexo_1_condiciones.docx")
    return ReviewSession.start(NewReviewSession(name, documents, alert_count), STARTED)
