import math

from argus.domain.comparison.damerau_levenshtein import damerau_levenshtein
from argus.domain.comparison.difference import Difference, DifferenceKind


class NameComparator:
    """Compara nombres por similitud relativa (1 - distancia / longitud mayor).

    En nombres la distancia absoluta engaña: tres letras en un apellido corto son mucho, en una
    razón social larga son poco. La similitud también es la confianza de la diferencia.
    """

    def __init__(self, min_similarity: float) -> None:
        self._min_similarity = min_similarity

    def candidate_radius(self, value: str) -> int:
        # Si d ≤ (1 - s)·max(la, lb) y lb ≤ la + d, entonces d ≤ (1 - s)·la / s.
        return math.floor((1 - self._min_similarity) * len(value) / self._min_similarity)

    def compare(self, first: str, second: str) -> Difference | None:
        distance = damerau_levenshtein(first, second)
        if distance == 0:
            return None
        similarity = 1 - distance / max(len(first), len(second))
        if similarity < self._min_similarity:
            return None
        return Difference(DifferenceKind.SIMILAR_NAME, similarity)
