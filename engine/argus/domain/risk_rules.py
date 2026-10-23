"""Reglas de riesgo como Specifications componibles y su clasificador (CLAUDE.md §5 y §7)."""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

from argus.domain.comparison.difference import Difference, DifferenceKind
from argus.domain.entity import EntityType
from argus.domain.risk import RiskLevel
from argus.domain.specification import Specification


class ValueContrast(Protocol):
    """Dos valores de un tipo y cómo difieren: una alerta entre documentos o un documento
    frente a un dato confirmado del expediente. Las mismas reglas dan el riesgo de ambos."""

    @property
    def entity_type(self) -> EntityType: ...

    @property
    def difference(self) -> Difference: ...


@dataclass(frozen=True)
class TypedDifference:
    """Un tipo de dato y una diferencia, sin los valores: basta para clasificar el riesgo de un
    valor frente a un dato confirmado o de una verificación de un solo valor."""

    entity_type: EntityType
    difference: Difference


class EntityTypeIs(Specification[ValueContrast]):
    def __init__(self, *entity_types: EntityType) -> None:
        self._entity_types = frozenset(entity_types)

    def is_satisfied_by(self, candidate: ValueContrast) -> bool:
        return candidate.entity_type in self._entity_types


class DifferenceIs(Specification[ValueContrast]):
    def __init__(self, *kinds: DifferenceKind) -> None:
        self._kinds = frozenset(kinds)

    def is_satisfied_by(self, candidate: ValueContrast) -> bool:
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
# Un campo sin llenar no es un valor equivocado: hay que completarlo antes de enviar.
BlankField = DifferenceIs(DifferenceKind.BLANK_FIELD)


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


RiskRule = Rule[ValueContrast]


class RiskClassifier(RuleChainClassifier[ValueContrast]):
    """Riesgo de una alerta; sin regla que se cumpla no hay alerta. Las decisiones del usuario
    no cambian el riesgo: solo ajustan la confianza (ADR 016)."""


# El formato va primero: una diferencia solo de formato nunca es de riesgo alto.
DEFAULT_RISK_RULES: tuple[RiskRule, ...] = (
    RiskRule(FormatOnly, RiskLevel.LOW),
    RiskRule(BlankField, RiskLevel.MEDIUM),
    RiskRule(IdentifierMismatch | AmountMismatch | DateMismatch | ReferencedPeriod, RiskLevel.HIGH),
    RiskRule(NameMismatch | PeriodMismatch, RiskLevel.MEDIUM),
)
