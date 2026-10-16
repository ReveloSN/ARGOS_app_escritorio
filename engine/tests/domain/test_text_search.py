import pytest

from argus.domain.text_search import fold_for_search


@pytest.mark.parametrize(
    ("text", "folded"),
    [
        ("Bogotá D.C.", "bogota d.c."),
        ("PEÑA", "pena"),
        ("Fontibón", "fontibon"),
        ("İstanbul", "istanbul"),
    ],
)
def test_folding_ignores_case_and_accents(text: str, folded: str) -> None:
    assert fold_for_search(text) == folded


def test_folding_keeps_the_length_so_positions_match_the_original() -> None:
    text = "Canon de arrendamiento en Bogotá: $ 18.450.000"

    assert len(fold_for_search(text)) == len(text)
    assert fold_for_search(text).index("bogota") == text.index("Bogotá")
