"""Cada dato confirmado del expediente frente a lo que dicen los documentos de la revisión."""

from collections.abc import Mapping
from dataclasses import dataclass

from argus.domain.alert import AlertSide
from argus.domain.comparison.difference import Difference, ValueComparator
from argus.domain.confirmed_fact import ConfirmedFact
from argus.domain.entity import Entity, EntityType
from argus.domain.entity_index import EntityIndex
from argus.domain.risk import RiskLevel
from argus.domain.risk_rules import RiskClassifier
from argus.domain.suppression import SuppressionRule


@dataclass(frozen=True)
class FactContrast:
    """Un valor de los documentos frente al confirmado, para clasificar su riesgo."""

    entity_type: EntityType
    difference: Difference


@dataclass(frozen=True)
class FactContradiction:
    """Un valor parecido al confirmado pero distinto, con todas sus apariciones."""

    side: AlertSide
    difference: Difference
    risk: RiskLevel


@dataclass(frozen=True)
class AcceptedByRule:
    """Un valor distinto que no se marca porque el usuario pidió no alertar ese caso."""

    side: AlertSide
    rule: SuppressionRule


@dataclass(frozen=True)
class FactCheck:
    """Dónde aparece el dato confirmado, qué documentos lo contradicen y qué se acepta."""

    fact: ConfirmedFact
    appearances: tuple[Entity, ...]
    contradictions: tuple[FactContradiction, ...]
    accepted: tuple[AcceptedByRule, ...]


@dataclass(frozen=True)
class FactCheckRules:
    """Cómo se compara cada tipo, cómo se clasifica el riesgo y qué casos no se alertan."""

    comparators: Mapping[EntityType, ValueComparator]
    classifier: RiskClassifier
    suppressions: tuple[SuppressionRule, ...]


type Contrast = FactContradiction | AcceptedByRule


class FactChecker:
    """Compara cada dato confirmado con los valores de su tipo en los documentos.

    Usa los mismos comparadores y reglas de riesgo que las alertas entre documentos: el dato
    confirmado ocupa el lugar de uno de los dos valores. Un dato retirado ya no se compara.
    """

    def __init__(self, index: EntityIndex, rules: FactCheckRules) -> None:
        self._index = index
        self._rules = rules

    def check(self, fact: ConfirmedFact) -> FactCheck:
        value = fact.value
        appearances = self._index.entities_with(value.entity_type, value.normalized_value)
        contrasts = () if fact.is_retired else self._contrasts(fact)
        contradictions = sorted(
            (item for item in contrasts if isinstance(item, FactContradiction)),
            key=lambda item: -item.risk.priority,
        )
        accepted = tuple(item for item in contrasts if isinstance(item, AcceptedByRule))
        return FactCheck(fact, appearances, tuple(contradictions), accepted)

    def _contrasts(self, fact: ConfirmedFact) -> tuple[Contrast, ...]:
        value = fact.value
        others = sorted(self._index.values_of(value.entity_type) - {value.normalized_value})
        found = (self._contrast(fact, other) for other in others)
        return tuple(item for item in found if item is not None)

    def _contrast(self, fact: ConfirmedFact, other: str) -> Contrast | None:
        entity_type = fact.value.entity_type
        comparator = self._rules.comparators.get(entity_type)
        difference = (
            None if comparator is None else comparator.compare(fact.value.normalized_value, other)
        )
        if difference is None:
            return None
        side = AlertSide(self._index.entities_with(entity_type, other))
        rule = self._rule_for(entity_type, frozenset({fact.value.normalized_value, other}))
        if rule is not None:
            return AcceptedByRule(side, rule)
        risk = self._rules.classifier.classify(FactContrast(entity_type, difference))
        return None if risk is None else FactContradiction(side, difference, risk)

    def _rule_for(self, entity_type: EntityType, values: frozenset[str]) -> SuppressionRule | None:
        return next(
            (
                rule
                for rule in self._rules.suppressions
                if rule.case.matches_values(entity_type, values)
            ),
            None,
        )
