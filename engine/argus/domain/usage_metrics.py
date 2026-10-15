from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import timedelta

from argus.domain.decision import Decision
from argus.domain.review_session import ReviewSession


@dataclass(frozen=True)
class UsageMetrics:
    """Métricas del historial (CLAUDE.md §10): eficacia y eficiencia de las revisiones.

    Las tasas son None cuando aún no hay datos: «0 %» sugeriría un resultado que no existe.
    """

    session_count: int
    resolved_alerts: int
    real_error_count: int
    mean_review_duration: timedelta | None

    @property
    def real_error_rate(self) -> float | None:
        return self.real_error_count / self.resolved_alerts if self.resolved_alerts else None


def compute_usage_metrics(
    sessions: Sequence[ReviewSession], decisions_by_session: Mapping[str, Sequence[Decision]]
) -> UsageMetrics:
    decisions = [
        decision for session in sessions for decision in decisions_by_session.get(session.id, ())
    ]
    durations = [s.review_duration for s in sessions if s.review_duration is not None]
    mean_duration = sum(durations, timedelta()) / len(durations) if durations else None
    return UsageMetrics(
        session_count=len(sessions),
        resolved_alerts=len(decisions),
        real_error_count=sum(decision.marks_real_error for decision in decisions),
        mean_review_duration=mean_duration,
    )
