from dataclasses import dataclass

from argus.domain.comparison.difference import Difference
from argus.domain.entity import Entity, EntityType
from argus.domain.errors import InvalidValueError
from argus.domain.risk import RiskLevel


@dataclass(frozen=True)
class AlertSide:
    """Un valor de la alerta con todas sus apariciones (el mockup: «6 apariciones en 3 archivos»)."""

    entities: tuple[Entity, ...]

    def __post_init__(self) -> None:
        if not self.entities:
            raise InvalidValueError("Un lado de la alerta necesita al menos una aparición.")
        if len({(e.type, e.normalized_value) for e in self.entities}) != 1:
            raise InvalidValueError("Todas las apariciones de un lado deben tener el mismo valor.")

    @property
    def representative(self) -> Entity:
        return self.entities[0]

    @property
    def entity_type(self) -> EntityType:
        return self.representative.type

    @property
    def normalized_value(self) -> str:
        return self.representative.normalized_value

    @property
    def occurrence_count(self) -> int:
        return len(self.entities)

    @property
    def document_names(self) -> frozenset[str]:
        return frozenset(entity.occurrence.document_name for entity in self.entities)


@dataclass(frozen=True)
class AlertCandidate:
    """Dos valores parecidos y su diferencia, antes de decidir si merecen una alerta."""

    first: AlertSide
    second: AlertSide
    difference: Difference

    def __post_init__(self) -> None:
        if self.first.entity_type is not self.second.entity_type:
            raise InvalidValueError("Solo se comparan valores del mismo tipo de entidad.")

    @property
    def entity_type(self) -> EntityType:
        return self.first.entity_type


@dataclass(frozen=True)
class Alert:
    """Inconsistencia que el usuario debe revisar: ambos valores con su origen, riesgo y confianza."""

    first: AlertSide
    second: AlertSide
    difference: Difference
    risk: RiskLevel

    @classmethod
    def from_candidate(cls, candidate: AlertCandidate, risk: RiskLevel) -> "Alert":
        return cls(candidate.first, candidate.second, candidate.difference, risk)

    @property
    def entity_type(self) -> EntityType:
        return self.first.entity_type

    @property
    def confidence(self) -> float:
        return self.difference.confidence
