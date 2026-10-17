"""Dónde vive el historial: la carpeta de datos del sistema o la que el usuario eligió."""

import json
import os
import shutil
import sqlite3
from pathlib import Path

from platformdirs import user_data_path

from argus.domain.errors import HistoryFolderError, HistoryFolderProblem

APP_NAME = "ARGUS"
DATABASE_FILE_NAME = "argus.sqlite3"
ARCHIVE_FOLDER_NAME = "documents"
# El puntero queda siempre en la carpeta del sistema: es lo primero que lee el motor al arrancar.
POINTER_FILE_NAME = "location.json"
WRITE_PROBE_NAME = ".argus-escritura"
# Instalaciones portables y pruebas del motor empaquetado: los datos van a otra carpeta.
DATA_ENV_VAR = "ARGUS_DATA_DIR"


def default_data_directory() -> Path:
    """Carpeta de datos de la app según el sistema operativo (AppData, ~/.local/share…)."""
    configured = os.environ.get(DATA_ENV_VAR)
    return Path(configured) if configured else user_data_path(APP_NAME, appauthor=False)


class JsonHistoryPointer:
    def __init__(self, default_directory: Path) -> None:
        self._file = default_directory / POINTER_FILE_NAME

    def point_to(self, folder: Path) -> None:
        self._file.parent.mkdir(parents=True, exist_ok=True)
        self._file.write_text(json.dumps({"dataDirectory": str(folder)}), encoding="utf-8")

    def resolve(self, default_directory: Path) -> Path:
        """La carpeta elegida si existe; si no (se desconectó o se borró), la del sistema."""
        if not self._file.is_file():
            return default_directory
        folder = Path(json.loads(self._file.read_text(encoding="utf-8"))["dataDirectory"])
        return folder if folder.is_dir() else default_directory


def _count_sessions(database: Path) -> int:
    with sqlite3.connect(database) as connection:
        return int(connection.execute("SELECT COUNT(*) FROM sessions").fetchone()[0])


def _count_files(folder: Path) -> int:
    return sum(1 for path in folder.rglob("*") if path.is_file()) if folder.is_dir() else 0


class FileSystemHistoryCopier:
    """Copia la base (con la copia en caliente de SQLite) y las copias de los archivos."""

    def __init__(self, source: Path) -> None:
        self._source = source

    def copy_to(self, target: Path) -> None:
        _require_writable(target)
        if (target / DATABASE_FILE_NAME).exists():
            raise HistoryFolderError(HistoryFolderProblem.HAS_HISTORY)
        self._copy_database(target / DATABASE_FILE_NAME)
        archive = self._source / ARCHIVE_FOLDER_NAME
        if archive.is_dir():
            shutil.copytree(archive, target / ARCHIVE_FOLDER_NAME, dirs_exist_ok=True)
        self._verify(target)

    def _copy_database(self, destination: Path) -> None:
        with (
            sqlite3.connect(self._source / DATABASE_FILE_NAME) as origin,
            sqlite3.connect(destination) as copy,
        ):
            origin.backup(copy)

    def _verify(self, target: Path) -> None:
        same_sessions = _count_sessions(self._source / DATABASE_FILE_NAME) == _count_sessions(
            target / DATABASE_FILE_NAME
        )
        same_files = _count_files(self._source / ARCHIVE_FOLDER_NAME) == _count_files(
            target / ARCHIVE_FOLDER_NAME
        )
        if not (same_sessions and same_files):
            raise HistoryFolderError(HistoryFolderProblem.COPY_MISMATCH)


def _require_writable(folder: Path) -> None:
    probe = folder / WRITE_PROBE_NAME
    try:
        folder.mkdir(parents=True, exist_ok=True)
        probe.write_bytes(b"")
        probe.unlink()
    except OSError as error:
        raise HistoryFolderError(HistoryFolderProblem.NOT_WRITABLE) from error
