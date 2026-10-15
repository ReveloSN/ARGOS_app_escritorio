from datetime import date
from decimal import Decimal

import pytest

from argus.domain.errors import InvalidValueError
from argus.domain.values import ContractId, Money, Period


class TestMoney:
    def test_amounts_with_same_value_and_currency_are_equal(self) -> None:
        assert Money(Decimal("18450000")) == Money(Decimal("18450000.00"), "COP")

    def test_transposed_digits_produce_different_amounts(self) -> None:
        assert Money(Decimal("18450000")) != Money(Decimal("18540000"))

    def test_same_amount_in_other_currency_is_different(self) -> None:
        assert Money(Decimal("100"), "COP") != Money(Decimal("100"), "USD")

    @pytest.mark.parametrize("currency", ["", "cop", "PESOS", "C0P"])
    def test_currency_must_be_an_iso_code(self, currency: str) -> None:
        with pytest.raises(InvalidValueError):
            Money(Decimal("1"), currency)

    @pytest.mark.parametrize("amount", ["NaN", "Infinity"])
    def test_amount_must_be_finite(self, amount: str) -> None:
        with pytest.raises(InvalidValueError):
            Money(Decimal(amount))


class TestContractId:
    def test_value_is_kept_as_written(self) -> None:
        assert ContractId("4857").value == "4857"

    def test_transposed_identifiers_are_different(self) -> None:
        assert ContractId("4857") != ContractId("4587")

    @pytest.mark.parametrize("value", ["", " 4857", "48 57", "no.4857", "-4857"])
    def test_value_must_be_a_normalized_identifier(self, value: str) -> None:
        with pytest.raises(InvalidValueError):
            ContractId(value)

    def test_identifiers_may_contain_letters_and_hyphens(self) -> None:
        assert ContractId("OTROSI-2-4410").value == "OTROSI-2-4410"


class TestPeriod:
    def test_month_covers_first_to_last_day(self) -> None:
        june = Period.month(2026, 6)

        assert june == Period(date(2026, 6, 1), date(2026, 6, 30))

    def test_december_ends_on_the_thirty_first(self) -> None:
        assert Period.month(2026, 12).end == date(2026, 12, 31)

    def test_period_contains_its_limits(self) -> None:
        june = Period.month(2026, 6)

        assert june.contains(date(2026, 6, 1))
        assert june.contains(date(2026, 6, 30))
        assert not june.contains(date(2026, 5, 31))

    def test_june_and_may_do_not_overlap(self) -> None:
        assert not Period.month(2026, 6).overlaps(Period.month(2026, 5))

    def test_quarter_overlaps_one_of_its_months(self) -> None:
        second_quarter = Period(date(2026, 4, 1), date(2026, 6, 30))

        assert second_quarter.overlaps(Period.month(2026, 5))

    def test_start_cannot_be_after_end(self) -> None:
        with pytest.raises(InvalidValueError):
            Period(date(2026, 7, 1), date(2026, 6, 30))

    def test_month_must_exist(self) -> None:
        with pytest.raises(InvalidValueError):
            Period.month(2026, 13)
