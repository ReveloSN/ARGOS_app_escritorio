import pytest

from argus.application.confirmed_facts import ConfirmedFacts, FactRepositories, FactRequest
from argus.application.fact_value_reader import FactValueReader
from argus.application.review_session_use_cases import CloseReviewSession, StartReviewSession
from argus.domain.entity import EntityType
from argus.domain.errors import ClosedSessionError, FactNotFoundError, UnrecognizedFactValueError
from argus.domain.review_session import ReviewSession
from tests.application.fact_doubles import fact_pipeline
from tests.application.in_memory_repositories import (
    START,
    InMemoryAlertRepository,
    InMemoryConfirmedFactRepository,
    InMemorySessionRepository,
    SteppingClock,
)

CANON = FactRequest("Canon mensual", EntityType.MONEY, "$ 18.450.000")


def open_case_file() -> tuple[ConfirmedFacts, ReviewSession, InMemorySessionRepository]:
    sessions, clock = InMemorySessionRepository(), SteppingClock()
    session = StartReviewSession(sessions, InMemoryAlertRepository(), clock).execute(
        "Expediente 2026-118", ("a.pdf", "b.pdf"), []
    )
    repositories = FactRepositories(sessions, InMemoryConfirmedFactRepository())
    return ConfirmedFacts(repositories, FactValueReader(fact_pipeline()), clock), session, sessions


def test_adding_a_fact_saves_its_value_and_when_it_was_confirmed() -> None:
    facts, session, _ = open_case_file()

    state = facts.add(session.id, CANON)

    (fact,) = state.facts
    assert fact.label == "Canon mensual"
    assert fact.value.normalized_value == "18450000"
    assert fact.confirmed_at > START
    assert state.can_undo


def test_undo_removes_the_fact_just_added() -> None:
    facts, session, _ = open_case_file()
    facts.add(session.id, CANON)

    state = facts.undo(session.id)

    assert state.facts == ()
    assert not state.can_undo


def test_editing_and_undoing_restores_the_previous_value() -> None:
    facts, session, _ = open_case_file()
    (fact,) = facts.add(session.id, CANON).facts

    edited = facts.edit(session.id, fact.id, "$ 18.540.000")
    assert edited.facts[0].value.raw_value == "$ 18.540.000"

    assert facts.undo(session.id).facts == (fact,)


def test_retiring_and_restoring_keep_the_fact() -> None:
    facts, session, _ = open_case_file()
    (fact,) = facts.add(session.id, CANON).facts

    assert facts.retire(session.id, fact.id).facts[0].is_retired
    assert not facts.restore(session.id, fact.id).facts[0].is_retired


def test_a_value_that_is_not_of_the_chosen_type_is_rejected() -> None:
    facts, session, _ = open_case_file()

    with pytest.raises(UnrecognizedFactValueError):
        facts.add(session.id, FactRequest("Canon mensual", EntityType.MONEY, "pendiente"))


def test_an_unknown_fact_cannot_be_edited() -> None:
    facts, session, _ = open_case_file()

    with pytest.raises(FactNotFoundError):
        facts.retire(session.id, 7)


def test_a_closed_review_is_read_only() -> None:
    facts, session, sessions = open_case_file()
    (fact,) = facts.add(session.id, CANON).facts
    CloseReviewSession(sessions, SteppingClock()).execute(session.id)

    assert not facts.state(session.id).can_undo
    with pytest.raises(ClosedSessionError):
        facts.add(session.id, CANON)
    with pytest.raises(ClosedSessionError):
        facts.retire(session.id, fact.id)
    with pytest.raises(ClosedSessionError):
        facts.undo(session.id)
