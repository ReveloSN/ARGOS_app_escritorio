from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from argus.application.ports.document_reader import DocumentSource


@dataclass(frozen=True)
class ArchivedFile:
    """Copia de un archivo leído, para abrirlo después desde el detalle de la alerta."""

    session_id: str
    position: int
    source: DocumentSource


class DocumentArchive(Protocol):
    def store(self, file: ArchivedFile) -> None: ...

    def path_of(self, session_id: str, position: int) -> Path | None:
        """Ruta de la copia, o None si ya no está (se movió o se borró)."""
        ...

    def delete_session(self, session_id: str) -> None: ...


class FileOpener(Protocol):
    def open(self, path: Path) -> None:
        """Abre el archivo con la aplicación predeterminada del sistema."""
        ...
