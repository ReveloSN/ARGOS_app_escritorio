import os
import subprocess
import sys
from pathlib import Path

import pytest

from argus.application.ports.document_archive import ArchivedFile
from argus.application.ports.document_reader import DocumentSource
from argus.infrastructure import system_file_opener
from argus.infrastructure.file_system_document_archive import (
    FileSystemDocumentArchive,
    safe_file_name,
)
from argus.infrastructure.system_file_opener import SystemFileOpener


def test_stored_copy_keeps_the_name_and_content(tmp_path: Path) -> None:
    archive = FileSystemDocumentArchive(tmp_path)

    archive.store(ArchivedFile("sesion", 0, DocumentSource("Contrato 4857.pdf", b"%PDF-1.7")))

    path = archive.path_of("sesion", 0)
    assert path is not None
    assert path.name == "Contrato 4857.pdf"
    assert path.read_bytes() == b"%PDF-1.7"


def test_missing_copy_has_no_path(tmp_path: Path) -> None:
    assert FileSystemDocumentArchive(tmp_path).path_of("sesion", 3) is None


def test_deleting_a_session_removes_its_copies(tmp_path: Path) -> None:
    archive = FileSystemDocumentArchive(tmp_path)
    archive.store(ArchivedFile("sesion", 0, DocumentSource("a.pdf", b"%PDF")))
    archive.store(ArchivedFile("otra", 0, DocumentSource("b.pdf", b"%PDF")))

    archive.delete_session("sesion")
    archive.delete_session("no-existe")

    assert archive.path_of("sesion", 0) is None
    assert archive.path_of("otra", 0) is not None


@pytest.mark.parametrize(
    ("name", "safe"),
    [
        ("../../secreto.txt", "secreto.txt"),
        ("C:\\Windows\\system.ini", "system.ini"),
        ('acta: "final"?.docx', "acta_ _final__.docx"),
        ("...", "archivo"),
    ],
)
def test_names_never_point_outside_the_session_folder(name: str, safe: str) -> None:
    assert safe_file_name(name) == safe


def test_opener_uses_the_system_launcher(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    launched: list[object] = []
    monkeypatch.setattr(os, "startfile", launched.append, raising=False)
    monkeypatch.setattr(subprocess, "Popen", lambda command, **_: launched.append(command))

    SystemFileOpener().open(tmp_path / "contrato.pdf")

    expected = (
        tmp_path / "contrato.pdf"
        if sys.platform == "win32"
        else [system_file_opener.LINUX_OPENER, str(tmp_path / "contrato.pdf")]
    )
    assert launched == [expected]
