import pytest

from argus.domain.text_comparison.alignment import (
    AlignedPair,
    Alignment,
    longest_increasing_run,
    word_similarity,
)
from tests.domain.text_comparison.segment_builders import segments_of


@pytest.mark.parametrize(
    ("values", "expected"),
    [
        ([1, 2, 3], {0, 1, 2}),
        ([2, 3, 1], {0, 1}),
        ([1, 5, 2, 3, 4], {0, 2, 3, 4}),
        ([], set()),
    ],
)
def test_the_longest_increasing_run_keeps_the_most_segments_in_place(
    values: list[int], expected: set[int]
) -> None:
    assert longest_increasing_run(values) == expected


def test_a_pair_out_of_the_common_order_is_the_one_that_moved() -> None:
    first = segments_of("v1.docx", "Objeto", "Canon", "Plazo", "Multas")
    second = segments_of("v2.docx", "Objeto", "Multas", "Canon", "Plazo")
    pairs = tuple(
        AlignedPair(first[a], second[b], 1.0) for a, b in [(0, 0), (1, 2), (2, 3), (3, 1)]
    )

    alignment = Alignment(pairs, removed=(), added=())

    assert [pair.first.text for pair in pairs if alignment.is_moved(pair)] == ["Multas"]


def test_word_similarity_ignores_case_and_rewards_shared_words() -> None:
    assert word_similarity("El canon MENSUAL", "el canon mensual") == 1.0
    assert word_similarity("El canon mensual es fijo", "El canon anual es fijo") == 0.8
    assert word_similarity("Objeto del contrato", "Multas por retraso") == 0.0
