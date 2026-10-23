import pytest

from argus.domain.errors import InvalidValueError, UnreadableReason
from argus.domain.ocr import PageCount, ReadMethod
from argus.domain.read_outcome import DocumentReadOutcome


def test_page_count_cannot_pass_the_total() -> None:
    assert PageCount(2, 4).done == 2
    with pytest.raises(InvalidValueError):
        PageCount(5, 4)


def test_summary_keeps_how_the_file_was_read_and_its_pages() -> None:
    outcome = DocumentReadOutcome(
        "anexo_3.pdf", None, UnreadableReason.NO_TEXT, ReadMethod.LOCAL_OCR, 4
    )

    summary = outcome.summary

    assert summary.method is ReadMethod.LOCAL_OCR
    assert summary.page_count == 4


def test_a_file_read_without_ocr_says_so() -> None:
    summary = DocumentReadOutcome("contrato.pdf", None, UnreadableReason.CORRUPTED).summary

    assert summary.method is ReadMethod.TEXT
    assert summary.page_count is None
