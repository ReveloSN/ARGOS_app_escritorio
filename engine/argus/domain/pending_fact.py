from collections.abc import Iterable, Iterator
from dataclasses import dataclass

from argus.domain.alert import Alert
from argus.domain.comparison.difference import DifferenceKind
from argus.domain.confirmed_fact import ConfirmedFact
from argus.domain.entity import EntityType


@dataclass(frozen=True)
class PendingFact:
    """Un dato sin confirmar: los documentos dan dos valores y ninguno está en el expediente.

    Los valores van como están escritos, en el orden de la alerta (el más repetido primero).
    """

    entity_type: EntityType
    values: tuple[str, str]


def pending_facts(
    alerts: Iterable[Alert], facts: Iterable[ConfirmedFact]
) -> tuple[PendingFact, ...]:
    """Las alertas que ningún dato confirmado resuelve todavía, sin repetir el mismo par."""
    covered = {
        (fact.value.entity_type, fact.value.normalized_value)
        for fact in facts
        if not fact.is_retired
    }
    return tuple(dict.fromkeys(_uncovered(alerts, covered)))


def _uncovered(
    alerts: Iterable[Alert], covered: set[tuple[EntityType, str]]
) -> Iterator[PendingFact]:
    for alert in alerts:
        values = (alert.first.normalized_value, alert.second.normalized_value)
        is_covered = any((alert.entity_type, value) in covered for value in values)
        # Solo cambia la forma de escribirlo: es el mismo valor y no hay nada que elegir.
        if not is_covered and alert.difference.kind is not DifferenceKind.FORMAT_ONLY:
            yield PendingFact(
                alert.entity_type,
                (alert.first.representative.raw_value, alert.second.representative.raw_value),
            )
