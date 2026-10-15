from argus.domain.sensitivity import DEFAULT_SENSITIVITY, Sensitivity


def test_balanced_is_the_default_shown_in_the_new_review_wizard() -> None:
    assert DEFAULT_SENSITIVITY is Sensitivity.BALANCED


def test_only_strict_reports_format_only_differences() -> None:
    assert Sensitivity.STRICT.policy.reports_format_differences
    assert not Sensitivity.BALANCED.policy.reports_format_differences
    assert not Sensitivity.PERMISSIVE.policy.reports_format_differences


def test_stricter_levels_tolerate_more_edits_and_less_similar_names() -> None:
    strict, balanced, permissive = (level.policy for level in Sensitivity)

    assert strict.max_identifier_edits > balanced.max_identifier_edits
    assert balanced.max_identifier_edits >= permissive.max_identifier_edits
    assert (
        strict.min_name_similarity < balanced.min_name_similarity < permissive.min_name_similarity
    )


def test_only_strict_compares_dates_that_differ_only_in_year() -> None:
    assert Sensitivity.STRICT.policy.compares_years
    assert not Sensitivity.BALANCED.policy.compares_years
