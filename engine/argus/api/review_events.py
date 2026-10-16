"""Progreso de la revisión como Server-Sent Events (ADR 004): un evento por archivo leído."""

import asyncio
from collections.abc import AsyncIterator

from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from argus.api.review_response import (
    NO_DECISIONS,
    document_response,
    stored_review_of,
    to_review_response,
)
from argus.api.schemas.review import DocumentFinishedEvent, DocumentStartedEvent
from argus.application.run_review import ReviewRequest, RunReview
from argus.domain.read_outcome import DocumentReadOutcome

DOCUMENT_STARTED = "document_started"
DOCUMENT_FINISHED = "document_finished"
ANALYSIS_STARTED = "analysis_started"
REVIEW_FINISHED = "review"


class EmptyEvent(BaseModel):
    pass


def format_event(name: str, payload: BaseModel) -> str:
    return f"event: {name}\ndata: {payload.model_dump_json(by_alias=True)}\n\n"


class QueuedReviewProgress:
    """Observer que lleva el avance del hilo de análisis al flujo SSE del bucle de eventos."""

    def __init__(self, loop: asyncio.AbstractEventLoop, queue: asyncio.Queue[str | None]) -> None:
        self._loop = loop
        self._queue = queue

    def document_started(self, position: int, name: str) -> None:
        self._put(DOCUMENT_STARTED, DocumentStartedEvent(position=position, name=name))

    def document_finished(self, position: int, outcome: DocumentReadOutcome) -> None:
        document = document_response(outcome.summary)
        self._put(DOCUMENT_FINISHED, DocumentFinishedEvent(position=position, document=document))

    def analysis_started(self) -> None:
        self._put(ANALYSIS_STARTED, EmptyEvent())

    def _put(self, name: str, payload: BaseModel) -> None:
        self._loop.call_soon_threadsafe(self._queue.put_nowait, format_event(name, payload))


async def review_events(run_review: RunReview, request: ReviewRequest) -> AsyncIterator[str]:
    """Eventos de avance y, al final, la revisión completa.

    Si el análisis falla, el flujo termina sin el evento «review» y la interfaz lo informa.
    """
    loop = asyncio.get_running_loop()
    events: asyncio.Queue[str | None] = asyncio.Queue()
    progress = QueuedReviewProgress(loop, events)
    task = asyncio.ensure_future(run_in_threadpool(run_review.execute, request, progress))
    # El aviso de fin entra a la cola después de todos los de avance: llegan en orden.
    task.add_done_callback(lambda _: events.put_nowait(None))
    while (event := await events.get()) is not None:
        yield event
    review = stored_review_of(task.result())
    yield format_event(REVIEW_FINISHED, to_review_response(review, NO_DECISIONS))
