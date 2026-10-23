"""Piezas comunes de las verificaciones internas: valores con su origen y su alerta."""

from collections.abc import Iterator
from dataclasses import dataclass

from argus.application.excerpt import excerpt_around
from argus.domain.alert import Alert, AlertCandidate, AlertSide
from argus.domain.comparison.difference import Difference
from argus.domain.document import Document, NamedFragment
from argus.domain.entity import Entity, EntityType, Occurrence
from argus.domain.risk_rules import RiskClassifier, TypedDifference


@dataclass(frozen=True)
class CheckedValue:
    """Un valor que encontró una verificación: su tipo, cómo está escrito y cómo se compara."""

    entity_type: EntityType
    raw_value: str
    normalized_value: str


@dataclass(frozen=True)
class TextSpan:
    start: int
    end: int


def entity_in(named: NamedFragment, span: TextSpan, value: CheckedValue) -> Entity:
    """El valor con su origen: archivo, ubicación y el texto que lo rodea."""
    text = named.fragment.text
    excerpt = excerpt_around(text, span.start, span.end)
    occurrence = Occurrence(named.document_name, named.fragment.location, excerpt)
    return Entity(value.entity_type, value.raw_value, value.normalized_value, occurrence)


def fragments_of(documents: tuple[Document, ...]) -> Iterator[NamedFragment]:
    """Cada fragmento de cada documento y de sus adjuntos."""
    for document in documents:
        yield from document.named_fragments()


@dataclass(frozen=True)
class FoundPair:
    """Dos valores del mismo documento que deberían coincidir y cómo difieren."""

    first: Entity
    second: Entity
    difference: Difference


def paired_alert(pair: FoundPair, classifier: RiskClassifier) -> Alert | None:
    """Alerta de los dos valores, con el riesgo que dan las reglas de siempre."""
    candidate = AlertCandidate(AlertSide((pair.first,)), AlertSide((pair.second,)), pair.difference)
    risk = classifier.classify(candidate)
    return None if risk is None else Alert.from_candidate(candidate, risk)


def single_alert(
    side: AlertSide, difference: Difference, classifier: RiskClassifier
) -> Alert | None:
    """Alerta de un solo valor (fecha imposible, campo vacío) con todas sus apariciones."""
    risk = classifier.classify(TypedDifference(side.entity_type, difference))
    return None if risk is None else Alert(side, None, difference, risk)
