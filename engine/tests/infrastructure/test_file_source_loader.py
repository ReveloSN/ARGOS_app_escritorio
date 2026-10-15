from pathlib import Path

import pytest

from argus.application.document_limits import MAX_DOCUMENT_BYTES
from argus.domain.errors import UnreadableDocumentError, UnreadableReason
from argus.infrastructure.file_source_loader import FileSourceLoader


def test_loader_reads_name_and_bytes(tmp_path: Path) -> None:
    path = tmp_path / "notas.txt"
    path.write_bytes(b"Contrato No. 4857")

    source = FileSourceLoader().load(path)

    assert source.name == "notas.txt"
    assert source.content == b"Contrato No. 4857"


def test_default_limit_is_ten_megabytes() -> None:
    assert MAX_DOCUMENT_BYTES == 10 * 1024 * 1024


def test_files_over_the_limit_are_rejected_before_reading(tmp_path: Path) -> None:
    path = tmp_path / "Balance_general_2026.xlsx"
    path.write_bytes(b"x" * 11)

    with pytest.raises(UnreadableDocumentError) as raised:
        FileSourceLoader(max_bytes=10).load(path)

    assert raised.value.document_name == "Balance_general_2026.xlsx"
    assert raised.value.reason is UnreadableReason.TOO_LARGE


def test_missing_file_is_reported_as_unreadable(tmp_path: Path) -> None:
    with pytest.raises(UnreadableDocumentError) as raised:
        FileSourceLoader().load(tmp_path / "movido.pdf")

    assert raised.value.reason is UnreadableReason.NOT_FOUND
