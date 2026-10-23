from datetime import UTC, datetime

from argus.domain.alert import Alert
from argus.domain.entity import EntityType
from argus.domain.risk import RiskLevel
from argus.domain.text_comparison.change import Change, ChangeKind, Materiality
from argus.domain.text_comparison.modes import ComparisonModeName
from argus.domain.text_comparison.report import (
    ComparisonContent,
    ComparisonReport,
    PairComparison,
)
from tests.domain.alert_builders import candidate
from tests.domain.text_comparison.segment_builders import segments_of

FIRST = segments_of("v1.docx", "Objeto", "Canon", "Plazo", "Multas")
SECOND = segments_of("v2.docx", "Objeto", "Canon", "Garantías")
ALERT = Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH)


def removed(position: int) -> Change:
    return Change(ChangeKind.REMOVED, RiskLevel.MEDIUM, (), FIRST[position - 1], None, (), False)


def added(position: int) -> Change:
    return Change(ChangeKind.ADDED, RiskLevel.MEDIUM, (), None, SECOND[position - 1], (), False)


def pair(*changes: Change) -> PairComparison:
    return PairComparison("v1.docx", "v2.docx", changes, FIRST, SECOND)


def test_the_match_ratio_counts_the_segments_that_found_a_pair() -> None:
    assert pair(removed(3), removed(4), added(3)).match_ratio == 2 / 4
    assert not pair(removed(3), removed(4), added(3)).seems_unrelated


def test_versions_with_almost_nothing_in_common_seem_unrelated() -> None:
    unrelated = pair(removed(1), removed(2), removed(3), removed(4), added(1), added(2))

    assert unrelated.match_ratio == 0
    assert unrelated.seems_unrelated
    assert PairComparison("a", "b", ()).match_ratio == 1


def test_changes_and_inconsistencies_share_one_numbering() -> None:
    content = ComparisonContent(
        "Arrendamiento",
        ComparisonModeName.CONTRACT_ANNEXES,
        (),
        (pair(removed(3)), pair(added(3), removed(4))),
        (ALERT,),
    )

    report = ComparisonReport.start(content, datetime(2026, 10, 22, tzinfo=UTC))

    assert [(item.number, item.pair_index) for item in report.numbered_changes] == [
        (1, 0),
        (2, 1),
        (3, 1),
    ]
    assert [item.number for item in report.numbered_inconsistencies] == [4]
    assert report.has_item(4)
    assert not report.has_item(5)
    assert not report.has_item(0)
    assert report.summary.by_kind[ChangeKind.REMOVED] == 2
    assert Materiality.NUMBER not in {m for c in content.pairs[0].changes for m in c.materialities}
