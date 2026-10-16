import re
import shutil
from pathlib import Path, PurePath

from argus.application.ports.document_archive import ArchivedFile

# Caracteres que Windows no admite en nombres de archivo; el resto del nombre se conserva para
# que, al abrir la copia, la aplicación del sistema muestre el nombre que el usuario reconoce.
FORBIDDEN_NAME_CHARACTERS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
REPLACEMENT_CHARACTER = "_"
FALLBACK_NAME = "archivo"


class FileSystemDocumentArchive:
    """Copias de los archivos leídos, en `<carpeta>/<sesión>/<posición>/<nombre>`."""

    def __init__(self, root: Path) -> None:
        self._root = root

    def store(self, file: ArchivedFile) -> None:
        folder = self._folder(file.session_id, file.position)
        folder.mkdir(parents=True, exist_ok=True)
        (folder / safe_file_name(file.source.name)).write_bytes(file.source.content)

    def path_of(self, session_id: str, position: int) -> Path | None:
        folder = self._folder(session_id, position)
        files = sorted(folder.iterdir()) if folder.is_dir() else []
        return files[0] if files else None

    def delete_session(self, session_id: str) -> None:
        folder = self._root / session_id
        if folder.is_dir():
            shutil.rmtree(folder)

    def _folder(self, session_id: str, position: int) -> Path:
        return self._root / session_id / str(position)


def safe_file_name(name: str) -> str:
    """Solo el nombre final, sin rutas ni caracteres prohibidos: nunca escribe fuera de su carpeta."""
    base = PurePath(name.replace("\\", "/")).name
    cleaned = FORBIDDEN_NAME_CHARACTERS.sub(REPLACEMENT_CHARACTER, base).strip(" .")
    return cleaned or FALLBACK_NAME
