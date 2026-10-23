"""Diferencias por palabra y, dentro de cada palabra cambiada, por carácter."""

import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from enum import StrEnum

from argus.domain.text_comparison.segment import TextSpan

WORD = re.compile(r"\S+")
EQUAL = "equal"


class EditKind(StrEnum):
    INSERTED = "inserted"
    DELETED = "deleted"
    REPLACED = "replaced"


_EDIT_KIND_BY_OPCODE = {
    "insert": EditKind.INSERTED,
    "delete": EditKind.DELETED,
    "replace": EditKind.REPLACED,
}


@dataclass(frozen=True)
class CharacterEdit:
    """Caracteres distintos dentro de una palabra reemplazada; tramos sobre cada texto."""

    kind: EditKind
    first: TextSpan | None
    second: TextSpan | None


@dataclass(frozen=True)
class WordEdit:
    """Palabras insertadas, eliminadas o reemplazadas, con su tramo en cada texto."""

    kind: EditKind
    first: TextSpan | None
    second: TextSpan | None
    first_text: str
    second_text: str
    characters: tuple[CharacterEdit, ...]


@dataclass(frozen=True)
class _Words:
    text: str
    spans: tuple[TextSpan, ...]

    @classmethod
    def of(cls, text: str) -> "_Words":
        return cls(text, tuple(TextSpan(m.start(), m.end()) for m in WORD.finditer(text)))

    @property
    def keys(self) -> list[str]:
        return [self.text[span.start : span.end] for span in self.spans]

    def span(self, start: int, end: int) -> TextSpan | None:
        """Tramo que cubre de la palabra `start` a la `end` (excluida); None si no hay ninguna."""
        return TextSpan(self.spans[start].start, self.spans[end - 1].end) if start < end else None


def diff_words(first: str, second: str) -> tuple[WordEdit, ...]:
    """Ediciones para pasar de `first` a `second`; los espacios entre palabras no cuentan."""
    first_words, second_words = _Words.of(first), _Words.of(second)
    matcher = SequenceMatcher(None, first_words.keys, second_words.keys, autojunk=False)
    return tuple(
        _word_edit(opcode, (first_words.span(i1, i2), second_words.span(j1, j2)), (first, second))
        for opcode, i1, i2, j1, j2 in matcher.get_opcodes()
        if opcode != EQUAL
    )


def _word_edit(
    opcode: str, spans: tuple[TextSpan | None, TextSpan | None], texts: tuple[str, str]
) -> WordEdit:
    first, second = spans
    first_text = texts[0][first.start : first.end] if first else ""
    second_text = texts[1][second.start : second.end] if second else ""
    characters = diff_characters(first, second, texts) if first and second else ()
    kind = _EDIT_KIND_BY_OPCODE[opcode]
    return WordEdit(kind, first, second, first_text, second_text, characters)


def diff_characters(
    first: TextSpan, second: TextSpan, texts: tuple[str, str]
) -> tuple[CharacterEdit, ...]:
    """Caracteres distintos entre dos tramos (4857 → 4587), con tramos sobre el texto completo."""
    first_text = texts[0][first.start : first.end]
    second_text = texts[1][second.start : second.end]
    matcher = SequenceMatcher(None, first_text, second_text, autojunk=False)
    return tuple(
        CharacterEdit(
            _EDIT_KIND_BY_OPCODE[opcode],
            TextSpan(first.start + i1, first.start + i2) if i1 < i2 else None,
            TextSpan(second.start + j1, second.start + j2) if j1 < j2 else None,
        )
        for opcode, i1, i2, j1, j2 in matcher.get_opcodes()
        if opcode != EQUAL
    )
