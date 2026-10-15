import pytest

from argus.domain.comparison.bk_tree import BKTree
from argus.domain.comparison.damerau_levenshtein import damerau_levenshtein

IDENTIFIERS = ["4857", "4587", "4410", "3921", "4857-A", "21-44", "4851", "9999", "4578"]


def brute_force(query: str, radius: int) -> set[tuple[str, int]]:
    return {
        (word, damerau_levenshtein(query, word))
        for word in IDENTIFIERS
        if damerau_levenshtein(query, word) <= radius
    }


@pytest.mark.parametrize("query", ["4857", "4410", "0000", "4587"])
@pytest.mark.parametrize("radius", [0, 1, 2, 3])
def test_search_finds_exactly_what_comparing_everything_would_find(query: str, radius: int) -> None:
    tree = BKTree(IDENTIFIERS, damerau_levenshtein)

    assert set(tree.search(query, radius)) == brute_force(query, radius)


def test_contract_transposition_is_one_step_away() -> None:
    tree = BKTree(IDENTIFIERS, damerau_levenshtein)

    assert ("4587", 1) in tree.search("4857", 1)


def test_duplicated_words_are_stored_once() -> None:
    tree = BKTree(["4857", "4857", "4587"], damerau_levenshtein)

    assert len(tree) == 2
    assert tree.search("4857", 0) == [("4857", 0)]


def test_empty_tree_finds_nothing() -> None:
    tree = BKTree([], damerau_levenshtein)

    assert len(tree) == 0
    assert tree.search("4857", 5) == []
