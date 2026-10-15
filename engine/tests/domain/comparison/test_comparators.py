import pytest

from argus.domain.comparison.date_comparator import DateComparator
from argus.domain.comparison.difference import DifferenceKind
from argus.domain.comparison.edit_distance_comparator import EditDistanceComparator
from argus.domain.comparison.money_comparator import MoneyComparator
from argus.domain.comparison.name_comparator import NameComparator


class TestEditDistanceComparator:
    comparator = EditDistanceComparator(max_distance=1)

    def test_contract_transposition_is_detected_with_its_positions(self) -> None:
        difference = self.comparator.compare("4857", "4587")

        assert difference is not None
        assert difference.kind is DifferenceKind.TRANSPOSITION
        assert difference.positions == (2, 3)

    def test_single_character_change_is_detected(self) -> None:
        difference = self.comparator.compare("NIT:900482315-7", "NIT:900482315-1")

        assert difference is not None
        assert difference.kind is DifferenceKind.CHARACTER_CHANGE
        assert difference.positions == (15,)

    def test_transposition_is_more_certain_than_a_character_change(self) -> None:
        transposition = self.comparator.compare("4857", "4587")
        change = self.comparator.compare("4857", "4851")

        assert transposition is not None
        assert change is not None
        assert transposition.confidence > change.confidence

    @pytest.mark.parametrize(("first", "second"), [("4857", "4857"), ("4857", "3921")])
    def test_equal_or_unrelated_values_are_not_differences(self, first: str, second: str) -> None:
        assert self.comparator.compare(first, second) is None

    def test_wider_tolerance_accepts_two_edits(self) -> None:
        difference = EditDistanceComparator(max_distance=2).compare("4857", "4813")

        assert difference is not None
        assert difference.kind is DifferenceKind.CHARACTER_CHANGE

    def test_candidate_radius_is_the_tolerance(self) -> None:
        assert self.comparator.candidate_radius("4857") == 1


class TestMoneyComparator:
    comparator = MoneyComparator(EditDistanceComparator(max_distance=1))

    def test_rent_with_swapped_digits_is_a_transposition(self) -> None:
        difference = self.comparator.compare("COP:18450000", "COP:18540000")

        assert difference is not None
        assert difference.kind is DifferenceKind.TRANSPOSITION
        assert difference.positions == (3, 4)

    def test_amounts_in_different_currencies_are_not_compared(self) -> None:
        assert self.comparator.compare("COP:300", "USD:300") is None

    def test_far_apart_amounts_are_not_differences(self) -> None:
        assert self.comparator.compare("COP:18450000", "COP:36900000") is None


class TestDateComparator:
    def test_start_date_with_a_different_month_is_detected(self) -> None:
        difference = DateComparator(compares_years=False).compare("2026-07-01", "2026-08-01")

        assert difference is not None
        assert difference.kind is DifferenceKind.DATE_COMPONENT

    def test_day_and_month_swapped_is_detected(self) -> None:
        difference = DateComparator(compares_years=False).compare("2026-07-01", "2026-01-07")

        assert difference is not None
        assert difference.kind is DifferenceKind.DAY_MONTH_SWAP

    def test_year_difference_is_only_compared_when_requested(self) -> None:
        assert DateComparator(compares_years=False).compare("2026-07-01", "2029-07-01") is None
        assert DateComparator(compares_years=True).compare("2026-07-01", "2029-07-01") is not None

    def test_dates_differing_in_several_parts_are_unrelated(self) -> None:
        assert DateComparator(compares_years=True).compare("2026-07-01", "2029-06-30") is None

    def test_equal_dates_are_not_differences(self) -> None:
        assert DateComparator(compares_years=True).compare("2026-07-01", "2026-07-01") is None

    def test_candidate_radius_covers_a_day_month_swap(self) -> None:
        assert DateComparator(compares_years=True).candidate_radius("2026-07-01") == 2


class TestNameComparator:
    comparator = NameComparator(min_similarity=0.8)

    def test_one_surname_written_differently_is_a_similar_name(self) -> None:
        difference = self.comparator.compare("maria f rojas perez", "maria f rojas pena")

        assert difference is not None
        assert difference.kind is DifferenceKind.SIMILAR_NAME
        assert difference.confidence == pytest.approx(1 - 3 / 19)

    def test_different_companies_are_not_similar(self) -> None:
        assert (
            self.comparator.compare("inversiones torres gomez sas", "logistica andina sas") is None
        )

    def test_stricter_threshold_ignores_the_same_pair(self) -> None:
        strict = NameComparator(min_similarity=0.9)

        assert strict.compare("maria f rojas perez", "maria f rojas pena") is None

    def test_candidate_radius_never_misses_a_similar_longer_name(self) -> None:
        radius = self.comparator.candidate_radius("maria f rojas pena")

        assert radius >= 3
