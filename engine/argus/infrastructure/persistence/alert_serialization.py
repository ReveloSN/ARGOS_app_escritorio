"""Alertas ↔ JSON, conservando el origen exacto (archivo, ubicación y fragmento) de cada valor."""

import json
from collections.abc import Callable
from dataclasses import asdict
from typing import TypedDict

from argus.domain.alert import Alert, AlertSide
from argus.domain.comparison.difference import Difference, DifferenceKind
from argus.domain.entity import Entity, EntityType, Occurrence
from argus.domain.locations import (
    EmailPart,
    EmailPartLocation,
    LineLocation,
    PageLocation,
    ParagraphLocation,
    SheetCellLocation,
    SourceLocation,
    TableCellLocation,
)
from argus.domain.risk import RiskLevel

type LocationPayload = dict[str, str | int]


class EntityPayload(TypedDict):
    type: str
    raw: str
    normalized: str
    document: str
    location: LocationPayload
    excerpt: str


class DifferencePayload(TypedDict):
    kind: str
    confidence: float
    positions: list[int]


class AlertPayload(TypedDict):
    first: list[EntityPayload]
    second: list[EntityPayload]
    difference: DifferencePayload
    risk: str


LOCATION_KINDS: dict[type, str] = {
    PageLocation: "page",
    ParagraphLocation: "paragraph",
    TableCellLocation: "table_cell",
    SheetCellLocation: "sheet_cell",
    EmailPartLocation: "email_part",
    LineLocation: "line",
}
LOCATION_BUILDERS: dict[str, Callable[[LocationPayload], SourceLocation]] = {
    "page": lambda data: PageLocation(int(data["page"])),
    "paragraph": lambda data: ParagraphLocation(int(data["paragraph"])),
    "table_cell": lambda data: TableCellLocation(
        int(data["table"]), int(data["row"]), int(data["column"])
    ),
    "sheet_cell": lambda data: SheetCellLocation(str(data["sheet"]), str(data["cell"])),
    "email_part": lambda data: EmailPartLocation(EmailPart(str(data["part"]))),
    "line": lambda data: LineLocation(int(data["line"])),
}


def alert_to_json(alert: Alert) -> str:
    payload: AlertPayload = {
        "first": [_entity_payload(entity) for entity in alert.first.entities],
        "second": [_entity_payload(entity) for entity in alert.second.entities],
        "difference": {
            "kind": alert.difference.kind,
            "confidence": alert.difference.confidence,
            "positions": list(alert.difference.positions),
        },
        "risk": alert.risk,
    }
    return json.dumps(payload, ensure_ascii=False)


def alert_from_json(text: str) -> Alert:
    payload: AlertPayload = json.loads(text)
    difference = payload["difference"]
    return Alert(
        AlertSide(tuple(_entity(item) for item in payload["first"])),
        AlertSide(tuple(_entity(item) for item in payload["second"])),
        Difference(
            DifferenceKind(difference["kind"]),
            difference["confidence"],
            tuple(difference["positions"]),
        ),
        RiskLevel(payload["risk"]),
    )


def location_payload(location: SourceLocation) -> LocationPayload:
    """Ubicación como diccionario con su tipo: {"kind": "page", "page": 1}."""
    return {"kind": LOCATION_KINDS[type(location)], **asdict(location)}


def location_from_payload(payload: LocationPayload) -> SourceLocation:
    return LOCATION_BUILDERS[str(payload["kind"])](payload)


def location_from_json(text: str) -> SourceLocation:
    payload: LocationPayload = json.loads(text)
    return location_from_payload(payload)


def _entity_payload(entity: Entity) -> EntityPayload:
    location = entity.occurrence.location
    return {
        "type": entity.type,
        "raw": entity.raw_value,
        "normalized": entity.normalized_value,
        "document": entity.occurrence.document_name,
        "location": location_payload(location),
        "excerpt": entity.occurrence.excerpt,
    }


def _entity(payload: EntityPayload) -> Entity:
    location = location_from_payload(payload["location"])
    occurrence = Occurrence(payload["document"], location, payload["excerpt"])
    return Entity(EntityType(payload["type"]), payload["raw"], payload["normalized"], occurrence)
