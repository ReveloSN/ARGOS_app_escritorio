from argus.domain.comparison.date_comparator import DateComparator
from argus.domain.comparison.difference import ValueComparator
from argus.domain.comparison.edit_distance_comparator import EditDistanceComparator
from argus.domain.comparison.money_comparator import MoneyComparator
from argus.domain.comparison.name_comparator import NameComparator
from argus.domain.entity import EntityType
from argus.domain.sensitivity import DetectionPolicy


def comparators_for(policy: DetectionPolicy) -> dict[EntityType, ValueComparator]:
    """La estrategia de comparación de cada tipo de entidad, con los umbrales de la política.

    Los periodos usan distancia de edición sobre su forma normalizada: «2026-05» frente a
    «2026-06» o «P36M» frente a «P30M». La comparación semántica llega en la Fase 7.
    """
    identifiers = EditDistanceComparator(policy.max_identifier_edits)
    names = NameComparator(policy.min_name_similarity)
    return {
        EntityType.CONTRACT_ID: identifiers,
        EntityType.TAX_ID: identifiers,
        EntityType.PERIOD: identifiers,
        EntityType.MONEY: MoneyComparator(identifiers),
        EntityType.DATE: DateComparator(policy.compares_years),
        EntityType.PERSON_NAME: names,
        EntityType.ORGANIZATION_NAME: names,
    }
