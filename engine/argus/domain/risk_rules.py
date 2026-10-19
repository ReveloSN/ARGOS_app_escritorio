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
# Un correo que remite un adjunto de otro periodo es el caso guía de CLAUDE.md §1: riesgo alto.
ReferencedPeriod = DifferenceIs(DifferenceKind.REFERENCED_PERIOD)


@dataclass(frozen=True)
class Rule[Candidate]:
    specification: Specification[Candidate]
    risk: RiskLevel


class RuleChainClassifier[Candidate]:
    """Cadena de reglas: el riesgo lo decide la primera que se cumple; sin regla, None.

    Una regla nueva se agrega a la lista, sin tocar esta clase. La usan las alertas y los
    cambios entre documentos (ADR 018), cada uno con sus propias reglas.
    """

    def __init__(self, rules: Sequence[Rule[Candidate]]) -> None:
        self._rules = tuple(rules)

    def classify(self, candidate: Candidate) -> RiskLevel | None:
        return next(
            (rule.risk for rule in self._rules if rule.specification.is_satisfied_by(candidate)),
            None,
        )


RiskRule = Rule[AlertCandidate]


class RiskClassifier(RuleChainClassifier[AlertCandidate]):
    """Riesgo de una alerta; sin regla que se cumpla no hay alerta. Las decisiones del usuario
    no cambian el riesgo: solo ajustan la confianza (ADR 016)."""


# El formato va primero: una diferencia solo de formato nunca es de riesgo alto.
DEFAULT_RISK_RULES: tuple[RiskRule, ...] = (
    RiskRule(FormatOnly, RiskLevel.LOW),
    RiskRule(IdentifierMismatch | AmountMismatch | DateMismatch | ReferencedPeriod, RiskLevel.HIGH),
    RiskRule(NameMismatch | PeriodMismatch, RiskLevel.MEDIUM),
)
