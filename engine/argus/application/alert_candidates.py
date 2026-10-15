"""Búsqueda de pares de valores que merecen revisión, a partir del índice de entidades."""

from collections import defaultdict
from collections.abc import Iterator, Sequence

from argus.domain.alert import AlertCandidate, AlertSide
from argus.domain.comparison.bk_tree import BKTree
from argus.domain.comparison.damerau_levenshtein import damerau_levenshtein
from argus.domain.comparison.difference import Difference, DifferenceKind, ValueComparator
from argus.domain.entity import Entity, EntityType
from argus.domain.entity_index import EntityIndex

# El valor es el mismo; solo cambia cómo está escrito.
FORMAT_ONLY_CONFIDENCE = 0.99
MIN_DOCUMENTS_TO_CROSS_CHECK = 2
MIN_WRITTEN_FORMS = 2


def similar_value_candidates(
    index: EntityIndex, entity_type: EntityType, comparator: ValueComparator
) -> Iterator[AlertCandidate]:
    values = sorted(index.values_of(entity_type))
    for first, second, difference in similar_pairs(values, comparator):
        candidate = AlertCandidate(
            *majority_first(
                AlertSide(index.entities_with(entity_type, first)),
                AlertSide(index.entities_with(entity_type, second)),
            ),
            difference,
        )
        if spans_several_documents(candidate):
            yield candidate


def similar_pairs(
    values: Sequence[str], comparator: ValueComparator
) -> Iterator[tuple[str, str, Difference]]:
    """Pares de valores parecidos sin comparar todos contra todos: el BK-tree descarta lejanos."""
    tree = BKTree(values, damerau_levenshtein)
    for value in values:
        neighbors = (
            neighbor
            for neighbor, _ in tree.search(value, comparator.candidate_radius(value))
            if neighbor > value
        )
        yield from (
            (value, neighbor, difference)
            for neighbor in neighbors
            if (difference := comparator.compare(value, neighbor)) is not None
        )


def format_difference_candidates(
    index: EntityIndex, entity_type: EntityType
) -> Iterator[AlertCandidate]:
    """Mismo valor escrito de dos formas («S.A.S.» frente a «SAS»); los espacios no cuentan."""
    for value in sorted(index.values_of(entity_type)):
        forms = group_by_written_form(index.entities_with(entity_type, value))
        if len(forms) < MIN_WRITTEN_FORMS:
            continue
        first, second = forms[0], forms[1]
        difference = Difference(DifferenceKind.FORMAT_ONLY, FORMAT_ONLY_CONFIDENCE)
        candidate = AlertCandidate(AlertSide(first), AlertSide(second), difference)
        if spans_several_documents(candidate):
            yield candidate


def group_by_written_form(entities: Sequence[Entity]) -> list[tuple[Entity, ...]]:
    groups: defaultdict[str, list[Entity]] = defaultdict(list)
    for entity in entities:
        groups["".join(entity.raw_value.split())].append(entity)
    # sorted es estable: a igual frecuencia se conserva el orden de aparición.
    return [tuple(group) for group in sorted(groups.values(), key=len, reverse=True)]


def majority_first(first: AlertSide, second: AlertSide) -> tuple[AlertSide, AlertSide]:
    """El Valor A es el que más se repite, como en el detalle de alerta de los mockups."""
    return (second, first) if second.occurrence_count > first.occurrence_count else (first, second)


def spans_several_documents(candidate: AlertCandidate) -> bool:
    documents = candidate.first.document_names | candidate.second.document_names
    return len(documents) >= MIN_DOCUMENTS_TO_CROSS_CHECK
