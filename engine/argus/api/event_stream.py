"""Server-Sent Events (ADR 004): el avance de un trabajo en otro hilo y, al final, su resultado."""

import asyncio
from collections.abc import AsyncIterator, Callable

from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool


class EmptyEvent(BaseModel):
    pass


def format_event(name: str, payload: BaseModel) -> str:
    return f"event: {name}\ndata: {payload.model_dump_json(by_alias=True)}\n\n"


class EventChannel:
    """Lleva los avisos del hilo de trabajo al bucle de eventos, en el orden en que llegan.

    Se crea dentro del flujo de respuesta, que ya corre en el bucle de eventos.
    """

    def __init__(self) -> None:
        self._loop = asyncio.get_running_loop()
        self._queue: asyncio.Queue[str | None] = asyncio.Queue()

    def put(self, name: str, payload: BaseModel) -> None:
        self._loop.call_soon_threadsafe(self._queue.put_nowait, format_event(name, payload))

    async def stream[Result](
        self, work: Callable[[], Result], finish: Callable[[Result], str]
    ) -> AsyncIterator[str]:
        """Eventos de avance y, al final, el que arma `finish` con el resultado.

        Si el trabajo falla, el flujo termina sin el evento final y la interfaz lo informa.
        """
        task = asyncio.ensure_future(run_in_threadpool(work))
        # El aviso de fin entra a la cola después de todos los de avance: llegan en orden.
        task.add_done_callback(lambda _: self._queue.put_nowait(None))
        while (event := await self._queue.get()) is not None:
            yield event
        yield finish(task.result())
