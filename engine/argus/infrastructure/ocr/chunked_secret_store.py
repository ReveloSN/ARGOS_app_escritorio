from collections.abc import Callable
from threading import Lock

from argus.application.ports.secrets import SecretStore

# El Administrador de credenciales de Windows guarda hasta 2560 bytes por entrada (1280
# caracteres en UTF-16); una clave de cuenta de servicio de Google mide más del doble.
CHUNK_CHARACTERS = 1000
PART_SEPARATOR = "#"
# Delante del número mientras las partes se escriben: `remove` las encuentra y `read` no las lee.
WRITING_MARK = "~"


class ChunkedSecretStore:
    """Guarda un secreto largo en varias entradas del llavero: la cuenta principal dice cuántas
    partes hay y cada parte va en «cuenta#n».

    El número se escribe antes que las partes y se confirma al final, sin la marca. Así ninguna
    parte queda sin quien la encuentre y un corte no mezcla un secreto con otro.
    """

    def __init__(self, entry: Callable[[str], SecretStore], account: str) -> None:
        self._entry = entry
        self._account = account
        # Leer a mitad de una reescritura juntaría partes de dos secretos.
        self._lock = Lock()

    def read(self) -> str | None:
        with self._lock:
            count = self._entry(self._account).read()
            if not count or not count.isdigit():
                return None
            parts = [self._part(index).read() for index in range(int(count))]
        if any(part is None for part in parts):
            return None
        return "".join(part for part in parts if part is not None)

    def store(self, secret: str) -> None:
        parts = [
            secret[start : start + CHUNK_CHARACTERS]
            for start in range(0, len(secret), CHUNK_CHARACTERS)
        ]
        with self._lock:
            self._remove_all()
            self._entry(self._account).store(f"{WRITING_MARK}{len(parts)}")
            for index, part in enumerate(parts):
                self._part(index).store(part)
            self._entry(self._account).store(str(len(parts)))

    def remove(self) -> None:
        with self._lock:
            self._remove_all()

    def _remove_all(self) -> None:
        count = (self._entry(self._account).read() or "").removeprefix(WRITING_MARK)
        if count.isdigit():
            for index in range(int(count)):
                self._part(index).remove()
        # Al final: mientras quede una parte, el número dice dónde está.
        self._entry(self._account).remove()

    def _part(self, index: int) -> SecretStore:
        return self._entry(f"{self._account}{PART_SEPARATOR}{index}")
