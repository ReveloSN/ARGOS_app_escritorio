import itertools

import pytest

from argus.domain.comparison.damerau_levenshtein import (
    damerau_levenshtein,
    differing_positions,
    is_adjacent_transposition,
)


@pytest.mark.parametrize(
    ("first", "second", "expected"),
    [
        ("4857", "4857", 0),
        ("4857", "4587", 1),
        ("18450000", "18540000", 1),
        ("900482315-7", "900482315-1", 1),
        ("4857", "485", 1),
        ("4857", "48577", 1),
        ("", "abc", 3),
        ("abc", "", 3),
        ("", "", 0),
        ("ca", "abc", 2),
        ("maria f rojas perez", "maria f rojas pena", 3),
    ],
)
def test_distance_counts_insertions_deletions_substitutions_and_transpositions(
    first: str, second: str, expected: int
) -> None:
    assert damerau_levenshtein(first, second) == expected


WORDS = ["4857", "4587", "4578", "ca", "abc", "ac", "", "8457", "48577"]


@pytest.mark.parametrize(("first", "second"), list(itertools.product(WORDS, repeat=2)))
def test_distance_is_symmetric(first: str, second: str) -> None:
    assert damerau_levenshtein(first, second) == damerau_levenshtein(second, first)


@pytest.mark.parametrize(("a", "b", "c"), list(itertools.product(WORDS, repeat=3)))
def test_distance_satisfies_triangle_inequality_required_by_the_bk_tree(
    a: str, b: str, c: str
) -> None:
    assert damerau_levenshtein(a, c) <= damerau_levenshtein(a, b) + damerau_levenshtein(b, c)


@pytest.mark.parametrize(
    ("first", "second", "expected"),
    [("4857", "4587", True), ("4857", "4851", False), ("4857", "8457", True), ("ab", "ab", False)],
)
def test_adjacent_transposition_is_detected(first: str, second: str, expected: bool) -> None:
    assert is_adjacent_transposition(first, second) is expected


def test_differing_positions_are_one_based() -> None:
    assert differing_positions("4857", "4587") == (2, 3)


def test_differing_positions_are_empty_for_different_lengths() -> None:
    assert differing_positions("4857", "485") == ()
