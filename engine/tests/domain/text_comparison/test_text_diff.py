from argus.domain.text_comparison.segment import TextSpan
from argus.domain.text_comparison.text_diff import EditKind, diff_words

FIRST = "Contrato No. 4857 de 2026"
SECOND = "Contrato No. 4587 de 2026"


def test_a_changed_word_is_replaced_with_its_spans_on_both_sides() -> None:
    (edit,) = diff_words(FIRST, SECOND)

    assert (edit.kind, edit.first_text, edit.second_text) == (EditKind.REPLACED, "4857", "4587")
    assert edit.first == TextSpan(13, 17)
    assert edit.second == TextSpan(13, 17)


def test_characters_inside_a_replaced_word_point_to_the_digits_that_changed() -> None:
    (edit,) = diff_words(FIRST, SECOND)

    assert edit.characters
    for character in edit.characters:
        if character.first:
            assert 13 <= character.first.start < character.first.end <= 17
        if character.second:
            assert 13 <= character.second.start < character.second.end <= 17
    changed = "".join(
        SECOND[character.second.start : character.second.end]
        for character in edit.characters
        if character.second
    )
    assert changed
    assert changed in "4587"


def test_an_inserted_word_has_no_span_in_the_first_text() -> None:
    (edit,) = diff_words("Las partes podrán ceder", "Las partes no podrán ceder")

    assert (edit.kind, edit.first, edit.second_text) == (EditKind.INSERTED, None, "no")
    assert edit.characters == ()


def test_a_deleted_phrase_keeps_its_whole_span() -> None:
    (edit,) = diff_words("Pago a 30 días hábiles siguientes", "Pago a 30 días")

    assert (edit.kind, edit.first_text, edit.second) == (
        EditKind.DELETED,
        "hábiles siguientes",
        None,
    )


def test_spacing_is_not_an_edit_but_case_is() -> None:
    assert diff_words("El  canon\nmensual", "El canon mensual") == ()

    (edit,) = diff_words("El canon mensual", "El CANON mensual")

    assert (edit.kind, edit.first_text, edit.second_text) == (EditKind.REPLACED, "canon", "CANON")
