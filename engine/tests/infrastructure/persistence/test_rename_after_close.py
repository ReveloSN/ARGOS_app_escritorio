from datetime import datetime, timedelta

from argus.application.review_session_use_cases import CloseReviewSession, RenameReviewSession
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase
from argus.infrastructure.persistence.sqlite_session_repository import SqliteSessionRepository
from tests.infrastructure.persistence.conftest import STARTED, new_session


class _FixedClock:
    def now(self) -> datetime:
        return STARTED + timedelta(hours=1)


def test_a_stale_rename_does_not_reopen_a_session_closed_meanwhile(
    database: SqliteDatabase,
) -> None:
    """(Regresión) Renombrar leyó la sesión abierta; entretanto se cerró; no debe reabrirse."""
    sessions = SqliteSessionRepository(database)
    session = new_session(alert_count=0)
    sessions.save(session)
    stale_open_copy = sessions.get(session.id)

    CloseReviewSession(sessions, _FixedClock()).execute(session.id)
    sessions.save(stale_open_copy.rename("Nombre nuevo"))

    stored = sessions.get(session.id)
    assert stored.name == "Nombre nuevo"
    assert stored.closed_at is not None


def test_rename_answers_with_the_stored_session(database: SqliteDatabase) -> None:
    sessions = SqliteSessionRepository(database)
    session = new_session(alert_count=0)
    sessions.save(session)
    CloseReviewSession(sessions, _FixedClock()).execute(session.id)

    renamed = RenameReviewSession(sessions).execute(session.id, "Otro nombre")

    assert renamed.name == "Otro nombre"
    assert renamed.closed_at is not None
