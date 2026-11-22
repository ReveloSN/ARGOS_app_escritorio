"""Dobles para ordenar hilos con eventos, sin depender de esperas a ciegas."""

from threading import Event, Lock
from types import TracebackType
from typing import Self

TIMEOUT_SECONDS = 5


class Pause:
    """Detiene una llamada al proveedor hasta que la prueba sale del bloque `with`."""

    def __init__(self) -> None:
        self.entered = Event()
        self._release = Event()

    def __enter__(self) -> Self:
        return self

    def __exit__(
        self, _type: type[BaseException] | None, _error: object, _trace: TracebackType | None
    ) -> None:
        self.release()

    def release(self) -> None:
        self._release.set()

    def hold(self) -> None:
        self.entered.set()
        assert self._release.wait(TIMEOUT_SECONDS)


class WatchedLock:
    """Un candado que avisa cuando alguien se queda esperándolo."""

    def __init__(self, waiting: Event) -> None:
        self._lock = Lock()
        self._waiting = waiting

    def __enter__(self) -> None:
        if not self._lock.acquire(blocking=False):
            self._waiting.set()
            assert self._lock.acquire(timeout=TIMEOUT_SECONDS)

    def __exit__(self, *_error: object) -> None:
        self._lock.release()
