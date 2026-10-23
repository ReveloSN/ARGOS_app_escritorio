from pathlib import Path, PurePath

from argus.application.ports.document_archive import FileOpener


class FileSystemDraftOutbox:
    """Guarda la copia corregida en la carpeta del historial y la abre con el cliente de correo.

    Cada revisión tiene su carpeta: abrir de nuevo reemplaza la copia anterior de ese borrador.
    """

    def __init__(self, directory: Path, opener: FileOpener) -> None:
        self._directory = directory
        self._opener = opener

    def deliver(self, review_id: str, file_name: str, content: bytes) -> None:
        folder = self._directory / review_id
        folder.mkdir(parents=True, exist_ok=True)
        # Solo el nombre: un nombre con carpetas no debe escribir fuera de la carpeta del borrador.
        path = folder / PurePath(file_name).name
        path.write_bytes(content)
        self._opener.open(path)
