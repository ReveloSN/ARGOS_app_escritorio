"""Progreso de la comparación como Server-Sent Events: archivos leídos y pares comparados."""

from collections.abc import AsyncIterator

from argus.api.comparison_response import to_comparison_response
from argus.api.event_stream import EventChannel, format_event
from argus.api.review_events import QueuedReviewProgress
from argus.api.schemas.comparison import PairComparedEvent
from argus.application.text_comparison.run_comparison import ComparisonRequest, RunComparison
from argus.domain.text_comparison.report import ComparisonReport

PAIR_COMPARED = "pair_compared"
COMPARISON_FINISHED = "comparison"


class QueuedComparisonProgress(QueuedReviewProgress):
    """Los mismos avisos de lectura que la revisión, más uno por cada par comparado."""

    def pair_compared(self, position: int, total: int) -> None:
        self._channel.put(PAIR_COMPARED, PairComparedEvent(position=position, total=total))


async def comparison_events(
    run_comparison: RunComparison, request: ComparisonRequest
) -> AsyncIterator[str]:
    """Eventos de avance y, al final, la comparación completa."""
    channel = EventChannel()
    progress = QueuedComparisonProgress(channel)

    def finish(report: ComparisonReport) -> str:
        return format_event(COMPARISON_FINISHED, to_comparison_response(report))

    async for event in channel.stream(lambda: run_comparison.execute(request, progress), finish):
        yield event
