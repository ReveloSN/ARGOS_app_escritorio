from datetime import UTC, datetime

import pytest

from argus.application.decision_history import DecisionHistories, DecisionRequest
from argus.application.text_comparison.comparison_decisions import ComparisonDecisions
from argus.domain.decision import DecisionKind
from argus.domain.errors import ComparisonItemNotFoundError, ComparisonNotFoundError
from argus.domain.risk import RiskLevel
from argus.domain.text_comparison.change import Change, ChangeKind
from argus.domain.text_comparison.modes import ComparisonModeName
from argus.domain.text_comparison.report import (
    ComparisonContent,
    ComparisonReport,
    PairComparison,
)
from tests.application.in_memory_repositories import (
    InMemoryComparisonRepository,
    InMemoryDecisionRepository,
    SteppingClock,
)
from tests.application.test_run_review import CONTRACT_ALERT
from tests.domain.text_comparison.segment_builders import segments_of

(SEGMENT,) = segments_of("v2.docx", "Cláusula penal")


def saved_report() -> tuple[ComparisonDecisions, str]:
    added = Change(ChangeKind.ADDED, RiskLevel.MEDIUM, (), None, SEGMENT, (), False)
    content = ComparisonContent(
        "Arrendamiento",
        ComparisonModeName.VERSIONS,
        (),
        (PairComparison("v1.docx", "v2.docx", (added,)),),
        (CONTRACT_ALERT,),
    )
    report = ComparisonReport.start(content, datetime(2026, 10, 22, tzinfo=UTC))
    comparisons = InMemoryComparisonRepository()
    comparisons.save(report)
    histories = DecisionHistories(InMemoryDecisionRepository(), SteppingClock())
    return ComparisonDecisions(comparisons, histories), report.id


def test_changes_and_inconsistencies_are_decided_and_undone_in_order() -> None:
    decisions, comparison_id = saved_report()

    decisions.decide(comparison_id, DecisionRequest(1, DecisionKind.ERROR))
    state = decisions.decide(comparison_id, DecisionRequest(2, DecisionKind.CORRECT))
    undone = decisions.undo(comparison_id)

    assert [(d.alert_number, d.kind) for d in state.decisions] == [
        (1, DecisionKind.ERROR),
        (2, DecisionKind.CORRECT),
    ]
    assert [d.alert_number for d in undone.decisions] == [1]
    assert undone.can_undo


def test_a_number_outside_the_comparison_is_rejected() -> None:
    decisions, comparison_id = saved_report()

    with pytest.raises(ComparisonItemNotFoundError):
        decisions.decide(comparison_id, DecisionRequest(3, DecisionKind.IGNORED))
    with pytest.raises(ComparisonNotFoundError):
        decisions.decide("no-existe", DecisionRequest(1, DecisionKind.IGNORED))
    assert not decisions.state(comparison_id).can_undo
