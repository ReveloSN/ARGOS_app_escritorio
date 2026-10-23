from collections.abc import Callable

from argus.application.ports.secrets import SecretStore

# El Administrador de credenciales de Windows guarda hasta 2560 bytes por entrada (1280
# caracteres en UTF-16); una clave de cuenta de servicio de Google mide más del doble.
CHUNK_CHARACTERS = 1000
PART_SEPARATOR = "#"


class ChunkedSecretStore:
    """Guarda un secreto largo en varias entradas del llavero: la cuenta principal dice cuántas
    partes hay y cada parte va en «cuenta#n»."""

    def __init__(self, entry: Callable[[str], SecretStore], account: str) -> None:
        self._entry = entry
        self._account = account

    def read(self) -> str | None:
        count = self._entry(self._account).read()
        if not count or not count.isdigit():
            return None
        parts = [self._part(index).read() for index in range(int(count))]
        if any(part is None for part in parts):
            return None
        return "".join(part for part in parts if part is not None)

    def store(self, secret: str) -> None:
        self.remove()
        parts = [
            secret[start : start + CHUNK_CHARACTERS]
            for start in range(0, len(secret), CHUNK_CHARACTERS)
        ]
        for index, part in enumerate(parts):
            self._part(index).store(part)
        self._entry(self._account).store(str(len(parts)))

    def remove(self) -> None:
        count = self._entry(self._account).read()
        if count and count.isdigit():
            for index in range(int(count)):
                self._part(index).remove()
        self._entry(self._account).remove()

    def _part(self, index: int) -> SecretStore:
        return self._entry(f"{self._account}{PART_SEPARATOR}{index}")
