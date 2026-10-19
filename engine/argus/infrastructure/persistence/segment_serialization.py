"""Segmentos y ediciones ↔ diccionarios JSON, conservando el origen de cada segmento."""

from typing import TypedDict

from argus.domain.text_comparison.segment import Segment, SegmentKind, SegmentOrigin, TextSpan
from argus.domain.text_comparison.text_diff import CharacterEdit, EditKind, WordEdit
from argus.infrastructure.persistence.alert_serialization import (
    LocationPayload,
    location_from_payload,
    location_payload,
)

type SpanPayload = list[int] | None


class SegmentPayload(TypedDict):
    position: int
    kind: str
    text: str
    document: str
    location: LocationPayload
    span: SpanPayload


class CharacterPayload(TypedDict):
    kind: str
    first: SpanPayload
    second: SpanPayload


class EditPayload(TypedDict):
    kind: str
    first: SpanPayload
    second: SpanPayload
    first_text: str
    second_text: str
    characters: list[CharacterPayload]


def span_payload(span: TextSpan | None) -> SpanPayload:
    return [span.start, span.end] if span else None


def span_from_payload(payload: SpanPayload) -> TextSpan | None:
    return TextSpan(payload[0], payload[1]) if payload else None


def segment_payload(segment: Segment) -> SegmentPayload:
    origin = segment.origin
    return {
        "position": segment.position,
        "kind": segment.kind,
        "text": segment.text,
        "document": origin.document_name,
        "location": location_payload(origin.location),
        "span": span_payload(origin.span),
    }


def segment_from_payload(payload: SegmentPayload) -> Segment:
    origin = SegmentOrigin(
        payload["document"],
        location_from_payload(payload["location"]),
        span_from_payload(payload["span"]),
    )
    return Segment(payload["position"], SegmentKind(payload["kind"]), payload["text"], origin)


def edit_payload(edit: WordEdit) -> EditPayload:
    return {
        "kind": edit.kind,
        "first": span_payload(edit.first),
        "second": span_payload(edit.second),
        "first_text": edit.first_text,
        "second_text": edit.second_text,
        "characters": [
            {
                "kind": character.kind,
                "first": span_payload(character.first),
                "second": span_payload(character.second),
            }
            for character in edit.characters
        ],
    }


def edit_from_payload(payload: EditPayload) -> WordEdit:
    characters = tuple(
        CharacterEdit(
            EditKind(character["kind"]),
            span_from_payload(character["first"]),
            span_from_payload(character["second"]),
        )
        for character in payload["characters"]
    )
    return WordEdit(
        EditKind(payload["kind"]),
        span_from_payload(payload["first"]),
        span_from_payload(payload["second"]),
        payload["first_text"],
        payload["second_text"],
        characters,
    )
