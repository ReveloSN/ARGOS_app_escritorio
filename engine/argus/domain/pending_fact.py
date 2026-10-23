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
        second = alert.second
        is_covered = any((alert.entity_type, value) in covered for value in alert.normalized_values)
        # Solo cambia la forma de escribirlo, o hay un solo valor: no hay nada que elegir.
        if second is None or is_covered or alert.difference.kind is DifferenceKind.FORMAT_ONLY:
            continue
        values = (alert.first.representative.raw_value, second.representative.raw_value)
        yield PendingFact(alert.entity_type, values)
