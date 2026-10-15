from collections import defaultdict
from collections.abc import Iterable, Mapping

from argus.domain.entity import Entity, EntityType


class EntityIndex:
    """Índice invertido `tipo → valor normalizado → entidades` (CLAUDE.md §6).

    Permite saber en O(1) en qué documentos aparece un valor, sin comparar todos los documentos
    entre sí. Guarda la entidad completa y no solo su aparición: la forma original del valor
    (S.A.S. frente a SAS) es lo que distingue una diferencia de formato de un error real.
    Es inmutable: se construye una vez con todas las entidades de la revisión.
    """

    def __init__(self, entities: Iterable[Entity]) -> None:
        grouped: defaultdict[EntityType, defaultdict[str, list[Entity]]] = defaultdict(
            lambda: defaultdict(list)
        )
        for entity in entities:
            grouped[entity.type][entity.normalized_value].append(entity)
        self._index: Mapping[EntityType, Mapping[str, tuple[Entity, ...]]] = {
            entity_type: {value: tuple(found) for value, found in values.items()}
            for entity_type, values in grouped.items()
        }

    def __len__(self) -> int:
        return sum(len(found) for values in self._index.values() for found in values.values())

    @property
    def entity_types(self) -> frozenset[EntityType]:
        return frozenset(self._index)

    def values_of(self, entity_type: EntityType) -> frozenset[str]:
        return frozenset(self._index.get(entity_type, {}))

    def entities_with(self, entity_type: EntityType, normalized_value: str) -> tuple[Entity, ...]:
        return self._index.get(entity_type, {}).get(normalized_value, ())

    def documents_with(self, entity_type: EntityType, normalized_value: str) -> frozenset[str]:
        return frozenset(
            entity.occurrence.document_name
            for entity in self.entities_with(entity_type, normalized_value)
        )
