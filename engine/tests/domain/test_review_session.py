from datetime import UTC, datetime, timedelta

import pytest

from argus.domain.errors import InvalidValueError
from argus.domain.review_session import NewReviewSession, ReviewSession, SessionStatus

STARTED = datetime(2026, 10, 13, 9, 42, tzinfo=UTC)
DOCUMENTS = ("Contrato_4857_v3.pdf", "Anexo_1_condiciones.docx")


def start(alert_count: int = 9) -> ReviewSession:
    return ReviewSession.start(
        NewReviewSession(
            "Expediente 2026-118 · Arrendamiento Bodega Fontibón", DOCUMENTS, alert_count
        ),
        STARTED,
    )


def test_new_session_is_in_progress_with_its_documents() -> None:
    session = start()

    assert session.status is SessionStatus.IN_PROGRESS
    assert session.document_names == DOCUMENTS
    assert session.created_at == STARTED
    assert session.closed_at is None
    assert session.review_duration is None


def test_each_session_gets_its_own_identifier() -> None:
    assert start().id != start().id


def test_closing_records_when_and_how_long_the_review_took() -> None:
    closed = start().close(STARTED + timedelta(minutes=6, seconds=40))

    assert closed.status is SessionStatus.CLOSED
    assert closed.review_duration == timedelta(minutes=6, seconds=40)


def test_closed_session_without_alerts_had_no_inconsistencies() -> None:
    closed = start(alert_count=0).close(STARTED + timedelta(minutes=1))

    assert closed.status is SessionStatus.NO_INCONSISTENCIES


def test_closing_does_not_modify_the_original_session() -> None:
    session = start()

    session.close(STARTED + timedelta(minutes=1))

    assert session.closed_at is None


def test_session_cannot_close_before_it_started() -> None:
    with pytest.raises(InvalidValueError):
        start().close(STARTED - timedelta(seconds=1))


def test_session_requires_a_name() -> None:
    with pytest.raises(InvalidValueError):
        ReviewSession.start(NewReviewSession("  ", DOCUMENTS, 0), STARTED)


def test_session_times_must_include_a_time_zone() -> None:
    with pytest.raises(InvalidValueError):
        ReviewSession.start(
            NewReviewSession("Expediente", DOCUMENTS, 0), datetime(2026, 10, 13, 9, 42)
        )
