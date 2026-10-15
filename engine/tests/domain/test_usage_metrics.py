from datetime import UTC, datetime, timedelta

import pytest

from argus.domain.decision import Decision, DecisionKind
from argus.domain.review_session import NewReviewSession, ReviewSession
from argus.domain.usage_metrics import compute_usage_metrics

START = datetime(2026, 10, 1, 9, 0, tzinfo=UTC)


def closed_session(minutes: int) -> ReviewSession:
    session = ReviewSession.start(NewReviewSession("Expediente", ("a.pdf", "b.docx"), 3), START)
    return session.close(START + timedelta(minutes=minutes))


def decisions(*kinds: DecisionKind) -> tuple[Decision, ...]:
    return tuple(Decision(number, kind, START) for number, kind in enumerate(kinds, start=1))


def test_metrics_count_resolved_alerts_errors_and_mean_review_time() -> None:
    first, second = closed_session(5), closed_session(8)
    by_session = {
        first.id: decisions(DecisionKind.ERROR, DecisionKind.CORRECT, DecisionKind.IGNORED),
        second.id: decisions(DecisionKind.ERROR),
    }

    metrics = compute_usage_metrics([first, second], by_session)

    assert metrics.resolved_alerts == 4
    assert metrics.session_count == 2
    assert metrics.real_error_count == 2
    assert metrics.real_error_rate == pytest.approx(0.5)
    assert metrics.mean_review_duration == timedelta(minutes=6, seconds=30)


def test_sessions_still_open_do_not_count_toward_review_time() -> None:
    open_session = ReviewSession.start(NewReviewSession("En curso", ("a.pdf",), 2), START)

    metrics = compute_usage_metrics([open_session, closed_session(10)], {})

    assert metrics.mean_review_duration == timedelta(minutes=10)


def test_without_decisions_or_closed_sessions_rates_are_unknown() -> None:
    metrics = compute_usage_metrics(
        [ReviewSession.start(NewReviewSession("En curso", ("a.pdf",), 1), START)], {}
    )

    assert metrics.resolved_alerts == 0
    assert metrics.real_error_rate is None
    assert metrics.mean_review_duration is None
