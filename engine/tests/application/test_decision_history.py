from argus.application.decision_history import DecisionHistory, DecisionRequest
from argus.domain.decision import CorrectSide, DecisionKind
from tests.application.in_memory_repositories import (
    START,
    InMemoryDecisionRepository,
    SteppingClock,
)

SESSION_ID = "expediente-2026-118"


def history_with_repository() -> tuple[DecisionHistory, InMemoryDecisionRepository]:
    repository = InMemoryDecisionRepository()
    return DecisionHistory(SESSION_ID, repository, SteppingClock()), repository


def test_decision_is_saved_with_the_time_it_was_made() -> None:
    history, repository = history_with_repository()

    decision = history.decide(DecisionRequest(1, DecisionKind.ERROR, CorrectSide.FIRST))

    assert decision.decided_at == START
    assert repository.get(SESSION_ID, 1) == decision


def test_undoing_the_first_decision_leaves_the_alert_pending() -> None:
    history, repository = history_with_repository()
    history.decide(DecisionRequest(1, DecisionKind.CORRECT))

    assert history.undo()

    assert repository.get(SESSION_ID, 1) is None


def test_undoing_a_changed_decision_restores_the_previous_one() -> None:
    history, repository = history_with_repository()
    first = history.decide(DecisionRequest(1, DecisionKind.CORRECT))
    history.decide(DecisionRequest(1, DecisionKind.ERROR))

    history.undo()

    assert repository.get(SESSION_ID, 1) == first


def test_redo_reapplies_the_undone_decision() -> None:
    history, repository = history_with_repository()
    decision = history.decide(DecisionRequest(2, DecisionKind.IGNORED))
    history.undo()

    assert history.redo()

    assert repository.get(SESSION_ID, 2) == decision


def test_undo_follows_the_order_in_which_alerts_were_decided() -> None:
    history, repository = history_with_repository()
    history.decide(DecisionRequest(1, DecisionKind.CORRECT))
    history.decide(DecisionRequest(2, DecisionKind.ERROR))

    history.undo()

    assert repository.get(SESSION_ID, 1) is not None
    assert repository.get(SESSION_ID, 2) is None


def test_nothing_to_undo_is_reported() -> None:
    history, _ = history_with_repository()

    assert not history.undo()
    assert not history.redo()
