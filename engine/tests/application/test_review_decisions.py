import pytest

from argus.application.decision_history import DecisionRequest
from argus.application.review_decisions import DecisionRepositories, ReviewDecisions
from argus.application.review_session_use_cases import CloseReviewSession, StartReviewSession
from argus.domain.alert import Alert
from argus.domain.decision import CorrectSide, DecisionKind
from argus.domain.entity import EntityType
from argus.domain.errors import ClosedSessionError, SessionNotFoundError
from argus.domain.review_session import ReviewSession
from argus.domain.risk import RiskLevel
from tests.application.in_memory_repositories import (
    InMemoryAlertRepository,
    InMemoryDecisionRepository,
    InMemorySessionRepository,
    SteppingClock,
)
from tests.domain.alert_builders import candidate

ALERTS = [
    Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH),
    Alert.from_candidate(candidate(EntityType.MONEY), RiskLevel.HIGH),
]


def open_review() -> tuple[ReviewDecisions, ReviewSession, InMemorySessionRepository]:
    sessions, clock = InMemorySessionRepository(), SteppingClock()
    session = StartReviewSession(sessions, InMemoryAlertRepository(), clock).execute(
        "Expediente", ("a.pdf", "b.pdf"), ALERTS
    )
    repositories = DecisionRepositories(sessions, InMemoryDecisionRepository())
    return ReviewDecisions(repositories, clock), session, sessions


def test_a_new_review_has_no_decisions_and_nothing_to_undo() -> None:
    decisions, session, _ = open_review()

    state = decisions.state(session.id)

    assert state.decisions == ()
    assert not state.can_undo


def test_deciding_returns_the_current_decisions_with_undo_available() -> None:
    decisions, session, _ = open_review()

    state = decisions.decide(session.id, DecisionRequest(1, DecisionKind.ERROR, CorrectSide.FIRST))

    assert [(d.alert_number, d.kind, d.correct_side) for d in state.decisions] == [
        (1, DecisionKind.ERROR, CorrectSide.FIRST)
    ]
    assert state.can_undo


def test_undo_restores_the_previous_state() -> None:
    decisions, session, _ = open_review()
    decisions.decide(session.id, DecisionRequest(1, DecisionKind.CORRECT))
    decisions.decide(session.id, DecisionRequest(2, DecisionKind.IGNORED))

    state = decisions.undo(session.id)

    assert [d.alert_number for d in state.decisions] == [1]
    assert state.can_undo
    assert decisions.undo(session.id).decisions == ()


def test_a_closed_review_is_read_only() -> None:
    decisions, session, sessions = open_review()
    decisions.decide(session.id, DecisionRequest(1, DecisionKind.CORRECT))
    CloseReviewSession(sessions, SteppingClock()).execute(session.id)

    with pytest.raises(ClosedSessionError):
        decisions.decide(session.id, DecisionRequest(2, DecisionKind.CORRECT))
    with pytest.raises(ClosedSessionError):
        decisions.undo(session.id)
    assert not decisions.state(session.id).can_undo


def test_unknown_review_fails_explicitly() -> None:
    decisions, _, _ = open_review()

    with pytest.raises(SessionNotFoundError):
        decisions.decide("no-existe", DecisionRequest(1, DecisionKind.CORRECT))
