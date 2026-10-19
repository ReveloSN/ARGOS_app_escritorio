"""Informe de comparación ↔ JSON para guardarlo en SQLite y volver a abrirlo igual."""

import json
from typing import TypedDict

from argus.domain.errors import UnreadableReason
from argus.domain.read_outcome import ReadSummary
from argus.domain.risk import RiskLevel
from argus.domain.text_comparison.change import Change, ChangeKind, Materiality
from argus.domain.text_comparison.modes import ComparisonModeName
from argus.domain.text_comparison.report import ComparisonContent, PairComparison
from argus.infrastructure.persistence.segment_serialization import (
    EditPayload,
    SegmentPayload,
    edit_from_payload,
    edit_payload,
    segment_from_payload,
    segment_payload,
)


class ChangePayload(TypedDict):
    kind: str
    risk: str
    materialities: list[str]
    first: SegmentPayload | None
    second: SegmentPayload | None
    edits: list[EditPayload]
    is_moved: bool


class PairPayload(TypedDict):
    first: str
    second: str
    changes: list[ChangePayload]


class DocumentPayload(TypedDict):
    name: str
    reason: str | None
    fragment_count: int


class ContentPayload(TypedDict):
    name: str
    mode: str
    documents: list[DocumentPayload]
    pairs: list[PairPayload]


def content_to_json(content: ComparisonContent) -> str:
    payload: ContentPayload = {
        "name": content.name,
        "mode": content.mode,
        "documents": [
            {"name": doc.name, "reason": doc.reason, "fragment_count": doc.fragment_count}
            for doc in content.documents
        ],
        "pairs": [
            {
                "first": pair.first_document,
                "second": pair.second_document,
                "changes": [_change_payload(change) for change in pair.changes],
            }
            for pair in content.pairs
        ],
    }
    return json.dumps(payload, ensure_ascii=False)


def content_from_json(text: str) -> ComparisonContent:
    payload: ContentPayload = json.loads(text)
    documents = tuple(
        ReadSummary(
            item["name"],
            UnreadableReason(item["reason"]) if item["reason"] else None,
            item["fragment_count"],
        )
        for item in payload["documents"]
    )
    pairs = tuple(
        PairComparison(item["first"], item["second"], tuple(map(_change, item["changes"])))
        for item in payload["pairs"]
    )
    return ComparisonContent(payload["name"], ComparisonModeName(payload["mode"]), documents, pairs)


def _change_payload(change: Change) -> ChangePayload:
    return {
        "kind": change.kind,
        "risk": change.risk,
        "materialities": list(change.materialities),
        "first": segment_payload(change.first) if change.first else None,
        "second": segment_payload(change.second) if change.second else None,
        "edits": [edit_payload(edit) for edit in change.edits],
        "is_moved": change.is_moved,
    }


def _change(payload: ChangePayload) -> Change:
    first, second = payload["first"], payload["second"]
    return Change(
        ChangeKind(payload["kind"]),
        RiskLevel(payload["risk"]),
        tuple(Materiality(item) for item in payload["materialities"]),
        segment_from_payload(first) if first else None,
        segment_from_payload(second) if second else None,
        tuple(edit_from_payload(edit) for edit in payload["edits"]),
        payload["is_moved"],
    )
