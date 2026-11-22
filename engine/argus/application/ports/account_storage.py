from typing import Protocol

from argus.domain.account import StoredSession


class SessionStore(Protocol):
    """La cuenta y su token de renovación en el llavero del sistema operativo.

    Cada método lanza KeychainUnavailableError si el llavero no se puede usar.
    """

    def read(self) -> StoredSession | None: ...

    def write(self, session: StoredSession) -> None: ...

    def clear(self) -> None: ...


class GatePreference(Protocol):
    """«Continuar sin cuenta». No es secreto y va aparte: guardar otros Ajustes no lo pisa."""

    def is_skipped(self) -> bool: ...

    def set_skipped(self, value: bool) -> None: ...
