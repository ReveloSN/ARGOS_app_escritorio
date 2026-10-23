"""Progreso de la revisión como Server-Sent Events (ADR 004): un evento por archivo leído."""

from collections.abc import AsyncIterator

from argus.api.event_stream import EmptyEvent, EventChannel, format_event
from argus.api.review_response import (
    NO_DECISIONS,
    document_response,
    stored_review_of,
    to_review_response,
)
from argus.api.schemas.review import (
    DocumentFinishedEvent,
    DocumentStartedEvent,
    PageRecognizedEvent,
)
from argus.application.alert_explanation import AlertExplainer
from argus.application.run_review import ReviewOutcome, ReviewRequest, ReviewRunner
from argus.domain.ocr import PageCount
from argus.domain.read_outcome import DocumentReadOutcome

DOCUMENT_STARTED = "document_started"
DOCUMENT_FINISHED = "document_finished"
PAGE_RECOGNIZED = "page_recognized"
ANALYSIS_STARTED = "analysis_started"
REVIEW_FINISHED = "review"


class QueuedReviewProgress:
    """Observer que lleva el avance del hilo de análisis al flujo SSE."""

    def __init__(self, channel: EventChannel) -> None:
        self._channel = channel

    def document_started(self, position: int, name: str) -> None:
        self._channel.put(DOCUMENT_STARTED, DocumentStartedEvent(position=position, name=name))

    def document_finished(self, position: int, outcome: DocumentReadOutcome) -> None:
        document = document_response(outcome.summary)
        event = DocumentFinishedEvent(position=position, document=document)
        self._channel.put(DOCUMENT_FINISHED, event)

    def page_recognized(self, position: int, pages: PageCount) -> None:
        event = PageRecognizedEvent(position=position, done=pages.done, total=pages.total)
        self._channel.put(PAGE_RECOGNIZED, event)

    def analysis_started(self) -> None:
        self._channel.put(ANALYSIS_STARTED, EmptyEvent())


async def review_events(
    run_review: ReviewRunner, request: ReviewRequest, explainer: AlertExplainer
) -> AsyncIterator[str]:
    """Eventos de avance y, al final, la revisión completa."""
    channel = EventChannel()
    progress = QueuedReviewProgress(channel)

    def finish(outcome: ReviewOutcome) -> str:
        review = to_review_response(stored_review_of(outcome), NO_DECISIONS, explainer)
        return format_event(REVIEW_FINISHED, review)

    async for event in channel.stream(lambda: run_review.execute(request, progress), finish):
        yield event
