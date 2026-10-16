import pytest

from argus.domain.entity import EntityType
from argus.domain.errors import InvalidValueError
from argus.domain.preferences import ComparedCategory, UserPreferences
from argus.domain.sensitivity import DEFAULT_SENSITIVITY


def test_defaults_compare_every_type_and_limit_history_to_90_days() -> None:
    preferences = UserPreferences()

    assert preferences.sensitivity is DEFAULT_SENSITIVITY
    assert preferences.compared_categories == frozenset(ComparedCategory)
    assert preferences.has_retention_limit
    assert all(preferences.compares(entity_type) for entity_type in EntityType)


def test_every_entity_type_belongs_to_one_category() -> None:
    types = [t for category in ComparedCategory for t in category.entity_types]

    assert sorted(types) == sorted(EntityType)


def test_only_the_chosen_categories_are_compared() -> None:
    preferences = UserPreferences(compared_categories=frozenset({ComparedCategory.IDENTIFIERS}))

    assert preferences.compares(EntityType.CONTRACT_ID)
    assert preferences.compares(EntityType.TAX_ID)
    assert not preferences.compares(EntityType.MONEY)


def test_at_least_one_category_must_be_compared() -> None:
    with pytest.raises(InvalidValueError):
        UserPreferences(compared_categories=frozenset())
