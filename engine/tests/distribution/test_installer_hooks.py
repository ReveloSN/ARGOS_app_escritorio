"""El instalador de Windows conoce la carpeta del historial del motor (ADR 034)."""

import json
import re
from pathlib import Path

from argus.infrastructure.history_location import APP_NAME

TAURI = Path(__file__).resolve().parents[3] / "app" / "src-tauri"


def installer_hooks() -> str:
    config = json.loads((TAURI / "tauri.conf.json").read_text(encoding="utf-8"))
    hooks: str = config["bundle"]["windows"]["nsis"]["installerHooks"]
    return (TAURI / hooks).read_text(encoding="utf-8")


def folder_named(define: str) -> str:
    found = re.search(rf'^!define {define} "(.+)"$', installer_hooks(), re.MULTILINE)
    assert found is not None
    return found.group(1)


def test_the_hooks_guard_the_folder_where_the_engine_keeps_the_history() -> None:
    assert folder_named("ARGUS_DATA_FOLDER") == rf"$LOCALAPPDATA\{APP_NAME}"


def test_the_program_folder_is_outside_the_history() -> None:
    program = folder_named("ARGUS_PROGRAM_FOLDER")
    data = folder_named("ARGUS_DATA_FOLDER")

    assert program != data
    assert not program.startswith(f"{data}\\")


def test_the_hooks_never_delete_a_folder_with_its_content() -> None:
    assert re.search(r"^\s*RMDir\s+/r", installer_hooks(), re.MULTILINE | re.IGNORECASE) is None
