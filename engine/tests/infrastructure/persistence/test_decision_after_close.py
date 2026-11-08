from datetime import timedelta

import pytest

from argus.domain.alert import Alert
from argus.domain.decision import Decision, DecisionKind
from argus.domain.entity import EntityType
from argus.domain.errors import ClosedSessionError
from argus.domain.risk import RiskLevel
from argus.infrastructure.persistence.sqlite_alert_repository import SqliteAlertRepository
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase
from argus.infrastructure.persistence.sqlite_decision_repository import SqliteDecisionRepository
from argus.infrastructure.persistence.sqlite_session_repository import SqliteSessionRepository
from tests.domain.alert_builders import candidate
from tests.infrastructure.persistence.conftest import STARTED, new_session

CLOSED_AT = STARTED + timedelta(hours=1)


def _closed_session_with_a_decision(database: SqliteDatabase) -> str:
    """Una revisión con la alerta 1 decidida y luego cerrada (otra petición la cerró a la vez)."""
    sessions = SqliteSessionRepository(database)
    session = new_session(alert_count=1)
    sessions.save(session)
    alert = Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH)
    SqliteAlertRepository(database).save_all(session.id, [alert])
    SqliteDecisionRepository(database).save(session.id, Decision(1, DecisionKind.ERROR, STARTED))
    sessions.save(session.close(CLOSED_AT))
    return session.id


def test_a_decision_is_not_saved_once_the_session_was_closed(database: SqliteDatabase) -> None:
    """(Regresión) La comprobación de «abierta» y la escritura van juntas: no se cuela tras cerrar."""
    session_id = _closed_session_with_a_decision(database)
    decisions = SqliteDecisionRepository(database)

    with pytest.raises(ClosedSessionError):
        decisions.save(session_id, Decision(1, DecisionKind.CORRECT, CLOSED_AT))

    assert decisions.get(session_id, 1) == Decision(1, DecisionKind.ERROR, STARTED)


def test_undo_does_not_remove_a_decision_once_the_session_was_closed(
    database: SqliteDatabase,
) -> None:
    session_id = _closed_session_with_a_decision(database)
    decisions = SqliteDecisionRepository(database)

    with pytest.raises(ClosedSessionError):
        decisions.delete(session_id, 1)

    assert decisions.get(session_id, 1) is not None
