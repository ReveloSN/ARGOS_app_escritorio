"""Reglas de materialidad (Specification): qué cambios importan y con qué riesgo."""

import re
from dataclasses import dataclass

from argus.domain.risk import RiskLevel
from argus.domain.risk_rules import Rule, RuleChainClassifier
from argus.domain.specification import Specification
from argus.domain.text_comparison.change import ChangeKind, Materiality
from argus.domain.text_comparison.segment import normalize_for_comparison

# Palabras que invierten el sentido de una frase, en español e inglés.
NEGATION_WORDS = frozenset(
    {
        "no",
        "ni",
        "nunca",
        "jamás",
        "tampoco",
        "sin",
        "ningún",
        "ninguno",
        "ninguna",
        "not",
        "never",
        "no-one",
        "without",
        "neither",
        "nor",
    }
)
WORD = re.compile(r"[\w-]+")


def negation_count(text: str) -> int:
    words = WORD.findall(normalize_for_comparison(text))
    return sum(1 for word in words if word in NEGATION_WORDS)


@dataclass(frozen=True)
class ChangeFacts:
    kind: ChangeKind
    materialities: frozenset[Materiality]


class Touches(Specification[ChangeFacts]):
    def __init__(self, *materialities: Materiality) -> None:
        self._materialities = frozenset(materialities)

    def is_satisfied_by(self, candidate: ChangeFacts) -> bool:
        return bool(candidate.materialities & self._materialities)


class KindIs(Specification[ChangeFacts]):
    def __init__(self, *kinds: ChangeKind) -> None:
        self._kinds = frozenset(kinds)

    def is_satisfied_by(self, candidate: ChangeFacts) -> bool:
        return candidate.kind in self._kinds


# CLAUDE.md §7: montos, identificadores y fechas son de riesgo alto; las partes, medio. Una
# negación agregada o quitada invierte una obligación, así que también es alto.
MaterialChange = Touches(Materiality.AMOUNT, Materiality.DATE, Materiality.NUMBER) | Touches(
    Materiality.NEGATION
)
PartyChange = Touches(Materiality.PARTY)
WholeSegmentChange = KindIs(ChangeKind.ADDED, ChangeKind.REMOVED)
OtherChange = KindIs(ChangeKind.MODIFIED, ChangeKind.MOVED)

MATERIALITY_RULES: tuple[Rule[ChangeFacts], ...] = (
    Rule(MaterialChange, RiskLevel.HIGH),
    Rule(PartyChange | WholeSegmentChange, RiskLevel.MEDIUM),
    Rule(OtherChange, RiskLevel.LOW),
)
MATERIALITY_CLASSIFIER = RuleChainClassifier(MATERIALITY_RULES)
