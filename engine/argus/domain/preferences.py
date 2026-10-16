from dataclasses import dataclass, field
from datetime import timedelta
from enum import StrEnum

from argus.domain.entity import EntityType
from argus.domain.errors import InvalidValueError
from argus.domain.sensitivity import DEFAULT_SENSITIVITY, Sensitivity

# Ajustes > Privacidad: «Guardar el historial de decisiones durante 90 días».
HISTORY_RETENTION = timedelta(days=90)


class ComparedCategory(StrEnum):
    """Los tipos de dato de Ajustes > Detección > «Tipos que se comparan»."""

    IDENTIFIERS = "identifiers"
    DATES = "dates"
    AMOUNTS = "amounts"
    NAMES = "names"
    PERIODS = "periods"

    @property
    def entity_types(self) -> frozenset[EntityType]:
        return _ENTITY_TYPES_BY_CATEGORY[self]


_ENTITY_TYPES_BY_CATEGORY = {
    ComparedCategory.IDENTIFIERS: frozenset({EntityType.CONTRACT_ID, EntityType.TAX_ID}),
    ComparedCategory.DATES: frozenset({EntityType.DATE}),
    ComparedCategory.AMOUNTS: frozenset({EntityType.MONEY}),
    ComparedCategory.NAMES: frozenset({EntityType.PERSON_NAME, EntityType.ORGANIZATION_NAME}),
    ComparedCategory.PERIODS: frozenset({EntityType.PERIOD}),
}


@dataclass(frozen=True)
class UserPreferences:
    """Ajustes que cambian el análisis y el historial; los de idioma y tema viven en la interfaz.

    Con `has_retention_limit`, las revisiones de más de 90 días se borran al iniciar el motor;
    sin él, el historial se conserva sin límite.
    """

    sensitivity: Sensitivity = DEFAULT_SENSITIVITY
    compared_categories: frozenset[ComparedCategory] = field(
        default_factory=lambda: frozenset(ComparedCategory)
    )
    has_retention_limit: bool = True

    def __post_init__(self) -> None:
        if not self.compared_categories:
            raise InvalidValueError("Debe compararse al menos un tipo de dato.")

    def compares(self, entity_type: EntityType) -> bool:
        return any(entity_type in category.entity_types for category in self.compared_categories)
