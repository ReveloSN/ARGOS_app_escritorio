from datetime import UTC, datetime, timedelta

from argus.infrastructure.system_clock import SystemClock


def test_system_clock_returns_the_current_time_in_utc() -> None:
    now = SystemClock().now()

    assert now.tzinfo is UTC
    assert abs(datetime.now(UTC) - now) < timedelta(seconds=5)
