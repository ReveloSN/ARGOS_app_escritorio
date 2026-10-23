import re
from collections.abc import Sequence
from typing import Protocol

from argus.application.ports.entity_extractor import EntityMatch
from argus.domain.entity import EntityType
from argus.domain.text_comparison.change import ChangeKind, Materiality
from argus.domain.text_comparison.materiality import (
    ChangeFacts,
    cosmetic_difference,
    negation_count,
)
from argus.domain.text_comparison.segment import Segment

NUMBER = re.compile(r"\d+")
MATERIALITY_BY_ENTITY = {
    EntityType.MONEY: Materiality.AMOUNT,
    EntityType.DATE: Materiality.DATE,
    EntityType.PERIOD: Materiality.DATE,
    EntityType.CONTRACT_ID: Materiality.NUMBER,
    EntityType.TAX_ID: Materiality.NUMBER,
    EntityType.PERSON_NAME: Materiality.PARTY,
    EntityType.ORGANIZATION_NAME: Materiality.PARTY,
}

type _Mark = tuple[Materiality, str]


class ValueReader(Protocol):
    """Reconoce montos, fechas, identificadores y nombres en un texto (la cadena de extractores)."""

    def matches(self, text: str) -> Sequence[EntityMatch]: ...


class ChangeFactsReader:
    """Qué toca un cambio: los valores, números y negaciones que difieren entre sus lados.

    Reutiliza los mismos extractores de la revisión, así un monto es monto en los dos análisis.
    En un segmento agregado o eliminado cuenta todo lo que contiene.
    """

    def __init__(self, values: ValueReader) -> None:
        self._values = values

    def facts_of(
        self, kind: ChangeKind, first: Segment | None, second: Segment | None
    ) -> ChangeFacts:
        # Un cambio solo de forma no se analiza más: «18.450.000» y «18450000» no son montos distintos.
        if first and second and (cosmetic := cosmetic_difference(first.text, second.text)):
            return ChangeFacts(kind, frozenset({cosmetic}))
        differing = self._marks(first) ^ self._marks(second)
        materialities = {materiality for materiality, _ in differing}
        if kind is ChangeKind.MODIFIED and not materialities:
            materialities.add(Materiality.WORDING)
        return ChangeFacts(kind, frozenset(materialities))

    def _marks(self, segment: Segment | None) -> set[_Mark]:
        if segment is None:
            return set()
        matches = self._values.matches(segment.text)
        marks = {(MATERIALITY_BY_ENTITY[match.type], match.normalized_value) for match in matches}
        marks.update(
            (Materiality.NUMBER, number) for number in _loose_numbers(segment.text, matches)
        )
        negations = negation_count(segment.text)
        if negations:
            marks.add((Materiality.NEGATION, str(negations)))
        return marks


def _loose_numbers(text: str, matches: Sequence[EntityMatch]) -> list[str]:
    """Números fuera de los valores reconocidos: un monto cambiado no cuenta además como número."""
    masked = list(text)
    for match in matches:
        masked[match.start : match.end] = " " * (match.end - match.start)
    return NUMBER.findall("".join(masked))
