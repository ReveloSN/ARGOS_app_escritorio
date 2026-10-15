from datetime import timedelta

import pytest

from argus.domain.alert import Alert
from argus.domain.decision import CorrectSide, Decision, DecisionKind
from argus.domain.entity import EntityType
from argus.domain.errors import AlertNotFoundError, SessionNotFoundError
from argus.domain.risk import RiskLevel
from argus.infrastructure.persistence.sqlite_alert_repository import SqliteAlertRepository
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase
from argus.infrastructure.persistence.sqlite_decision_repository import (
    SqliteDecisionRepository,
)
from argus.infrastructure.persistence.sqlite_session_repository import SqliteSessionRepository
from tests.domain.alert_builders import candidate
from tests.infrastructure.persistence.conftest import STARTED, new_session

ALERTS = [
    Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH),
    Alert.from_candidate(candidate(EntityType.PERSON_NAME), RiskLevel.MEDIUM),
]


class TestSessions:
    def test_saved_session_is_read_back_identically(self, database: SqliteDatabase) -> None:
        repository = SqliteSessionRepository(database)
        session = new_session()

        repository.save(session)

        assert repository.get(session.id) == session

    def test_saving_again_updates_the_session(self, database: SqliteDatabase) -> None:
        repository = SqliteSessionRepository(database)
        session = new_session()
        repository.save(session)

        repository.save(session.close(STARTED + timedelta(minutes=6, seconds=40)))

        assert repository.get(session.id).review_duration == timedelta(minutes=6, seconds=40)

    def test_unknown_session_fails_explicitly(self, database: SqliteDatabase) -> None:
        with pytest.raises(SessionNotFoundError):
            SqliteSessionRepository(database).get("no-existe")

    def test_sessions_are_listed_newest_first_from_a_date(self, database: SqliteDatabase) -> None:
        repository = SqliteSessionRepository(database)
        old = new_session("Antigua")
        recent = new_session("Reciente")
        repository.save(old)
        repository.save(recent)

        listed = repository.list_created_since(STARTED)

        assert {session.name for session in listed} == {"Antigua", "Reciente"}
        assert repository.list_created_since(STARTED + timedelta(seconds=1)) == ()


class TestAlerts:
    def test_alerts_are_numbered_in_the_order_given(self, database: SqliteDatabase) -> None:
        session = new_session()
        SqliteSessionRepository(database).save(session)
        repository = SqliteAlertRepository(database)

        repository.save_all(session.id, ALERTS)

        stored = repository.list_for(session.id)
        assert [(alert.number, alert.alert) for alert in stored] == [(1, ALERTS[0]), (2, ALERTS[1])]

    def test_saving_alerts_again_replaces_the_previous_ones(self, database: SqliteDatabase) -> None:
        session = new_session()
        SqliteSessionRepository(database).save(session)
        repository = SqliteAlertRepository(database)
        repository.save_all(session.id, ALERTS)

        repository.save_all(session.id, ALERTS[:1])

        assert len(repository.list_for(session.id)) == 1


class TestDecisions:
    @pytest.fixture
    def session_id(self, database: SqliteDatabase) -> str:
        session = new_session()
        SqliteSessionRepository(database).save(session)
        SqliteAlertRepository(database).save_all(session.id, ALERTS)
        return session.id

    def test_decision_is_saved_replaced_and_deleted(
        self, database: SqliteDatabase, session_id: str
    ) -> None:
        repository = SqliteDecisionRepository(database)
        first = Decision(1, DecisionKind.ERROR, STARTED, CorrectSide.FIRST)
        second = Decision(1, DecisionKind.CORRECT, STARTED + timedelta(seconds=5))

        repository.save(session_id, first)
        assert repository.get(session_id, 1) == first
        repository.save(session_id, second)
        assert repository.list_for(session_id) == (second,)
        repository.delete(session_id, 1)
        assert repository.get(session_id, 1) is None

    def test_decision_for_an_unknown_alert_is_rejected(
        self, database: SqliteDatabase, session_id: str
    ) -> None:
        with pytest.raises(AlertNotFoundError):
            SqliteDecisionRepository(database).save(
                session_id, Decision(9, DecisionKind.CORRECT, STARTED)
            )
