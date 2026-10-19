import pytest

from argus.domain.errors import ComparisonNotFoundError, UnreadableReason
from argus.domain.locations import TableCellLocation
from argus.domain.read_outcome import ReadSummary
from argus.domain.risk import RiskLevel
from argus.domain.text_comparison.change import Change, ChangeKind, Materiality
from argus.domain.text_comparison.modes import ComparisonModeName
from argus.domain.text_comparison.report import (
    ComparisonContent,
    ComparisonReport,
    PairComparison,
)
from argus.domain.text_comparison.segment import Segment, SegmentKind, SegmentOrigin
from argus.domain.text_comparison.text_diff import diff_words
from argus.infrastructure.persistence.sqlite_comparison_repository import (
    SqliteComparisonRepository,
)
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase
from tests.domain.text_comparison.segment_builders import segments_of
from tests.infrastructure.persistence.conftest import STARTED

(FIRST,) = segments_of("v1.pdf", "Contrato No. 4857 de arrendamiento")
(SECOND,) = segments_of("v2.pdf", "Contrato No. 4587 de arrendamiento")
ROW = Segment(
    2,
    SegmentKind.TABLE_ROW,
    "Canon | $ 18.450.000",
    SegmentOrigin("v2.pdf", TableCellLocation(1, 2, 1), None),
)


def report() -> ComparisonReport:
    modified = Change(
        ChangeKind.MODIFIED,
        RiskLevel.HIGH,
        (Materiality.NUMBER,),
        FIRST,
        SECOND,
        diff_words(FIRST.text, SECOND.text),
        is_moved=True,
    )
    added = Change(ChangeKind.ADDED, RiskLevel.HIGH, (Materiality.AMOUNT,), None, ROW, (), False)
    content = ComparisonContent(
        "Arrendamiento",
        ComparisonModeName.VERSIONS,
        (ReadSummary("v1.pdf", None, 3), ReadSummary("escaneado.pdf", UnreadableReason.NO_TEXT, 0)),
        (PairComparison("v1.pdf", "v2.pdf", (modified, added)),),
    )
    return ComparisonReport.start(content, STARTED)


def test_a_saved_comparison_opens_exactly_as_it_was(database: SqliteDatabase) -> None:
    repository = SqliteComparisonRepository(database)
    saved = report()

    repository.save(saved)

    assert repository.get(saved.id) == saved


def test_an_unknown_comparison_is_reported(database: SqliteDatabase) -> None:
    with pytest.raises(ComparisonNotFoundError):
        SqliteComparisonRepository(database).get("no-existe")
