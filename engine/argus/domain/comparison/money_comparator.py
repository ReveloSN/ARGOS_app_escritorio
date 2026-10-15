from argus.domain.comparison.difference import Difference
from argus.domain.comparison.edit_distance_comparator import EditDistanceComparator

CURRENCY_SEPARATOR = ":"


class MoneyComparator:
    """Compara montos de la misma moneda por sus cifras: «18.450.000» frente a «18.540.000».

    Montos muy distintos no se comparan: suelen ser conceptos diferentes (canon y depósito).
    """

    def __init__(self, digit_comparator: EditDistanceComparator) -> None:
        self._digit_comparator = digit_comparator

    def candidate_radius(self, value: str) -> int:
        return self._digit_comparator.candidate_radius(value)

    def compare(self, first: str, second: str) -> Difference | None:
        first_currency, first_amount = first.split(CURRENCY_SEPARATOR, maxsplit=1)
        second_currency, second_amount = second.split(CURRENCY_SEPARATOR, maxsplit=1)
        if first_currency != second_currency:
            return None
        return self._digit_comparator.compare(first_amount, second_amount)
