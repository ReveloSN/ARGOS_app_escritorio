from datetime import date

from argus.domain.comparison.difference import Difference, DifferenceKind

# Día y mes intercambiados: «01/07» escrito como «07/01». Casi siempre es un error.
DAY_MONTH_SWAP_CONFIDENCE = 0.9
SINGLE_COMPONENT_CONFIDENCE = 0.75
# Un intercambio de día y mes cambia dos caracteres en la forma ISO.
CANDIDATE_RADIUS = 2


class DateComparator:
    """Detecta fechas que difieren en un solo componente o con día y mes intercambiados.

    Fechas distintas en todo (inicio y fin del contrato) son datos diferentes, no errores.
    Comparar años es opcional: un mismo día y mes en años distintos suele ser intencional.
    """

    def __init__(self, compares_years: bool) -> None:
        self._compares_years = compares_years

    def candidate_radius(self, value: str) -> int:
        return CANDIDATE_RADIUS

    def compare(self, first: str, second: str) -> Difference | None:
        left, right = date.fromisoformat(first), date.fromisoformat(second)
        if left == right:
            return None
        if _is_day_month_swap(left, right):
            return Difference(DifferenceKind.DAY_MONTH_SWAP, DAY_MONTH_SWAP_CONFIDENCE)
        if self._differs_in_one_component(left, right):
            return Difference(DifferenceKind.DATE_COMPONENT, SINGLE_COMPONENT_CONFIDENCE)
        return None

    def _differs_in_one_component(self, left: date, right: date) -> bool:
        changes = {
            "year": left.year != right.year,
            "month": left.month != right.month,
            "day": left.day != right.day,
        }
        if sum(changes.values()) != 1:
            return False
        return self._compares_years or not changes["year"]


def _is_day_month_swap(left: date, right: date) -> bool:
    return left.year == right.year and left.day == right.month and left.month == right.day
