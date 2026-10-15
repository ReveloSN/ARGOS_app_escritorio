"""Reglas de riesgo como Specifications componibles y su clasificador (CLAUDE.md §5 y §7)."""

from collections.abc import Sequence
from dataclasses import dataclass

from argus.domain.alert import AlertCandidate
from argus.domain.comparison.difference import DifferenceKind
from argus.domain.entity import EntityType
from argus.domain.risk import RiskLevel
from argus.domain.specification import Specification


class EntityTypeIs(Specification[AlertCandidate]):
    def __init__(self, *entity_types: EntityType) -> None:
        self._entity_types = frozenset(entity_types)

    def is_satisfied_by(self, candidate: AlertCandidate) -> bool:
        return candidate.entity_type in self._entity_types


class DifferenceIs(Specification[AlertCandidate]):
    def __init__(self, *kinds: DifferenceKind) -> None:
        self._kinds = frozenset(kinds)

    def is_satisfied_by(self, candidate: AlertCandidate) -> bool:
        return candidate.difference.kind in self._kinds


FormatOnly = DifferenceIs(DifferenceKind.FORMAT_ONLY)
ContractIdTransposition = EntityTypeIs(EntityType.CONTRACT_ID) & DifferenceIs(
    DifferenceKind.TRANSPOSITION
)
IdentifierMismatch = EntityTypeIs(EntityType.CONTRACT_ID, EntityType.TAX_ID) & ~FormatOnly
AmountMismatch = EntityTypeIs(EntityType.MONEY) & ~FormatOnly
DateMismatch = EntityTypeIs(EntityType.DATE) & ~FormatOnly
NameMismatch = EntityTypeIs(EntityType.PERSON_NAME, EntityType.ORGANIZATION_NAME) & ~FormatOnly
PeriodMismatch = EntityTypeIs(EntityType.PERIOD) & ~FormatOnly


@dataclass(frozen=True)
class RiskRule:
    specification: Specification[AlertCandidate]
    risk: RiskLevel


class RiskClassifier:
    """Cadena de reglas: el riesgo lo decide la primera que se cumple; sin regla no hay alerta.

    Una regla nueva se agrega a la lista, sin tocar esta clase. El modelo entrenable de la
    Fase 7 podrá ocupar el lugar de esta cadena detrás de la misma interfaz.
    """

    def __init__(self, rules: Sequence[RiskRule]) -> None:
        self._rules = tuple(rules)

    def classify(self, candidate: AlertCandidate) -> RiskLevel | None:
        return next(
            (rule.risk for rule in self._rules if rule.specification.is_satisfied_by(candidate)),
            None,
        )


# El formato va primero: una diferencia solo de formato nunca es de riesgo alto.
DEFAULT_RISK_RULES: tuple[RiskRule, ...] = (
    RiskRule(FormatOnly, RiskLevel.LOW),
    RiskRule(IdentifierMismatch | AmountMismatch | DateMismatch, RiskLevel.HIGH),
    RiskRule(NameMismatch | PeriodMismatch, RiskLevel.MEDIUM),
)
