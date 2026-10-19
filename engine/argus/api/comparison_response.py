from collections.abc import Iterator
from itertools import count

from argus.api.review_response import document_response
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
from argus.domain.text_comparison.change import Change
from argus.domain.text_comparison.report import ChangeSummary, ComparisonReport, PairComparison
from argus.domain.text_comparison.segment import Segment, TextSpan
from argus.domain.text_comparison.text_diff import WordEdit
from argus.infrastructure.persistence.alert_serialization import location_payload

FIRST_CHANGE_NUMBER = 1


def to_comparison_response(report: ComparisonReport) -> ComparisonResponse:
    content = report.content
    numbers = count(FIRST_CHANGE_NUMBER)
    return ComparisonResponse(
        id=report.id,
        name=content.name,
        mode=content.mode,
        created_at=report.created_at,
        documents=[document_response(document) for document in content.documents],
        summary=_summary(report.summary),
        pairs=[_pair(pair, numbers) for pair in content.pairs],
    )


def _pair(pair: PairComparison, numbers: Iterator[int]) -> PairComparisonResponse:
    return PairComparisonResponse(
        first_document=pair.first_document,
        second_document=pair.second_document,
        summary=_summary(pair.summary),
        changes=[_change(next(numbers), change) for change in pair.changes],
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
        first=_segment(change.first),
        second=_segment(change.second),
        edits=[_edit(edit) for edit in change.edits],
    )


def _segment(segment: Segment | None) -> SegmentResponse | None:
    if segment is None:
        return None
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
