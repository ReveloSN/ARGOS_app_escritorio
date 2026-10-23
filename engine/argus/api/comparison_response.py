from argus.api.review_response import alert_response, decisions_response, document_response
from argus.api.schemas.comparison import (
    ChangeResponse,
    ChangeSummaryResponse,
    CharacterEditResponse,
    ComparisonResponse,
    PairComparisonResponse,
    SegmentResponse,
    TextSpanResponse,
    WordEditResponse,
)
from argus.application.alert_explanation import AlertExplainer
from argus.application.decision_history import DecisionsState
from argus.domain.text_comparison.change import Change
from argus.domain.text_comparison.report import (
    ChangeSummary,
    ComparisonReport,
    NumberedChange,
    PairComparison,
)
from argus.domain.text_comparison.segment import Segment, TextSpan
from argus.domain.text_comparison.text_diff import WordEdit
from argus.infrastructure.persistence.alert_serialization import location_payload


def to_comparison_response(
    report: ComparisonReport, decisions: DecisionsState, explainer: AlertExplainer
) -> ComparisonResponse:
    content = report.content
    inconsistencies = report.numbered_inconsistencies
    explanations = explainer.explain([item.alert for item in inconsistencies])
    return ComparisonResponse(
        id=report.id,
        name=content.name,
        mode=content.mode,
        created_at=report.created_at,
        documents=[document_response(document) for document in content.documents],
        summary=_summary(report.summary),
        pairs=[_pair(pair, _changes_of(report, index)) for index, pair in enumerate(content.pairs)],
        inconsistencies=[
            alert_response(item, explanation)
            for item, explanation in zip(inconsistencies, explanations, strict=True)
        ],
        decisions=decisions_response(decisions),
    )


def _changes_of(report: ComparisonReport, pair_index: int) -> list[NumberedChange]:
    return [item for item in report.numbered_changes if item.pair_index == pair_index]


def _pair(pair: PairComparison, changes: list[NumberedChange]) -> PairComparisonResponse:
    return PairComparisonResponse(
        first_document=pair.first_document,
        second_document=pair.second_document,
        summary=_summary(pair.summary),
        changes=[_change(item.number, item.change) for item in changes],
        first_segments=[_segment(segment) for segment in pair.first_segments],
        second_segments=[_segment(segment) for segment in pair.second_segments],
        match_ratio=pair.match_ratio,
        seems_unrelated=pair.seems_unrelated,
    )


def _summary(summary: ChangeSummary) -> ChangeSummaryResponse:
    return ChangeSummaryResponse(
        by_kind={str(kind): total for kind, total in summary.by_kind.items()},
        by_risk={str(risk): total for risk, total in summary.by_risk.items()},
    )


def _change(number: int, change: Change) -> ChangeResponse:
    return ChangeResponse(
        number=number,
        kind=change.kind,
        risk=change.risk,
        materialities=list(change.materialities),
        is_moved=change.is_moved,
        first=_optional_segment(change.first),
        second=_optional_segment(change.second),
        edits=[_edit(edit) for edit in change.edits],
    )


def _optional_segment(segment: Segment | None) -> SegmentResponse | None:
    return _segment(segment) if segment else None


def _segment(segment: Segment) -> SegmentResponse:
    return SegmentResponse(
        position=segment.position,
        kind=segment.kind,
        text=segment.text,
        document=segment.origin.document_name,
        location=location_payload(segment.origin.location),
        span=_span(segment.origin.span),
    )


def _edit(edit: WordEdit) -> WordEditResponse:
    return WordEditResponse(
        kind=edit.kind,
        first=_span(edit.first),
        second=_span(edit.second),
        first_text=edit.first_text,
        second_text=edit.second_text,
        characters=[
            CharacterEditResponse(
                kind=character.kind, first=_span(character.first), second=_span(character.second)
            )
            for character in edit.characters
        ],
    )


def _span(span: TextSpan | None) -> TextSpanResponse | None:
    return TextSpanResponse(start=span.start, end=span.end) if span else None
