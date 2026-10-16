"""Meses citados en un correo y en sus adjuntos, a partir del índice de entidades."""

import re
from collections import Counter, defaultdict
from dataclasses import dataclass

from argus.domain.alert import AlertSide
from argus.domain.entity import Entity, EntityType
from argus.domain.entity_index import EntityIndex

MONTH = re.compile(r"^(?P<year>\d{4}|X{4})-(?P<month>\d{2})")
UNKNOWN_YEAR = "XXXX"


@dataclass(frozen=True)
class Month:
    year: str
    month: str

    def overlaps(self, other: "Month") -> bool:
        """Mismo mes; un año desconocido («junio» a secas) coincide con cualquiera."""
        years_match = UNKNOWN_YEAR in (self.year, other.year) or self.year == other.year
        return self.month == other.month and years_match


def month_of(normalized: str) -> Month | None:
    """Mes de un periodo («2026-06», «XXXX-06») o de una fecha ISO; None para duraciones."""
    match = MONTH.match(normalized)
    return None if match is None else Month(match["year"], match["month"])


def entities_in(index: EntityIndex, entity_type: EntityType, names: frozenset[str]) -> list[Entity]:
    """Las entidades de ese tipo que aparecen en alguno de los archivos nombrados."""
    return [
        entity
        for value in sorted(index.values_of(entity_type))
        for entity in index.entities_with(entity_type, value)
        if entity.occurrence.document_name in names
    ]


def _with_month(entities: list[Entity]) -> list[Entity]:
    return [entity for entity in entities if month_of(entity.normalized_value) is not None]


@dataclass(frozen=True)
class Mention:
    """Un mes citado en el correo, con todas sus apariciones."""

    month: Month
    side: AlertSide


def mentions_in(index: EntityIndex, document_name: str) -> list[Mention]:
    grouped: defaultdict[str, list[Entity]] = defaultdict(list)
    for entity in _with_month(entities_in(index, EntityType.PERIOD, frozenset({document_name}))):
        grouped[entity.normalized_value].append(entity)
    return [
        Mention(month, AlertSide(tuple(found)))
        for value, found in grouped.items()
        if (month := month_of(value)) is not None
    ]


@dataclass(frozen=True)
class AttachedMonths:
    """Los meses de un adjunto: sus periodos (para la alerta) y todo mes citado, fechas incluidas."""

    periods: tuple[Entity, ...]
    months: frozenset[Month]

    def covers(self, month: Month) -> bool:
        return any(month.overlaps(other) for other in self.months)

    @property
    def dominant(self) -> AlertSide:
        """El periodo que más se repite en el adjunto: el que lo describe."""
        value, _ = Counter(entity.normalized_value for entity in self.periods).most_common(1)[0]
        return AlertSide(tuple(e for e in self.periods if e.normalized_value == value))


def months_in(index: EntityIndex, names: frozenset[str]) -> AttachedMonths:
    periods = _with_month(entities_in(index, EntityType.PERIOD, names))
    dates = entities_in(index, EntityType.DATE, names)
    months = {month_of(entity.normalized_value) for entity in [*periods, *dates]}
    return AttachedMonths(tuple(periods), frozenset(m for m in months if m is not None))
