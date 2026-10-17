import sqlite3
from pathlib import Path

import pytest

from argus.application.change_history_folder import ChangeHistoryFolder
from argus.domain.errors import HistoryFolderError, HistoryFolderProblem
from argus.infrastructure.history_location import (
    ARCHIVE_FOLDER_NAME,
    DATA_ENV_VAR,
    DATABASE_FILE_NAME,
    FileSystemHistoryCopier,
    JsonHistoryPointer,
    default_data_directory,
)
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase
from argus.infrastructure.persistence.sqlite_session_repository import SqliteSessionRepository
from tests.infrastructure.persistence.conftest import new_session


def history_in(folder: Path) -> Path:
    database = SqliteDatabase(folder / DATABASE_FILE_NAME)
    database.migrate()
    SqliteSessionRepository(database).save(new_session())
    copies = folder / ARCHIVE_FOLDER_NAME / "sesion" / "0"
    copies.mkdir(parents=True)
    (copies / "contrato.pdf").write_bytes(b"%PDF")
    return folder


def sessions_in(folder: Path) -> int:
    with sqlite3.connect(folder / DATABASE_FILE_NAME) as connection:
        return int(connection.execute("SELECT COUNT(*) FROM sessions").fetchone()[0])


def test_the_whole_history_is_copied_and_the_original_is_kept(tmp_path: Path) -> None:
    source = history_in(tmp_path / "antes")

    FileSystemHistoryCopier(source).copy_to(tmp_path / "despues")

    assert sessions_in(tmp_path / "despues") == 1
    assert (tmp_path / "despues" / ARCHIVE_FOLDER_NAME / "sesion" / "0" / "contrato.pdf").is_file()
    assert sessions_in(source) == 1


def test_a_folder_that_already_has_a_history_is_not_overwritten(tmp_path: Path) -> None:
    source = history_in(tmp_path / "antes")
    history_in(tmp_path / "otra")

    with pytest.raises(HistoryFolderError) as raised:
        FileSystemHistoryCopier(source).copy_to(tmp_path / "otra")

    assert raised.value.problem is HistoryFolderProblem.HAS_HISTORY


def test_a_folder_that_cannot_be_written_is_reported(tmp_path: Path) -> None:
    source = history_in(tmp_path / "antes")
    blocked = tmp_path / "archivo"
    blocked.write_text("no es una carpeta", encoding="utf-8")

    with pytest.raises(HistoryFolderError) as raised:
        FileSystemHistoryCopier(source).copy_to(blocked / "historial")

    assert raised.value.problem is HistoryFolderProblem.NOT_WRITABLE


def test_an_incomplete_copy_is_reported(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    source = history_in(tmp_path / "antes")
    monkeypatch.setattr("shutil.copytree", lambda *_, **__: None)

    with pytest.raises(HistoryFolderError) as raised:
        FileSystemHistoryCopier(source).copy_to(tmp_path / "despues")

    assert raised.value.problem is HistoryFolderProblem.COPY_MISMATCH


def test_the_pointer_remembers_the_chosen_folder_while_it_exists(tmp_path: Path) -> None:
    system, chosen = tmp_path / "sistema", tmp_path / "elegida"
    pointer = JsonHistoryPointer(system)
    assert pointer.resolve(system) == system

    chosen.mkdir()
    pointer.point_to(chosen)
    assert pointer.resolve(system) == chosen

    chosen.rmdir()
    assert pointer.resolve(system) == system


class RecordingPointer:
    def __init__(self) -> None:
        self.folders: list[Path] = []

    def point_to(self, folder: Path) -> None:
        self.folders.append(folder)


def test_changing_the_folder_copies_then_points_to_it(tmp_path: Path) -> None:
    source = history_in(tmp_path / "antes")
    pointer = RecordingPointer()

    moved = ChangeHistoryFolder(source, FileSystemHistoryCopier(source), pointer).execute(
        tmp_path / "despues"
    )

    assert moved == tmp_path / "despues"
    assert pointer.folders == [tmp_path / "despues"]


def test_the_same_folder_is_not_a_change(tmp_path: Path) -> None:
    source = history_in(tmp_path / "antes")
    pointer = RecordingPointer()

    with pytest.raises(HistoryFolderError) as raised:
        ChangeHistoryFolder(source, FileSystemHistoryCopier(source), pointer).execute(source)

    assert raised.value.problem is HistoryFolderProblem.SAME_FOLDER
    assert pointer.folders == []


def test_a_portable_install_can_set_the_data_folder(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv(DATA_ENV_VAR, str(tmp_path))

    assert default_data_directory() == tmp_path
