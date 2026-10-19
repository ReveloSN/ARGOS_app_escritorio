"""Archivos subidos y respuestas en flujo, compartidos por revisiones y comparaciones."""

from collections.abc import AsyncIterator, Sequence

from fastapi import UploadFile
from fastapi.responses import StreamingResponse

from argus.application.ports.document_reader import DocumentSource

UNNAMED_FILE = "archivo_sin_nombre"
EVENT_STREAM = "text/event-stream"
# Sin caché ni búfer intermedio: cada evento debe llegar apenas se produce.
STREAM_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


async def uploaded_sources(files: Sequence[UploadFile]) -> tuple[DocumentSource, ...]:
    return tuple(
        [DocumentSource(file.filename or UNNAMED_FILE, await file.read()) for file in files]
    )


def event_stream_response(events: AsyncIterator[str]) -> StreamingResponse:
    return StreamingResponse(events, media_type=EVENT_STREAM, headers=STREAM_HEADERS)
