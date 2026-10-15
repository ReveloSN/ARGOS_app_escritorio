from argus.domain.comparison.damerau_levenshtein import (
    damerau_levenshtein,
    differing_positions,
    is_adjacent_transposition,
)
from argus.domain.comparison.difference import Difference, DifferenceKind

# Dos dígitos vecinos intercambiados casi siempre son un error de digitación.
TRANSPOSITION_CONFIDENCE = 0.95
# Cada edición adicional hace más probable que se trate de dos valores distintos a propósito.
FIRST_EDIT_CONFIDENCE = 0.8
CONFIDENCE_LOST_PER_EXTRA_EDIT = 0.15


class EditDistanceComparator:
    """Compara identificadores por distancia de Damerau-Levenshtein, hasta un máximo de ediciones."""

    def __init__(self, max_distance: int) -> None:
        self._max_distance = max_distance

    def candidate_radius(self, value: str) -> int:
        return self._max_distance

    def compare(self, first: str, second: str) -> Difference | None:
        distance = damerau_levenshtein(first, second)
        if distance == 0 or distance > self._max_distance:
            return None
        positions = differing_positions(first, second)
        if is_adjacent_transposition(first, second):
            return Difference(DifferenceKind.TRANSPOSITION, TRANSPOSITION_CONFIDENCE, positions)
        confidence = FIRST_EDIT_CONFIDENCE - CONFIDENCE_LOST_PER_EXTRA_EDIT * (distance - 1)
        return Difference(DifferenceKind.CHARACTER_CHANGE, confidence, positions)
