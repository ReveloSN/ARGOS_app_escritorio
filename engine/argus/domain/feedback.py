"""Aprendizaje con las decisiones del usuario (CLAUDE.md §8, capa 5).

Las decisiones no cambian el riesgo ni ocultan alertas: solo mueven la confianza hacia lo que
el usuario decidió antes en alertas parecidas (mismo tipo de dato y de diferencia).
"""

from collections.abc import Mapping
from dataclasses import dataclass

from argus.domain.comparison.difference import DifferenceKind
from argus.domain.entity import EntityType

# Cuántas decisiones «vale» la confianza calculada por el motor: con pocas decisiones manda
# el motor y, a medida que se acumulan, manda la experiencia del usuario.
ENGINE_WEIGHT = 4
CONFIDENCE_DIGITS = 2

type FeedbackKey = tuple[EntityType, DifferenceKind]


@dataclass(frozen=True)
class FeedbackCount:
    """Cuántas alertas parecidas marcó el usuario como error real y cuántas descartó."""

    real_errors: int
    dismissed: int

    @property
    def total(self) -> int:
        return self.real_errors + self.dismissed


NO_FEEDBACK = FeedbackCount(0, 0)

type FeedbackCounts = Mapping[FeedbackKey, FeedbackCount]


def adjusted_confidence(engine_confidence: float, feedback: FeedbackCount) -> float:
    """Promedio ponderado entre la confianza del motor y la tasa de errores reales."""
    weighted = engine_confidence * ENGINE_WEIGHT + feedback.real_errors
    return round(weighted / (ENGINE_WEIGHT + feedback.total), CONFIDENCE_DIGITS)
