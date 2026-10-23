from typing import Protocol


class SecretStore(Protocol):
    """La clave del proveedor de IA en el llavero del sistema operativo (CLAUDE.md §8).

    Cada método lanza KeychainUnavailableError si el llavero no se puede usar.
    """

    def read(self) -> str | None: ...

    def store(self, secret: str) -> None: ...

    def remove(self) -> None: ...
