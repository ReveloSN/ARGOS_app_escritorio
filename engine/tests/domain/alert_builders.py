"""Constructores de entidades y alertas para las pruebas del dominio y de la aplicación."""

from argus.domain.alert import AlertCandidate, AlertSide
from argus.domain.comparison.difference import Difference, DifferenceKind
from argus.domain.entity import Entity, EntityType, Occurrence
from argus.domain.locations import PageLocation


def entity(
    entity_type: EntityType, normalized: str, document: str = "Contrato_4857_v3.pdf"
) -> Entity:
    occurrence = Occurrence(document, PageLocation(1), f"…{normalized}…")
    return Entity(entity_type, normalized, normalized, occurrence)


def side(entity_type: EntityType, normalized: str, *documents: str) -> AlertSide:
    names = documents or ("Contrato_4857_v3.pdf",)
    return AlertSide(tuple(entity(entity_type, normalized, name) for name in names))


def candidate(
    entity_type: EntityType,
    kind: DifferenceKind = DifferenceKind.TRANSPOSITION,
    confidence: float = 0.95,
) -> AlertCandidate:
    return AlertCandidate(
        side(entity_type, "4857", "Contrato_4857_v3.pdf"),
        side(entity_type, "4587", "Anexo_1_condiciones.docx"),
        Difference(kind, confidence),
    )
