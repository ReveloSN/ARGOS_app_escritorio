"""Segmentos de prueba con su origen, para no repetir la construcción en cada prueba."""

from argus.domain.locations import ParagraphLocation
from argus.domain.text_comparison.segment import Segment, SegmentKind, SegmentOrigin, TextSpan


def segments_of(document_name: str, *texts: str) -> tuple[Segment, ...]:
    return tuple(
        Segment(
            position,
            SegmentKind.PARAGRAPH,
            text,
            SegmentOrigin(document_name, ParagraphLocation(position), TextSpan(0, len(text))),
        )
        for position, text in enumerate(texts, start=1)
    )
