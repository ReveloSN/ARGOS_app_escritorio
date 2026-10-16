from argus.domain.alert import Alert
from argus.domain.comparison.difference import DifferenceKind
from argus.domain.decision import Decision, DecisionKind
from argus.domain.entity import EntityType
from argus.domain.feedback import FeedbackCount
from argus.domain.risk import RiskLevel
from argus.infrastructure.persistence.sqlite_alert_repository import SqliteAlertRepository
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase
from argus.infrastructure.persistence.sqlite_decision_repository import (
    SqliteDecisionRepository,
)
from argus.infrastructure.persistence.sqlite_decision_statistics import SqliteDecisionStatistics
from argus.infrastructure.persistence.sqlite_session_repository import SqliteSessionRepository
from tests.domain.alert_builders import candidate
from tests.infrastructure.persistence.conftest import STARTED, new_session


def test_decisions_are_counted_by_entity_type_and_difference_kind(
    database: SqliteDatabase,
) -> None:
    session = new_session(alert_count=3)
    SqliteSessionRepository(database).save(session)
    SqliteAlertRepository(database).save_all(
        session.id,
        [
            Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH),
            Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH),
            Alert.from_candidate(
                candidate(EntityType.MONEY, DifferenceKind.CHARACTER_CHANGE), RiskLevel.HIGH
            ),
        ],
    )
    decisions = SqliteDecisionRepository(database)
    decisions.save(session.id, Decision(1, DecisionKind.ERROR, STARTED))
    decisions.save(session.id, Decision(2, DecisionKind.IGNORED, STARTED))
    decisions.save(session.id, Decision(3, DecisionKind.CORRECT, STARTED))

    counts = SqliteDecisionStatistics(database).counts_by_kind()

    assert counts == {
        (EntityType.CONTRACT_ID, DifferenceKind.TRANSPOSITION): FeedbackCount(1, 1),
        (EntityType.MONEY, DifferenceKind.CHARACTER_CHANGE): FeedbackCount(0, 1),
    }


def test_without_decisions_there_is_no_feedback(database: SqliteDatabase) -> None:
    assert SqliteDecisionStatistics(database).counts_by_kind() == {}
