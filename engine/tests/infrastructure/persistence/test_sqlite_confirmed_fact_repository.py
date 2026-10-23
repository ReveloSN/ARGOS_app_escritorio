from datetime import timedelta

import pytest

from argus.domain.confirmed_fact import FactDraft, FactValue
from argus.domain.entity import EntityType
from argus.domain.errors import FactNotFoundError, SessionNotFoundError
from argus.infrastructure.persistence.sqlite_confirmed_fact_repository import (
    SqliteConfirmedFactRepository,
)
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase
from argus.infrastructure.persistence.sqlite_session_repository import SqliteSessionRepository
from tests.infrastructure.persistence.conftest import STARTED, new_session

CANON = FactDraft("Canon mensual", FactValue(EntityType.MONEY, "$ 18.450.000", "COP:18450000"))
CONTRACT = FactDraft("Número de contrato", FactValue(EntityType.CONTRACT_ID, "4857", "4857"))


def stored(database: SqliteDatabase) -> tuple[SqliteConfirmedFactRepository, str]:
    session = new_session()
    SqliteSessionRepository(database).save(session)
    return SqliteConfirmedFactRepository(database), session.id


def test_added_facts_come_back_in_order_with_their_values(database: SqliteDatabase) -> None:
    repository, session_id = stored(database)

    first = repository.add(session_id, CANON, STARTED)
    second = repository.add(session_id, CONTRACT, STARTED)

    assert repository.list_for(session_id) == (first, second)
    assert repository.get(session_id, first.id).value == CANON.value


def test_saving_replaces_the_fact_with_the_same_number(database: SqliteDatabase) -> None:
    repository, session_id = stored(database)
    fact = repository.add(session_id, CANON, STARTED)
    retired = fact.retired(STARTED + timedelta(days=1))

    repository.save(session_id, retired)

    assert repository.list_for(session_id) == (retired,)


def test_deleting_and_reading_a_missing_fact(database: SqliteDatabase) -> None:
    repository, session_id = stored(database)
    fact = repository.add(session_id, CANON, STARTED)

    repository.delete(session_id, fact.id)

    with pytest.raises(FactNotFoundError):
        repository.get(session_id, fact.id)


def test_facts_belong_to_an_existing_review(database: SqliteDatabase) -> None:
    with pytest.raises(SessionNotFoundError):
        SqliteConfirmedFactRepository(database).add("no-existe", CANON, STARTED)


def test_deleting_the_review_deletes_its_facts(database: SqliteDatabase) -> None:
    repository, session_id = stored(database)
    repository.add(session_id, CANON, STARTED)

    SqliteSessionRepository(database).delete(session_id)

    assert repository.list_for(session_id) == ()
