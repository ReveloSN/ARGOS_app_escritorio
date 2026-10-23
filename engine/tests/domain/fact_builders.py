"""Constructores de datos confirmados para las pruebas."""

from datetime import UTC, datetime

from argus.domain.confirmed_fact import ConfirmedFact, FactValue
from argus.domain.entity import EntityType

CONFIRMED = datetime(2026, 9, 14, 10, 0, tzinfo=UTC)


def fact(
    entity_type: EntityType = EntityType.CONTRACT_ID,
    normalized: str = "4857",
    fact_id: int = 1,
) -> ConfirmedFact:
    value = FactValue(entity_type, normalized, normalized)
    return ConfirmedFact(fact_id, "Número de contrato", value, CONFIRMED)
